/**
 * Adjusts paths in skill content for target AI tool
 * Automatically converts tool-specific paths (e.g., ~/.claude/skills -> ~/.codex/skills)
 */
export class PathAdjuster {
  private readonly toolPaths = {
    'claude-code': {
      skillsPath: '~/.claude/skills',
      configPath: '~/.claude',
    },
    'codex': {
      skillsPath: '~/.codex/skills',
      configPath: '~/.codex',
    },
  }

  /**
   * Adjusts paths in content for specific tool
   * Replaces all known AI tool paths with the target tool's paths
   */
  adjustPaths(content: string, targetTool: 'claude-code' | 'codex'): string {
    let adjusted = content
    const targetPaths = this.toolPaths[targetTool]

    // Define all path patterns that need adjustment
    const pathReplacements = [
      // Claude Code paths
      { pattern: /~\/\.claude\/skills/g, replacement: targetPaths.skillsPath },
      { pattern: /~\/\.claude/g, replacement: targetPaths.configPath },
      { pattern: /\$HOME\/\.claude\/skills/g, replacement: targetPaths.skillsPath },
      { pattern: /\$HOME\/\.claude/g, replacement: targetPaths.configPath },

      // Codex paths
      { pattern: /~\/\.codex\/skills/g, replacement: targetPaths.skillsPath },
      { pattern: /~\/\.codex/g, replacement: targetPaths.configPath },
      { pattern: /\$HOME\/\.codex\/skills/g, replacement: targetPaths.skillsPath },
      { pattern: /\$HOME\/\.codex/g, replacement: targetPaths.configPath },
    ]

    // Apply all replacements
    // Note: More specific paths (with /skills) must be replaced first
    for (const { pattern, replacement } of pathReplacements) {
      adjusted = adjusted.replace(pattern, replacement)
    }

    return adjusted
  }

  /**
   * Get the skills path for a specific tool
   */
  getSkillsPath(tool: 'claude-code' | 'codex'): string {
    return this.toolPaths[tool].skillsPath
  }

  /**
   * Get the config path for a specific tool
   */
  getConfigPath(tool: 'claude-code' | 'codex'): string {
    return this.toolPaths[tool].configPath
  }
}
