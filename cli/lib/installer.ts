import { exists } from '@std/fs'
import { dirname, join } from '@std/path'
import { Confirm } from '@cliffy/prompt'
import { Eta } from 'eta'
import { batchConvertSkills } from './converter.ts'

interface SyncSkillsOptions {
  pathReplacements?: Record<string, string>
}

export interface InstallConfig {
  version: string
  installedTools: string[]
  lastUpdateCheck: string
  installPath: string
  customPaths?: Record<string, string>
}

interface PlatformConfig {
  name: string
  dir: string
  outputFile: string // Output filename (e.g., 'CLAUDE.md', 'AGENTS.md')
  skillsFormat?: 'agent-md' // If set, convert & embed skills in main file with this format
  pathReplacements?: Record<string, string>
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  'claude': {
    name: 'Claude Code',
    dir: '.claude',
    outputFile: 'CLAUDE.md',
    // No skillsFormat = skills copied as-is to separate directory (no conversion, no embedding)
  },

  'codex': {
    name: 'Codex',
    dir: '.codex',
    outputFile: 'AGENTS.md',
    skillsFormat: 'agent-md', // Convert & embed skills in AGENTS.md
    pathReplacements: {
      '~/.claude': '~/.codex',
    },
  },

  'opencode': {
    name: 'OpenCode',
    dir: '.opencode',
    outputFile: 'AGENTS.md',
    skillsFormat: 'agent-md', // Convert & embed skills in AGENTS.md
    pathReplacements: {
      '~/.claude': '~/.opencode',
    },
  },
}

export class Installer {
  private homeDir: string
  private installDir: string
  private configPath: string
  private binPath: string
  private eta: Eta
  private modifyPath: boolean

  constructor() {
    this.homeDir = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || ''

    if (!this.homeDir) {
      throw new Error(
        'Could not determine home directory. Please set HOME or USERPROFILE environment variable.',
      )
    }

    this.installDir = Deno.env.get('AGENT_RECIPES_HOME') ||
      join(this.homeDir, '.stashaway-agent-recipes')
    this.configPath = join(this.installDir, 'config.json')
    this.binPath = join(this.installDir, 'bin')

    // Initialize Eta templating engine
    this.eta = new Eta({
      cache: true,
      autoEscape: false, // We're rendering markdown, not HTML
    })

    const modifyPathEnv = Deno.env.get('AGENT_RECIPES_MODIFY_PATH')
    this.modifyPath = modifyPathEnv === undefined ? true : modifyPathEnv !== '0'
  }

  async isInstalled(): Promise<boolean> {
    return await exists(this.configPath)
  }

  async getConfig(): Promise<InstallConfig | null> {
    try {
      if (!await this.isInstalled()) return null
      const content = await Deno.readTextFile(this.configPath)
      return JSON.parse(content)
    } catch (error) {
      console.error(
        '⚠ Warning: Could not read config file:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      return null
    }
  }

  async saveConfig(config: InstallConfig): Promise<void> {
    await Deno.mkdir(dirname(this.configPath), { recursive: true })
    await Deno.writeTextFile(this.configPath, JSON.stringify(config, null, 2))
  }

  async detectAITools(): Promise<string[]> {
    const tools: string[] = []

    // Check for Claude Code
    const claudePath = join(this.homeDir, '.claude')
    if (await exists(claudePath)) {
      tools.push('claude')
    }

    // Check for Codex
    const codexPath = join(this.homeDir, '.codex')
    if (await exists(codexPath)) {
      tools.push('codex')
    }

    // Check for OpenCode
    const opencodePath = join(this.homeDir, '.opencode')
    if (await exists(opencodePath)) {
      tools.push('opencode')
    }

    return tools
  }

  async promptForTools(): Promise<string[]> {
    console.log('📦 Setting up StashAway Agent Recipes...\n')

    const detectedTools = await this.detectAITools()

    if (detectedTools.length > 0) {
      console.log(`✓ Detected AI tools: ${detectedTools.join(', ')}\n`)
      const useDetected = await Confirm.prompt({
        message: 'Would you like to set up instructions for these tools?',
        default: true,
      })

      if (useDetected) return detectedTools
    }

    console.log('\nWhich AI coding tools do you use? (select all that apply)\n')

    const selectedTools: string[] = []

    const tools = [
      { name: 'Claude Code', value: 'claude' },
      { name: 'Codex CLI', value: 'codex' },
      { name: 'OpenCode', value: 'opencode' },
    ]

    for (const tool of tools) {
      const use = await Confirm.prompt({
        message: `Install ${tool.name}?`,
        default: detectedTools.includes(tool.value),
      })
      if (use) selectedTools.push(tool.value)
    }

    return selectedTools
  }

  async ensureDirectories(): Promise<void> {
    await Deno.mkdir(this.installDir, { recursive: true })
    await Deno.mkdir(this.binPath, { recursive: true })
  }

  shouldModifyPath(): boolean {
    return this.modifyPath
  }

  async addToPath(): Promise<void> {
    const shell = Deno.env.get('SHELL') || ''
    const rcFiles: string[] = []

    if (shell.includes('zsh')) {
      rcFiles.push(join(this.homeDir, '.zshrc'))
    } else if (shell.includes('bash')) {
      rcFiles.push(join(this.homeDir, '.bashrc'))
      rcFiles.push(join(this.homeDir, '.bash_profile'))
    }

    const pathExport = `\n# StashAway Agent Recipes\nexport PATH="$PATH:${this.binPath}"\n`

    for (const rcFile of rcFiles) {
      try {
        const content = await exists(rcFile) ? await Deno.readTextFile(rcFile) : ''

        if (!content.includes('StashAway Agent Recipes')) {
          await Deno.writeTextFile(rcFile, content + pathExport)
          console.log(`✓ Added to PATH in ${rcFile}`)
        }
      } catch (error) {
        console.error(`⚠ Could not update ${rcFile}:`, error)
      }
    }
  }

  private getRepositoryCandidates(): string[] {
    const candidates = new Set<string>()
    if (this.installDir) {
      candidates.add(join(this.installDir, 'repo'))
      candidates.add(this.installDir)
    }
    const runtimeRoot = join(dirname(dirname(import.meta.dirname!)))
    candidates.add(runtimeRoot)
    return Array.from(candidates).filter((path) => path.length > 0)
  }

  async findRepositoryRoot(): Promise<string | null> {
    return await this.resolveRepositoryRoot()
  }

  private async resolveRepositoryRoot(): Promise<string | null> {
    for (const candidate of this.getRepositoryCandidates()) {
      try {
        if (await exists(join(candidate, 'instructions'))) {
          return candidate
        }
        if (await exists(join(candidate, 'skills'))) {
          return candidate
        }
      } catch {
        // Ignore and continue checking other candidates
      }
    }
    return null
  }

  private async resolveGitRepository(): Promise<string | null> {
    for (const candidate of this.getRepositoryCandidates()) {
      try {
        if (await exists(join(candidate, '.git'))) {
          return candidate
        }
      } catch {
        // Ignore and continue checking other candidates
      }
    }
    return null
  }

  async syncInstructions(tools: string[], config: InstallConfig): Promise<InstallConfig> {
    console.log('\n📝 Syncing instructions...\n')

    const repoRoot = await this.resolveRepositoryRoot()
    if (!repoRoot) {
      console.log('  ⚠ Could not locate agent-recipes repository content. Skipping sync.')
      return config
    }

    const installedTools = Array.from(config.installedTools ?? [])
    for (const tool of tools) {
      if (!installedTools.includes(tool)) {
        installedTools.push(tool)
      }
    }

    const detectedTools = await this.detectAITools()
    const newlyDetected: string[] = []
    for (const tool of detectedTools) {
      if (!installedTools.includes(tool)) {
        installedTools.push(tool)
        newlyDetected.push(tool)
      }
    }

    if (newlyDetected.length > 0) {
      const label = newlyDetected.length === 1 ? 'tool' : 'tools'
      console.log(
        `  ✓ Detected new ${label}: ${newlyDetected.join(', ')} (auto-added to sync list)`,
      )
    }

    for (const platform of installedTools) {
      try {
        await this.syncPlatform(platform, repoRoot)
      } catch (error) {
        console.error(`⚠ Failed to sync ${platform}:`, error)
      }
    }

    return {
      ...config,
      installedTools,
    }
  }

  private async syncPlatform(platformKey: string, repoRoot: string): Promise<void> {
    const config = PLATFORM_CONFIGS[platformKey]
    if (!config) {
      throw new Error(`Unknown platform: ${platformKey}`)
    }

    const targetDir = join(this.homeDir, config.dir)
    await Deno.mkdir(targetDir, { recursive: true })

    // Build template data
    const data: Record<string, unknown> = {
      platform: platformKey,
      agents: (await this.loadGlobalInstructions(repoRoot)).trim(),
      skillsSection: '', // Default to empty string
    }

    // Add skills if needed (convert & embed in main file)
    if (config.skillsFormat) {
      const skillsDir = join(repoRoot, 'skills')
      const results = await batchConvertSkills(
        skillsDir,
        config.skillsFormat,
        (skillDir) => `~/${config.dir}/skills/${this.getManagedSkillDirName(skillDir)}/SKILL.md`,
      )
      const skillsList = results.map((r) => r.output).join('\n').trim()

      // Render skills section template
      const skillsTemplatePath = join(repoRoot, 'instructions', 'common', 'skills.eta')
      const skillsSection = await this.renderTemplate(skillsTemplatePath, { skillsList })

      data.skillsSection = skillsSection

      console.log(`  ✓ Generated skills list with ${results.length} skill(s)`)
    }

    // Render main file from template
    const templatePath = join(repoRoot, 'instructions', platformKey, 'main.eta')
    const content = await this.renderTemplate(templatePath, data)

    // Sync main file with managed section
    const mainFilePath = join(targetDir, config.outputFile)
    await this.syncManagedFile(mainFilePath, content, `${config.name} ${config.outputFile}`)

    // Sync skills directory
    const skillsSource = join(repoRoot, 'skills')
    if (await exists(skillsSource)) {
      const skillsTarget = join(targetDir, 'skills')
      await this.syncSkills(skillsSource, skillsTarget, {
        pathReplacements: config.pathReplacements,
      })
    }
  }

  /**
   * Sync a file with managed section markers
   * User content above marker is preserved, managed section is always replaced
   */
  private async syncManagedFile(
    targetPath: string,
    ourManagedContent: string,
    description: string,
  ): Promise<void> {
    const MARKER_START = '<stashaway-recipes-managed-section>'
    const MARKER_END = '</stashaway-recipes-managed-section>'

    if (!await exists(targetPath)) {
      // First time - create file with managed section at end
      const initialContent = [
        MARKER_START,
        '\n',
        ourManagedContent.trimEnd(),
        '\n',
        MARKER_END,
        '\n',
      ].join('')

      await Deno.writeTextFile(targetPath, initialContent)
      console.log(`  ✓ Created ${description} with managed section`)
      return
    }

    // File exists - split and replace managed section
    const content = await Deno.readTextFile(targetPath)
    const markerIndex = content.indexOf(MARKER_START)
    const markerEndIndex = content.indexOf(MARKER_END)

    let userContent: string
    let hadManagedSection: boolean

    if (markerIndex === -1 || markerEndIndex === -1 || markerEndIndex < markerIndex) {
      // No managed section yet - keep all content as user content
      userContent = content.trim()
      hadManagedSection = false
    } else {
      // Extract user content (everything before marker)
      userContent = content.substring(0, markerIndex).trim()
      hadManagedSection = true
    }

    const managedBlock = [
      MARKER_START,
      '\n',
      ourManagedContent.trimEnd(),
      '\n',
      MARKER_END,
    ].join('')

    // Reconstruct: user content + our managed section
    const newContent = userContent.length > 0 ? `${userContent.trimEnd()}\n\n${managedBlock}\n` : `${managedBlock}\n`

    await Deno.writeTextFile(targetPath, newContent)
    console.log(
      hadManagedSection ? `  ✓ Updated managed section in ${description}` : `  ✓ Added managed section to ${description}`,
    )
  }

  /**
   * Sync skills ensuring managed copies use sa_ prefix (always replace our managed skills)
   */
  private async syncSkills(sourceDir: string, targetDir: string, options?: SyncSkillsOptions): Promise<void> {
    await Deno.mkdir(targetDir, { recursive: true })

    // Get list of skills from repo
    const repoSkills: Array<{ dirName: string; targetName: string }> = []
    for await (const entry of Deno.readDir(sourceDir)) {
      if (entry.isDirectory) {
        const dirName = entry.name
        const targetName = this.getManagedSkillDirName(dirName)
        repoSkills.push({ dirName, targetName })
      }
    }

    // Sync each repo skill directory (managed copies keep sa_ prefix)
    for (const { dirName, targetName } of repoSkills) {
      const sourcePath = join(sourceDir, dirName)
      const targetPath = join(targetDir, targetName)

      // Always replace - no questions asked
      if (await exists(targetPath)) {
        await Deno.remove(targetPath, { recursive: true })
      }

      await this.copyDirectory(sourcePath, targetPath, options)
      console.log(`  ✓ Synced skill: ${targetName}`)
    }

    // Count user's custom skills (no sa_ prefix)
    let customCount = 0
    for await (const entry of Deno.readDir(targetDir)) {
      if (entry.isDirectory && !entry.name.startsWith('sa_')) {
        customCount++
      }
    }

    if (customCount > 0) {
      console.log(`  ℹ  Preserved ${customCount} custom skill(s)`)
    }
  }

  private async copyDirectory(source: string, target: string, options?: SyncSkillsOptions): Promise<void> {
    await Deno.mkdir(target, { recursive: true })

    for await (const entry of Deno.readDir(source)) {
      const sourcePath = join(source, entry.name)
      const targetPath = join(target, entry.name)

      if (entry.isDirectory) {
        await this.copyDirectory(sourcePath, targetPath, options)
      } else {
        await this.copyFileWithReplacements(sourcePath, targetPath, options?.pathReplacements)
      }
    }
  }

  private getManagedSkillDirName(dirName: string): string {
    return dirName.startsWith('sa_') ? dirName : `sa_${dirName}`
  }

  private shouldTransformFile(filePath: string): boolean {
    const lower = filePath.toLowerCase()
    return lower.endsWith('.md') || lower.endsWith('.mdx') || lower.endsWith('.mdc') || lower.endsWith('.txt')
  }

  private applyReplacements(content: string, replacements: Record<string, string>): string {
    let updated = content
    const ordered = Object.entries(replacements).sort((a, b) => b[0].length - a[0].length)
    for (const [needle, replacement] of ordered) {
      updated = updated.split(needle).join(replacement)
    }
    return updated
  }

  private async copyFileWithReplacements(
    sourcePath: string,
    targetPath: string,
    replacements?: Record<string, string>,
  ): Promise<void> {
    if (!replacements || !this.shouldTransformFile(sourcePath)) {
      await Deno.copyFile(sourcePath, targetPath)
      return
    }

    const content = await Deno.readTextFile(sourcePath)
    const updatedContent = this.applyReplacements(content, replacements)
    await Deno.writeTextFile(targetPath, updatedContent)
  }

  private async loadGlobalInstructions(repoRoot: string): Promise<string> {
    const globalInstructionsPath = join(repoRoot, 'instructions', 'GLOBAL_INSTRUCTIONS.md')
    if (await exists(globalInstructionsPath)) {
      return await Deno.readTextFile(globalInstructionsPath)
    }
    return ''
  }

  private async renderTemplate(templatePath: string, data: Record<string, unknown>): Promise<string> {
    const template = await Deno.readTextFile(templatePath)
    const rendered = await this.eta.renderStringAsync(template, data)
    return rendered.trimEnd()
  }

  async checkForUpdates(): Promise<
    { hasUpdate: boolean; latestVersion: string; currentVersion: string; changelogDiff?: string } | null
  > {
    try {
      const repoPath = await this.resolveGitRepository()
      if (!repoPath) {
        console.log('  ℹ Repository not managed by git, skipping update check')
        return null
      }

      // Fetch latest from origin (quietly)
      const fetchCmd = new Deno.Command('git', {
        args: ['fetch', 'origin', '--quiet'],
        cwd: repoPath,
        stdout: 'null',
        stderr: 'null',
      })

      const fetchResult = await fetchCmd.output()
      if (!fetchResult.success) {
        console.log('  ⚠ Could not fetch updates from remote')
        return null
      }

      // Determine remote branch (try main first, fall back to master)
      const remoteBranch = await this.getDefaultRemoteBranch(repoPath)

      // Get current commit hash
      const currentHashCmd = new Deno.Command('git', {
        args: ['rev-parse', 'HEAD'],
        cwd: repoPath,
        stdout: 'piped',
      })
      const currentHashResult = await currentHashCmd.output()
      if (!currentHashResult.success) {
        return null
      }
      const currentHash = new TextDecoder().decode(currentHashResult.stdout).trim().slice(0, 7)

      // Get remote commit hash
      const remoteHashCmd = new Deno.Command('git', {
        args: ['rev-parse', `origin/${remoteBranch}`],
        cwd: repoPath,
        stdout: 'piped',
        stderr: 'null',
      })
      const remoteHashResult = await remoteHashCmd.output()
      if (!remoteHashResult.success) {
        // Remote branch doesn't exist, no update available
        return { hasUpdate: false, latestVersion: currentHash, currentVersion: currentHash }
      }
      const remoteHash = new TextDecoder().decode(remoteHashResult.stdout).trim().slice(0, 7)

      // Check if remote is ahead
      const revListCmd = new Deno.Command('git', {
        args: ['rev-list', '--count', `HEAD..origin/${remoteBranch}`],
        cwd: repoPath,
        stdout: 'piped',
        stderr: 'null',
      })
      const revListResult = await revListCmd.output()

      if (revListResult.success) {
        const commitsAhead = parseInt(new TextDecoder().decode(revListResult.stdout).trim())
        const hasUpdate = commitsAhead > 0
        let changelogDiff: string | undefined

        if (hasUpdate) {
          changelogDiff = await this.getChangelogDiff(repoPath, remoteBranch)
        }

        return {
          hasUpdate,
          latestVersion: remoteHash,
          currentVersion: currentHash,
          changelogDiff,
        }
      }

      return null
    } catch (error) {
      // deno-lint-ignore no-explicit-any
      console.log('  ⚠ Update check failed:', (error as any)?.message)
      return null
    }
  }

  private async getChangelogDiff(
    repoPath: string,
    remoteBranch: string,
  ): Promise<string | undefined> {
    try {
      const diffCmd = new Deno.Command('git', {
        args: [
          'diff',
          '--color=never',
          '--unified=5',
          `HEAD..origin/${remoteBranch}`,
          '--',
          'CHANGELOG.md',
        ],
        cwd: repoPath,
        stdout: 'piped',
        stderr: 'null',
      })

      const result = await diffCmd.output()
      if (!result.success) return undefined

      const diffText = new TextDecoder().decode(result.stdout).trim()
      if (diffText.length === 0) return undefined

      return diffText
    } catch {
      return undefined
    }
  }

  async pullLatestChanges(): Promise<boolean> {
    try {
      const repoPath = await this.resolveGitRepository()
      if (!repoPath) {
        console.log('  ℹ Repository not managed by git, cannot pull updates automatically')
        return false
      }

      // Get the default remote branch
      const remoteBranch = await this.getDefaultRemoteBranch(repoPath)

      // Reset to remote branch (hard reset to avoid merge conflicts)
      const resetCmd = new Deno.Command('git', {
        args: ['reset', '--hard', `origin/${remoteBranch}`],
        cwd: repoPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const resetResult = await resetCmd.output()

      if (!resetResult.success) {
        const error = new TextDecoder().decode(resetResult.stderr)
        console.error(`  ⚠ Git reset failed: ${error}`)
        return false
      }

      // Clean any untracked files
      const cleanCmd = new Deno.Command('git', {
        args: ['clean', '-fd'],
        cwd: repoPath,
        stdout: 'null',
        stderr: 'null',
      })

      await cleanCmd.output()

      return true
    } catch (error) {
      // deno-lint-ignore no-explicit-any
      console.error(`  ⚠ Pull failed: ${(error as any)?.message}`)
      return false
    }
  }

  private async getDefaultRemoteBranch(repoPath: string): Promise<string> {
    try {
      // Try to get default remote branch
      const cmd = new Deno.Command('git', {
        args: ['symbolic-ref', 'refs/remotes/origin/HEAD'],
        cwd: repoPath,
        stdout: 'piped',
        stderr: 'null',
      })
      const result = await cmd.output()

      if (result.success) {
        const output = new TextDecoder().decode(result.stdout).trim()
        // Output is like "refs/remotes/origin/main"
        return output.split('/').pop() || 'main'
      }
    } catch {
      // Ignore errors
    }

    // Try main first, then master
    const branches = ['main', 'master']
    for (const branch of branches) {
      const cmd = new Deno.Command('git', {
        args: ['rev-parse', '--verify', `origin/${branch}`],
        cwd: repoPath,
        stdout: 'null',
        stderr: 'null',
      })
      const result = await cmd.output()
      if (result.success) {
        return branch
      }
    }

    return 'main'
  }

  getInstallPath(): string {
    return this.installDir
  }

  getBinPath(): string {
    return this.binPath
  }
}
