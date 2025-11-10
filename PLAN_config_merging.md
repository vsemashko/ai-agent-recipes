# Plan: Configuration Merging for AI Coding Providers

**Date**: 2025-11-08 **Status**: Planning **Goal**: Enable team-wide distribution and partial merging of **global configuration files** for Claude
Code, Codex, and OpenCode without overwriting user customizations.

**Scope**: Global configurations only (not project-level configs).

---

## TL;DR

**Problem**: We want to distribute team configs (permissions, MCP servers) but can't use simple deep merge because it doesn't handle deletions.

**Solution**: **Three-way merge** with state tracking:

- Track what was previously synced (base)
- Compare with current user config (ours) and new managed config (theirs)
- Calculate: `result = (new_managed + user_custom) - team_deletions`

**Key Benefits**:

- ✅ Team deletions are properly removed
- ✅ User customizations are preserved
- ✅ Team additions are applied
- ✅ Format-agnostic: Works with JSON, YAML, TOML, or any future format
- ✅ Easy to extend with new format parsers

**Timeline**: 4 weeks for Claude Code MVP, 7 weeks for all providers

**Integration**: Integrated into existing `agent-recipes sync` command (no new commands)

**Flags**:

- `--skip-configs` - Skip config syncing
- `--yes` - Auto-approve all changes

**Files to create**:

- `cli/lib/config-format.ts` - **Generic format parsers** (JSON, TOML, YAML)
- `cli/lib/config-merger.ts` - **Format-agnostic** three-way merge logic
- `cli/lib/state-manager.ts` - Track last synced configs
- `configs/claude-code/managed.json` - Team config template
- `configs/claude-code/merge-strategy.json` - Per-key merge rules
- Update `cli/commands/sync.ts` - Add config sync integration

**Architecture**: Parser/Merger separation for extensibility

---

## Problem Statement

Currently, agent-recipes only syncs instructions and skills. However, each AI coding tool has configuration files that control:

- Allowed commands and permissions
- MCP servers
- Environment variables
- Model settings
- Hooks and automation

**Challenges**:

1. Each provider uses different config formats (JSON, TOML, JSONC)
2. Users have personal customizations we must preserve
3. Some settings should be team-wide (security policies, allowed tools)
4. Some settings should remain user-specific (API keys, personal preferences)
5. Arrays need smart merging (append vs replace vs union)

## Provider Configuration Overview

### Claude Code

- **Format**: JSON
- **Location**: `~/.claude/settings.json` (global user settings)
- **Key Settings**:
  - `permissions.allow/ask/deny` - Tool permissions
  - `env` - Environment variables
  - `hooks` - Custom command execution
  - `enabledMcpjsonServers/disabledMcpjsonServers` - MCP server configuration
  - `model` - Default model override
  - `sandbox` - Sandbox configuration

### Codex

- **Format**: TOML
- **Location**: `~/.codex/config.toml` (global, shared between CLI and IDE)
- **Key Settings**:
  - `model` - Default model
  - `model_provider` - Backend provider
  - `sandbox_level` - Filesystem/network access
  - `[profiles.*]` - Named configuration profiles
  - `[features]` - Feature flags

### OpenCode

- **Format**: JSON/JSONC
- **Location**: `~/.config/opencode/opencode.json` (global user settings)
- **Key Settings**:
  - `model/small_model` - Model selection
  - `provider` - Provider configuration
  - `tools` - Available tools configuration
  - `permissions` - Operation approval requirements
  - `mcp_servers` - MCP server integration
  - `instructions` - Include file paths and patterns

## Proposed Solution

### Architecture Overview

```
agent-recipes/
├── configs/                          # NEW: Configuration templates
│   ├── claude-code/
│   │   ├── settings.template.json    # Template with merge markers
│   │   └── settings.schema.json      # Validation schema
│   ├── codex/
│   │   ├── config.template.toml      # Template with merge markers
│   │   └── config.schema.toml        # Validation schema
│   └── opencode/
│       ├── opencode.template.json    # Template with merge markers
│       └── opencode.schema.json      # Validation schema
├── cli/
│   └── lib/
│       ├── config-merger.ts          # NEW: Smart config merging logic
│       └── installer.ts              # MODIFIED: Add config sync
```

### Approach 1: Managed Sections (Recommended)

Similar to how we handle instructions with `<stashaway-recipes-managed-section>`, use special markers in JSON/TOML configs.

**Claude Code Example** (`~/.claude/settings.json`):

```json
{
  "permissions": {
    "allow": [
      "// STASHAWAY_MANAGED_START: allowed-commands",
      "Bash(npm run:*)",
      "Bash(deno task:*)",
      "Bash(git status:*)",
      "// STASHAWAY_MANAGED_END: allowed-commands",
      "Read(/my/custom/path/**)"
    ],
    "deny": [
      "// STASHAWAY_MANAGED_START: denied-commands",
      "Bash(rm -rf:*)",
      "Bash(sudo:*)",
      "Read(.env*)",
      "Read(secrets/**)",
      "// STASHAWAY_MANAGED_END: denied-commands"
    ]
  },
  "env": {
    "// STASHAWAY_MANAGED_START: env-vars": "",
    "NODE_ENV": "development",
    "// STASHAWAY_MANAGED_END: env-vars": "",
    "MY_CUSTOM_VAR": "my-value"
  }
}
```

**Pros**:

- Clear separation of managed vs user settings
- Easy to understand what's controlled by team
- Safe merging - only updates managed sections
- Works with any JSON structure

**Cons**:

- Comments in JSON require JSONC support
- Slightly verbose
- Need to preserve comment markers

### Approach 2: Separate Managed Files

Create separate files for managed vs user configs, then merge at runtime.

**File Structure**:

```
~/.claude/
├── settings.json              # User's personal settings
├── settings.managed.json      # Team-managed (synced by agent-recipes)
└── settings.merged.json       # Runtime merged result
```

**Pros**:

- Clean separation
- No comment marker requirements
- Easy to see what's team-managed vs personal
- Claude Code could read merged file

**Cons**:

- Requires Claude Code to support reading from merged file
- More complex file management
- May not be supported by all providers

### Approach 3: Deep Merge with Override Keys

Smart deep merge that understands specific override behavior per key.

**Merge Strategy Config** (`configs/claude-code/merge-strategy.json`):

```json
{
  "permissions.allow": "union", // Combine arrays (union)
  "permissions.deny": "union", // Combine arrays (union)
  "permissions.ask": "union", // Combine arrays (union)
  "env": "merge", // Deep merge objects
  "hooks": "user-first", // User overrides managed
  "enabledMcpjsonServers": "union", // Combine arrays (union)
  "model": "user-first", // User preference wins
  "sandbox": "merge" // Deep merge objects
}
```

**Merge Behaviors**:

- `union`: Combine arrays, remove duplicates
- `merge`: Deep merge objects
- `user-first`: User value wins if exists
- `managed-first`: Managed value wins if exists
- `replace`: Replace entirely

**Pros**:

- Most flexible
- Clean config files (no markers)
- Precise control over merge behavior
- Works with all formats

**Cons**:

- More complex implementation
- Requires maintaining merge strategy
- User may not understand merge behavior

## Recommended Approach: Three-Way Deep Merge with Generic Format Support

Use **deep merge** for all configuration merging, but address the key removal problem with **three-way merge** tracking. Implement using a
**format-agnostic architecture** for maximum extensibility.

### The Key Removal Problem

Simple deep merge cannot handle deletions from managed config:

**Scenario**:

1. Managed config v1: `{"permissions": {"allow": ["Bash(curl:*)", "Bash(git:*)"]}}`
2. User merges and adds personal command: `{"permissions": {"allow": ["Bash(curl:*)", "Bash(git:*)", "Read(/my/path/**)"]}}`
3. Team removes curl from managed config v2: `{"permissions": {"allow": ["Bash(git:*)"]}}`
4. Simple deep merge keeps: `{"permissions": {"allow": ["Bash(curl:*)", "Bash(git:*)", "Read(/my/path/**)"]}}` ❌
5. But we want: `{"permissions": {"allow": ["Bash(git:*)", "Read(/my/path/**)"]}}` ✅

**The Issue**: Deep merge doesn't know that `Bash(curl:*)` was removed intentionally vs user wanting to keep it.

### Solution: Three-Way Merge with Metadata Tracking

Track what was previously installed from managed config, enabling three-way merge:

1. **Base**: Previous managed config that was installed
2. **Ours**: Current user config (includes user additions)
3. **Theirs**: New managed config (team updates)
4. **Result**: Merged config that respects both user additions and team removals

**Metadata File** (`~/.stashaway-agent-recipes/state.json`):

```json
{
  "claude": {
    "lastSyncedManaged": {
      "version": "481e457",
      "timestamp": "2025-11-08T12:00:00Z",
      "config": {
        "permissions": {
          "allow": ["Bash(curl:*)", "Bash(git:*)"]
        }
      }
    }
  }
}
```

### Merge Algorithm

For each key path (e.g., `permissions.allow`):

1. **Additions**: `new_managed - base_managed` → Add to result
2. **Deletions**: `base_managed - new_managed` → Remove from user config
3. **User Custom**: `user - base_managed` → Keep in result
4. **Result**: `(new_managed + user_custom) - deletions`

**Example**:

```typescript
// Base (previously installed)
base = ["Bash(curl:*)", "Bash(git:*)"]

// User config (current state)
user = ["Bash(curl:*)", "Bash(git:*)", "Read(/my/path/**)"]

// New managed (team update)
newManaged = ["Bash(git:*)", "Bash(npm:*)"]

// Calculate
additions = newManaged - base = ["Bash(npm:*)"]
deletions = base - newManaged = ["Bash(curl:*)"]
userCustom = user - base = ["Read(/my/path/**)"]

// Result
result = (newManaged + userCustom) - deletions
result = (["Bash(git:*)", "Bash(npm:*)"] + ["Read(/my/path/**)"]) - ["Bash(curl:*)"]
result = ["Bash(git:*)", "Bash(npm:*)", "Read(/my/path/**)"]
```

### Merge Strategy Per Key

Different keys need different merge behaviors:

```json
{
  "permissions.allow": "array-union", // Set union (no duplicates)
  "permissions.deny": "array-union", // Set union (no duplicates)
  "permissions.ask": "array-union", // Set union (no duplicates)
  "env": "object-merge", // Deep merge objects, user-first for conflicts
  "hooks": "object-merge", // Deep merge objects, user-first for conflicts
  "enabledMcpjsonServers": "array-union", // Set union (no duplicates)
  "model": "user-first", // User preference always wins
  "sandbox.enabled": "managed-first" // Team policy wins (security)
}
```

**Merge Modes**:

- `array-union`: Three-way merge for arrays (supports additions/deletions)
- `object-merge`: Deep merge objects with user-first for conflicts
- `user-first`: User value always wins
- `managed-first`: Managed value always wins (security policies)
- `replace`: Complete replacement (rarely used)

### Generic Format Architecture

The config merger is **format-agnostic** through a parser/merger separation:

**Benefits**:

1. **Extensibility**: Add new formats (INI, XML, custom) without changing merge logic
2. **Maintainability**: Merge logic is in one place, works for all formats
3. **Testability**: Test merge logic independently of format parsing
4. **Future-proof**: Support new AI tools regardless of their config format
5. **Simplicity**: `ConfigMerger` works with plain JavaScript objects only

**How it works**:

```typescript
// 1. Parse configs (format-specific)
const userConfig = await JsonParser.parse(userJsonContent)
const managedConfig = await TomlParser.parse(managedTomlContent)

// 2. Merge (format-agnostic)
const merged = await ConfigMerger.threeWayMerge(base, userConfig, managedConfig, strategy)

// 3. Serialize back (format-specific)
const result = await JsonParser.stringify(merged)
```

**Architecture Diagram**:

```
┌─────────────────────────────────────────────────────────────┐
│                      Installer                               │
│  (orchestrates parsing, merging, serialization)             │
└────────┬────────────────────────────────────────┬───────────┘
         │                                         │
         v                                         v
┌────────────────────┐                  ┌───────────────────────┐
│  ConfigParser      │                  │   ConfigMerger        │
│  (format-specific) │                  │   (format-agnostic)   │
├────────────────────┤                  ├───────────────────────┤
│ - JsonParser       │───parse()───>    │ - threeWayMerge()     │
│ - TomlParser       │                  │ - mergeArrays()       │
│ - YamlParser       │                  │ - mergeObjects()      │
│ - [Your Parser]    │<──stringify()──  │ - calculateChanges()  │
└────────────────────┘                  └───────────────────────┘
         │                                         │
         │                                         v
         │                              Works with plain objects
         v                              (no format knowledge)
Format auto-detection
via file extension
```

**Adding a new format**:

```typescript
// 1. Implement ConfigParser interface
class IniParser implements ConfigParser {
  async parse(content: string) {/* ... */}
  async stringify(obj: Record<string, unknown>) {/* ... */}
  getExtension() {
    return '.ini'
  }
  getFormatName() {
    return 'INI'
  }
}

// 2. Register parser
ConfigParserFactory.registerParser('.ini', new IniParser())

// 3. Done! Merge logic works automatically
```

### Implementation Plan

#### Phase 1: Core Infrastructure

**1.1 Create Config Templates**

Add managed config templates for each provider (clean JSON/TOML, no markers):

```json
// configs/claude-code/managed.json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(deno task:*)",
      "Bash(yarn:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(sudo:*)",
      "Bash(curl:*)",
      "Read(.env*)",
      "Read(secrets/**)",
      "Read(**/credentials*)"
    ]
  },
  "enabledMcpjsonServers": [
    "stashaway-tools",
    "filesystem",
    "gitlab"
  ]
}
```

**1.2 Implement Format Parsers (Generic Architecture)**

Create `cli/lib/config-format.ts`:

```typescript
/**
 * Generic interface for config file parsers
 * Allows supporting multiple formats (JSON, YAML, TOML, etc.)
 */
export interface ConfigParser {
  /**
   * Parse config file content to object
   */
  parse(content: string): Promise<Record<string, unknown>>

  /**
   * Serialize object to config file content
   * Should preserve formatting/style when possible
   */
  stringify(obj: Record<string, unknown>): Promise<string>

  /**
   * Get file extension for this format
   */
  getExtension(): string

  /**
   * Get format name
   */
  getFormatName(): string
}

/**
 * JSON parser
 */
export class JsonParser implements ConfigParser {
  async parse(content: string): Promise<Record<string, unknown>> {
    return JSON.parse(content)
  }

  async stringify(obj: Record<string, unknown>): Promise<string> {
    return JSON.stringify(obj, null, 2)
  }

  getExtension(): string {
    return '.json'
  }

  getFormatName(): string {
    return 'JSON'
  }
}

/**
 * TOML parser
 */
export class TomlParser implements ConfigParser {
  async parse(content: string): Promise<Record<string, unknown>> {
    // Use @std/toml or similar TOML parser
    const { parse } = await import('@std/toml')
    return parse(content) as Record<string, unknown>
  }

  async stringify(obj: Record<string, unknown>): Promise<string> {
    // Use TOML stringifier
    const { stringify } = await import('@std/toml')
    return stringify(obj)
  }

  getExtension(): string {
    return '.toml'
  }

  getFormatName(): string {
    return 'TOML'
  }
}

/**
 * YAML parser (for future use)
 */
export class YamlParser implements ConfigParser {
  async parse(content: string): Promise<Record<string, unknown>> {
    const { parse } = await import('@std/yaml')
    return parse(content) as Record<string, unknown>
  }

  async stringify(obj: Record<string, unknown>): Promise<string> {
    const { stringify } = await import('@std/yaml')
    return stringify(obj)
  }

  getExtension(): string {
    return '.yaml'
  }

  getFormatName(): string {
    return 'YAML'
  }
}

/**
 * Factory to get parser for a given file
 */
export class ConfigParserFactory {
  private static parsers: Map<string, ConfigParser> = new Map([
    ['.json', new JsonParser()],
    ['.toml', new TomlParser()],
    ['.yaml', new YamlParser()],
    ['.yml', new YamlParser()],
  ])

  static getParser(filePath: string): ConfigParser {
    const ext = filePath.substring(filePath.lastIndexOf('.'))
    const parser = this.parsers.get(ext)
    if (!parser) {
      throw new Error(`Unsupported config format: ${ext}`)
    }
    return parser
  }

  static registerParser(extension: string, parser: ConfigParser): void {
    this.parsers.set(extension, parser)
  }
}
```

**1.3 Implement ConfigMerger with Three-Way Merge (Format-Agnostic)**

Create `cli/lib/config-merger.ts`:

```typescript
export interface MergeStrategy {
  [key: string]: 'array-union' | 'object-merge' | 'user-first' | 'managed-first' | 'replace'
}

export interface MergeState {
  version: string
  timestamp: string
  config: Record<string, unknown>
}

export interface ConfigChange {
  type: 'add' | 'remove' | 'modify'
  keyPath: string
  description: string
  oldValue?: unknown
  newValue?: unknown
}

/**
 * Format-agnostic config merger using three-way merge
 * Works with any config format (JSON, TOML, YAML, etc.)
 */
export class ConfigMerger {
  /**
   * Three-way merge that tracks deletions
   * Works with plain objects - format parsing handled separately
   *
   * @param base - Previously installed managed config
   * @param user - Current user config (may have user additions)
   * @param managed - New managed config to merge
   * @param strategy - Merge strategy per key path
   */
  async threeWayMerge(
    base: Record<string, unknown> | null,
    user: Record<string, unknown>,
    managed: Record<string, unknown>,
    strategy: MergeStrategy,
  ): Promise<Record<string, unknown>> {
    return this.mergeObjects(base, user, managed, strategy, '')
  }

  /**
   * Calculate what changes will be made (for preview)
   */
  calculateChanges(
    base: Record<string, unknown> | null,
    user: Record<string, unknown>,
    managed: Record<string, unknown>,
    strategy: MergeStrategy,
  ): ConfigChange[] {
    const changes: ConfigChange[] = []
    this.collectChanges(base, user, managed, strategy, '', changes)
    return changes
  }

  /**
   * Merge arrays using three-way merge (supports deletions)
   */
  private mergeArrays(
    base: unknown[] | null,
    user: unknown[],
    managed: unknown[],
  ): unknown[] {
    if (!base) {
      // First time: simple union
      return [...new Set([...managed, ...user])]
    }

    // Three-way merge
    const baseSet = new Set(base.map((item) => this.normalizeForComparison(item)))
    const userSet = new Set(user.map((item) => this.normalizeForComparison(item)))
    const managedSet = new Set(managed.map((item) => this.normalizeForComparison(item)))

    // Calculate additions and deletions
    const additions = managed.filter((item) => !baseSet.has(this.normalizeForComparison(item)))
    const deletions = new Set(
      base.filter((item) => !managedSet.has(this.normalizeForComparison(item)))
        .map((item) => this.normalizeForComparison(item)),
    )
    const userCustom = user.filter((item) => !baseSet.has(this.normalizeForComparison(item)))

    // Result = managed + user custom - deletions
    const result = [
      ...managed,
      ...userCustom.filter((item) => !deletions.has(this.normalizeForComparison(item))),
    ]

    // Deduplicate
    return Array.from(new Set(result.map((item) => this.normalizeForComparison(item))))
      .map((normalized) => result.find((item) => this.normalizeForComparison(item) === normalized)!)
  }

  /**
   * Deep merge objects with conflict resolution
   */
  private mergeObjects(
    base: Record<string, unknown> | null,
    user: Record<string, unknown>,
    managed: Record<string, unknown>,
    strategy: MergeStrategy,
    keyPath: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    // Get all keys from all sources
    const allKeys = new Set([
      ...Object.keys(managed),
      ...Object.keys(user),
      ...(base ? Object.keys(base) : []),
    ])

    for (const key of allKeys) {
      const currentPath = keyPath ? `${keyPath}.${key}` : key
      const mergeMode = this.getMergeMode(currentPath, strategy)

      const baseValue = base?.[key]
      const userValue = user[key]
      const managedValue = managed[key]

      // Handle different merge modes
      if (mergeMode === 'user-first' && userValue !== undefined) {
        result[key] = userValue
      } else if (mergeMode === 'managed-first' && managedValue !== undefined) {
        result[key] = managedValue
      } else if (mergeMode === 'replace' && managedValue !== undefined) {
        result[key] = managedValue
      } else if (mergeMode === 'array-union') {
        if (Array.isArray(managedValue) || Array.isArray(userValue)) {
          result[key] = this.mergeArrays(
            Array.isArray(baseValue) ? baseValue : null,
            Array.isArray(userValue) ? userValue : [],
            Array.isArray(managedValue) ? managedValue : [],
          )
        }
      } else if (mergeMode === 'object-merge') {
        if (this.isObject(managedValue) || this.isObject(userValue)) {
          result[key] = this.mergeObjects(
            this.isObject(baseValue) ? baseValue : null,
            this.isObject(userValue) ? userValue : {},
            this.isObject(managedValue) ? managedValue : {},
            strategy,
            currentPath,
          )
        }
      } else {
        // Default: user-first for conflicts, merge for additions
        if (managedValue !== undefined && userValue === undefined) {
          result[key] = managedValue
        } else if (userValue !== undefined) {
          result[key] = userValue
        }
      }
    }

    return result
  }

  /**
   * Collect changes for preview
   */
  private collectChanges(
    base: Record<string, unknown> | null,
    user: Record<string, unknown>,
    managed: Record<string, unknown>,
    strategy: MergeStrategy,
    keyPath: string,
    changes: ConfigChange[],
  ): void {
    // Implementation to detect and describe changes
    // This is used for preview before applying
    // ... (detailed implementation)
  }

  /**
   * Get merge mode for a specific key path
   */
  private getMergeMode(keyPath: string, strategy: MergeStrategy): string {
    // Exact match
    if (strategy[keyPath]) return strategy[keyPath]

    // Wildcard match (e.g., "permissions.*")
    const wildcardKey = Object.keys(strategy).find((key) => {
      if (key.includes('*')) {
        const regex = new RegExp('^' + key.replace(/\*/g, '.*') + '$')
        return regex.test(keyPath)
      }
      return false
    })

    return wildcardKey ? strategy[wildcardKey] : 'user-first'
  }

  /**
   * Normalize value for comparison (handles object key order)
   */
  private normalizeForComparison(value: unknown): string {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(this.sortObjectKeys(value))
    }
    return JSON.stringify(value)
  }

  /**
   * Sort object keys recursively for consistent comparison
   */
  private sortObjectKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item))
    }
    if (typeof obj === 'object' && obj !== null) {
      const sorted: Record<string, unknown> = {}
      Object.keys(obj).sort().forEach((key) => {
        sorted[key] = this.sortObjectKeys((obj as Record<string, unknown>)[key])
      })
      return sorted
    }
    return obj
  }

  /**
   * Check if value is a plain object
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
```

**1.4 Implement State Manager**

Create `cli/lib/state-manager.ts`:

```typescript
export interface StateFile {
  [provider: string]: {
    lastSyncedManaged?: MergeState
  }
}

export class StateManager {
  private statePath: string

  constructor(installDir: string) {
    this.statePath = join(installDir, 'state.json')
  }

  /**
   * Load state file
   */
  async loadState(): Promise<StateFile>

  /**
   * Save state file
   */
  async saveState(state: StateFile): Promise<void>

  /**
   * Get last synced managed config for provider
   */
  async getLastSynced(provider: string): Promise<MergeState | null>

  /**
   * Update last synced managed config for provider
   */
  async updateLastSynced(
    provider: string,
    version: string,
    config: Record<string, unknown>,
  ): Promise<void>
}
```

**1.5 Update Installer (Format-Agnostic)**

Modify `cli/lib/installer.ts` to add config syncing methods using generic parsers:

```typescript
import { ConfigParserFactory } from './config-format.ts'
import { ConfigMerger } from './config-merger.ts'
import { StateManager } from './state-manager.ts'

export class Installer {
  // ... existing methods

  /**
   * Check if there are config changes to apply
   */
  async hasConfigChanges(tools: string[]): Promise<boolean> {
    const stateManager = new StateManager(this.installDir)
    const repoRoot = await this.resolveRepositoryRoot()
    if (!repoRoot) return false

    for (const tool of tools) {
      const managedPath = this.getManagedConfigPath(repoRoot, tool)
      if (!managedPath || !await exists(managedPath)) continue

      const lastSynced = await stateManager.getLastSynced(tool)
      const parser = ConfigParserFactory.getParser(managedPath)
      const currentManagedContent = await Deno.readTextFile(managedPath)
      const currentManaged = await parser.parse(currentManagedContent)
      const lastManagedStr = JSON.stringify(lastSynced?.config || {})

      if (JSON.stringify(currentManaged) !== lastManagedStr) {
        return true
      }
    }
    return false
  }

  /**
   * Preview config changes without applying
   */
  async previewConfigChanges(tools: string[]): Promise<void> {
    const stateManager = new StateManager(this.installDir)
    const configMerger = new ConfigMerger()
    const repoRoot = await this.resolveRepositoryRoot()
    if (!repoRoot) return

    console.log('  📄 Configuration changes detected:\n')

    for (const tool of tools) {
      const managedPath = this.getManagedConfigPath(repoRoot, tool)
      const strategyPath = join(repoRoot, 'configs', tool, 'merge-strategy.json')

      if (!managedPath || !await exists(managedPath)) continue

      // Get parser for user config format
      const userConfigPath = this.getUserConfigPath(tool)
      const userParser = ConfigParserFactory.getParser(userConfigPath)
      const managedParser = ConfigParserFactory.getParser(managedPath)

      // Read and parse configs
      const userContent = await Deno.readTextFile(userConfigPath)
      const userConfig = await userParser.parse(userContent)

      const managedContent = await Deno.readTextFile(managedPath)
      const newManaged = await managedParser.parse(managedContent)

      const strategyContent = await Deno.readTextFile(strategyPath)
      const strategy = JSON.parse(strategyContent)

      const lastSynced = await stateManager.getLastSynced(tool)
      const baseManaged = lastSynced?.config || null

      // Calculate changes
      const changes = configMerger.calculateChanges(baseManaged, userConfig, newManaged, strategy)

      if (changes.length > 0) {
        console.log(`  ${this.getToolDisplayName(tool)} (${userConfigPath}):`)
        for (const change of changes) {
          console.log(`    ${change.type === 'add' ? '+' : '-'} ${change.description}`)
        }
        console.log()
      }
    }
  }

  /**
   * Sync configs for all tools (format-agnostic)
   */
  async syncConfigs(tools: string[], config: InstallConfig): Promise<void> {
    const stateManager = new StateManager(this.installDir)
    const configMerger = new ConfigMerger()
    const repoRoot = await this.resolveRepositoryRoot()
    if (!repoRoot) return

    for (const tool of tools) {
      const managedPath = this.getManagedConfigPath(repoRoot, tool)
      const strategyPath = join(repoRoot, 'configs', tool, 'merge-strategy.json')

      if (!managedPath || !await exists(managedPath)) continue

      const userConfigPath = this.getUserConfigPath(tool)

      // Get parsers based on file extensions
      const userParser = ConfigParserFactory.getParser(userConfigPath)
      const managedParser = ConfigParserFactory.getParser(managedPath)

      // Read and parse user config
      const userContent = await Deno.readTextFile(userConfigPath)
      const userConfig = await userParser.parse(userContent)

      // Read and parse managed config
      const managedContent = await Deno.readTextFile(managedPath)
      const newManaged = await managedParser.parse(managedContent)

      // Read merge strategy (always JSON)
      const strategyContent = await Deno.readTextFile(strategyPath)
      const strategy = JSON.parse(strategyContent)

      // Get previously synced managed config (base for three-way merge)
      const lastSynced = await stateManager.getLastSynced(tool)
      const baseManaged = lastSynced?.config || null

      // Three-way merge (format-agnostic - works with plain objects)
      const merged = await configMerger.threeWayMerge(
        baseManaged,
        userConfig,
        newManaged,
        strategy,
      )

      // Backup user config
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = `${userConfigPath}.backup-${timestamp}`
      await Deno.writeTextFile(backupPath, userContent)

      console.log(`    ✓ Backed up to ${backupPath}`)

      // Serialize merged config back to original format
      const mergedContent = await userParser.stringify(merged)

      // Write merged config
      await Deno.writeTextFile(userConfigPath, mergedContent)

      // Update state with new managed config
      const currentVersion = await this.getCurrentGitVersion()
      await stateManager.updateLastSynced(tool, currentVersion, newManaged)
    }
  }

  /**
   * Get path to managed config file in repo
   * Automatically detects format (json, toml, yaml)
   */
  private getManagedConfigPath(repoRoot: string, tool: string): string | null {
    const configDir = join(repoRoot, 'configs', tool)
    const extensions = ['.json', '.toml', '.yaml', '.yml']

    for (const ext of extensions) {
      const path = join(configDir, `managed${ext}`)
      if (existsSync(path)) {
        return path
      }
    }
    return null
  }

  /**
   * Get path to user config file
   */
  private getUserConfigPath(tool: string): string {
    const home = Deno.env.get('HOME')!
    switch (tool) {
      case 'claude':
        return `${home}/.claude/settings.json`
      case 'codex':
        return `${home}/.codex/config.toml`
      case 'opencode':
        return `${home}/.config/opencode/opencode.json`
      default:
        throw new Error(`Unknown tool: ${tool}`)
    }
  }

  private getToolDisplayName(tool: string): string {
    switch (tool) {
      case 'claude':
        return 'Claude Code'
      case 'codex':
        return 'Codex'
      case 'opencode':
        return 'OpenCode'
      default:
        return tool
    }
  }
}
```

#### Phase 2: Provider-Specific Implementation

**2.1 Claude Code**

Files:

- `configs/claude-code/managed.json` - Team-managed config
- `configs/claude-code/merge-strategy.json` - Merge rules per key
- `configs/claude-code/README.md` - Documentation

Focus areas:

- Security permissions (deny dangerous commands: `rm -rf`, `sudo`, `curl`)
- Standard tool allowlist (npm, git, deno, yarn)
- Common MCP servers (stashaway-tools, filesystem, gitlab)
- Recommended hooks for pre/post operations

**2.2 Codex**

Files:

- `configs/codex/managed.toml` - Team-managed config
- `configs/codex/merge-strategy.json` - Merge rules per key
- `configs/codex/README.md` - Documentation

Focus areas:

- Default model settings
- Sandbox level recommendations
- Feature flags for team
- Standard profiles

**2.3 OpenCode**

Files:

- `configs/opencode/managed.json` - Team-managed config
- `configs/opencode/merge-strategy.json` - Merge rules per key
- `configs/opencode/README.md` - Documentation

Focus areas:

- Model provider setup
- Tool permissions
- MCP server configuration
- Standard formatters

#### Phase 3: Integration with Sync Command

Integrate config syncing into the existing `agent-recipes sync` command (no new commands):

**Sync Workflow**:

```bash
$ agent-recipes sync

🔄 Reinstalling latest recipes...
✓ Already on latest version (481e457)

📥 Refreshing repository files...
✓ Repository refreshed

📝 Syncing instructions...
  ✓ Claude Code instructions synced
  ✓ Synced 3 skills

🔧 Syncing configurations...

  📄 Configuration changes detected:

  Claude Code (~/.claude/settings.json):
    Permissions (allow):
      + Bash(npm run:*)
      + Bash(deno task:*)

    Permissions (deny):
      + Read(.env*)
      + Read(secrets/**)

    MCP Servers:
      + stashaway-tools

    ✓ Backed up to ~/.claude/settings.json.backup-20251108-133000

  Apply these changes? [Y/n]: y
  ✓ Configuration synced

✅ Sync complete!
```

**Behavior**:

- Config sync happens automatically during regular `sync` command
- Shows preview of changes before applying
- Requires user confirmation (default: yes)
- Can skip with `--skip-configs` flag: `agent-recipes sync --skip-configs`
- Can auto-approve with `--yes` flag: `agent-recipes sync --yes`

**Implementation in sync command** (`cli/commands/sync.ts`):

```typescript
export const syncCommand = new Command()
  .description('Install/update/sync agent recipes and configurations')
  .option('--skip-configs', 'Skip configuration syncing')
  .option('--yes, -y', 'Auto-approve all changes without prompting')
  .action(async (options) => {
    const installer = new Installer()

    // ... existing sync logic for instructions/skills ...

    // Config sync (if not skipped)
    if (!options.skipConfigs) {
      console.log('\n🔧 Syncing configurations...\n')

      const hasChanges = await installer.hasConfigChanges(config.installedTools)

      if (hasChanges) {
        // Show preview
        await installer.previewConfigChanges(config.installedTools)

        // Confirm (unless --yes)
        const shouldApply = options.yes || await Confirm.prompt({
          message: 'Apply these changes?',
          default: true,
        })

        if (shouldApply) {
          await installer.syncConfigs(config.installedTools, config)
          console.log('  ✓ Configuration synced')
        } else {
          console.log('  ⊘ Configuration sync skipped')
        }
      } else {
        console.log('  ✓ Configurations already up to date')
      }
    }

    console.log('\n✅ Sync complete!')
  })
```

#### Phase 4: Documentation & Safety

**4.1 Safety Features**

- Always backup user config before merging: `~/.claude/settings.json.backup-{timestamp}`
- Dry-run mode by default, require `--apply` flag
- Validation against provider schemas
- Rollback command if merge causes issues

**4.2 Documentation**

- Update README with config sync documentation
- Add CONFIGS.md explaining merge behavior
- Document each managed template with comments
- Add examples to CONTRIBUTING.md

## Three-Way Merge Examples

### Example 1: Array Union with Deletion (permissions.allow)

```typescript
// Base (last synced managed config)
base = {
  "permissions": {
    "allow": ["Bash(npm:*)", "Bash(curl:*)"]
  }
}

// User config (current state - user added custom command)
user = {
  "permissions": {
    "allow": ["Bash(npm:*)", "Bash(curl:*)", "Read(/my/path/**)"]
  }
}

// New managed (team removed curl, added git)
managed = {
  "permissions": {
    "allow": ["Bash(npm:*)", "Bash(git status:*)"]
  }
}

// Three-way merge calculation
additions = managed - base = ["Bash(git status:*)"]
deletions = base - managed = ["Bash(curl:*)"]
userCustom = user - base = ["Read(/my/path/**)"]

// Result = (managed + userCustom) - deletions
result = {
  "permissions": {
    "allow": [
      "Bash(npm:*)",          // From managed (kept)
      "Bash(git status:*)",   // From managed (added)
      "Read(/my/path/**)"     // User custom (preserved)
      // "Bash(curl:*)" removed (was in base, removed from managed)
    ]
  }
}
```

### Example 2: Object Merge (env)

```typescript
// Base
base = {
  'env': {
    'TEAM_VAR': 'old-value',
  },
}

// User config (user added MY_VAR, modified TEAM_VAR)
user = {
  'env': {
    'TEAM_VAR': 'my-override',
    'MY_VAR': 'my-value',
  },
}

// New managed (team updated TEAM_VAR, added NODE_ENV)
managed = {
  'env': {
    'TEAM_VAR': 'new-value',
    'NODE_ENV': 'development',
  },
}

// Result (user-first for conflicts)
result = {
  'env': {
    'TEAM_VAR': 'my-override', // User override preserved
    'MY_VAR': 'my-value', // User addition preserved
    'NODE_ENV': 'development', // Managed addition applied
  },
}
```

### Example 3: MCP Servers with Mixed Changes

```typescript
// Base
base = {
  'enabledMcpjsonServers': ['old-tool', 'filesystem'],
}

// User config (user added personal tool)
user = {
  'enabledMcpjsonServers': ['old-tool', 'filesystem', 'my-personal-server'],
}

// New managed (team removed old-tool, added gitlab)
managed = {
  'enabledMcpjsonServers': ['filesystem', 'gitlab', 'stashaway-tools'],
}

// Three-way merge
additions = ['gitlab', 'stashaway-tools']
deletions = ['old-tool']
userCustom = ['my-personal-server']

// Result
result = {
  'enabledMcpjsonServers': [
    'filesystem', // From managed (kept)
    'gitlab', // From managed (added)
    'stashaway-tools', // From managed (added)
    'my-personal-server', // User custom (preserved)
    // "old-tool" removed
  ],
}
```

### Example 4: First Time Sync (No Base)

```typescript
// Base (null - first sync)
base = null

// User config (existing user setup)
user = {
  'permissions': {
    'allow': ['Read(/my/path/**)'],
  },
}

// New managed (team config)
managed = {
  'permissions': {
    'allow': ['Bash(npm:*)', 'Bash(git status:*)'],
  },
}

// When base is null, simple union merge
result = {
  'permissions': {
    'allow': [
      'Bash(npm:*)', // From managed
      'Bash(git status:*)', // From managed
      'Read(/my/path/**)', // From user (preserved)
    ],
  },
}
```

## User Experience

### First-Time Sync (No Previous Config)

```bash
$ agent-recipes sync

🔄 Reinstalling latest recipes...
✓ Already on latest version (481e457)

📥 Refreshing repository files...
✓ Repository refreshed

📝 Syncing instructions...
  ✓ Claude Code instructions synced
  ✓ Synced 3 skills

🔧 Syncing configurations...

  📄 Configuration changes detected:

  Claude Code (~/.claude/settings.json):
    Permissions (allow):
      + Bash(npm run:*)
      + Bash(deno task:*)
      + Bash(git status:*)

    Permissions (deny):
      + Bash(rm -rf:*)
      + Bash(sudo:*)
      + Read(.env*)

    MCP Servers:
      + stashaway-tools
      + filesystem

    ✓ Backed up to ~/.claude/settings.json.backup-2025-11-08T13-30-00

  Apply these changes? [Y/n]: y
  ✓ Configuration synced

✅ Sync complete!
```

### Subsequent Syncs (With Changes)

When team updates configs:

```bash
$ agent-recipes sync

📦 New version available!
   Current: 481e457
   Latest:  abc1234

📄 Changelog diff:
  - Added gitlab MCP server to recommended list
  - Updated allowed git commands

📥 Updating to latest version...
✓ Repository updated

📝 Syncing instructions...
  ✓ Already up to date

🔧 Syncing configurations...

  📄 Configuration changes detected:

  Claude Code (~/.claude/settings.json):
    MCP Servers:
      + gitlab

    Permissions (allow):
      + Bash(git push:*)

    Permissions (deny):
      - Bash(curl:*)  (removed from team config)

    ✓ Backed up to ~/.claude/settings.json.backup-2025-11-08T14-00-00

  Apply these changes? [Y/n]: y
  ✓ Configuration synced

✅ Sync complete!
```

### No Config Changes

```bash
$ agent-recipes sync

🔄 Reinstalling latest recipes...
✓ Already on latest version (481e457)

📝 Syncing instructions...
  ✓ Already up to date

🔧 Syncing configurations...
  ✓ Configurations already up to date

✅ Sync complete!
```

### Skipping Config Sync

```bash
$ agent-recipes sync --skip-configs

🔄 Reinstalling latest recipes...
✓ Already on latest version (481e457)

📝 Syncing instructions...
  ✓ Already up to date

✅ Sync complete!
```

### Auto-Approve All Changes

```bash
$ agent-recipes sync --yes

🔄 Reinstalling latest recipes...
✓ Already on latest version (481e457)

📝 Syncing instructions...
  ✓ Already up to date

🔧 Syncing configurations...

  📄 Configuration changes detected:

  Claude Code (~/.claude/settings.json):
    MCP Servers:
      + gitlab

    ✓ Backed up to ~/.claude/settings.json.backup-2025-11-08T14-15-00
  ✓ Configuration synced (auto-approved)

✅ Sync complete!
```

## Migration Path

### v0.2.0: Default with Confirmation (Recommended)

- Config sync integrated into `agent-recipes sync` command
- Always shows preview before applying
- Requires user confirmation (default: yes)
- Users can opt-out with `--skip-configs` flag
- Users can auto-approve with `--yes` flag

**Rationale**: Since this is the first version, requiring confirmation builds trust. Users can see exactly what will change before it happens.

### v0.3.0: Smart Defaults (Future)

- Auto-approve "safe" changes without confirmation:
  - Adding allowed commands
  - Adding MCP servers
  - Adding environment variables
- Require confirmation for "restrictive" changes:
  - Adding deny rules
  - Removing allowed commands
  - Modifying security settings
- Support `AGENT_RECIPES_AUTO_APPROVE=safe` env var

### v0.4.0: Organization Policies (Future)

- Support for organization-level policies
- `managed-first` strategy for critical security keys
- Centralized policy server
- Compliance auditing

## Security Considerations

**1. Permission Defaults**

Managed configs should be secure by default:

- Deny dangerous commands: `rm -rf`, `sudo`, `curl`
- Deny access to secrets: `.env`, `secrets/**`, `credentials`
- Only allow vetted tools and commands

**2. Transparency**

Always show users what's changing:

- Diff preview before applying
- Backup original configs
- Easy rollback mechanism

**3. Override Protection**

Critical security settings should be team-enforced:

- Option for "managed-first" merge strategy
- Enterprise policies override user settings
- Audit logging for config changes

## Future Enhancements

### v0.2.0 - MVP

- Basic JSON merging for Claude Code
- Managed section markers
- Backup and rollback
- Preview command

### v0.3.0 - Multi-Provider

- TOML support for Codex
- OpenCode JSON support
- Unified merge strategies
- Config validation

### v0.4.0 - Advanced Features

- Organization policies
- Config inheritance
- Conditional configs (by project, role)
- Web UI for config management

### v0.5.0 - Enterprise

- Centralized policy server
- Compliance auditing
- Role-based config distribution
- Encrypted sensitive values

## Open Questions

1. **State Storage Location**: Where to store `state.json`?
   - **Option A** (Recommended): `~/.stashaway-agent-recipes/state.json` (alongside config.json)
   - **Option B**: Inside each provider dir (e.g., `~/.claude/stashaway-state.json`)
   - **Recommendation**: Option A for centralized state management

2. **Array Comparison**: How to determine array item equality?
   - **Simple**: String equality for primitives
   - **Complex**: Deep object equality for objects
   - **Edge case**: What if array contains objects with different key orders?
   - **Recommendation**: JSON.stringify() for comparison, but normalize key order first

3. **Conflict Detection**: When to flag conflicts requiring user intervention?
   - User modified a value that managed config also changed differently
   - **Option A**: Always apply managed change (managed-first)
   - **Option B**: Always keep user change (user-first)
   - **Option C**: Prompt user to choose (interactive)
   - **Recommendation**: Use merge strategy per key (default: user-first for most keys, managed-first for security)

4. **Schema Validation**: Should we enforce provider schemas?
   - **Yes**, but with warnings not errors
   - Validate before writing
   - Allow override with `--skip-validation` flag
   - **Recommendation**: Validate and warn, don't block

5. **Rollback Window**: How long to keep backups?
   - **Option A**: Keep last 5 backups per provider
   - **Option B**: Keep backups for 30 days
   - **Option C**: Configurable via config
   - **Recommendation**: Keep last 5 backups + manual cleanup command

6. **TOML Formatting**: How to preserve TOML formatting/comments?
   - **Challenge**: Most TOML parsers don't preserve comments
   - **Option A**: Use comment-preserving TOML parser (if exists)
   - **Option B**: Accept that formatting will be normalized
   - **Option C**: Store original file + apply diffs (complex)
   - **Recommendation**: Option B for MVP, explore Option A if user feedback requests it

7. **Partial Sync**: Should users be able to sync only specific keys?
   - **Use case**: "Only sync MCP servers, don't touch my permissions"
   - **Implementation**: `agent-recipes config sync --only permissions.allow`
   - **Recommendation**: Nice-to-have for v0.3.0, not MVP

8. **Dry Run**: Should dry-run be default or opt-in?
   - **Option A**: Always dry-run, require `--apply` (safer)
   - **Option B**: Apply by default, offer `--dry-run` (faster)
   - **Recommendation**: Option A for MVP to build trust, Option B after team is comfortable

## Success Metrics

- [ ] 80% of team uses synced configs within 1 month
- [ ] Zero incidents of user configs being accidentally wiped
- [ ] Less than 5 minutes to onboard new team member with full config
- [ ] Config drift reduced by 90% across team
- [ ] Positive feedback from early adopters

## Implementation Checklist

### Core (Required for v0.2.0)

- [ ] Create `configs/` directory structure
- [ ] **Format Parsers** (Generic Architecture):
  - [ ] Create `ConfigParser` interface
  - [ ] Implement `JsonParser` class
  - [ ] Implement `TomlParser` class (using @std/toml)
  - [ ] Implement `YamlParser` class (using @std/yaml) - optional for MVP
  - [ ] Create `ConfigParserFactory` with format auto-detection
  - [ ] Add ability to register custom parsers
  - [ ] Test format preservation (formatting should stay consistent)
- [ ] **State Manager**:
  - [ ] Implement `StateManager` class for tracking last synced configs
  - [ ] Add `loadState()` and `saveState()` methods
  - [ ] Add `getLastSynced()` and `updateLastSynced()` methods
  - [ ] Store state in `~/.stashaway-agent-recipes/state.json`
- [ ] **Config Merger** (Format-Agnostic):
  - [ ] Implement `ConfigMerger` class with three-way merge
  - [ ] Implement `mergeArrays()` with set operations (additions, deletions, union)
  - [ ] Implement `mergeObjects()` with recursive deep merge
  - [ ] Implement `calculateChanges()` to generate diff for preview
  - [ ] Implement `normalizeForComparison()` for consistent comparison
  - [ ] Implement `sortObjectKeys()` to handle key order differences
  - [ ] Add merge strategy system per key path with wildcard support
  - [ ] Add conflict detection and resolution
- [ ] **Installer Integration**:
  - [ ] Add `getManagedConfigPath()` with auto-detection of format
  - [ ] Add `getUserConfigPath()` method
  - [ ] Add `Installer.hasConfigChanges()` method using parsers
  - [ ] Add `Installer.previewConfigChanges()` method using parsers
  - [ ] Add `Installer.syncConfigs()` method using parsers
  - [ ] Backup mechanism with timestamps (preserve original format)
  - [ ] Serialize merged config back to original format
- [ ] **Sync Command Integration**:
  - [ ] Update `sync` command to integrate config syncing
  - [ ] Add `--skip-configs` flag to sync command
  - [ ] Add `--yes` flag to sync command for auto-approval
  - [ ] Add user confirmation prompt with preview

### Claude Code (Priority 1)

- [ ] Create `configs/claude-code/managed.json`
- [ ] Create `configs/claude-code/merge-strategy.json`
- [ ] Document merge behavior in README
- [ ] Define security defaults (deny dangerous commands)
- [ ] Define standard allowlist (npm, deno, git, yarn)
- [ ] Define recommended MCP servers
- [ ] Test three-way merge with various scenarios
- [ ] Test first-time sync (no base)
- [ ] Test with empty user config
- [ ] Add validation against Claude settings schema

### Documentation

- [ ] Update README with config sync
- [ ] Create CONFIGS.md guide
- [ ] Add examples to CONTRIBUTING
- [ ] Update CHANGELOG

### Testing

- [ ] Unit tests for StateManager (load/save state)
- [ ] Unit tests for ConfigMerger.threeWayMerge()
- [ ] Unit tests for ConfigMerger.mergeArrays() (additions, deletions, user custom)
- [ ] Unit tests for ConfigMerger.mergeObjects() (deep merge, conflicts)
- [ ] Test first-time sync (null base)
- [ ] Test subsequent syncs (with base)
- [ ] Test deletions are properly removed
- [ ] Test user additions are preserved
- [ ] Test conflicts resolved per strategy
- [ ] Integration tests for full sync workflow
- [ ] Test backup/restore mechanism
- [ ] Test edge cases:
  - Empty user config
  - Empty managed config
  - Invalid JSON
  - Missing keys
  - Type mismatches (array vs object)
  - Circular references
- [ ] Manual testing with real Claude Code configs
- [ ] Test rollback scenarios

### Codex & OpenCode (Phase 2)

- [ ] Implement TOML parser with three-way merge support
- [ ] Implement TOML serializer (preserve formatting)
- [ ] Create `configs/codex/managed.toml`
- [ ] Create `configs/codex/merge-strategy.json`
- [ ] Test TOML three-way merge
- [ ] Create `configs/opencode/managed.json`
- [ ] Create `configs/opencode/merge-strategy.json`
- [ ] Test JSONC support (comments preservation)
- [ ] Cross-provider testing (sync all three simultaneously)
- [ ] Performance testing with large configs

## Timeline Estimate

- **Week 1**: Core infrastructure
  - StateManager implementation
  - ConfigMerger with three-way merge algorithm
  - Array/object merge helpers
  - Unit tests

- **Week 2**: Claude Code implementation
  - Create managed.json template
  - Create merge-strategy.json
  - Integration with sync command
  - Testing with real configs

- **Week 3**: CLI commands + UI
  - config preview command
  - config sync command
  - config diff command
  - Backup/restore functionality
  - User confirmations and previews

- **Week 4**: Documentation + Beta testing
  - CONFIGS.md guide
  - Update README
  - Beta testing with 2-3 team members
  - Gather feedback, fix issues

- **Week 5**: Codex support
  - TOML parser/serializer
  - Codex managed.toml
  - Testing

- **Week 6**: OpenCode support
  - JSONC support
  - OpenCode managed.json
  - Cross-provider testing

- **Week 7**: Polish + Release
  - Performance optimization
  - Edge case fixes
  - Final documentation
  - Release v0.2.0

**Total**: ~7 weeks for full multi-provider support, ~4 weeks for Claude Code only MVP.

## Risks & Mitigation

| Risk                               | Impact | Probability | Mitigation                                 |
| ---------------------------------- | ------ | ----------- | ------------------------------------------ |
| Corrupt user config                | High   | Medium      | Always backup, validate before write       |
| Merge conflicts                    | Medium | High        | Clear preview, manual resolution UI        |
| Provider schema changes            | Medium | Medium      | Version templates, validate against schema |
| User resistance to managed configs | Low    | Medium      | Make opt-in, show clear value              |
| Performance with large configs     | Low    | Low         | Optimize merge algorithm, async processing |

## Conclusion

Configuration merging will significantly improve team consistency and onboarding while respecting user customization. The **three-way deep merge**
approach solves the key removal problem by tracking what was previously synced, enabling proper detection of:

- Team additions (new managed config items)
- Team deletions (removed managed config items)
- User customizations (personal additions)

This approach provides the best balance of:

- **Safety**: User customizations are preserved
- **Correctness**: Team deletions are properly removed
- **Flexibility**: Merge strategies per key allow fine-grained control
- **Transparency**: Full diff preview before applying changes

**Recommendation**:

1. Start with Claude Code only (v0.2.0 MVP) - ~4 weeks
2. Validate with 2-3 team members
3. Gather feedback and iterate
4. Expand to Codex and OpenCode (v0.3.0) - +3 weeks
5. Consider advanced features (partial sync, interactive conflict resolution) based on user feedback

**Success Criteria**:

- Zero incidents of user configs being corrupted
- User additions preserved across syncs
- Team policy changes (additions/deletions) applied correctly
- Positive team feedback on ease of use

## Summary

**Key Innovations**:

1. **Three-way merge with state tracking** solves the deletion problem that simple deep merge cannot handle
2. **Generic format architecture** allows supporting any config format (JSON, TOML, YAML, etc.) without changing merge logic

**Files**:

```
agent-recipes/
├── configs/
│   ├── claude-code/
│   │   ├── managed.json          # Team-managed config (JSON format)
│   │   └── merge-strategy.json   # Merge rules
│   ├── codex/
│   │   ├── managed.toml          # Team-managed config (TOML format)
│   │   └── merge-strategy.json
│   └── opencode/
│       ├── managed.json          # Team-managed config (JSON format)
│       └── merge-strategy.json
├── cli/lib/
│   ├── config-format.ts          # Generic format parsers (JSON/TOML/YAML)
│   │                             #   - ConfigParser interface
│   │                             #   - JsonParser, TomlParser, YamlParser
│   │                             #   - ConfigParserFactory
│   ├── config-merger.ts          # Format-agnostic three-way merge
│   │                             #   - Works with plain objects
│   │                             #   - No format-specific logic
│   ├── state-manager.ts          # Track last synced state
│   └── installer.ts              # Integration (uses parsers)
└── ~/.stashaway-agent-recipes/
    ├── config.json               # Agent-recipes config
    └── state.json                # Last synced configs per provider
```

**Merge Algorithm**:

```typescript
// For each key with array-union strategy
additions = newManaged - baseManaged
deletions = baseManaged - newManaged
userCustom = userConfig - baseManaged
result = (newManaged + userCustom) - deletions
```

**Scope**: Global configurations only (not project-level configs)

**Commands**: No new commands - integrated directly into existing `agent-recipes sync`
