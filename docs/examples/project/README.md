# Project-Level Configuration Examples

This directory contains example configurations for project-level agent recipes.

## Files

- **`basic-config.json`** - Minimal configuration with essential skills
- **`full-config.json`** - Complete configuration with all options
- **`.gitignore`** - Recommended gitignore for `.agent-recipes/` directory

## Usage

### Basic Setup

1. Initialize your project:
   ```bash
   agent-recipes project init --providers=claude,opencode
   ```

2. Replace `.agent-recipes/config.json` with `basic-config.json` or customize as needed

3. Sync:
   ```bash
   agent-recipes project sync
   ```

### Full Setup with Custom Agents

1. Copy `full-config.json` to your project:
   ```bash
   cp docs/examples/project/full-config.json /path/to/project/.agent-recipes/config.json
   ```

2. Create custom agents in `.agent-recipes/agents/`:
   ```bash
   # .agent-recipes/agents/code-reviewer.md
   ---
   name: code-reviewer
   description: Review code changes
   model: claude-sonnet-4
   tools: Read, Grep, Glob
   ---

   Review code for:
   - Error handling
   - Test coverage
   - Documentation
   ```

3. Create custom commands in `.agent-recipes/commands/`:
   ```bash
   # .agent-recipes/commands/build-test.md
   ---
   name: build-test
   description: Build and test project
   ---

   Run:
   1. npm run build
   2. npm test
   ```

4. Sync and commit:
   ```bash
   agent-recipes project sync
   git add .agent-recipes/
   git commit -m "chore: configure agent recipes"
   ```

## Configuration Options

### Providers

Available providers:
- `claude` - Claude Code
- `opencode` - OpenCode
- `codex` - Codex
- `cursor` - Cursor

### Skills

**Include specific skills:**
```json
{
  "skills": {
    "include": ["commit-message", "branch-name", "rightsize"]
  }
}
```

**Exclude patterns:**
```json
{
  "skills": {
    "exclude": ["document-skills-*", "skill-sandbox"]
  }
}
```

### Agents

**Use local agents:**
```json
{
  "agents": {
    "source": "local",
    "include": ["code-reviewer", "test-runner"]
  }
}
```

**Inherit from user-level:**
```json
{
  "agents": {
    "source": "inherit",
    "include": []
  }
}
```

### Provider Overrides

Customize per provider:
```json
{
  "providerOverrides": {
    "claude": {
      "model": "claude-sonnet-4"
    },
    "opencode": {
      "model": "anthropic/claude-3-5-sonnet-20241022"
    }
  }
}
```

## See Also

- [Migration Guide](../../PROJECT_LEVEL_MIGRATION.md)
- [Main Documentation](../../../AGENTS.md#project-level-support)
