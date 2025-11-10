import { exists } from '@std/fs'
import { dirname, join } from '@std/path'
import { Confirm } from '@cliffy/prompt'
import { Eta } from 'eta'
import { batchConvertSkills } from './converter.ts'
import { ConfigParserFactory } from './config-format.ts'
import { type ConfigChange, ConfigMerger, type MergeStrategy } from './config-merger.ts'
import { StateManager } from './state-manager.ts'

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
  skillsFormat?: 'agent-md' // If set, convert & embed skills in templates with this format
  pathReplacements?: Record<string, string>
  configFile?: string // Config filename (same in both user dir and repo)
  configMergeStrategy?: MergeStrategy[] // Custom merge strategy for this platform's config
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  'claude': {
    name: 'Claude Code',
    dir: '.claude',
    // No skillsFormat = skills copied as-is to separate directory (no conversion, no embedding)
    configFile: 'config.json',
  },

  'codex': {
    name: 'Codex',
    dir: '.codex',
    skillsFormat: 'agent-md', // Convert & embed skills in templates
    pathReplacements: {
      '~/.claude': '~/.codex',
    },
    configFile: 'config.toml',
  },

  'opencode': {
    name: 'OpenCode',
    dir: '.opencode',
    skillsFormat: 'agent-md', // Convert & embed skills in templates
    pathReplacements: {
      '~/.claude': '~/.opencode',
    },
    configFile: 'config.json',
  },
}

interface InstallerOptions {
  verbose?: boolean
  homeDir?: string
  installDir?: string
}

type ManagedFileChangeAction = 'created' | 'updated'

interface ManagedFileChange {
  file: string
  action: ManagedFileChangeAction
}

interface PlatformSyncSummary {
  key: string
  name: string
  fileChanges: ManagedFileChange[]
  skillUpdates: number
}

interface SyncSkillsOptions {
  pathReplacements?: Record<string, string>
}

interface UpdateCheckResult {
  hasUpdate: boolean
  changelogUrl?: string
}

export class Installer {
  private homeDir: string
  private installDir: string
  private configPath: string
  private binPath: string
  private eta: Eta
  private modifyPath: boolean
  private stateManager: StateManager
  private configMerger: ConfigMerger
  private verbose: boolean

  constructor(options: InstallerOptions = {}) {
    this.verbose = Boolean(options.verbose)
    this.homeDir = options.homeDir || Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || ''

    if (!this.homeDir) {
      throw new Error(
        'Could not determine home directory. Please set HOME or USERPROFILE environment variable.',
      )
    }

    const defaultInstallDir = join(this.homeDir, '.stashaway-agent-recipes')
    this.installDir = options.installDir || Deno.env.get('AGENT_RECIPES_HOME') || defaultInstallDir
    this.configPath = join(this.installDir, 'config.json')
    this.binPath = join(this.installDir, 'bin')

    // Initialize Eta templating engine
    this.eta = new Eta({
      cache: true,
      autoEscape: false, // We're rendering markdown, not HTML
    })

    const modifyPathEnv = Deno.env.get('AGENT_RECIPES_MODIFY_PATH')
    this.modifyPath = modifyPathEnv === undefined ? true : modifyPathEnv !== '0'

    // Initialize state manager and config merger
    this.stateManager = new StateManager(this.installDir)
    this.configMerger = new ConfigMerger()
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
    console.log('📝 Syncing instructions...\n')

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

    const summaries: PlatformSyncSummary[] = []

    for (const platform of installedTools) {
      try {
        const summary = await this.syncPlatform(platform, repoRoot)
        summaries.push(summary)
      } catch (error) {
        console.error(`⚠ Failed to sync ${platform}:`, error)
      }
    }

    const changedPlatforms = summaries.filter((summary) => summary.fileChanges.length > 0 || summary.skillUpdates > 0)

    if (changedPlatforms.length > 0) {
      console.log('📝 Instructions updated:')
      for (const summary of changedPlatforms) {
        const parts: string[] = []

        if (summary.fileChanges.length > 0) {
          const fileDescriptions = summary.fileChanges.map((change) =>
            `${change.action === 'created' ? 'created' : 'updated'} ${change.file} managed section`
          )
          parts.push(fileDescriptions.join(', '))
        }

        if (summary.skillUpdates > 0) {
          const label = summary.skillUpdates === 1 ? 'skill' : 'skills'
          parts.push(`synced ${summary.skillUpdates} managed ${label}`)
        }

        console.log(`  • ${summary.name}: ${parts.join('; ')}`)
      }
    } else {
      this.logVerbose('\n📝 Instructions are up to date')
    }

    return {
      ...config,
      installedTools,
    }
  }

  private async syncPlatform(platformKey: string, repoRoot: string): Promise<PlatformSyncSummary> {
    const config = PLATFORM_CONFIGS[platformKey]
    if (!config) {
      throw new Error(`Unknown platform: ${platformKey}`)
    }

    const targetDir = join(this.homeDir, config.dir)
    await Deno.mkdir(targetDir, { recursive: true })

    const summary: PlatformSyncSummary = {
      key: platformKey,
      name: config.name,
      fileChanges: [],
      skillUpdates: 0,
    }

    // Build template data
    const data: Record<string, unknown> = {
      platform: platformKey,
      agents: (await this.loadGlobalInstructions(repoRoot)).trim(),
      skillsSection: '', // Default to empty string
    }

    // Add skills if needed (convert & embed in templates)
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
      data.skillsSection = await this.renderTemplate(skillsTemplatePath, { skillsList })
      this.logVerbose(`  ✓ Generated skills list with ${results.length} skill(s)`)
    }

    // Find and process all .eta templates in the platform directory
    const templatesDir = join(repoRoot, 'instructions', platformKey)
    const templates: string[] = []

    for await (const entry of Deno.readDir(templatesDir)) {
      if (entry.isFile && entry.name.endsWith('.eta')) {
        templates.push(entry.name)
      }
    }

    this.logVerbose(`  📝 Found ${templates.length} template(s) for ${platformKey}:`, templates)

    // Render and sync each template
    for (const templateFile of templates) {
      const templatePath = join(templatesDir, templateFile)
      const content = await this.renderTemplate(templatePath, data)

      // Derive output filename by removing .eta extension
      const outputFile = templateFile.slice(0, -4) // Remove '.eta'
      const outputPath = join(targetDir, outputFile)

      this.logVerbose(`  📄 Processing: ${templateFile} → ${outputFile}`)
      const description = `${config.name} ${outputFile}`
      const change = await this.syncManagedFile(outputPath, content, description)
      if (change) {
        summary.fileChanges.push({ file: outputFile, action: change })
      }
    }

    // Sync skills directory
    const skillsSource = join(repoRoot, 'skills')
    if (await exists(skillsSource)) {
      const skillsTarget = join(targetDir, 'skills')
      summary.skillUpdates = await this.syncSkills(skillsSource, skillsTarget, {
        pathReplacements: config.pathReplacements,
      })
    }

    return summary
  }

  /**
   * Sync a file with managed section markers
   * User content above marker is preserved, managed section is always replaced
   */
  private async syncManagedFile(
    targetPath: string,
    ourManagedContent: string,
    description: string,
  ): Promise<ManagedFileChangeAction | null> {
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
      this.logVerbose(`  ✓ Created ${description} managed section`)
      return 'created'
    }

    // File exists - split and replace managed section
    const originalContent = await Deno.readTextFile(targetPath)
    const markerIndex = originalContent.indexOf(MARKER_START)
    const markerEndIndex = originalContent.indexOf(MARKER_END)

    let userContent: string
    let hadManagedSection: boolean

    if (markerIndex === -1 || markerEndIndex === -1 || markerEndIndex < markerIndex) {
      // No managed section yet - keep all content as user content
      userContent = originalContent.trim()
      hadManagedSection = false
    } else {
      // Extract user content (everything before marker)
      userContent = originalContent.substring(0, markerIndex).trim()
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

    if (newContent === originalContent) {
      this.logVerbose(`  ↺ ${description} already up to date`)
      return null
    }

    await Deno.writeTextFile(targetPath, newContent)
    this.logVerbose(
      hadManagedSection ? `  ✓ Updated managed section in ${description}` : `  ✓ Added managed section to ${description}`,
    )
    return 'updated'
  }

  /**
   * Sync skills ensuring managed copies use sa_ prefix (always replace our managed skills)
   */
  private async syncSkills(
    sourceDir: string,
    targetDir: string,
    options?: SyncSkillsOptions,
  ): Promise<number> {
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

    let updatedSkills = 0

    // Sync each repo skill directory (managed copies keep sa_ prefix)
    for (const { dirName, targetName } of repoSkills) {
      const sourcePath = join(sourceDir, dirName)
      const targetPath = join(targetDir, targetName)

      const needsUpdate = await this.skillNeedsUpdate(
        sourcePath,
        targetPath,
        options?.pathReplacements,
      )

      if (needsUpdate) {
        if (await exists(targetPath)) {
          await Deno.remove(targetPath, { recursive: true })
        }
        await this.copyDirectory(sourcePath, targetPath, options)
        this.logVerbose(`  ✓ Synced skill: ${targetName}`)
        updatedSkills++
        continue
      }

      this.logVerbose(`  ↺ Skill already up to date: ${targetName}`)
    }

    // Count user's custom skills (no sa_ prefix)
    let customCount = 0
    for await (const entry of Deno.readDir(targetDir)) {
      if (entry.isDirectory && !entry.name.startsWith('sa_')) {
        customCount++
      }
    }

    if (customCount > 0) {
      this.logVerbose(`  ℹ  Preserved ${customCount} custom skill(s)`)
    }

    return updatedSkills
  }

  private async skillNeedsUpdate(
    sourcePath: string,
    targetPath: string,
    replacements?: Record<string, string>,
  ): Promise<boolean> {
    if (!await exists(targetPath)) {
      return true
    }

    const sourceSnapshot = await this.createDirectorySnapshot(sourcePath, replacements)
    const targetSnapshot = await this.createDirectorySnapshot(targetPath)

    if (sourceSnapshot.size !== targetSnapshot.size) {
      return true
    }

    for (const [relativePath, sourceContent] of sourceSnapshot) {
      const targetContent = targetSnapshot.get(relativePath)
      if (!targetContent || !this.bytesEqual(sourceContent, targetContent)) {
        return true
      }
    }

    return false
  }

  private async createDirectorySnapshot(
    baseDir: string,
    replacements?: Record<string, string>,
  ): Promise<Map<string, Uint8Array>> {
    const files = new Map<string, Uint8Array>()
    await this.collectFiles(baseDir, '', files, replacements)
    return files
  }

  private async collectFiles(
    currentDir: string,
    prefix: string,
    files: Map<string, Uint8Array>,
    replacements?: Record<string, string>,
  ): Promise<void> {
    for await (const entry of Deno.readDir(currentDir)) {
      const relativePath = prefix.length > 0 ? `${prefix}/${entry.name}` : entry.name
      const entryPath = join(currentDir, entry.name)

      if (entry.isDirectory) {
        await this.collectFiles(entryPath, relativePath, files, replacements)
      } else if (entry.isFile) {
        files.set(relativePath, await this.readFileWithReplacements(entryPath, replacements))
      }
    }
  }

  private async readFileWithReplacements(
    sourcePath: string,
    replacements?: Record<string, string>,
  ): Promise<Uint8Array> {
    if (replacements && this.shouldTransformFile(sourcePath)) {
      const content = await Deno.readTextFile(sourcePath)
      const updatedContent = this.applyReplacements(content, replacements)
      return new TextEncoder().encode(updatedContent)
    }

    return await Deno.readFile(sourcePath)
  }

  private bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false
      }
    }

    return true
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

  async checkForUpdates(): Promise<UpdateCheckResult | null> {
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
        return {
          hasUpdate: false,
        }
      }
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
        const changelogUrl = hasUpdate ? await this.buildChangelogUrl(repoPath, remoteBranch) : undefined

        return {
          hasUpdate,
          changelogUrl,
        }
      }

      return null
    } catch (error) {
      // deno-lint-ignore no-explicit-any
      console.log('  ⚠ Update check failed:', (error as any)?.message)
      return null
    }
  }

  private async getLocalProjectVersion(repoPath: string): Promise<string | undefined> {
    try {
      const content = await Deno.readTextFile(join(repoPath, 'deno.json'))
      return this.extractVersionFromDenoConfig(content)
    } catch {
      return undefined
    }
  }

  private extractVersionFromDenoConfig(content: string): string | undefined {
    try {
      const parsed = JSON.parse(content)
      const version = typeof parsed?.version === 'string' ? parsed.version.trim() : ''
      return version.length > 0 ? version : undefined
    } catch {
      return undefined
    }
  }

  async getInstalledRecipesVersion(): Promise<string | undefined> {
    const repoPath = await this.resolveGitRepository()
    if (repoPath) {
      const version = await this.getLocalProjectVersion(repoPath)
      if (version) {
        return version
      }
    }

    await this.stateManager.load()
    return this.stateManager.getRecipesVersion() ?? undefined
  }

  async recordInstalledRecipesVersion(version?: string): Promise<void> {
    await this.stateManager.load()
    this.stateManager.setRecipesVersion(version ?? null)
    await this.stateManager.save()
  }

  private async buildChangelogUrl(repoPath: string, branch: string): Promise<string | undefined> {
    const remoteUrl = await this.getRemoteUrl(repoPath)
    if (!remoteUrl) return undefined
    const normalized = this.normalizeRemoteUrl(remoteUrl)
    if (!normalized) return undefined
    return `${normalized}/blob/${branch}/CHANGELOG.md`
  }

  private async getRemoteUrl(repoPath: string): Promise<string | undefined> {
    try {
      const cmd = new Deno.Command('git', {
        args: ['config', '--get', 'remote.origin.url'],
        cwd: repoPath,
        stdout: 'piped',
        stderr: 'null',
      })
      const result = await cmd.output()
      if (!result.success) return undefined
      const value = new TextDecoder().decode(result.stdout).trim()
      return value.length > 0 ? value : undefined
    } catch {
      return undefined
    }
  }

  private normalizeRemoteUrl(remoteUrl: string): string | undefined {
    const stripGit = (url: string): string => url.replace(/\.git$/, '')

    if (remoteUrl.startsWith('git@')) {
      const match = remoteUrl.match(/^git@([^:]+):(.+)$/)
      if (!match) return undefined
      const host = match[1]
      const path = match[2].replace(/\.git$/, '')
      return `https://${host}/${path}`
    }

    if (remoteUrl.startsWith('ssh://')) {
      try {
        const parsed = new URL(remoteUrl)
        const path = parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, '')
        return `https://${parsed.hostname}/${path}`
      } catch {
        return undefined
      }
    }

    if (remoteUrl.startsWith('https://') || remoteUrl.startsWith('http://')) {
      return stripGit(remoteUrl)
    }

    return undefined
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

  private logVerbose(...args: unknown[]): void {
    if (this.verbose) {
      console.log(...args)
    }
  }

  /**
   * Format config changes as a git-style diff
   */
  private formatConfigDiff(
    userConfig: Record<string, unknown>,
    mergedConfig: Record<string, unknown>,
    parser: { stringify: (obj: Record<string, unknown>) => string },
  ): string {
    const userContent = parser.stringify(userConfig)
    const mergedContent = parser.stringify(mergedConfig)

    const userLines = userContent.split('\n')
    const mergedLines = mergedContent.split('\n')

    // ANSI color codes
    const red = '\x1b[31m'
    const green = '\x1b[32m'
    const cyan = '\x1b[36m'
    const reset = '\x1b[0m'
    const dim = '\x1b[2m'

    const output: string[] = []

    // Header
    output.push(`${cyan}@@ Config diff @@${reset}`)

    // Simple line-by-line diff
    const maxLines = Math.max(userLines.length, mergedLines.length)
    let lastChangeIndex = -1

    for (let i = 0; i < maxLines; i++) {
      const userLine = userLines[i] || ''
      const mergedLine = mergedLines[i] || ''

      if (userLine !== mergedLine) {
        lastChangeIndex = i

        // Show removed line
        if (userLine && !mergedLines.includes(userLine)) {
          output.push(`${red}- ${userLine}${reset}`)
        }

        // Show added line
        if (mergedLine && !userLines.includes(mergedLine)) {
          output.push(`${green}+ ${mergedLine}${reset}`)
        }

        // Modified line
        if (userLine && mergedLine && userLines.includes(mergedLine) && mergedLines.includes(userLine)) {
          output.push(`${dim}  ${mergedLine}${reset}`)
        }
      } else if (mergedLine) {
        // Context line (show a few lines around changes)
        if (lastChangeIndex >= 0 && i - lastChangeIndex <= 2) {
          output.push(`${dim}  ${mergedLine}${reset}`)
        } else if (i < mergedLines.length - 1 && i + 1 < maxLines) {
          // Check if next line is a change
          const nextUser = userLines[i + 1] || ''
          const nextMerged = mergedLines[i + 1] || ''
          if (nextUser !== nextMerged) {
            output.push(`${dim}  ${mergedLine}${reset}`)
          }
        }
      }
    }

    return output.join('\n')
  }

  /**
   * Format config changes summary with stats
   */
  private formatConfigSummary(changes: ConfigChange[]): string {
    const counts = {
      added: changes.filter((c) => c.type === 'added').length,
      modified: changes.filter((c) => c.type === 'modified').length,
      removed: changes.filter((c) => c.type === 'removed').length,
    }

    const summary: string[] = []
    if (counts.added > 0) summary.push(`${counts.added} added`)
    if (counts.modified > 0) summary.push(`${counts.modified} modified`)
    if (counts.removed > 0) summary.push(`${counts.removed} removed`)

    return `${changes.length} change(s): ${summary.join(', ')}`
  }

  private async getDefaultRemoteBranch(repoPath: string): Promise<string> {
    // Check if a source branch was detected during installation
    const sourceBranch = Deno.env.get('AGENT_RECIPES_SOURCE_BRANCH')
    if (sourceBranch) {
      console.log(`  ℹ Using source branch: ${sourceBranch}`)
      return sourceBranch
    }

    try {
      // Check current branch of the repo
      const currentBranchCmd = new Deno.Command('git', {
        args: ['branch', '--show-current'],
        cwd: repoPath,
        stdout: 'piped',
        stderr: 'null',
      })
      const currentBranchResult = await currentBranchCmd.output()

      if (currentBranchResult.success) {
        const currentBranch = new TextDecoder().decode(currentBranchResult.stdout).trim()
        // If on a non-default branch, use it for updates
        if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
          console.log(`  ℹ Using current branch: ${currentBranch}`)
          return currentBranch
        }
      }
    } catch {
      // Ignore errors
    }

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

  /**
   * Check if any configs have pending changes (three-way merge preview)
   */
  async hasConfigChanges(tools: string[]): Promise<boolean> {
    const repoRoot = await this.resolveRepositoryRoot()
    if (!repoRoot) return false

    await this.stateManager.load()

    for (const tool of tools) {
      const platformConfig = PLATFORM_CONFIGS[tool]
      if (!platformConfig || !platformConfig.configFile) continue

      const managedPath = this.getManagedConfigPath(repoRoot, tool)
      if (!managedPath || !await exists(managedPath)) continue

      const userPath = this.getUserConfigPath(tool)
      if (!await exists(userPath)) {
        // Managed config exists but user doesn't have it yet - that's a change
        return true
      }

      try {
        // Parse both configs
        const parser = ConfigParserFactory.getParser(userPath)
        const userContent = await Deno.readTextFile(userPath)
        const managedContent = await Deno.readTextFile(managedPath)

        const userConfig = parser.parse(userContent)
        const managedConfig = parser.parse(managedContent)

        // Get base config (last synced)
        const baseConfig = this.stateManager.getLastSyncedConfig(tool, userPath)

        // Perform three-way merge
        const merged = this.configMerger.threeWayMerge(baseConfig, userConfig, managedConfig)

        // Check if merge result differs from current user config
        const changes = this.configMerger.calculateChanges(userConfig, merged)

        if (changes.length > 0) return true
      } catch {
        // If parsing fails, treat as no changes
        continue
      }
    }

    return false
  }

  /**
   * Preview config changes before syncing
   */
  async previewConfigChanges(tools: string[]): Promise<void> {
    const repoRoot = await this.resolveRepositoryRoot()
    if (!repoRoot) {
      console.log('  ℹ No repository found, skipping config preview')
      return
    }

    await this.stateManager.load()

    let hasAnyChanges = false

    for (const tool of tools) {
      const platformConfig = PLATFORM_CONFIGS[tool]
      if (!platformConfig || !platformConfig.configFile) continue

      const managedPath = this.getManagedConfigPath(repoRoot, tool)
      if (!managedPath || !await exists(managedPath)) continue

      const userPath = this.getUserConfigPath(tool)

      try {
        const parser = ConfigParserFactory.getParser(userPath)

        // Load configs
        const managedContent = await Deno.readTextFile(managedPath)
        const managedConfig = parser.parse(managedContent)

        let userConfig: Record<string, unknown>
        if (await exists(userPath)) {
          const userContent = await Deno.readTextFile(userPath)
          userConfig = parser.parse(userContent)
        } else {
          userConfig = {}
        }

        // Get base config
        const baseConfig = this.stateManager.getLastSyncedConfig(tool, userPath)

        // Perform three-way merge
        const merged = this.configMerger.threeWayMerge(
          baseConfig,
          userConfig,
          managedConfig,
          platformConfig.configMergeStrategy,
        )

        // Calculate changes
        const changes = this.configMerger.calculateChanges(userConfig, merged)

        if (changes.length > 0) {
          if (!hasAnyChanges) {
            console.log('\n📝 Config changes preview:\n')
            hasAnyChanges = true
          }

          // Check if there are user conflicts
          const hasConflicts = this.configMerger.hasUserConflicts(
            baseConfig,
            userConfig,
            managedConfig,
            merged,
          )

          console.log(`  ${platformConfig.name} (${platformConfig.configFile}):`)
          console.log(`  ${this.formatConfigSummary(changes)}`)
          if (hasConflicts) {
            console.log('  ⚠ Warning: Contains conflicts (you modified managed fields)')
            console.log('  → Sync will prompt for confirmation\n')
          } else {
            console.log('  ✓ No conflicts (will auto-apply during sync)\n')
          }
          const diff = this.formatConfigDiff(userConfig, merged, parser)
          console.log(diff)
          console.log()
        }
      } catch (error) {
        console.error(`  ⚠ Failed to preview ${tool} config: ${(error as Error).message}`)
      }
    }

    if (!hasAnyChanges) {
      console.log('  ✓ No config changes detected')
    }
  }

  /**
   * Sync configs using three-way merge
   */
  async syncConfigs(tools: string[], _config: InstallConfig, skipPrompt = false): Promise<void> {
    const repoRoot = await this.resolveRepositoryRoot()
    if (!repoRoot) {
      console.log('  ℹ No repository found, skipping config sync')
      return
    }

    await this.stateManager.load()

    let hasAnyChanges = false

    // First check if there are any changes
    for (const tool of tools) {
      const platformConfig = PLATFORM_CONFIGS[tool]
      if (!platformConfig || !platformConfig.configFile) continue

      const managedPath = this.getManagedConfigPath(repoRoot, tool)
      if (!managedPath || !await exists(managedPath)) continue

      hasAnyChanges = true
      break
    }

    if (!hasAnyChanges) {
      return
    }

    console.log('\n📝 Syncing configs...\n')

    for (const tool of tools) {
      const platformConfig = PLATFORM_CONFIGS[tool]
      if (!platformConfig || !platformConfig.configFile) continue

      const managedPath = this.getManagedConfigPath(repoRoot, tool)
      if (!managedPath || !await exists(managedPath)) {
        console.log(`  ℹ  No managed config for ${platformConfig.name}, skipping`)
        continue
      }

      const userPath = this.getUserConfigPath(tool)

      try {
        const parser = ConfigParserFactory.getParser(userPath)

        // Load managed config
        const managedContent = await Deno.readTextFile(managedPath)
        const managedConfig = parser.parse(managedContent)

        // Load user config (or empty if doesn't exist)
        let userConfig: Record<string, unknown>
        if (await exists(userPath)) {
          const userContent = await Deno.readTextFile(userPath)
          userConfig = parser.parse(userContent)
        } else {
          userConfig = {}
        }

        // Get base config (last synced)
        const baseConfig = this.stateManager.getLastSyncedConfig(tool, userPath)

        // Perform three-way merge
        const merged = this.configMerger.threeWayMerge(
          baseConfig,
          userConfig,
          managedConfig,
          platformConfig.configMergeStrategy,
        )

        // Check if there are actual changes
        const changes = this.configMerger.calculateChanges(userConfig, merged)

        // DEBUG: Show what we're comparing
        if (this.verbose) {
          console.log(`\n  DEBUG ${platformConfig.name}:`)
          console.log('  Base keys:', baseConfig ? Object.keys(baseConfig).join(', ') : 'null')
          console.log('  User keys:', Object.keys(userConfig).join(', '))
          console.log('  Managed keys:', Object.keys(managedConfig).join(', '))
          console.log('  Merged keys:', Object.keys(merged).join(', '))
          console.log('  Changes:', changes.length)
          if (changes.length > 0 && changes.length < 20) {
            changes.forEach((c) => console.log(`    - ${c.type}: ${c.path}`))
          }
        }

        if (changes.length === 0) {
          console.log(`  ✓ ${platformConfig.name}: No changes`)
          continue
        }

        // Check if there are user conflicts (user modified managed fields)
        const hasConflicts = this.configMerger.hasUserConflicts(
          baseConfig,
          userConfig,
          managedConfig,
          merged,
        )

        // Determine if we need user confirmation
        const needsConfirmation = !skipPrompt && hasConflicts

        if (needsConfirmation) {
          // User modified managed fields - show diff and ask for confirmation
          console.log(`\n  ${platformConfig.name} (${platformConfig.configFile}):`)
          console.log(`  ${this.formatConfigSummary(changes)}\n`)
          const diff = this.formatConfigDiff(userConfig, merged, parser)
          console.log(diff)
          console.log('\n  ⚠ Warning: You modified fields that are managed by agent-recipes.')
          console.log('  Your changes will be overwritten if you proceed.\n')

          const confirm = await Confirm.prompt({
            message: `Apply managed config and overwrite your changes?`,
            default: false,
          })

          if (!confirm) {
            console.log(`  ⊘  Skipped ${platformConfig.name} config (keeping your changes)`)
            continue
          }
        }

        // Apply changes
        const mergedContent = parser.stringify(merged)
        await Deno.mkdir(dirname(userPath), { recursive: true })
        await Deno.writeTextFile(userPath, mergedContent)

        // Update state - store only managed config, not merged!
        // This way next sync knows what WE added, not what the user had
        this.stateManager.setLastSyncedConfig(tool, userPath, managedConfig)

        // Log success
        if (skipPrompt) {
          console.log(`  ✓ ${platformConfig.name}: Applied ${changes.length} change(s) (--yes)`)
        } else if (hasConflicts) {
          console.log(`  ✓ ${platformConfig.name}: Applied changes (conflicts resolved)`)
        } else {
          console.log(`  ✓ ${platformConfig.name}: Auto-applied ${changes.length} change(s)`)
        }
      } catch (error) {
        console.error(`  ⚠ Failed to sync ${tool} config: ${(error as Error).message}`)
      }
    }

    // Save state
    await this.stateManager.save()
  }

  /**
   * Get path to managed config in repo
   */
  private getManagedConfigPath(repoRoot: string, tool: string): string | null {
    const platformConfig = PLATFORM_CONFIGS[tool]
    if (!platformConfig || !platformConfig.configFile) return null

    return join(repoRoot, 'instructions', tool, platformConfig.configFile)
  }

  /**
   * Get path to user config
   */
  private getUserConfigPath(tool: string): string {
    const platformConfig = PLATFORM_CONFIGS[tool]
    if (!platformConfig || !platformConfig.configFile) {
      throw new Error(`No config file defined for platform: ${tool}`)
    }

    return join(this.homeDir, platformConfig.dir, platformConfig.configFile)
  }
}
