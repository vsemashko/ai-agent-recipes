import { exists } from '@std/fs'
import { dirname, join } from '@std/path'
import { Confirm } from '@cliffy/prompt'

export interface InstallConfig {
  version: string
  installedTools: string[]
  lastUpdateCheck: string
  installPath: string
}

export class Installer {
  private homeDir: string
  private installDir: string
  private configPath: string
  private binPath: string

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
    const claudeCodePaths = [
      join(this.homeDir, '.config', 'claude-code'),
      join(this.homeDir, '.claude-code'),
    ]
    for (const path of claudeCodePaths) {
      if (await exists(path)) {
        tools.push('claude-code')
        break
      }
    }

    // Check for Codex
    const codexPath = join(this.homeDir, '.codex')
    if (await exists(codexPath)) {
      tools.push('codex')
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
      { name: 'Claude Code', value: 'claude-code' },
      { name: 'Codex CLI', value: 'codex' },
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

  async syncInstructions(tools: string[], config: InstallConfig): Promise<InstallConfig> {
    console.log('\n📝 Syncing instructions...\n')

    const repoRoot = join(dirname(dirname(import.meta.dirname!)))

    for (const tool of tools) {
      try {
        if (tool === 'claude-code') {
          await this.syncClaudeCode(repoRoot)
        } else if (tool === 'codex') {
          await this.syncCodex(repoRoot)
        }
      } catch (error) {
        console.error(`⚠ Failed to sync ${tool}:`, error)
      }
    }

    return config
  }

  private async syncClaudeCode(repoRoot: string): Promise<void> {
    const sourcePath = join(repoRoot, 'instructions', 'claude-code')
    if (!await exists(sourcePath)) {
      console.log('ℹ Claude Code instructions not found in repository')
      return
    }

    const targetPath = join(this.homeDir, '.config', 'claude-code')
    await Deno.mkdir(targetPath, { recursive: true })

    // Sync CLAUDE.md with managed section
    const claudeMdSource = join(sourcePath, 'CLAUDE.md')
    const claudeMdTarget = join(targetPath, 'CLAUDE.md')

    let ourContent = ''
    if (await exists(claudeMdSource)) {
      ourContent = await Deno.readTextFile(claudeMdSource)
    }
    // Always sync (creates file if missing, updates if exists)
    await this.syncManagedFile(claudeMdTarget, ourContent, 'Claude Code CLAUDE.md')

    // Sync skills with sa_ prefix
    const skillsSource = join(repoRoot, 'skills')
    const skillsTarget = join(targetPath, 'skills')

    if (await exists(skillsSource)) {
      await this.syncSkills(skillsSource, skillsTarget)
    }
  }

  private async syncCodex(repoRoot: string): Promise<void> {
    const targetPath = join(this.homeDir, '.codex')
    await Deno.mkdir(targetPath, { recursive: true })

    // Auto-generate AGENTS.md from CLAUDE.md + skills
    const claudeMdPath = join(repoRoot, 'instructions', 'claude-code', 'CLAUDE.md')
    const skillsDir = join(repoRoot, 'skills')

    if (!await exists(skillsDir)) {
      console.log('ℹ No skills found to sync for Codex')
      return
    }

    // Import converter dynamically
    const converterPath = join(dirname(import.meta.dirname!), 'lib', 'converter.ts')
    const { batchConvertSkills } = await import(converterPath)

    try {
      // Read CLAUDE.md if it exists
      let claudeMdContent = ''
      if (await exists(claudeMdPath)) {
        claudeMdContent = await Deno.readTextFile(claudeMdPath)
      }

      // Convert all skills
      const results = await batchConvertSkills(skillsDir, 'agent-md')

      if (results.length === 0) {
        console.log('  ℹ No skills found to convert')
        return
      }

      // Build managed content: CLAUDE.md + skills
      const managedContent = [
        '# StashAway Agent Instructions\n',
        'This section is managed by agent-recipes. Add your custom content above this line.\n',
        '---\n',
        claudeMdContent,
        '\n---\n',
        '# Available Skills\n',
        // deno-lint-ignore no-explicit-any
        results.map((r: { output: any }) => r.output).join('\n\n---\n\n'),
      ].join('\n')

      // Sync with managed section
      const targetFile = join(targetPath, 'AGENTS.md')
      await this.syncManagedFile(targetFile, managedContent, 'Codex AGENTS.md')

      console.log(`  ✓ Synced AGENTS.md with global instructions + ${results.length} skill(s)`)
    } catch (error) {
      // deno-lint-ignore no-explicit-any
      console.error('  ⚠ Failed to generate AGENTS.md:', (error as any).message)
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
    const MARKER_START = '<!-- AGENT-RECIPES-MANAGED-START -->'
    const MARKER_END = '<!-- AGENT-RECIPES-MANAGED-END -->'

    if (!await exists(targetPath)) {
      // First time - create file with managed section at end
      const initialContent = [
        '# My Custom Instructions\n',
        'Add your custom instructions here.\n',
        'Everything above the managed section marker will be preserved.\n\n',
        '---\n\n',
        MARKER_START,
        '<!-- This section is managed by agent-recipes. Edit content above this line. -->\n',
        ourManagedContent,
        '\n' + MARKER_END,
      ].join('')

      await Deno.writeTextFile(targetPath, initialContent)
      console.log(`  ✓ Created ${description} with managed section`)
      return
    }

    // File exists - split and replace managed section
    const content = await Deno.readTextFile(targetPath)
    const markerIndex = content.indexOf(MARKER_START)

    let userContent: string
    let hadManagedSection: boolean

    if (markerIndex === -1) {
      // No managed section yet - keep all content as user content
      userContent = content.trim()
      hadManagedSection = false
    } else {
      // Extract user content (everything before marker)
      userContent = content.substring(0, markerIndex).trim()
      hadManagedSection = true
    }

    // Reconstruct: user content + our managed section
    const newContent = [
      userContent,
      '\n\n---\n\n',
      MARKER_START,
      '<!-- This section is managed by agent-recipes. Edit content above this line. -->\n',
      ourManagedContent,
      '\n' + MARKER_END,
    ].join('')

    await Deno.writeTextFile(targetPath, newContent)
    console.log(
      hadManagedSection
        ? `  ✓ Updated managed section in ${description}`
        : `  ✓ Added managed section to ${description}`,
    )
  }

  /**
   * Sync skills with sa_ prefix (always replace our managed skills)
   */
  private async syncSkills(sourceDir: string, targetDir: string): Promise<void> {
    await Deno.mkdir(targetDir, { recursive: true })

    // Get list of skills from repo
    const repoSkills: string[] = []
    for await (const entry of Deno.readDir(sourceDir)) {
      if (entry.isDirectory) {
        repoSkills.push(entry.name)
      }
    }

    // Sync each repo skill with sa_ prefix
    for (const skillName of repoSkills) {
      const sourcePath = join(sourceDir, skillName)
      const targetPath = join(targetDir, `sa_${skillName}`)

      // Always replace - no questions asked
      if (await exists(targetPath)) {
        await Deno.remove(targetPath, { recursive: true })
      }

      await this.copyDirectory(sourcePath, targetPath)
      console.log(`  ✓ Synced skill: sa_${skillName}`)
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

  private async copyDirectory(source: string, target: string): Promise<void> {
    await Deno.mkdir(target, { recursive: true })

    for await (const entry of Deno.readDir(source)) {
      const sourcePath = join(source, entry.name)
      const targetPath = join(target, entry.name)

      if (entry.isDirectory) {
        await this.copyDirectory(sourcePath, targetPath)
      } else {
        await Deno.copyFile(sourcePath, targetPath)
      }
    }
  }

  async checkForUpdates(): Promise<
    { hasUpdate: boolean; latestVersion: string; currentVersion: string } | null
  > {
    try {
      // Check if install directory exists and is a git repository
      const gitDir = join(this.installDir, '.git')
      if (!await exists(gitDir)) {
        console.log('  ℹ Not a git repository, skipping update check')
        return null
      }

      // Fetch latest from origin (quietly)
      const fetchCmd = new Deno.Command('git', {
        args: ['fetch', 'origin', '--quiet'],
        cwd: this.installDir,
        stdout: 'null',
        stderr: 'null',
      })

      const fetchResult = await fetchCmd.output()
      if (!fetchResult.success) {
        console.log('  ⚠ Could not fetch updates from remote')
        return null
      }

      // Determine remote branch (try main first, fall back to master)
      const remoteBranch = await this.getDefaultRemoteBranch()

      // Get current commit hash
      const currentHashCmd = new Deno.Command('git', {
        args: ['rev-parse', 'HEAD'],
        cwd: this.installDir,
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
        cwd: this.installDir,
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
        cwd: this.installDir,
        stdout: 'piped',
        stderr: 'null',
      })
      const revListResult = await revListCmd.output()

      if (revListResult.success) {
        const commitsAhead = parseInt(new TextDecoder().decode(revListResult.stdout).trim())
        const hasUpdate = commitsAhead > 0

        return {
          hasUpdate,
          latestVersion: remoteHash,
          currentVersion: currentHash,
        }
      }

      return null
    } catch (error) {
      // deno-lint-ignore no-explicit-any
      console.log('  ⚠ Update check failed:', (error as any)?.message)
      return null
    }
  }

  async pullLatestChanges(): Promise<boolean> {
    try {
      // Get the default remote branch
      const remoteBranch = await this.getDefaultRemoteBranch()

      // Reset to remote branch (hard reset to avoid merge conflicts)
      const resetCmd = new Deno.Command('git', {
        args: ['reset', '--hard', `origin/${remoteBranch}`],
        cwd: this.installDir,
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
        cwd: this.installDir,
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

  private async getDefaultRemoteBranch(): Promise<string> {
    try {
      // Try to get default remote branch
      const cmd = new Deno.Command('git', {
        args: ['symbolic-ref', 'refs/remotes/origin/HEAD'],
        cwd: this.installDir,
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
        cwd: this.installDir,
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
