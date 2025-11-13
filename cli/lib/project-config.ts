/**
 * Project Configuration Schema and Validation
 *
 * Defines the configuration format for project-level agent recipes.
 * This allows teams to commit AI agent configurations to their repositories.
 */

import { exists } from '@std/fs'
import { join } from '@std/path'
import { parse as parseJsonc } from '@std/jsonc'

export interface ProjectSkillsConfig {
  /**
   * Skill names to include (without sa- prefix)
   * e.g., ["commit-message", "branch-name"]
   */
  include?: string[]

  /**
   * Skill patterns to exclude (supports wildcards)
   * e.g., ["document-skills-*"]
   */
  exclude?: string[]
}

export interface ProjectAgentsConfig {
  /**
   * Source for agents: "local" = .agent-recipes/agents, "inherit" = user-level agents
   */
  source: 'local' | 'inherit'

  /**
   * Agent names to include (without .md extension)
   */
  include?: string[]
}

export interface ProjectCommandsConfig {
  /**
   * Source for commands: "local" = .agent-recipes/commands, "inherit" = user-level commands
   */
  source: 'local' | 'inherit'

  /**
   * Command names to include (without .md extension)
   */
  include?: string[]
}

export interface ProviderOverride {
  /**
   * Model override for this provider
   */
  model?: string

  /**
   * Additional skills specific to this provider
   */
  additionalSkills?: string[]

  /**
   * Custom config overrides
   */
  config?: Record<string, unknown>
}

export interface ProjectSyncConfig {
  /**
   * Automatically sync when repo is cloned/pulled
   */
  autoSync?: boolean

  /**
   * Commit generated files to repository
   */
  commitToRepo?: boolean
}

export interface ProjectConfig {
  /**
   * Config version for future migrations
   */
  version: string

  /**
   * Enabled providers (e.g., ["claude", "opencode", "codex"])
   */
  providers: string[]

  /**
   * Skills configuration
   */
  skills?: ProjectSkillsConfig

  /**
   * Agents configuration
   */
  agents?: ProjectAgentsConfig

  /**
   * Commands configuration
   */
  commands?: ProjectCommandsConfig

  /**
   * Provider-specific overrides
   */
  providerOverrides?: Record<string, ProviderOverride>

  /**
   * Sync behavior configuration
   */
  sync?: ProjectSyncConfig
}

/**
 * Default project configuration
 */
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  version: '1.0',
  providers: ['claude'],
  skills: {
    include: ['commit-message', 'branch-name'],
    exclude: ['document-skills-*'],
  },
  agents: {
    source: 'local',
    include: [],
  },
  commands: {
    source: 'local',
    include: [],
  },
  sync: {
    autoSync: true,
    commitToRepo: true,
  },
}

/**
 * Default skills to exclude (large documentation skills)
 */
export const DEFAULT_EXCLUDED_SKILLS = [
  'document-skills-docx',
  'document-skills-pptx',
  'document-skills-pdf',
  'document-skills-xlsx',
  'skill-sandbox',
]

/**
 * Project configuration manager
 */
export class ProjectConfigManager {
  private projectRoot: string
  private configPath: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
    this.configPath = join(projectRoot, '.agent-recipes', 'config.json')
  }

  /**
   * Check if project has agent recipes configuration
   */
  async exists(): Promise<boolean> {
    return await exists(this.configPath)
  }

  /**
   * Load project configuration
   */
  async load(): Promise<ProjectConfig> {
    if (!await this.exists()) {
      throw new Error(`Project configuration not found at ${this.configPath}`)
    }

    try {
      const content = await Deno.readTextFile(this.configPath)
      const config = parseJsonc(content) as unknown as ProjectConfig

      // Validate configuration
      this.validate(config)

      return config
    } catch (error) {
      throw new Error(`Failed to load project configuration: ${(error as Error).message}`)
    }
  }

  /**
   * Save project configuration
   */
  async save(config: ProjectConfig): Promise<void> {
    try {
      // Ensure .agent-recipes directory exists
      const agentRecipesDir = join(this.projectRoot, '.agent-recipes')
      await Deno.mkdir(agentRecipesDir, { recursive: true })

      // Write configuration
      const content = JSON.stringify(config, null, 2) + '\n'
      await Deno.writeTextFile(this.configPath, content)
    } catch (error) {
      throw new Error(`Failed to save project configuration: ${(error as Error).message}`)
    }
  }

  /**
   * Validate project configuration
   */
  validate(config: ProjectConfig): void {
    const errors: string[] = []

    // Check required fields
    if (!config.version) {
      errors.push('Missing required field: version')
    }

    if (!config.providers || !Array.isArray(config.providers) || config.providers.length === 0) {
      errors.push('Missing or empty required field: providers')
    }

    // Validate provider names
    const validProviders = ['claude', 'codex', 'opencode', 'cursor']
    for (const provider of config.providers || []) {
      if (!validProviders.includes(provider)) {
        errors.push(`Invalid provider: ${provider}. Must be one of: ${validProviders.join(', ')}`)
      }
    }

    // Validate agents source
    if (config.agents && config.agents.source && !['local', 'inherit'].includes(config.agents.source)) {
      errors.push(`Invalid agents.source: ${config.agents.source}. Must be "local" or "inherit"`)
    }

    // Validate commands source
    if (config.commands && config.commands.source && !['local', 'inherit'].includes(config.commands.source)) {
      errors.push(`Invalid commands.source: ${config.commands.source}. Must be "local" or "inherit"`)
    }

    if (errors.length > 0) {
      throw new Error(`Invalid project configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}`)
    }
  }

  /**
   * Get project root directory
   */
  getProjectRoot(): string {
    return this.projectRoot
  }

  /**
   * Get .agent-recipes directory path
   */
  getAgentRecipesDir(): string {
    return join(this.projectRoot, '.agent-recipes')
  }

  /**
   * Get provider-specific directory
   */
  getProviderDir(provider: string): string {
    return join(this.getAgentRecipesDir(), 'providers', provider)
  }

  /**
   * Get project skills directory
   */
  getSkillsDir(): string {
    return join(this.getAgentRecipesDir(), 'skills')
  }

  /**
   * Get project agents directory
   */
  getAgentsDir(): string {
    return join(this.getAgentRecipesDir(), 'agents')
  }

  /**
   * Get project commands directory
   */
  getCommandsDir(): string {
    return join(this.getAgentRecipesDir(), 'commands')
  }

  /**
   * Check if a skill matches exclude patterns
   */
  isSkillExcluded(skillName: string, excludePatterns: string[]): boolean {
    for (const pattern of excludePatterns) {
      if (pattern.includes('*')) {
        // Wildcard pattern matching
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        if (regex.test(skillName)) {
          return true
        }
      } else if (skillName === pattern) {
        // Exact match
        return true
      }
    }
    return false
  }

  /**
   * Filter skills based on include/exclude configuration
   */
  filterSkills(availableSkills: string[], config: ProjectSkillsConfig): string[] {
    const includeList = config.include || []
    const excludePatterns = config.exclude || DEFAULT_EXCLUDED_SKILLS

    // If include list is specified, start with only those skills
    let filtered = includeList.length > 0 ? includeList.filter((s) => availableSkills.includes(s)) : [...availableSkills]

    // Apply exclude patterns
    filtered = filtered.filter((skill) => !this.isSkillExcluded(skill, excludePatterns))

    return filtered
  }
}
