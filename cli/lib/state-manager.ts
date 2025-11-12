/**
 * State Manager
 *
 * Tracks last synced configuration state to enable three-way merge.
 * State is stored in ~/.stashaway-agent-recipes/state.json
 */

import { exists } from '@std/fs'
import { parse as parseJsonc } from '@std/jsonc'

export interface ConfigState {
  /**
   * Last synced config content for each tool
   * Key: tool name (e.g., "claude", "codex", "opencode")
   * Value: config file path -> last synced content
   */
  configs: Record<string, Record<string, Record<string, unknown>>>

  /**
   * Last synced agent filenames for each platform
   * Key: platform name (e.g., "claude", "codex", "opencode")
   * Value: array of agent filenames (e.g., ["code-reviewer.md", "test-agent.md"])
   */
  agents?: Record<string, string[]>

  /**
   * Last synced command filenames for each platform
   * Key: platform name (e.g., "claude", "codex", "opencode")
   * Value: array of command filenames (e.g., ["fix-issue.md", "test.md"])
   */
  commands?: Record<string, string[]>

  /**
   * Last installed recipes version (deno.json version)
   */
  recipesVersion?: string | null

  /**
   * Timestamp of last sync
   */
  lastSync: string

  /**
   * Version of state format (for future migrations)
   */
  version: string
}

/**
 * State Manager
 */
export class StateManager {
  private stateFilePath: string
  private state: ConfigState | null = null

  constructor(installDir: string) {
    this.stateFilePath = `${installDir}/state.json`
  }

  /**
   * Load state from disk
   */
  async load(): Promise<ConfigState> {
    if (this.state) {
      return this.state
    }

    try {
      if (await exists(this.stateFilePath)) {
        const content = await Deno.readTextFile(this.stateFilePath)
        this.state = parseJsonc(content) as unknown as ConfigState
        return this.state
      }
    } catch (error) {
      console.warn(`Failed to load state: ${(error as Error).message}. Using empty state.`)
    }

    // Return empty state if file doesn't exist or load failed
    this.state = {
      configs: {},
      agents: {},
      commands: {},
      recipesVersion: null,
      lastSync: new Date().toISOString(),
      version: '1.0',
    }
    return this.state
  }

  /**
   * Save state to disk
   */
  async save(): Promise<void> {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    try {
      this.state.lastSync = new Date().toISOString()
      const content = JSON.stringify(this.state, null, 2) + '\n'
      await Deno.writeTextFile(this.stateFilePath, content)
    } catch (error) {
      throw new Error(`Failed to save state: ${(error as Error).message}`)
    }
  }

  /**
   * Get last synced config for a tool and file path
   */
  getLastSyncedConfig(tool: string, configPath: string): Record<string, unknown> | null {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    return this.state.configs[tool]?.[configPath] ?? null
  }

  /**
   * Update last synced config for a tool and file path
   */
  setLastSyncedConfig(tool: string, configPath: string, config: Record<string, unknown>): void {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    if (!this.state.configs[tool]) {
      this.state.configs[tool] = {}
    }

    this.state.configs[tool][configPath] = config
  }

  /**
   * Remove last synced config for a tool and file path
   */
  removeLastSyncedConfig(tool: string, configPath: string): void {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    if (this.state.configs[tool]) {
      delete this.state.configs[tool][configPath]

      // Clean up empty tool entries
      if (Object.keys(this.state.configs[tool]).length === 0) {
        delete this.state.configs[tool]
      }
    }
  }

  /**
   * Get all tracked config paths for a tool
   */
  getTrackedConfigPaths(tool: string): string[] {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    return Object.keys(this.state.configs[tool] || {})
  }

  /**
   * Get last installed recipes version label
   */
  getRecipesVersion(): string | null {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    return this.state.recipesVersion ?? null
  }

  /**
   * Update stored recipes version label
   */
  setRecipesVersion(version: string | null): void {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    this.state.recipesVersion = version ?? null
  }

  /**
   * Check if any configs are tracked for a tool
   */
  hasTrackedConfigs(tool: string): boolean {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    return !!this.state.configs[tool] && Object.keys(this.state.configs[tool]).length > 0
  }

  /**
   * Clear all state (useful for testing or reset)
   */
  clear(): void {
    this.state = {
      configs: {},
      agents: {},
      commands: {},
      recipesVersion: null,
      lastSync: new Date().toISOString(),
      version: '1.0',
    }
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTime(): string | null {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    return this.state.lastSync
  }

  // ============================================================================
  // Agents Management
  // ============================================================================

  /**
   * Get all tracked agent filenames for a platform
   */
  getTrackedAgents(platform: string): string[] {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    return this.state.agents?.[platform] ?? []
  }

  /**
   * Set tracked agent filenames for a platform
   */
  setTrackedAgents(platform: string, filenames: string[]): void {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    if (!this.state.agents) {
      this.state.agents = {}
    }

    this.state.agents[platform] = filenames
  }

  /**
   * Check if any agents are tracked for a platform
   */
  hasTrackedAgents(platform: string): boolean {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    return (this.state.agents?.[platform]?.length ?? 0) > 0
  }

  // ============================================================================
  // Commands Management
  // ============================================================================

  /**
   * Get all tracked command filenames for a platform
   */
  getTrackedCommands(platform: string): string[] {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    return this.state.commands?.[platform] ?? []
  }

  /**
   * Set tracked command filenames for a platform
   */
  setTrackedCommands(platform: string, filenames: string[]): void {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    if (!this.state.commands) {
      this.state.commands = {}
    }

    this.state.commands[platform] = filenames
  }

  /**
   * Check if any commands are tracked for a platform
   */
  hasTrackedCommands(platform: string): boolean {
    if (!this.state) {
      throw new Error('State not loaded. Call load() first.')
    }

    return (this.state.commands?.[platform]?.length ?? 0) > 0
  }
}
