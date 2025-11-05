import { Command } from '@cliffy/command'
import { Installer } from '../lib/installer.ts'

export const syncCommand = new Command()
  .description('Install/update/sync agent recipes (handles initial install and updates)')
  .option('-f, --force', 'Force reinstall even if already installed')
  .action(async (options) => {
    const installer = new Installer()

    try {
      const isInstalled = await installer.isInstalled()

      if (!isInstalled || options.force) {
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
          console.log(`📦 New version available: ${updateInfo.latestVersion}`)
          console.log('   Run `agent-recipes sync --force` to update')
        } else {
          console.log('✓ Already up to date')
        }

        // Re-sync instructions
        const updatedConfig = await installer.syncInstructions(config.installedTools, config)

        // Update last check time
        updatedConfig.lastUpdateCheck = new Date().toISOString()
        await installer.saveConfig(updatedConfig)

        console.log('\n✅ Sync complete!')
      }
    } catch (error) {
      console.error('❌ Error during sync:', error)
      Deno.exit(1)
    }
  })
