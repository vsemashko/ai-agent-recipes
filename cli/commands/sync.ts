import { Command } from '@cliffy/command'
import { Installer } from '../lib/installer.ts'

export const syncCommand = new Command()
  .description('Install/update/sync agent recipes (handles initial install and updates)')
  .option('-f, --force', 'Force reinstall even if already installed')
  .action(async (options) => {
    const installer = new Installer()

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
          fileHashes: {},
        }
        await installer.saveConfig(config)

        // Add to PATH
        await installer.addToPath()

        // Sync instructions
        const updatedConfig = await installer.syncInstructions(tools, config)
        await installer.saveConfig(updatedConfig)

        console.log('\n✅ Installation complete!')
        console.log(`\n📁 Installed to: ${installer.getInstallPath()}`)
        console.log('\n💡 Next steps:')
        console.log('  1. Restart your shell or run: source ~/.zshrc (or ~/.bashrc)')
        console.log('  2. Run `agent-recipes list` to see available skills')
        console.log('  3. Open your AI tools and confirm the global instructions are loaded')
      } else if (options.force) {
        // Force update - pull latest and re-sync everything
        console.log('🔄 Force updating StashAway Agent Recipes...\n')

        const config = await installer.getConfig()
        if (!config) {
          console.error('❌ Could not read config. Try reinstalling.')
          Deno.exit(1)
        }

        // Check for updates first
        const updateInfo = await installer.checkForUpdates()

        if (updateInfo?.hasUpdate) {
          console.log(`📥 Updating from ${updateInfo.currentVersion} to ${updateInfo.latestVersion}...\n`)

          // Pull latest changes
          const pullSuccess = await installer.pullLatestChanges()
          if (!pullSuccess) {
            console.error('❌ Failed to pull latest changes')
            Deno.exit(1)
          }

          console.log('✓ Repository updated to latest version\n')
        } else if (updateInfo) {
          console.log(`✓ Already on latest version (${updateInfo.currentVersion})\n`)
        }

        // Re-sync instructions
        console.log('📝 Re-syncing instructions...\n')
        const updatedConfig = await installer.syncInstructions(config.installedTools, config)
        updatedConfig.lastUpdateCheck = new Date().toISOString()
        await installer.saveConfig(updatedConfig)

        console.log('\n✅ Force update complete!')
      } else {
        // Update/sync existing installation
        console.log('🔄 Checking for updates...\n')

        const config = await installer.getConfig()
        if (!config) {
          console.error('❌ Could not read config. Try running with --force')
          Deno.exit(1)
        }

        // Check for updates
        const updateInfo = await installer.checkForUpdates()

        if (updateInfo?.hasUpdate) {
          console.log(`📦 New version available!`)
          console.log(`   Current: ${updateInfo.currentVersion}`)
          console.log(`   Latest:  ${updateInfo.latestVersion}`)
          console.log(`\n   Run \`agent-recipes sync --force\` to update\n`)
        } else if (updateInfo) {
          console.log(`✓ Up to date (${updateInfo.currentVersion})\n`)
        } else {
          console.log('✓ Version check skipped\n')
        }

        // Re-sync instructions
        console.log('📝 Syncing instructions...\n')
        const updatedConfig = await installer.syncInstructions(config.installedTools, config)

        // Update last check time
        updatedConfig.lastUpdateCheck = new Date().toISOString()
        await installer.saveConfig(updatedConfig)

        console.log('✅ Sync complete!')
      }
    } catch (error) {
      console.error('❌ Error during sync:', error)
      Deno.exit(1)
    }
  })
