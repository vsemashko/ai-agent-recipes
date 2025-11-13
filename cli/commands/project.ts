/**
 * Project-level commands for agent recipes - Simplified
 */

import { Command } from '@cliffy/command'
import { ProjectInstaller } from '../lib/project-installer.ts'

/**
 * Get current working directory
 */
function getCwd(): string {
  return Deno.cwd()
}

/**
 * Project sync command - Sync project configurations
 */
const syncCommand = new Command()
  .description('Sync project-level agent recipes from central configuration')
  .argument('[path:string]', 'Project root path (defaults to current directory)', { required: false })
  .option('--providers <providers:string>', 'Comma-separated list of providers to sync (e.g., claude,opencode)', {
    required: false,
  })
  .option('--verbose, -v', 'Show verbose output')
  .action(async (options, path?: string) => {
    try {
      const projectRoot = path || getCwd()

      // Parse providers if specified
      const providers = options.providers
        ? options.providers.split(',').map((p: string) => p.trim())
        : undefined

      // Sync project
      const installer = new ProjectInstaller(projectRoot, { verbose: Boolean(options.verbose) })
      const summary = await installer.sync(providers)

      console.log('\n✅ Project sync complete!\n')
      console.log('📊 Summary:')
      console.log(`  • Providers: ${summary.providers.join(', ')}`)
      console.log(`  • Skills synced: ${summary.skillsCount}`)
      console.log(`  • Agents synced: ${summary.agentsCount}`)
      console.log(`  • Commands synced: ${summary.commandsCount}`)

      console.log('\n💡 Configurations synced to .agent-recipes/')
      console.log('📝 Commit .agent-recipes/ to your repository for team-wide consistency')
    } catch (error) {
      console.error('❌ Error:', (error as Error).message)
      Deno.exit(1)
    }
  })

/**
 * Main project command
 */
export const projectCommand = new Command()
  .description('Manage project-level agent recipes')
  .action(() => {
    projectCommand.showHelp()
  })
  .command('sync', syncCommand)
