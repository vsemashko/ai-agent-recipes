import type { MergeStrategy } from './config-merger.ts'

/**
 * Tool format types for different providers
 */
export type ToolsFormat = 'string' | 'object' | 'array'

export interface PlatformConfig {
  name: string
  dir: string
  skillsFormat?: 'agent-md' | 'cursor-mdc' // If set, convert & embed skills in templates with this format
  pathReplacements?: Record<string, string>
  configFile?: string // Config filename (same in both user dir and repo)
  configMergeStrategy?: MergeStrategy[] // Custom merge strategy for this platform's config

  // Agents & Commands support (file-based)
  agentsDir?: string // Subdirectory for agent files (e.g., 'agents', 'agent')
  commandsDir?: string // Subdirectory for command files (e.g., 'commands', 'command', 'prompts')
  rulesDir?: string // Subdirectory for Cursor rules (e.g., '.cursorrules', 'rules')
  toolsFormat?: ToolsFormat // Format for tools field in agents/commands
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  'claude': {
    name: 'Claude Code',
    dir: '.claude',
    // No skillsFormat = skills copied as-is to separate directory (no conversion, no embedding)
    configFile: 'settings.json',
    // Agents and commands as separate markdown files
    agentsDir: 'agents',
    commandsDir: 'commands',
    toolsFormat: 'string', // "Read, Grep, Glob"
  },

  'codex': {
    name: 'Codex',
    dir: '.codex',
    skillsFormat: 'agent-md', // Convert & embed skills in templates
    pathReplacements: {
      '~/.claude': '~/.codex',
    },
    configFile: 'config.toml',
    // Commands only (agents not well documented in Codex)
    commandsDir: 'prompts',
    toolsFormat: 'string', // "Read, Grep, Glob"
  },

  'opencode': {
    name: 'OpenCode',
    dir: '.config/opencode',
    skillsFormat: 'agent-md', // Convert & embed skills in templates
    pathReplacements: {
      '~/.claude': '~/.config/opencode',
    },
    configFile: 'opencode.json',
    // Both as separate markdown files
    agentsDir: 'agent',
    commandsDir: 'command',
    toolsFormat: 'object', // { read: true, grep: true }
  },

  'cursor': {
    name: 'Cursor',
    dir: '.cursor',
    skillsFormat: 'cursor-mdc', // Cursor uses MDC format with globs
    pathReplacements: {
      '~/.claude': '~/.cursor',
    },
    // Cursor uses .cursorrules directory
    rulesDir: 'rules',
    toolsFormat: 'string',
  },
}
