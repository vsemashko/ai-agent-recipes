/**
 * Project Installer
 *
 * Handles installation and syncing of agent recipes at the project level.
 * Syncs configurations to .agent-recipes/ directory in project root.
 */

import { exists } from '@std/fs'
import { basename, dirname, join } from '@std/path'
import { Eta } from 'eta'
import { batchConvertSkills } from './converter.ts'
import { parseFrontmatter, processContentForPlatform, reconstructMarkdown } from './agents-commands-converter.ts'
import { PLATFORM_CONFIGS } from './platform-config.ts'
import { DEFAULT_EXCLUDED_SKILLS, ProjectConfig, ProjectConfigManager } from './project-config.ts'
import { StateManager } from './state-manager.ts'

interface ProjectInstallerOptions {
  verbose?: boolean
  repoPath?: string // Path to agent-recipes repository
}

interface SkillInfo {
  name: string // Without sa- prefix
  dirName: string // With sa- prefix
  path: string // Full path to skill directory
}

interface ProjectSyncSummary {
  providers: string[]
  skillsCount: number
  agentsCount: number
  commandsCount: number
  filesCreated: number
  filesUpdated: number
}

export class ProjectInstaller {
  private projectRoot: string
  private configManager: ProjectConfigManager
  private repoPath: string
  private eta: Eta
  private verbose: boolean
  private stateManager: StateManager

  constructor(projectRoot: string, options: ProjectInstallerOptions = {}) {
    this.projectRoot = projectRoot
    this.configManager = new ProjectConfigManager(projectRoot)
    this.verbose = Boolean(options.verbose)

    // Determine repository path
    if (options.repoPath) {
      this.repoPath = options.repoPath
    } else {
      // Try to find repository
      const homeDir = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || ''
      const defaultInstallDir = join(homeDir, '.stashaway-agent-recipes')
      this.repoPath = Deno.env.get('AGENT_RECIPES_HOME') || defaultInstallDir
    }

    // Initialize Eta templating engine
    this.eta = new Eta({
      cache: true,
      autoEscape: false,
    })

    // Initialize state manager for project
    const agentRecipesDir = this.configManager.getAgentRecipesDir()
    this.stateManager = new StateManager(agentRecipesDir)
  }

  /**
   * Initialize a new project configuration
   */
  async init(providers: string[], skillsInclude?: string[]): Promise<void> {
    this.logVerbose('🔧 Initializing project-level agent recipes...')

    // Check if already initialized
    if (await this.configManager.exists()) {
      throw new Error('Project already initialized. Use "agent-recipes project sync" to update.')
    }

    // Create default configuration
    const config: ProjectConfig = {
      version: '1.0',
      providers,
      skills: {
        include: skillsInclude || ['commit-message', 'branch-name'],
        exclude: DEFAULT_EXCLUDED_SKILLS,
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

    // Save configuration
    await this.configManager.save(config)

    // Create directory structure
    await this.createDirectoryStructure()

    // Create empty directories for agents and commands
    await Deno.mkdir(this.configManager.getAgentsDir(), { recursive: true })
    await Deno.mkdir(this.configManager.getCommandsDir(), { recursive: true })

    this.logVerbose(`✅ Project initialized at ${this.configManager.getAgentRecipesDir()}`)
    this.logVerbose('📝 Configuration saved to .agent-recipes/config.json')
    this.logVerbose('\n💡 Next steps:')
    this.logVerbose('  1. Customize .agent-recipes/config.json')
    this.logVerbose('  2. Run "agent-recipes project sync" to sync configurations')
    this.logVerbose('  3. Commit .agent-recipes/ to your repository')
  }

  /**
   * Sync project configurations
   */
  async sync(): Promise<ProjectSyncSummary> {
    this.logVerbose('🔄 Syncing project-level agent recipes...\n')

    // Load project configuration
    const config = await this.configManager.load()

    // Load state
    await this.stateManager.load()

    const summary: ProjectSyncSummary = {
      providers: config.providers,
      skillsCount: 0,
      agentsCount: 0,
      commandsCount: 0,
      filesCreated: 0,
      filesUpdated: 0,
    }

    // Get available skills from repository
    const availableSkills = await this.getAvailableSkills()

    // Filter skills based on configuration
    const skillsToSync = this.configManager.filterSkills(
      availableSkills.map((s) => s.name),
      config.skills || { exclude: DEFAULT_EXCLUDED_SKILLS },
    )

    // Sync for each provider
    for (const provider of config.providers) {
      this.logVerbose(`📦 Syncing for ${provider}...`)

      const platformConfig = PLATFORM_CONFIGS[provider]
      if (!platformConfig) {
        console.warn(`⚠  Unknown provider: ${provider}, skipping`)
        continue
      }

      // Create provider directory
      const providerDir = this.configManager.getProviderDir(provider)
      await Deno.mkdir(providerDir, { recursive: true })

      // Sync skills
      const skillsUpdated = await this.syncSkills(
        skillsToSync,
        availableSkills,
        provider,
      )
      summary.skillsCount += skillsUpdated

      // Sync agents
      const agentsUpdated = await this.syncAgents(config, provider)
      summary.agentsCount += agentsUpdated

      // Sync commands
      const commandsUpdated = await this.syncCommands(config, provider)
      summary.commandsCount += commandsUpdated

      // Render provider-specific instructions
      const instructionsUpdated = await this.renderInstructions(config, provider, skillsToSync)
      if (instructionsUpdated) {
        summary.filesUpdated++
      }

      this.logVerbose(`  ✓ ${provider} synced\n`)
    }

    // Save state
    await this.stateManager.save()

    return summary
  }

  /**
   * List available skills in repository
   */
  async listAvailableSkills(): Promise<SkillInfo[]> {
    return await this.getAvailableSkills()
  }

  /**
   * Add a skill to project configuration
   */
  async addSkill(skillName: string): Promise<void> {
    const config = await this.configManager.load()

    // Ensure skills.include exists
    if (!config.skills) {
      config.skills = { include: [], exclude: DEFAULT_EXCLUDED_SKILLS }
    }
    if (!config.skills.include) {
      config.skills.include = []
    }

    // Check if already included
    if (config.skills.include.includes(skillName)) {
      throw new Error(`Skill "${skillName}" is already included in project`)
    }

    // Add skill
    config.skills.include.push(skillName)

    // Save configuration
    await this.configManager.save(config)

    this.logVerbose(`✅ Added skill "${skillName}" to project configuration`)
    this.logVerbose('💡 Run "agent-recipes project sync" to apply changes')
  }

  /**
   * Remove a skill from project configuration
   */
  async removeSkill(skillName: string): Promise<void> {
    const config = await this.configManager.load()

    if (!config.skills?.include) {
      throw new Error('No skills configured in project')
    }

    // Check if skill is included
    const index = config.skills.include.indexOf(skillName)
    if (index === -1) {
      throw new Error(`Skill "${skillName}" is not included in project`)
    }

    // Remove skill
    config.skills.include.splice(index, 1)

    // Save configuration
    await this.configManager.save(config)

    this.logVerbose(`✅ Removed skill "${skillName}" from project configuration`)
    this.logVerbose('💡 Run "agent-recipes project sync" to apply changes')
  }

  /**
   * Validate project configuration
   */
  async validate(): Promise<void> {
    const config = await this.configManager.load()
    this.configManager.validate(config)
    this.logVerbose('✅ Project configuration is valid')
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private async createDirectoryStructure(): Promise<void> {
    const agentRecipesDir = this.configManager.getAgentRecipesDir()

    // Create main directories
    await Deno.mkdir(join(agentRecipesDir, 'skills'), { recursive: true })
    await Deno.mkdir(join(agentRecipesDir, 'agents'), { recursive: true })
    await Deno.mkdir(join(agentRecipesDir, 'commands'), { recursive: true })
    await Deno.mkdir(join(agentRecipesDir, 'providers'), { recursive: true })
  }

  private async getAvailableSkills(): Promise<SkillInfo[]> {
    const skillsDir = join(this.repoPath, 'repo', 'skills')
    const skills: SkillInfo[] = []

    try {
      for await (const entry of Deno.readDir(skillsDir)) {
        if (entry.isDirectory && entry.name.startsWith('sa-')) {
          const name = entry.name.substring(3) // Remove 'sa-' prefix
          skills.push({
            name,
            dirName: entry.name,
            path: join(skillsDir, entry.name),
          })
        }
      }
    } catch (error) {
      throw new Error(`Failed to read skills directory: ${(error as Error).message}`)
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name))
  }

  private async syncSkills(
    skillNames: string[],
    availableSkills: SkillInfo[],
    provider: string,
  ): Promise<number> {
    const providerDir = this.configManager.getProviderDir(provider)
    const skillsTargetDir = join(providerDir, 'skills')
    await Deno.mkdir(skillsTargetDir, { recursive: true })

    let syncedCount = 0

    for (const skillName of skillNames) {
      const skillInfo = availableSkills.find((s) => s.name === skillName)
      if (!skillInfo) {
        console.warn(`⚠  Skill "${skillName}" not found in repository, skipping`)
        continue
      }

      // Copy skill directory
      const targetDir = join(skillsTargetDir, skillInfo.dirName)

      // Check if skill directory exists in source
      if (!await exists(skillInfo.path)) {
        console.warn(`⚠  Skill directory not found: ${skillInfo.path}, skipping`)
        continue
      }

      // Copy skill files recursively
      await this.copyDirectory(skillInfo.path, targetDir)
      syncedCount++
    }

    this.logVerbose(`  ✓ Synced ${syncedCount} skills`)
    return syncedCount
  }

  private async syncAgents(config: ProjectConfig, provider: string): Promise<number> {
    const platformConfig = PLATFORM_CONFIGS[provider]
    if (!platformConfig.agentsDir) {
      return 0 // Provider doesn't support agents
    }

    const agentsSource = config.agents?.source || 'local'
    const sourceDir = agentsSource === 'local'
      ? this.configManager.getAgentsDir()
      : join(this.repoPath, 'repo', 'agents')

    const targetDir = join(this.configManager.getProviderDir(provider), 'agents')
    await Deno.mkdir(targetDir, { recursive: true })

    // Get agent files to sync
    const agentFiles: string[] = []
    try {
      for await (const entry of Deno.readDir(sourceDir)) {
        if (entry.isFile && entry.name.endsWith('.md')) {
          agentFiles.push(entry.name)
        }
      }
    } catch {
      // Directory doesn't exist or no agents
      return 0
    }

    // Filter by include list if specified
    const includeList = config.agents?.include || []
    const filesToSync = includeList.length > 0
      ? agentFiles.filter((f) => includeList.includes(f.replace('.md', '')))
      : agentFiles

    // Sync each agent file
    for (const filename of filesToSync) {
      const sourcePath = join(sourceDir, filename)
      const targetPath = join(targetDir, filename)

      // Process agent file for platform
      const processed = await this.processAgentFile(sourcePath, provider)
      await Deno.writeTextFile(targetPath, processed)
    }

    this.logVerbose(`  ✓ Synced ${filesToSync.length} agents`)
    return filesToSync.length
  }

  private async syncCommands(config: ProjectConfig, provider: string): Promise<number> {
    const platformConfig = PLATFORM_CONFIGS[provider]
    if (!platformConfig.commandsDir) {
      return 0 // Provider doesn't support commands
    }

    const commandsSource = config.commands?.source || 'local'
    const sourceDir = commandsSource === 'local'
      ? this.configManager.getCommandsDir()
      : join(this.repoPath, 'repo', 'commands')

    const targetDir = join(this.configManager.getProviderDir(provider), platformConfig.commandsDir)
    await Deno.mkdir(targetDir, { recursive: true })

    // Get command files to sync
    const commandFiles: string[] = []
    try {
      for await (const entry of Deno.readDir(sourceDir)) {
        if (entry.isFile && entry.name.endsWith('.md')) {
          commandFiles.push(entry.name)
        }
      }
    } catch {
      // Directory doesn't exist or no commands
      return 0
    }

    // Filter by include list if specified
    const includeList = config.commands?.include || []
    const filesToSync = includeList.length > 0
      ? commandFiles.filter((f) => includeList.includes(f.replace('.md', '')))
      : commandFiles

    // Sync each command file
    for (const filename of filesToSync) {
      const sourcePath = join(sourceDir, filename)
      const targetPath = join(targetDir, filename)

      // Process command file for platform
      const processed = await this.processCommandFile(sourcePath, provider)
      await Deno.writeTextFile(targetPath, processed)
    }

    this.logVerbose(`  ✓ Synced ${filesToSync.length} commands`)
    return filesToSync.length
  }

  private async processAgentFile(filePath: string, provider: string): Promise<string> {
    const content = await Deno.readTextFile(filePath)
    const parsed = parseFrontmatter(content)

    if (!parsed) {
      return content
    }

    const config = PLATFORM_CONFIGS[provider]
    const processed = processContentForPlatform(parsed, provider, config?.toolsFormat)

    return reconstructMarkdown(processed.frontmatter, processed.body)
  }

  private async processCommandFile(filePath: string, provider: string): Promise<string> {
    const content = await Deno.readTextFile(filePath)
    const parsed = parseFrontmatter(content)

    if (!parsed) {
      return content
    }

    const config = PLATFORM_CONFIGS[provider]
    const processed = processContentForPlatform(parsed, provider, config?.toolsFormat)

    return reconstructMarkdown(processed.frontmatter, processed.body)
  }

  private async renderInstructions(
    config: ProjectConfig,
    provider: string,
    skills: string[],
  ): Promise<boolean> {
    const templatePath = join(this.repoPath, 'repo', 'instructions', 'project', `${provider}.eta`)

    // Check if template exists
    if (!await exists(templatePath)) {
      this.logVerbose(`  ℹ No template for ${provider}, skipping instructions`)
      return false
    }

    // Load template
    const template = await Deno.readTextFile(templatePath)

    // Load global instructions
    const globalInstructionsPath = join(this.repoPath, 'repo', 'instructions', 'GLOBAL_INSTRUCTIONS.md')
    const globalInstructions = await exists(globalInstructionsPath)
      ? await Deno.readTextFile(globalInstructionsPath)
      : ''

    // Render skills list
    const skillsList = skills.join(', ')

    // Render template
    const rendered = this.eta.renderString(template, {
      agents: globalInstructions,
      skills: skillsList,
      skillsCount: skills.length,
      provider,
    })

    // Write to provider directory
    const targetPath = join(this.configManager.getProviderDir(provider), 'AGENTS.md')
    await Deno.writeTextFile(targetPath, rendered)

    this.logVerbose(`  ✓ Rendered instructions`)
    return true
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await Deno.mkdir(dest, { recursive: true })

    for await (const entry of Deno.readDir(src)) {
      const srcPath = join(src, entry.name)
      const destPath = join(dest, entry.name)

      if (entry.isDirectory) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        await Deno.copyFile(srcPath, destPath)
      }
    }
  }

  private logVerbose(message: string): void {
    if (this.verbose) {
      console.log(message)
    }
  }
}
