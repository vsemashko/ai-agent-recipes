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

    if (!this.homeDir) {
      throw new Error('Could not determine home directory. Please set HOME or USERPROFILE environment variable.')
    }

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
    } catch (error) {
      console.error('⚠ Warning: Could not read config file:', error instanceof Error ? error.message : 'Unknown error')
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

    // Check for Cursor
    const cursorPaths = [
      join(this.homeDir, '.cursor'),
      join(this.homeDir, 'Library', 'Application Support', 'Cursor')
    ]
    for (const path of cursorPaths) {
      if (await exists(path)) {
        tools.push('cursor')
        break
      }
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
        default: true
      })

      if (useDetected) return detectedTools
    }

    console.log('\nWhich AI coding tools do you use? (select all that apply)\n')

    const selectedTools: string[] = []

    const tools = [
      { name: 'Claude Code', value: 'claude-code' },
      { name: 'Codex CLI', value: 'codex' },
      { name: 'Cursor (project-specific only)', value: 'cursor' }
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
        } else if (tool === 'cursor') {
          console.log('ℹ Cursor support is deferred until project-specific templates return')
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

    await this.syncFileWithHash(
      join(sourcePath, 'CLAUDE.md'),
      join(targetPath, 'CLAUDE.md'),
      config,
      'claude-code/CLAUDE.md',
      'Claude Code CLAUDE.md',
    )

    await this.syncFileWithHash(
      join(sourcePath, 'AGENTS.md'),
      join(targetPath, 'AGENTS.md'),
      config,
      'claude-code/AGENTS.md',
      'Claude Code AGENTS.md',
    )

    const skillsSource = join(sourcePath, 'skills')
    const skillsTarget = join(targetPath, 'skills')

    if (await exists(skillsSource)) {
      try {
        // Check if symlink already exists and points to the right location
        if (await exists(skillsTarget)) {
          try {
            const linkInfo = await Deno.lstat(skillsTarget)
            if (linkInfo.isSymlink) {
              const currentTarget = await Deno.readLink(skillsTarget)
              if (currentTarget === skillsSource) {
                console.log('  ✓ Skills symlink already exists')
                return
              }
              // Remove old symlink if it points elsewhere
              await Deno.remove(skillsTarget)
            } else {
              // If it's a directory, remove it
              await Deno.remove(skillsTarget, { recursive: true })
            }
          } catch {
            // If we can't check, try to remove and recreate
            await Deno.remove(skillsTarget, { recursive: true }).catch(() => {})
          }
        }

        await Deno.symlink(skillsSource, skillsTarget, { type: 'dir' })
        console.log('  ✓ Created symlink for skills')
      } catch (error) {
        console.log('  ℹ Could not create symlink, copying directory instead')
        await this.copyDirectory(skillsSource, skillsTarget)
        console.log('  ✓ Copied skills directory')
      }
    }
  }

  private async syncCodex(repoRoot: string, config: InstallConfig): Promise<void> {
    const sourcePath = join(repoRoot, 'instructions', 'codex')
    if (!await exists(sourcePath)) {
      console.log('ℹ Codex instructions not found in repository')
      return
    }

    const targetPath = join(this.homeDir, '.codex')
    await Deno.mkdir(targetPath, { recursive: true })

    await this.syncFileWithHash(
      join(sourcePath, 'agents.json'),
      join(targetPath, 'agents.json'),
      config,
      'codex/agents.json',
      'Codex agents.json',
    )
  }

  private async syncFileWithHash(
    source: string,
    target: string,
    config: InstallConfig,
    hashKey: string,
    description: string,
  ): Promise<void> {
    try {
      if (!await exists(source)) {
        console.log(`  ℹ Skipped ${description}: source file not found`)
        return
      }

      config.fileHashes ??= {}
      const hashes = config.fileHashes

      const sourceContent = await Deno.readTextFile(source)
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
    } catch (error) {
      console.error(`  ❌ Failed to sync ${description}:`, error instanceof Error ? error.message : 'Unknown error')
      throw error
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

  private async computeHash(content: string | Uint8Array): Promise<string> {
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : content
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  async checkForUpdates(): Promise<{ hasUpdate: boolean; latestVersion: string } | null> {
    try {
      // TODO: Implement actual update checking against GitLab
      // For now, return null
      return null
    } catch {
      return null
    }
  }

  getInstallPath(): string {
    return this.installDir
  }

  getBinPath(): string {
    return this.binPath
  }
}
