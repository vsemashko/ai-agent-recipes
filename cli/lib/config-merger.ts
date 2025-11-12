/**
 * Config Merger
 *
 * Format-agnostic configuration merging with three-way merge support.
 * Handles user customizations while detecting team deletions.
 */

/**
 * Merge mode for a specific key
 */
export type MergeMode = 'array-union' | 'object-merge' | 'user-first' | 'managed-first' | 'replace'

/**
 * Merge strategy configuration
 */
export interface MergeStrategy {
  /**
   * Key path patterns to match (supports wildcards)
   * Examples: "permissions", "permissions.*", "mcpServers.*"
   */
  patterns: string[]

  /**
   * How to merge this key
   */
  mode: MergeMode

  /**
   * Description of what this strategy does
   */
  description: string
}

/**
 * Change detected during merge
 */
export interface ConfigChange {
  /**
   * Type of change
   */
  type: 'added' | 'removed' | 'modified' | 'user-kept'

  /**
   * Key path (e.g., "permissions.network")
   */
  path: string

  /**
   * Old value (for removed/modified)
   */
  oldValue?: unknown

  /**
   * New value (for added/modified)
   */
  newValue?: unknown
}

/**
 * Config Merger
 */
export class ConfigMerger {
  private strategies: MergeStrategy[]

  constructor(strategies: MergeStrategy[] = []) {
    this.strategies = strategies.length > 0 ? strategies : this.getDefaultStrategies()
  }

  /**
   * Default merge strategies for common config patterns
   */
  private getDefaultStrategies(): MergeStrategy[] {
    return [
      {
        patterns: ['allowedCommands', 'permissions.*', 'mcpServers.*'],
        mode: 'array-union',
        description: 'Merge arrays by combining unique values',
      },
      {
        patterns: ['*'],
        mode: 'object-merge',
        description: 'Default: deep merge objects',
      },
    ]
  }

  /**
   * Three-way merge: base + user + managed → result
   *
   * @param base - Last synced config (null if first sync)
   * @param user - Current user config
   * @param managed - New managed config from repo
   * @param strategy - Optional custom merge strategy
   */
  threeWayMerge(
    base: Record<string, unknown> | null,
    user: Record<string, unknown>,
    managed: Record<string, unknown>,
    strategy?: MergeStrategy[],
  ): Record<string, unknown> {
    // Update strategies if provided
    if (strategy) {
      this.strategies = strategy
    }

    // If no base (first sync), just merge user + managed
    if (!base) {
      return this.mergeTwoWay(user, managed, '')
    }

    // Perform three-way merge
    return this.mergeThreeWay(base, user, managed, '')
  }

  /**
   * Check if there are user conflicts that require approval
   *
   * A conflict occurs when:
   * 1. User has a value for a managed field
   * 2. The merge result would change/overwrite the user's value
   *
   * @returns true if there are conflicts requiring user approval
   */
  hasUserConflicts(
    base: Record<string, unknown> | null,
    user: Record<string, unknown>,
    managed: Record<string, unknown>,
    merged: Record<string, unknown>,
  ): boolean {
    const managedLeafEntries = this.collectLeafEntries(managed, [])

    for (const { segments } of managedLeafEntries) {
      const userValue = this.getValueAtSegments(user, segments)
      const managedValue = this.getValueAtSegments(managed, segments)
      const mergedValue = this.getValueAtSegments(merged, segments)

      // Skip if managed value doesn't exist (shouldn't happen, but safety check)
      if (managedValue === undefined) continue

      const baseValue = this.getValueAtSegments(base, segments)
      const userHasValue = userValue !== undefined

      // Build a keyPath in the same style as mergeThreeWay
      const keyPath = segments.join('.')

      // Special-case arrays that use array-union: only flag real conflicts
      const mode = this.getMergeMode(keyPath)
      if (mode === 'array-union' && Array.isArray(mergedValue)) {
        const conflict = this.arrayUnionHasConflict(baseValue, userValue, managedValue, mergedValue)
        if (conflict) return true
        continue
      }

      // First sync: warn only if user has a conflicting value
      if (!base) {
        if (userHasValue && !this.deepEqual(userValue, managedValue)) {
          return true
        }
        continue
      }

      const userModified = userHasValue && !this.deepEqual(userValue, baseValue)
      const userRemoved = !userHasValue && baseValue !== undefined

      // Check if merge result differs from user's value
      const mergeOverwrites = !this.deepEqual(mergedValue, userValue)

      if ((userModified || userRemoved) && mergeOverwrites) {
        return true
      }
    }

    return false
  }

  /**
   * Determine if an array-union merge introduced a real conflict.
   * Conflicts only when:
   * - The merge removes any user values, or
   * - It reintroduces items the user removed while the team still had them.
   */
  private arrayUnionHasConflict(
    baseValue: unknown,
    userValue: unknown,
    managedValue: unknown,
    mergedValue: unknown,
  ): boolean {
    const userArr = Array.isArray(userValue) ? (userValue as unknown[]) : []
    const baseArr = Array.isArray(baseValue) ? (baseValue as unknown[]) : []
    const managedArr = Array.isArray(managedValue) ? (managedValue as unknown[]) : []
    const mergedArr = Array.isArray(mergedValue) ? (mergedValue as unknown[]) : []

    const userSet = this.toNormalizedSet(userArr)
    const baseSet = this.toNormalizedSet(baseArr)
    const managedSet = this.toNormalizedSet(managedArr)
    const mergedSet = this.toNormalizedSet(mergedArr)

    // If merge removed any user entries → conflict
    for (const v of userSet) {
      if (!mergedSet.has(v)) return true
    }

    // If user intentionally removed something from base, but team still has it
    // and the merge reintroduces it → conflict
    for (const v of baseSet) {
      const userRemoved = !userSet.has(v)
      const teamStillHas = managedSet.has(v)
      const mergeReintroduced = mergedSet.has(v)
      if (userRemoved && teamStillHas && mergeReintroduced) return true
    }

    return false
  }

  private toNormalizedSet(arr: unknown[]): Set<string> {
    return new Set(arr.map((v) => this.normalizeForComparison(v)))
  }

  /**
   * Calculate changes between old and new config
   * Only counts leaf-level changes to avoid double-counting nested properties
   */
  calculateChanges(
    oldConfig: Record<string, unknown> | null,
    newConfig: Record<string, unknown>,
  ): ConfigChange[] {
    const changes: ConfigChange[] = []
    const encodeKey = (segments: string[]) => this.encodePathKey(segments)

    if (!oldConfig) {
      // Everything is new - collect only leaf keys
      this.collectLeafEntries(newConfig, []).forEach(({ segments, value }) => {
        changes.push({
          type: 'added',
          path: this.formatPath(segments),
          newValue: value,
        })
      })
      return changes
    }

    // Find additions and modifications - use leaf keys only
    const newLeafEntries = this.collectLeafEntries(newConfig, [])
    const oldLeafEntries = this.collectLeafEntries(oldConfig, [])

    const oldLeafMap = new Map<string, { segments: string[]; value: unknown }>()
    for (const entry of oldLeafEntries) {
      oldLeafMap.set(encodeKey(entry.segments), entry)
    }

    const newLeafKeySet = new Set(newLeafEntries.map((entry) => encodeKey(entry.segments)))

    for (const entry of newLeafEntries) {
      const key = encodeKey(entry.segments)
      const path = this.formatPath(entry.segments)
      const oldEntry = oldLeafMap.get(key)

      if (!oldEntry) {
        changes.push({ type: 'added', path, newValue: entry.value })
      } else if (!this.deepEqual(oldEntry.value, entry.value)) {
        changes.push({ type: 'modified', path, oldValue: oldEntry.value, newValue: entry.value })
      }
    }

    // Find removals
    for (const entry of oldLeafEntries) {
      const key = encodeKey(entry.segments)
      if (!newLeafKeySet.has(key)) {
        changes.push({
          type: 'removed',
          path: this.formatPath(entry.segments),
          oldValue: entry.value,
        })
      }
    }

    return changes
  }

  /**
   * Two-way merge (for first sync or simple merging)
   */
  private mergeTwoWay(
    user: Record<string, unknown>,
    managed: Record<string, unknown>,
    keyPath: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    // Add all managed keys
    for (const key of Object.keys(managed)) {
      const path = keyPath ? `${keyPath}.${key}` : key
      const mode = this.getMergeMode(path)

      if (user[key] === undefined) {
        // Key only in managed
        result[key] = this.deepClone(managed[key])
      } else if (mode === 'array-union' && Array.isArray(user[key]) && Array.isArray(managed[key])) {
        // Merge arrays
        result[key] = this.mergeArrays([], user[key] as unknown[], managed[key] as unknown[])
      } else if (mode === 'object-merge' && this.isPlainObject(user[key]) && this.isPlainObject(managed[key])) {
        // Recursively merge objects
        result[key] = this.mergeTwoWay(
          user[key] as Record<string, unknown>,
          managed[key] as Record<string, unknown>,
          path,
        )
      } else if (mode === 'user-first') {
        result[key] = this.deepClone(user[key])
      } else {
        // managed-first or replace
        result[key] = this.deepClone(managed[key])
      }
    }

    // Add user-only keys
    for (const key of Object.keys(user)) {
      if (result[key] === undefined) {
        result[key] = this.deepClone(user[key])
      }
    }

    return result
  }

  /**
   * Three-way merge implementation
   */
  private mergeThreeWay(
    base: Record<string, unknown>,
    user: Record<string, unknown>,
    managed: Record<string, unknown>,
    keyPath: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    // Get all keys from all three configs
    const allKeys = new Set([...Object.keys(base), ...Object.keys(user), ...Object.keys(managed)])

    for (const key of allKeys) {
      const path = keyPath ? `${keyPath}.${key}` : key
      const mode = this.getMergeMode(path)

      const baseValue = base[key]
      const userValue = user[key]
      const managedValue = managed[key]

      // Case 1: Key deleted by team (in base, not in managed)
      if (baseValue !== undefined && managedValue === undefined) {
        if (userValue !== undefined) {
          if (!this.deepEqual(userValue, baseValue)) {
            const pruned = this.subtractBaseValues(baseValue, userValue)
            if (pruned !== undefined) {
              result[key] = pruned
            }
          }
        }
        // else: both team and user deleted it - don't include in result
        continue
      }

      // Case 2: Key added by team (not in base, in managed)
      if (baseValue === undefined && managedValue !== undefined) {
        if (userValue !== undefined) {
          // User also added it - need to merge
          result[key] = this.mergeValue(undefined, userValue, managedValue, path, mode)
        } else {
          // Only team added it - use managed
          result[key] = this.deepClone(managedValue)
        }
        continue
      }

      // Case 3: Key exists in managed (and maybe in base/user)
      if (managedValue !== undefined) {
        if (userValue === undefined) {
          // User removed a managed key - restore managed value
          result[key] = this.deepClone(managedValue)
          continue
        }

        // Both exist - merge based on strategy
        result[key] = this.mergeValue(baseValue, userValue, managedValue, path, mode)
        continue
      }

      // Case 4: Key only in user (not in base, not in managed)
      if (baseValue === undefined && managedValue === undefined && userValue !== undefined) {
        // User's custom addition - preserve it
        result[key] = this.deepClone(userValue)
      }
    }

    return result
  }

  /**
   * Merge a single value based on strategy
   */
  private mergeValue(
    baseValue: unknown,
    userValue: unknown,
    managedValue: unknown,
    path: string,
    mode: MergeMode,
  ): unknown {
    // Array merging
    if (mode === 'array-union' && Array.isArray(userValue) && Array.isArray(managedValue)) {
      const baseArray = Array.isArray(baseValue) ? baseValue : []
      return this.mergeArrays(baseArray, userValue, managedValue)
    }

    // Object merging
    if (mode === 'object-merge' && this.isPlainObject(userValue) && this.isPlainObject(managedValue)) {
      const baseObj = this.isPlainObject(baseValue) ? baseValue : {}
      return this.mergeThreeWay(
        baseObj as Record<string, unknown>,
        userValue as Record<string, unknown>,
        managedValue as Record<string, unknown>,
        path,
      )
    }

    // User-first mode
    if (mode === 'user-first') {
      return this.deepClone(userValue)
    }

    // Managed-first or replace mode
    if (mode === 'managed-first' || mode === 'replace') {
      // If user didn't change from base, use managed
      if (this.deepEqual(userValue, baseValue)) {
        return this.deepClone(managedValue)
      }
      // User changed it - prefer user's change
      return this.deepClone(userValue)
    }

    // Default: prefer managed
    return this.deepClone(managedValue)
  }

  /**
   * Merge arrays using three-way merge
   */
  private mergeArrays(base: unknown[], user: unknown[], managed: unknown[]): unknown[] {
    // Calculate additions and deletions from base
    const baseSet = new Set(base.map((v) => this.normalizeForComparison(v)))
    const managedSet = new Set(managed.map((v) => this.normalizeForComparison(v)))

    // Team deletions: in base but not in managed
    const teamDeletions = new Set(
      base.filter((v) => !managedSet.has(this.normalizeForComparison(v))).map((v) => this.normalizeForComparison(v)),
    )

    // User customizations: in user but not in base (and not team deletions)
    const userCustom = user.filter((v) => {
      const normalized = this.normalizeForComparison(v)
      return !baseSet.has(normalized) && !teamDeletions.has(normalized)
    })

    // Result: managed + user customizations
    const result = [...managed, ...userCustom]

    // Remove duplicates
    const seen = new Set<string>()
    return result.filter((v) => {
      const normalized = this.normalizeForComparison(v)
      if (seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
  }

  /**
   * Get merge mode for a key path
   */
  private getMergeMode(keyPath: string): MergeMode {
    for (const strategy of this.strategies) {
      for (const pattern of strategy.patterns) {
        if (this.matchesPattern(keyPath, pattern)) {
          return strategy.mode
        }
      }
    }
    return 'object-merge' // default
  }

  /**
   * Check if a key path matches a pattern (supports wildcards)
   */
  private matchesPattern(keyPath: string, pattern: string): boolean {
    if (pattern === '*') return true

    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(keyPath)
  }

  /**
   * Normalize value for comparison (handles objects/arrays)
   */
  private normalizeForComparison(value: unknown): string {
    if (typeof value === 'object' && value !== null) {
      // Sort object keys for consistent comparison
      return JSON.stringify(this.sortObjectKeys(value))
    }
    return String(value)
  }

  /**
   * Sort object keys recursively for consistent comparison
   */
  private sortObjectKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((v) => this.sortObjectKeys(v))
    }
    if (typeof obj === 'object' && obj !== null) {
      const sorted: Record<string, unknown> = {}
      Object.keys(obj as Record<string, unknown>)
        .sort()
        .forEach((key) => {
          sorted[key] = this.sortObjectKeys((obj as Record<string, unknown>)[key])
        })
      return sorted
    }
    return obj
  }

  /**
   * Deep clone a value
   */
  private deepClone(value: unknown): unknown {
    if (value === null || value === undefined) return value
    if (typeof value !== 'object') return value

    if (Array.isArray(value)) {
      return value.map((v) => this.deepClone(v))
    }

    const cloned: Record<string, unknown> = {}
    for (const key in value as Record<string, unknown>) {
      cloned[key] = this.deepClone((value as Record<string, unknown>)[key])
    }
    return cloned
  }

  /**
   * Remove values that match the base (managed) subtree while keeping user-only content
   */
  private subtractBaseValues(baseValue: unknown, userValue: unknown): unknown | undefined {
    if (userValue === undefined) {
      return undefined
    }

    if (baseValue === undefined) {
      return this.deepClone(userValue)
    }

    const baseIsObject = this.isPlainObject(baseValue)
    const userIsObject = this.isPlainObject(userValue)

    if (baseIsObject && userIsObject) {
      const result: Record<string, unknown> = {}
      const userObj = userValue as Record<string, unknown>
      const baseObj = baseValue as Record<string, unknown>

      for (const key of Object.keys(userObj)) {
        const cleaned = this.subtractBaseValues(baseObj[key], userObj[key])
        if (cleaned !== undefined) {
          result[key] = cleaned
        }
      }

      return Object.keys(result).length > 0 ? result : undefined
    }

    if (Array.isArray(baseValue) && Array.isArray(userValue)) {
      return this.deepEqual(baseValue, userValue) ? undefined : this.deepClone(userValue)
    }

    return this.deepEqual(baseValue, userValue) ? undefined : this.deepClone(userValue)
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a === null || b === null) return false
    if (a === undefined || b === undefined) return false
    if (typeof a !== typeof b) return false

    if (typeof a === 'object') {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false
        return a.every((val, idx) => this.deepEqual(val, b[idx]))
      }

      const keysA = Object.keys(a as Record<string, unknown>)
      const keysB = Object.keys(b as Record<string, unknown>)
      if (keysA.length !== keysB.length) return false

      return keysA.every((key) =>
        this.deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        )
      )
    }

    return false
  }

  /**
   * Check if value is a plain object (not array, not null)
   */
  private isPlainObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  private collectLeafEntries(
    obj: Record<string, unknown>,
    prefix: string[],
  ): Array<{ segments: string[]; value: unknown }> {
    const entries: Array<{ segments: string[]; value: unknown }> = []

    for (const key of Object.keys(obj)) {
      const value = obj[key]
      const nextPath = [...prefix, key]

      if (this.isPlainObject(value)) {
        entries.push(...this.collectLeafEntries(value as Record<string, unknown>, nextPath))
      } else {
        entries.push({ segments: nextPath, value })
      }
    }

    return entries
  }

  private formatPath(segments: string[]): string {
    return segments
      .map((segment, index) => {
        const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)
        if (identifier) {
          return index === 0 ? segment : `.${segment}`
        }
        const escaped = segment.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        return index === 0 ? `["${escaped}"]` : `["${escaped}"]`
      })
      .join('')
  }

  private encodePathKey(segments: string[]): string {
    return segments.join('\u0000')
  }

  /**
   * Get value at a key path (segments preserve literal key names)
   */
  private getValueAtSegments(obj: Record<string, unknown> | null, segments: string[]): unknown {
    if (!obj) return undefined
    let current: unknown = obj

    for (const segment of segments) {
      if (
        typeof current === 'object' &&
        current !== null &&
        !Array.isArray(current) &&
        Object.prototype.hasOwnProperty.call(current, segment)
      ) {
        current = (current as Record<string, unknown>)[segment]
      } else {
        return undefined
      }
    }

    return current
  }
}
