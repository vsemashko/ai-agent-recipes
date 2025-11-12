import type { MergeStrategy } from './config-merger.ts'

export interface PlatformConfig {
  name: string
  dir: string
  skillsFormat?: 'agent-md' // If set, convert & embed skills in templates with this format
  pathReplacements?: Record<string, string>
  configFile?: string // Config filename (same in both user dir and repo)
  configMergeStrategy?: MergeStrategy[] // Custom merge strategy for this platform's config
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  'claude': {
    name: 'Claude Code',
    dir: '.claude',
    // No skillsFormat = skills copied as-is to separate directory (no conversion, no embedding)
    configFile: 'settings.json',
  },

  'codex': {
    name: 'Codex',
    dir: '.codex',
    skillsFormat: 'agent-md', // Convert & embed skills in templates
    pathReplacements: {
      '~/.claude': '~/.codex',
    },
    configFile: 'config.toml',
  },

  'opencode': {
    name: 'OpenCode',
    dir: '.config/opencode',
    skillsFormat: 'agent-md', // Convert & embed skills in templates
    pathReplacements: {
      '~/.claude': '~/.config/opencode',
    },
    configFile: 'opencode.json',
  },
}
