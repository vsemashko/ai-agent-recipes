import type { MergeStrategy } from './config-merger.ts'

export interface PlatformConfig {
  name: string
  dir: string
  skillsFormat?: 'agent-md' // If set, convert & embed skills in templates with this format
  agentsFormat?: 'claude-md' | 'opencode-json' | 'agent-md' // Agent conversion format
  agentsDir?: string // Where to output agents (relative to platform dir)
  commandsFormat?: 'claude-md' | 'opencode-json' // Command conversion format
  commandsDir?: string // Where to output commands (relative to platform dir)
  pathReplacements?: Record<string, string>
  configFile?: string // Config filename (same in both user dir and repo)
  configMergeStrategy?: MergeStrategy[] // Custom merge strategy for this platform's config
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  'claude': {
    name: 'Claude Code',
    dir: '.claude',
    // No skillsFormat = skills copied as-is to separate directory (no conversion, no embedding)
    agentsFormat: 'claude-md', // Output agents as individual .md files
    agentsDir: 'agents', // ~/.claude/agents/
    commandsFormat: 'claude-md', // Output commands as individual .md files
    commandsDir: 'commands', // ~/.claude/commands/
    configFile: 'config.json',
  },

  'codex': {
    name: 'Codex',
    dir: '.codex',
    skillsFormat: 'agent-md', // Convert & embed skills in templates
    agentsFormat: 'agent-md', // List agents in AGENTS.md (no native subagent support yet)
    // No agentsDir = agents listed in AGENTS.md only (not separate files)
    // No commandsFormat = Codex uses AGENTS.md for instructions (no slash commands)
    pathReplacements: {
      '~/.claude': '~/.codex',
    },
    configFile: 'config.toml',
  },

  'opencode': {
    name: 'OpenCode',
    dir: '.config/opencode',
    skillsFormat: 'agent-md', // Convert & embed skills in templates
    agentsFormat: 'opencode-json', // Merge agents into opencode.json
    // No agentsDir = agents merged into config file
    commandsFormat: 'opencode-json', // Merge commands into opencode.json OR output as .md files
    commandsDir: 'command', // ~/.config/opencode/command/ (also write .md files)
    pathReplacements: {
      '~/.claude': '~/.config/opencode',
    },
    configFile: 'opencode.json',
  },
}
