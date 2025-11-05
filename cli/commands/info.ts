import { Command } from '@cliffy/command'
import { Installer } from '../lib/installer.ts'

export const infoCommand = new Command()
  .description('Show installation info and configured tools')
  .action(async () => {
    const installer = new Installer()

    console.log('ℹ️  StashAway Agent Recipes Information\n')

    const isInstalled = await installer.isInstalled()

    if (!isInstalled) {
      console.log('❌ Not installed')
      console.log('\n💡 Run `agent-recipes sync` to install')
      return
    }

    const config = await installer.getConfig()

    if (!config) {
      console.log('❌ Could not read configuration')
      return
    }

    console.log('Installation:')
    console.log(`  Status: ✅ Installed`)
    console.log(`  Version: ${config.version}`)
    console.log(`  Location: ${config.installPath}`)
    console.log(`  Binary: ${installer.getBinPath()}/agent-recipes`)

    console.log('\nConfigured Tools:')
    if (config.installedTools.length > 0) {
      for (const tool of config.installedTools) {
        console.log(`  • ${tool}`)
      }
    } else {
      console.log('  (none)')
    }

    console.log('\nLast Update Check:')
    const lastCheck = new Date(config.lastUpdateCheck)
    console.log(`  ${lastCheck.toLocaleString()}`)

    if (config.customPaths && Object.keys(config.customPaths).length > 0) {
      console.log('\nCustom Paths:')
      for (const [tool, path] of Object.entries(config.customPaths)) {
        console.log(`  ${tool}: ${path}`)
      }
    }

    console.log('\n💡 Available Commands:')
    console.log('  agent-recipes sync       - Update installation and sync instructions')
    console.log('  agent-recipes list       - List available skills')
    console.log('  agent-recipes convert    - Convert skills between formats (maintainers only)')
    console.log('  agent-recipes info       - Show this information')
  })
