import { exists } from '@std/fs'
import { join, dirname } from '@std/path'
import { Confirm } from '@cliffy/prompt'

export interface InstallConfig {
  version: string
  installedTools: string[]
  lastUpdateCheck: string
  installPath: string
  customPaths?: {
    [key: string]: string
  }
  fileHashes?: Record<string, string>
}

export class Installer {
  private homeDir: string
  private installDir: string
  private configPath: string
  private binPath: string

  constructor() {
    this.homeDir = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || ''
    this.installDir = Deno.env.get('AGENT_RECIPES_HOME') || join(this.homeDir, '.stashaway-agent-recipes')
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
    } catch {
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
      join(this.homeDir, '.claude-code')
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

    // Note: Cursor support deferred - only supports project-specific configuration

    return tools
  }

  async promptForTools(): Promise<string[]> {
    console.log('📦 Setting up StashAway Agent Recipes...\n')

    const detectedTools = await this.detectAITools()

    if (detectedTools.length > 0) {
      console.log(`✓ Detected AI tools: ${detectedTools.join(', ')}\n`)
      const useDetected = await Confirm.prompt({
        message: 'Would you like to set up instructions for these tools?',
        default: true
      })

      if (useDetected) return detectedTools
    }

    console.log('\nWhich AI coding tools do you use? (select all that apply)\n')

    const selectedTools: string[] = []

    const tools = [
      { name: 'Claude Code', value: 'claude-code' },
      { name: 'Codex CLI', value: 'codex' }
    ]

    for (const tool of tools) {
      const use = await Confirm.prompt({
        message: `Install ${tool.name}?`,
        default: detectedTools.includes(tool.value)
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
    config.fileHashes ??= {}

    for (const tool of tools) {
      try {
        if (tool === 'claude-code') {
          await this.syncClaudeCode(repoRoot, config)
        } else if (tool === 'codex') {
          await this.syncCodex(repoRoot, config)
        }
      } catch (error) {
        console.error(`⚠ Failed to sync ${tool}:`, error)
      }
    }

    return config
  }

  private async syncClaudeCode(repoRoot: string, config: InstallConfig): Promise<void> {
    const sourcePath = join(repoRoot, 'instructions', 'claude-code')
    if (!await exists(sourcePath)) {
      console.log('ℹ Claude Code instructions not found in repository')
      return
    }

    const targetPath = join(this.homeDir, '.config', 'claude-code')
    await Deno.mkdir(targetPath, { recursive: true })

    // Sync CLAUDE.md (main instructions file)
    await this.syncFileWithHash(
      join(sourcePath, 'CLAUDE.md'),
      join(targetPath, 'CLAUDE.md'),
      config,
      'claude-code/CLAUDE.md',
      'Claude Code CLAUDE.md',
    )

    // Sync skills directory from repo root
    const skillsSource = join(repoRoot, 'skills')
    const skillsTarget = join(targetPath, 'skills')

    if (await exists(skillsSource)) {
      try {
        // Remove existing symlink/directory if it exists
        if (await exists(skillsTarget)) {
          await Deno.remove(skillsTarget, { recursive: true })
        }
        await Deno.symlink(skillsSource, skillsTarget, { type: 'dir' })
        console.log('  ✓ Created symlink for skills')
      } catch {
        await this.copyDirectory(skillsSource, skillsTarget)
        console.log('  ✓ Copied skills directory')
      }
    }
  }

  private async syncCodex(repoRoot: string, config: InstallConfig): Promise<void> {
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
      console.log('  ⚙️  Generating AGENTS.md from global instructions + skills...')

      // Read CLAUDE.md if it exists to include as header
      let header = '# AI Agent Skills for StashAway\n\nThis file is auto-generated from the stashaway-agent-recipes repository.\n\n'

      if (await exists(claudeMdPath)) {
        const claudeMdContent = await Deno.readTextFile(claudeMdPath)
        // Add CLAUDE.md content as the introduction
        header += '---\n\n' + claudeMdContent + '\n\n---\n\n# Available Skills\n\n'
      }

      // Convert all skills
      const results = await batchConvertSkills(skillsDir, 'agent-md')

      if (results.length === 0) {
        console.log('  ℹ No skills found to convert')
        return
      }

      // Combine header + skills
      const combined = header + results.map((r) => r.output).join('\n\n---\n\n')

      // Write to target with hash tracking
      const targetFile = join(targetPath, 'AGENTS.md')
      await this.syncFileWithHash(
        'generated', // Source is generated, not a file
        targetFile,
        config,
        'codex/AGENTS.md',
        'Codex AGENTS.md',
        combined  // Pass content directly
      )

      console.log(`  ✓ Generated AGENTS.md with global instructions + ${results.length} skill(s)`)
    } catch (error) {
      console.error('  ⚠ Failed to generate AGENTS.md:', error.message)
    }
  }

  private async syncFileWithHash(
    source: string,
    target: string,
    config: InstallConfig,
    hashKey: string,
    description: string,
    generatedContent?: string  // Optional: pass content directly instead of reading from file
  ): Promise<void> {
    config.fileHashes ??= {}
    const hashes = config.fileHashes

    // Get source content - either from file or passed directly
    let sourceContent: string
    if (generatedContent) {
      sourceContent = generatedContent
    } else {
      if (!await exists(source)) {
        console.log(`  ℹ Skipped ${description}: source file not found`)
        return
      }
      sourceContent = await Deno.readTextFile(source)
    }

    const sourceHash = await this.computeHash(sourceContent)

    const targetExists = await exists(target)
    if (targetExists) {
      const targetContent = await Deno.readTextFile(target)
      const targetHash = await this.computeHash(targetContent)
      const previousHash = hashes[hashKey]

      if (targetHash === sourceHash) {
        hashes[hashKey] = sourceHash
        console.log(`  ✓ ${description} is already up to date`)
        return
      }

      if (previousHash && targetHash !== previousHash) {
        const overwrite = await Confirm.prompt({
          message: `${description} has local changes. Overwrite with repository version?`,
          default: false,
        })
        if (!overwrite) {
          console.log(`  ↩ Skipped ${description}`)
          return
        }
      } else if (!previousHash && targetHash !== sourceHash) {
        const overwrite = await Confirm.prompt({
          message: `${description} already exists. Replace with repository version?`,
          default: false,
        })
        if (!overwrite) {
          console.log(`  ↩ Skipped ${description}`)
          return
        }
      }
    }

    await Deno.writeTextFile(target, sourceContent)
    hashes[hashKey] = sourceHash
    console.log(`  ✓ Synced ${description}`)
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

  private async computeHash(content: string | Uint8Array): Promise<string> {
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : content
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  async checkForUpdates(): Promise<{ hasUpdate: boolean; latestVersion: string; currentVersion: string } | null> {
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
        stderr: 'null'
      })

      const fetchResult = await fetchCmd.output()
      if (!fetchResult.success) {
        console.log('  ⚠ Could not fetch updates from remote')
        return null
      }

      // Get current branch or default to main
      const currentBranchCmd = new Deno.Command('git', {
        args: ['rev-parse', '--abbrev-ref', 'HEAD'],
        cwd: this.installDir,
        stdout: 'piped',
        stderr: 'null'
      })
      const currentBranchResult = await currentBranchCmd.output()
      const currentBranch = currentBranchResult.success
        ? new TextDecoder().decode(currentBranchResult.stdout).trim()
        : 'main'

      // Determine remote branch (try main first, fall back to master)
      const remoteBranch = await this.getDefaultRemoteBranch()

      // Get current commit hash
      const currentHashCmd = new Deno.Command('git', {
        args: ['rev-parse', 'HEAD'],
        cwd: this.installDir,
        stdout: 'piped'
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
        stderr: 'null'
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
        stderr: 'null'
      })
      const revListResult = await revListCmd.output()

      if (revListResult.success) {
        const commitsAhead = parseInt(new TextDecoder().decode(revListResult.stdout).trim())
        const hasUpdate = commitsAhead > 0

        return {
          hasUpdate,
          latestVersion: remoteHash,
          currentVersion: currentHash
        }
      }

      return null
    } catch (error) {
      console.log('  ⚠ Update check failed:', error.message)
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
        stderr: 'piped'
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
        stderr: 'null'
      })

      await cleanCmd.output()

      return true
    } catch (error) {
      console.error(`  ⚠ Pull failed: ${error.message}`)
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
        stderr: 'null'
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
        stderr: 'null'
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
