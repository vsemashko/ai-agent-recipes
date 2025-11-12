import { Command } from '@cliffy/command'
import { Installer } from '../lib/installer.ts'

export const syncCommand = new Command()
  .description('Install/update/sync agent recipes (handles initial install and updates)')
  .option('--skip-configs', 'Skip syncing configuration files')
  .option('--yes, -y', 'Auto-approve all changes without prompting')
  .option('--verbose, -v', 'Show verbose output during sync')
  .action(async (options) => {
    const installer = new Installer({ verbose: Boolean(options.verbose) })

    try {
      const isInstalled = await installer.isInstalled()

      if (!isInstalled) {
        // First time installation
        console.log('🚀 Installing StashAway Agent Recipes...\n')

        // Ensure directories exist
        await installer.ensureDirectories()

        // Prompt for tools
        const tools = await installer.promptForTools()

        if (tools.length === 0) {
          console.log('\n⚠ No tools selected. You can run `agent-recipes sync` later to set up.')
          return
        }

        // Save initial config
        const config = {
          version: '0.1.0',
          installedTools: tools,
          lastUpdateCheck: new Date().toISOString(),
          installPath: installer.getInstallPath(),
        }
        await installer.saveConfig(config)

        // Add to PATH
        if (installer.shouldModifyPath()) {
          await installer.addToPath()
        } else {
          console.log('ℹ Skipping PATH updates (AGENT_RECIPES_MODIFY_PATH=0)')
        }

        // Sync instructions
        const updatedConfig = await installer.syncInstructions(tools, config)
        await installer.saveConfig(updatedConfig)

        // Sync configs (if not skipped)
        if (!options.skipConfigs) {
          await installer.syncConfigs(tools, updatedConfig, Boolean(options.yes))
        }

        const installedVersion = await installer.getInstalledRecipesVersion()
        await installer.recordInstalledRecipesVersion(installedVersion)

        console.log('\n✅ Installation complete!')
        console.log(`\n📁 Installed to: ${installer.getInstallPath()}`)
        console.log('\n💡 Next steps:')
        console.log('  1. Restart your shell or run: source ~/.zshrc (or ~/.bashrc)')
        console.log('  2. Run `agent-recipes list` to see available skills')
        console.log('  3. Open your AI tools and confirm the global instructions are loaded')
        return
      }

      console.log('🔄 Reinstalling latest recipes...\n')

      const config = await installer.getConfig()
      if (!config) {
        console.error('❌ Could not read config. Try reinstalling.')
        Deno.exit(1)
      }

      const previousVersion = await installer.getInstalledRecipesVersion()
      const updateInfo = await installer.checkForUpdates()

      if (updateInfo?.hasUpdate) {
        console.log(`📦 Update available (${previousVersion ?? 'unknown'} → latest)\n`)
      } else if (updateInfo) {
        const versionInfo = previousVersion ?? 'unknown'
        const commitInfo = updateInfo.currentCommit ? ` (${updateInfo.currentCommit})` : ''
        console.log(`✓ Already on latest version ${versionInfo}${commitInfo}\n`)
      } else {
        console.log('✓ Version check skipped\n')
      }

      console.log('📥 Refreshing repository files...\n')
      const pullSuccess = await installer.pullLatestChanges()
      if (pullSuccess) {
        console.log('✓ Repository refreshed\n')

        const newVersion = await installer.getInstalledRecipesVersion()
        if (updateInfo?.hasUpdate) {
          console.log(`📦 Updated recipes to ${newVersion ?? 'latest'} (was ${previousVersion ?? 'unknown'})`)
          const changelogReference = updateInfo.changelogUrl ?? 'CHANGELOG.md'
          console.log(`📄 Changelog: ${changelogReference}\n`)
        }
        await installer.recordInstalledRecipesVersion(newVersion)
      } else {
        console.log('  ⚠ Could not refresh repository automatically (non-git install?)')
        console.log('    Continuing with existing files\n')

        if (updateInfo?.hasUpdate) {
          console.error('❌ Failed to pull latest changes')
          Deno.exit(1)
        }
      }

      const updatedConfig = await installer.syncInstructions(config.installedTools, config)
      updatedConfig.lastUpdateCheck = new Date().toISOString()
      await installer.saveConfig(updatedConfig)

      // Sync configs (if not skipped)
      if (!options.skipConfigs) {
        await installer.syncConfigs(config.installedTools, updatedConfig, Boolean(options.yes))
      }

      console.log('✅ Sync complete!')
    } catch (error) {
      console.error('❌ Error during sync:', error)
      Deno.exit(1)
    }
  })
