/**
 * Project-level commands for agent recipes
 */

import { Command } from '@cliffy/command'
import { Table } from '@cliffy/table'
import { Confirm, Select } from '@cliffy/prompt'
import { ProjectInstaller } from '../lib/project-installer.ts'
import { ProjectConfigManager } from '../lib/project-config.ts'
import { PLATFORM_CONFIGS } from '../lib/platform-config.ts'

/**
 * Get current working directory
 */
function getCwd(): string {
  return Deno.cwd()
}

/**
 * Project init command - Initialize project-level agent recipes
 */
const initCommand = new Command()
  .description('Initialize project-level agent recipes')
  .option('--providers <providers:string>', 'Comma-separated list of providers (e.g., claude,opencode,codex)', {
    required: false,
  })
  .option('--skills <skills:string>', 'Comma-separated list of skills to include', { required: false })
  .option('--verbose, -v', 'Show verbose output')
  .action(async (options) => {
    try {
      const projectRoot = getCwd()
      const configManager = new ProjectConfigManager(projectRoot)

      // Check if already initialized
      if (await configManager.exists()) {
        console.error('❌ Project already initialized at .agent-recipes/')
        console.log('💡 Use "agent-recipes project sync" to update existing configuration')
        Deno.exit(1)
      }

      console.log('🚀 Initializing project-level agent recipes...\n')

      // Prompt for providers if not specified
      let providers: string[]
      if (options.providers) {
        providers = options.providers.split(',').map((p: string) => p.trim())
      } else {
        const availableProviders = Object.keys(PLATFORM_CONFIGS)
        const selectedProviders = await Select.prompt({
          message: 'Select providers to enable (use space to select, enter to confirm):',
          options: availableProviders.map((key) => ({
            name: PLATFORM_CONFIGS[key].name,
            value: key,
          })),
          default: 'claude',
        })
        providers = [selectedProviders]
      }

      // Prompt for skills if not specified
      let skills: string[] | undefined
      if (options.skills) {
        skills = options.skills.split(',').map((s: string) => s.trim())
      } else {
        const includeDefaultSkills = await Confirm.prompt({
          message: 'Include default skills (commit-message, branch-name)?',
          default: true,
        })
        skills = includeDefaultSkills ? ['commit-message', 'branch-name'] : []
      }

      // Initialize project
      const installer = new ProjectInstaller(projectRoot, { verbose: Boolean(options.verbose) })
      await installer.init(providers, skills)

      console.log('\n✅ Project initialized successfully!')
      console.log(`\n📁 Configuration saved to: ${projectRoot}/.agent-recipes/`)
      console.log('\n💡 Next steps:')
      console.log('  1. Review and customize .agent-recipes/config.json')
      console.log('  2. Run "agent-recipes project sync" to sync configurations')
      console.log('  3. Add project-specific agents to .agent-recipes/agents/')
      console.log('  4. Add project-specific commands to .agent-recipes/commands/')
      console.log('  5. Commit .agent-recipes/ to your repository')
    } catch (error) {
      console.error('❌ Error:', (error as Error).message)
      Deno.exit(1)
    }
  })

/**
 * Project sync command - Sync project configurations
 */
const syncCommand = new Command()
  .description('Sync project-level agent recipes')
  .argument('[path:string]', 'Project root path (defaults to current directory)', { required: false })
  .option('--verbose, -v', 'Show verbose output')
  .action(async (options, path?: string) => {
    try {
      const projectRoot = path || getCwd()
      const configManager = new ProjectConfigManager(projectRoot)

      // Check if initialized
      if (!await configManager.exists()) {
        console.error('❌ Project not initialized. Run "agent-recipes project init" first.')
        Deno.exit(1)
      }

      // Sync project
      const installer = new ProjectInstaller(projectRoot, { verbose: Boolean(options.verbose) })
      const summary = await installer.sync()

      console.log('\n✅ Project sync complete!\n')
      console.log('📊 Summary:')
      console.log(`  • Providers: ${summary.providers.join(', ')}`)
      console.log(`  • Skills synced: ${summary.skillsCount}`)
      console.log(`  • Agents synced: ${summary.agentsCount}`)
      console.log(`  • Commands synced: ${summary.commandsCount}`)

      console.log('\n💡 Remember to commit changes to your repository!')
    } catch (error) {
      console.error('❌ Error:', (error as Error).message)
      Deno.exit(1)
    }
  })

/**
 * Project list command - List project skills and configuration
 */
const listCommand = new Command()
  .description('List project-level skills and configuration')
  .argument('[path:string]', 'Project root path (defaults to current directory)', { required: false })
  .option('--available', 'Show available skills from repository')
  .action(async (options, path?: string) => {
    try {
      const projectRoot = path || getCwd()
      const configManager = new ProjectConfigManager(projectRoot)

      // Check if initialized
      if (!await configManager.exists()) {
        console.error('❌ Project not initialized. Run "agent-recipes project init" first.')
        Deno.exit(1)
      }

      const config = await configManager.load()

      console.log('📦 Project Configuration\n')
      console.log(`Providers: ${config.providers.join(', ')}`)
      console.log(`Skills included: ${config.skills?.include?.join(', ') || 'none'}`)
      console.log(`Skills excluded: ${config.skills?.exclude?.join(', ') || 'none'}`)
      console.log(`Agents source: ${config.agents?.source || 'local'}`)
      console.log(`Commands source: ${config.commands?.source || 'local'}`)

      // Show available skills if requested
      if (options.available) {
        console.log('\n📚 Available Skills:\n')
        const installer = new ProjectInstaller(projectRoot)
        const availableSkills = await installer.listAvailableSkills()

        const table = new Table()
          .header(['Name', 'Directory'])
          .body(availableSkills.map((skill) => [skill.name, skill.dirName]))

        table.render()
      }
    } catch (error) {
      console.error('❌ Error:', (error as Error).message)
      Deno.exit(1)
    }
  })

/**
 * Project add-skill command - Add a skill to project
 */
const addSkillCommand = new Command()
  .description('Add a skill to project configuration')
  .argument('<skill:string>', 'Skill name (without sa- prefix)')
  .option('--verbose, -v', 'Show verbose output')
  .action(async (options, skill: string) => {
    try {
      const projectRoot = getCwd()
      const configManager = new ProjectConfigManager(projectRoot)

      // Check if initialized
      if (!await configManager.exists()) {
        console.error('❌ Project not initialized. Run "agent-recipes project init" first.')
        Deno.exit(1)
      }

      const installer = new ProjectInstaller(projectRoot, { verbose: Boolean(options.verbose) })
      await installer.addSkill(skill)

      console.log(`\n✅ Added skill "${skill}" to project`)
      console.log('💡 Run "agent-recipes project sync" to apply changes')
    } catch (error) {
      console.error('❌ Error:', (error as Error).message)
      Deno.exit(1)
    }
  })

/**
 * Project remove-skill command - Remove a skill from project
 */
const removeSkillCommand = new Command()
  .description('Remove a skill from project configuration')
  .argument('<skill:string>', 'Skill name (without sa- prefix)')
  .option('--verbose, -v', 'Show verbose output')
  .action(async (options, skill: string) => {
    try {
      const projectRoot = getCwd()
      const configManager = new ProjectConfigManager(projectRoot)

      // Check if initialized
      if (!await configManager.exists()) {
        console.error('❌ Project not initialized. Run "agent-recipes project init" first.')
        Deno.exit(1)
      }

      const installer = new ProjectInstaller(projectRoot, { verbose: Boolean(options.verbose) })
      await installer.removeSkill(skill)

      console.log(`\n✅ Removed skill "${skill}" from project`)
      console.log('💡 Run "agent-recipes project sync" to apply changes')
    } catch (error) {
      console.error('❌ Error:', (error as Error).message)
      Deno.exit(1)
    }
  })

/**
 * Project validate command - Validate project configuration
 */
const validateCommand = new Command()
  .description('Validate project configuration')
  .argument('[path:string]', 'Project root path (defaults to current directory)', { required: false })
  .action(async (_options, path?: string) => {
    try {
      const projectRoot = path || getCwd()
      const configManager = new ProjectConfigManager(projectRoot)

      // Check if initialized
      if (!await configManager.exists()) {
        console.error('❌ Project not initialized. Run "agent-recipes project init" first.')
        Deno.exit(1)
      }

      const installer = new ProjectInstaller(projectRoot)
      await installer.validate()

      console.log('✅ Project configuration is valid')
    } catch (error) {
      console.error('❌ Validation failed:', (error as Error).message)
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
  .command('init', initCommand)
  .command('sync', syncCommand)
  .command('list', listCommand)
  .command('add-skill', addSkillCommand)
  .command('remove-skill', removeSkillCommand)
  .command('validate', validateCommand)
