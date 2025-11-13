/**
 * Project Installer - Simplified
 *
 * Syncs agent recipes to project level using central configuration.
 * All projects get the same curated set of skills/agents/commands.
 */

import { exists } from '@std/fs'
import { join } from '@std/path'
import { Eta } from 'eta'
import { parseFrontmatter, processContentForPlatform, reconstructMarkdown } from './agents-commands-converter.ts'
import { PLATFORM_CONFIGS } from './platform-config.ts'
import { StateManager } from './state-manager.ts'

interface ProjectInstallerOptions {
  verbose?: boolean
  repoPath?: string // Path to agent-recipes repository
}

interface ProjectSyncConfig {
  skills: {
    include: string[]
    exclude: string[]
  }
  agents: {
    include: string[]
  }
  commands: {
    include: string[]
  }
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
}

export class ProjectInstaller {
  private projectRoot: string
  private repoPath: string
  private eta: Eta
  private verbose: boolean
  private stateManager: StateManager

  constructor(projectRoot: string, options: ProjectInstallerOptions = {}) {
    this.projectRoot = projectRoot
    this.verbose = Boolean(options.verbose)

    // Determine repository path
    if (options.repoPath) {
      this.repoPath = options.repoPath
    } else {
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
    const agentRecipesDir = join(this.projectRoot, '.agent-recipes')
    this.stateManager = new StateManager(agentRecipesDir)
  }

  /**
   * Sync project configurations using central config
   */
  async sync(providers?: string[]): Promise<ProjectSyncSummary> {
    this.logVerbose('🔄 Syncing project-level agent recipes...\n')

    // Load central project sync configuration
    const syncConfig = await this.loadCentralConfig()

    // Load state
    await this.stateManager.load()

    // Determine providers to sync
    const targetProviders = providers || Object.keys(PLATFORM_CONFIGS)

    const summary: ProjectSyncSummary = {
      providers: targetProviders,
      skillsCount: 0,
      agentsCount: 0,
      commandsCount: 0,
    }

    // Get available skills from repository
    const availableSkills = await this.getAvailableSkills()

    // Filter skills based on central configuration
    const skillsToSync = this.filterSkills(
      availableSkills.map((s) => s.name),
      syncConfig.skills,
    )

    // Create .agent-recipes directory structure
    await this.ensureDirectoryStructure()

    // Sync for each provider
    for (const provider of targetProviders) {
      const platformConfig = PLATFORM_CONFIGS[provider]
      if (!platformConfig) {
        console.warn(`⚠  Unknown provider: ${provider}, skipping`)
        continue
      }

      this.logVerbose(`📦 Syncing for ${platformConfig.name}...`)

      const providerDir = join(this.projectRoot, `.agent-recipes`, platformConfig.dir)
      await Deno.mkdir(providerDir, { recursive: true })

      // Sync skills
      const skillsUpdated = await this.syncSkills(
        skillsToSync,
        availableSkills,
        provider,
        providerDir,
      )
      summary.skillsCount += skillsUpdated

      // Sync agents
      const agentsUpdated = await this.syncAgents(
        syncConfig.agents.include,
        provider,
        providerDir,
      )
      summary.agentsCount += agentsUpdated

      // Sync commands
      const commandsUpdated = await this.syncCommands(
        syncConfig.commands.include,
        provider,
        providerDir,
      )
      summary.commandsCount += commandsUpdated

      // Render instructions (AGENTS.md and CLAUDE.md for Claude, AGENTS.md for others)
      await this.renderInstructions(
        provider,
        providerDir,
        skillsToSync,
      )

      this.logVerbose(`  ✓ ${platformConfig.name} synced\n`)
    }

    // Save state
    await this.stateManager.save()

    return summary
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private async loadCentralConfig(): Promise<ProjectSyncConfig> {
    const configPath = join(this.repoPath, 'repo', 'project-sync-config.json')

    try {
      const content = await Deno.readTextFile(configPath)
      return JSON.parse(content) as ProjectSyncConfig
    } catch (error) {
      throw new Error(`Failed to load central project sync config: ${(error as Error).message}`)
    }
  }

  private async ensureDirectoryStructure(): Promise<void> {
    const agentRecipesDir = join(this.projectRoot, '.agent-recipes')
    await Deno.mkdir(agentRecipesDir, { recursive: true })
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

  private filterSkills(
    availableSkills: string[],
    config: { include: string[]; exclude: string[] },
  ): string[] {
    const { include, exclude } = config

    // Start with include list (or all skills if empty)
    let filtered = include.length > 0
      ? include.filter((s) => availableSkills.includes(s))
      : [...availableSkills]

    // Apply exclude patterns
    filtered = filtered.filter((skill) => !this.isSkillExcluded(skill, exclude))

    return filtered
  }

  private isSkillExcluded(skillName: string, excludePatterns: string[]): boolean {
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

  private async syncSkills(
    skillNames: string[],
    availableSkills: SkillInfo[],
    provider: string,
    providerDir: string,
  ): Promise<number> {
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

  private async syncAgents(
    agentNames: string[],
    provider: string,
    providerDir: string,
  ): Promise<number> {
    const platformConfig = PLATFORM_CONFIGS[provider]
    if (!platformConfig.agentsDir) {
      return 0 // Provider doesn't support agents
    }

    const sourceDir = join(this.repoPath, 'repo', 'agents')
    const targetDir = join(providerDir, platformConfig.agentsDir)
    await Deno.mkdir(targetDir, { recursive: true })

    // Get agent files to sync
    const agentFiles: string[] = []
    try {
      for await (const entry of Deno.readDir(sourceDir)) {
        if (entry.isFile && entry.name.endsWith('.md')) {
          const agentName = entry.name.replace('.md', '')
          if (agentNames.length === 0 || agentNames.includes(agentName)) {
            agentFiles.push(entry.name)
          }
        }
      }
    } catch {
      // Directory doesn't exist or no agents
      return 0
    }

    // Sync each agent file
    for (const filename of agentFiles) {
      const sourcePath = join(sourceDir, filename)
      const targetPath = join(targetDir, filename)

      // Process agent file for platform
      const processed = await this.processAgentFile(sourcePath, provider)
      await Deno.writeTextFile(targetPath, processed)
    }

    this.logVerbose(`  ✓ Synced ${agentFiles.length} agents`)
    return agentFiles.length
  }

  private async syncCommands(
    commandNames: string[],
    provider: string,
    providerDir: string,
  ): Promise<number> {
    const platformConfig = PLATFORM_CONFIGS[provider]
    if (!platformConfig.commandsDir) {
      return 0 // Provider doesn't support commands
    }

    const sourceDir = join(this.repoPath, 'repo', 'commands')
    const targetDir = join(providerDir, platformConfig.commandsDir)
    await Deno.mkdir(targetDir, { recursive: true })

    // Get command files to sync
    const commandFiles: string[] = []
    try {
      for await (const entry of Deno.readDir(sourceDir)) {
        if (entry.isFile && entry.name.endsWith('.md')) {
          const commandName = entry.name.replace('.md', '')
          if (commandNames.length === 0 || commandNames.includes(commandName)) {
            commandFiles.push(entry.name)
          }
        }
      }
    } catch {
      // Directory doesn't exist or no commands
      return 0
    }

    // Sync each command file
    for (const filename of commandFiles) {
      const sourcePath = join(sourceDir, filename)
      const targetPath = join(targetDir, filename)

      // Process command file for platform
      const processed = await this.processCommandFile(sourcePath, provider)
      await Deno.writeTextFile(targetPath, processed)
    }

    this.logVerbose(`  ✓ Synced ${commandFiles.length} commands`)
    return commandFiles.length
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
    provider: string,
    providerDir: string,
    skills: string[],
  ): Promise<void> {
    // Load global instructions
    const globalInstructionsPath = join(this.repoPath, 'repo', 'instructions', 'GLOBAL_INSTRUCTIONS.md')
    const globalInstructions = await exists(globalInstructionsPath)
      ? await Deno.readTextFile(globalInstructionsPath)
      : ''

    // Render skills section
    const skillsSection = await this.renderSkillsSection(provider, skills)

    const context = {
      agents: globalInstructions,
      skillsSection,
      skills: skills.join(', '),
      skillsCount: skills.length,
      platform: provider,
    }

    // Render both AGENTS.md and CLAUDE.md templates
    const templates = ['AGENTS.md', 'CLAUDE.md']

    for (const templateName of templates) {
      const templatePath = join(this.repoPath, 'repo', 'instructions', 'project', `${templateName}.eta`)

      // Check if template exists
      if (!await exists(templatePath)) {
        continue
      }

      // Load and render template
      const template = await Deno.readTextFile(templatePath)
      const renderedContent = this.eta.renderString(template, context)

      // Write to provider directory
      const targetPath = join(providerDir, templateName)
      await Deno.writeTextFile(targetPath, renderedContent)
    }

    this.logVerbose(`  ✓ Rendered instructions`)
  }

  private async renderSkillsSection(provider: string, skills: string[]): Promise<string> {
    const skillsTemplatePath = join(this.repoPath, 'repo', 'instructions', 'common', 'skills.eta')

    if (!await exists(skillsTemplatePath)) {
      return ''
    }

    // Get skill information
    const skillsDir = join(this.repoPath, 'repo', 'skills')
    const skillsList: Array<{ name: string; description: string }> = []

    for (const skillName of skills) {
      const skillDir = join(skillsDir, `sa-${skillName}`)
      const skillFilePath = join(skillDir, 'SKILL.md')

      if (await exists(skillFilePath)) {
        try {
          const content = await Deno.readTextFile(skillFilePath)
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)

          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1]
            const descMatch = frontmatter.match(/description:\s*(.+)/)
            const description = descMatch ? descMatch[1].trim() : 'No description'

            skillsList.push({ name: skillName, description })
          }
        } catch {
          // Skip if can't read
        }
      }
    }

    // Render skills template
    const template = await Deno.readTextFile(skillsTemplatePath)
    return this.eta.renderString(template, { skills: skillsList })
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
