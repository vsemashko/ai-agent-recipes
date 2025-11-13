#!/usr/bin/env -S deno run --allow-all

import { Command } from '@cliffy/command'
import { syncCommand } from './cli/commands/sync.ts'
import { listCommand } from './cli/commands/list.ts'
import { convertCommand } from './cli/commands/convert.ts'
import { infoCommand } from './cli/commands/info.ts'
import { projectCommand } from './cli/commands/project.ts'
import denoConfig from './deno.json' with { type: 'json' }

const VERSION = typeof denoConfig?.version === 'string' ? denoConfig.version : '0.0.0'

const main = new Command()
  .name('agent-recipes')
  .version(VERSION)
  .description('StashAway Agent Recipes - AI coding agent toolkit')
  .action(function () {
    this.showHelp()
  })
  .command('sync', syncCommand)
  .command('list', listCommand)
  .command('convert', convertCommand)
  .command('info', infoCommand)
  .command('project', projectCommand)

// Allow both 'agent-recipes' and 'ar' as aliases
if (import.meta.main) {
  await main.parse(Deno.args)
}

export { main }
