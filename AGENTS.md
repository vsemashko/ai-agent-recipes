# Claude Code Instructions for StashAway Agent Recipes

This file contains instructions for working on the StashAway Agent Recipes repository itself.

## Repository Overview

**Repository**: stashaway-agent-recipes

**Purpose**: Centralized repository for reusable AI agent configurations, instructions, skills, and tools for StashAway engineering teams.

## Important Context

**When working in this repository, assume all discussions about creating agents, skills, or updating configs refer to modifying THIS repository**
(stashaway-agent-recipes), not user projects.

For example:

- "Create a new skill" → Add a skill to `skills/sa-*/` in this repo
- "Update the config" → Modify files in `instructions/{platform}/{config_file}`
- "Add agent instructions" → Update templates in `instructions/` or `instructions/GLOBAL_INSTRUCTIONS.md`
- "Modify templates" → Edit `.eta` files in `instructions/{platform}/`

These changes will be distributed to all users when they run `agent-recipes sync`.

## Technology Stack

- **Runtime**: Deno 2.x
- **CLI Framework**: Cliffy (from JSR)
- **Templating**: Eta templating engine
- **Language**: TypeScript (strict mode)
- **Testing**: Deno's built-in test runner

## Core Principles

### Template System

- Uses Eta (`.eta` files) for flexible, maintainable templates
- `instructions/GLOBAL_INSTRUCTIONS.md` is the single source of truth for global guidance
- Platform templates in `instructions/{platform}/*.eta` compose the final outputs (e.g., `CLAUDE.md.eta`, `AGENTS.md.eta`)
- Output filenames are derived from template filenames (strip `.eta` extension)
- Skills template in `instructions/common/skills.eta` provides shared boilerplate

### Platform Configuration

Platforms are configured declaratively in `cli/lib/installer.ts`:

```typescript
interface PlatformConfig {
  name: string // Display name
  dir: string // Home directory (.claude, .codex, .opencode)
  skillsFormat?: 'agent-md' // If set, convert & embed skills
  pathReplacements?: Record<string, string> // Path adjustments
}
```

**Adding a New Platform** (step-by-step):

1. Add platform config in `cli/lib/installer.ts` `PLATFORM_CONFIGS`:

```typescript
{
  key: "myplatform",              // Must match instructions directory name
  name: "My Platform",
  dir: "~/.myplatform",           // Installation directory
  skillsFormat: "agent-md",       // Optional: convert skills to this format
  configFile: "~/.myplatform/config.json",  // Optional: merge this config
  pathReplacements: {             // Optional: adjust paths in templates
    "~/.claude": "~/.myplatform"
  }
}
```

2. Create templates in `instructions/myplatform/`:
   - Template filenames determine output: `AGENTS.md.eta` → `~/.myplatform/AGENTS.md`
   - Use context variables: `<%= agents %>`, `<%= skillsSection %>`, `<%= platform %>`
   - Add managed section markers for non-destructive updates

3. Test with `deno task dev sync` to verify template rendering

4. (Optional) Define merge strategies if using `configFile`:
   - Add to `PLATFORM_CONFIGS[key].mergeStrategies`
   - Available: `array-union`, `object-merge`, `user-first`, `managed-first`, `replace`

### Skills Management

- Managed skills use `sa-` prefix in directory names
- Frontmatter: `name` (without prefix), `description`
- Synced to `~/{platform-dir}/skills/` during `agent-recipes sync`
- Skills are converted to platform-specific formats by `converter.ts`:
  - **agent-md**: Bullet point for markdown lists (used by Codex/OpenCode)
  - **cursor-mdc**: YAML frontmatter + body (Cursor editor)
  - **codex-json**: JSON object with trigger field (Codex CLI)
- Claude Code uses skills as-is (no conversion), other platforms embed converted skills in AGENTS.md

**Referencing Skills from Other Skills**:

- When referencing another skill, use the skill NAME (without `sa-` prefix)
- NOT the folder name (which has the `sa-` prefix)
- Example: Reference "rightsize" not "sa-rightsize", "branch-name" not "sa-branch-name"
- This applies to all skill references in SKILL.md files, descriptions, and documentation

### Agents & Commands Management

**Overview**: Agents and commands provide a unified, provider-agnostic way to define sub-agents and slash commands that work across Claude Code,
OpenCode, and Codex.

**Directory Structure**:

```
agents/               # Agent definitions
  └── *.md           # Each file defines one agent
commands/            # Command definitions
  └── *.md           # Each file defines one command
```

**File Format**: All agents and commands use markdown files with YAML frontmatter:

```markdown
---
name: agent-name
description: Brief description
model: claude-sonnet-4
tools: Read, Grep, Glob
---

# Agent Instructions

Your detailed agent instructions here...
```

**Core Frontmatter Fields**:

- `name` (required): Unique identifier (kebab-case)
- `description` (required): Brief description of purpose
- `model` (optional): Model override
- `tools` (optional): Comma-separated list of allowed tools
- `allowed-tools` (optional, commands only): Specific tool restrictions
- `argument-hint` (optional, commands only): Expected arguments format
- `agent` (optional, commands only): Link to specific agent

**Provider-Specific Overrides**:

Use `provider-overrides` to specify provider-specific values:

```yaml
---
name: my-agent
description: Example agent
model: sonnet
tools: Read, Grep, Glob
provider-overrides:
  claude:
    model: claude-sonnet-4
  opencode:
    model: anthropic/claude-3-5-sonnet-20241022
    temperature: 0.7
    tools:
      read: true
      grep: true
  codex:
    model: gpt-4.1
---
```

**Command Arguments**:

Commands support universal argument placeholders:

- `$ARGUMENTS` - All arguments as a single string
- `$1`, `$2`, `$3`, etc. - Individual positional arguments

Example:

```markdown
---
name: review-pr
argument-hint: '[pr-number] [priority] [assignee]'
---

Review PR #$1 with priority $2 and assign to $3
```

**Tools Format Conversion**:

The system automatically converts tools to platform-specific formats:

- **Claude/Codex**: String format (`"Read, Grep, Glob"`)
- **OpenCode**: Object format (`{ read: true, grep: true }`)

**Sync Process**:

During `agent-recipes sync`, the system:

1. Reads all `agents/*.md` and `commands/*.md` files
2. Parses YAML frontmatter and markdown body
3. Applies provider-specific overrides for each platform
4. Converts tools format based on platform requirements
5. Writes to platform-specific directories:
   - Claude: `~/.claude/agents/`, `~/.claude/commands/`
   - OpenCode: `~/.config/opencode/agent/`, `~/.config/opencode/command/`
   - Codex: Commands only to `~/.codex/prompts/`

**Native Discovery**: All providers automatically discover agents and commands from their respective directories. No explicit listing required.

## System Architecture

### Module Organization

The CLI is organized into specialized modules in `cli/lib/`:

| Module                         | Lines | Responsibility                                                              |
| ------------------------------ | ----- | --------------------------------------------------------------------------- |
| `installer.ts`                 | 1400+ | Orchestrates sync, repository discovery, template rendering, config merging |
| `config-merger.ts`             | 631+  | Three-way merge algorithm for configuration files                           |
| `state-manager.ts`             | 202   | Persists installation state and merge tracking                              |
| `config-format.ts`             | 183   | Auto-detects and parses JSON/JSONC/YAML/TOML formats                        |
| `converter.ts`                 | 121   | Transforms skills between platform-specific formats                         |
| `agents-commands-converter.ts` | 150+  | Parses and transforms agents/commands for platform-specific formats         |
| `platform-config.ts`           | 100+  | Defines platform configurations and tool format mappings                    |

**Dependency Flow**:

```
Commands (sync.ts, list.ts)
    ↓
Installer (core orchestrator)
    ├→ StateManager (persist state.json)
    ├→ ConfigMerger (three-way merge)
    ├→ ConfigParserFactory (detect format)
    ├→ Converter (transform skills)
    └→ AgentsCommandsConverter (transform agents & commands)
```

### Installation & Sync Process

**Repository Discovery** (cli/lib/installer.ts:197-226):

1. Checks `AGENT_RECIPES_HOME` environment variable
2. Falls back to `~/.stashaway-agent-recipes/repo/`
3. Checks runtime-relative path (for bundled binary)
4. Searches for `instructions/` or `skills/` directories

**Directory Structure Created**:

```
~/.stashaway-agent-recipes/
├── config.json          # Installation metadata
├── state.json           # Merge state tracking (base configs for three-way merge)
├── bin/
│   └── agent-recipes   # CLI binary
└── repo/               # Git repository (if installed from git)
```

**Sync Flow** (cli/lib/installer.ts):

1. Load `GLOBAL_INSTRUCTIONS.md` content
2. For each platform:
   - Convert skills to platform format (if `skillsFormat` specified)
   - Render `instructions/common/skills.eta` template
   - Discover all `.eta` templates in `instructions/{platform}/`
   - Render each template with context: `{ agents, skillsSection, skillsList, platform }`
   - Apply managed section markers (`<stashaway-recipes-managed-section>`)
   - Write to `~/.{platform-dir}/` (e.g., `~/.claude/CLAUDE.md`)
3. Sync skills with `sa-` prefix to `~/.{platform-dir}/skills/`
4. Sync agents from `agents/*.md` to platform-specific agent directories
5. Sync commands from `commands/*.md` to platform-specific command directories
6. Merge platform config files (if specified)

**Managed Section System** (cli/lib/installer.ts:399-462):

- Preserves user content above `<stashaway-recipes-managed-section>` marker
- Replaces only managed block on sync (non-destructive updates)
- Creates section on first sync if missing

### Configuration Merging System

**Why Three-Way Merge?**

- Problem: How to sync managed configs while preserving user customizations?
- Solution: Track "base" (last synced), detect user changes separately, apply managed changes
- Benefit: Non-destructive updates, conflict visibility, user control

**State Tracking** (`~/.stashaway-agent-recipes/state.json`):

```typescript
{
  version: "1.0",
  lastSync: "2024-01-15T10:30:00Z",
  recipesVersion: "0.1.1",
  configs: {
    "claude": {
      "~/.claude/config.json": {
        // This is the last MANAGED config we synced (base for merge)
        // NOT the user's current config
      }
    }
  }
}
```

**Merge Algorithm** (cli/lib/config-merger.ts):

1. Load base config from `state.json` (what we last installed)
2. Load user's current config file
3. Load managed config from repo
4. Call `threeWayMerge(base, user, managed)`
5. Detect conflicts (user modified fields we also changed)
6. Show preview, ask for approval if conflicts exist
7. Write merged result to user config
8. Update `state.json` with managed config (for next merge)

**Merge Strategies** (configurable per field):

- `array-union`: Combine arrays, remove duplicates
- `object-merge`: Deep merge objects
- `user-first`: Prefer user's value in conflicts
- `managed-first`: Prefer managed value in conflicts
- `replace`: Replace entire value

**Conflict Detection**:

- User modified: `user !== base`
- Managed changed: `managed !== base`
- Conflict: Both conditions true for same field

### Template Context

Templates receive the following context variables:

```typescript
{
  agents: string // GLOBAL_INSTRUCTIONS.md content
  skillsList: string // Raw list of skills (if any)
  skillsSection: string // Rendered skills.eta template output
  platform: string // Platform key (claude, codex, opencode)
}
```

Access in templates: `<%= agents %>`, `<%= skillsSection %>`, etc.

### Environment Variables

- `AGENT_RECIPES_HOME` - Override installation directory (default: `~/.stashaway-agent-recipes`)
- `AGENT_RECIPES_MODIFY_PATH` - Set to `0` to skip PATH updates
- `AGENT_RECIPES_SOURCE_BRANCH` - Override branch for updates
- `SHELL` - Detected to add binary to correct rc file

## Development Workflow

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions on:

- Adding skills
- Creating CLI commands
- Modifying templates
- Testing and releasing

### Quick Commands

```bash
# Development
deno task dev --help           # Run CLI in dev mode
deno task build                # Compile binary (outputs to bin/agent-recipes)
deno task lint                 # Run linter
deno task fmt                  # Format code
deno test                      # Run all tests

# Testing specific modules
deno test cli/lib/installer.test.ts
deno test cli/lib/config-merger.test.ts

# Release (interactive workflow)
deno task release              # Runs lint/tests, prompts for version, opens CHANGELOG editor
                               # Updates deno.json, creates git commit and tag (main only)

# Sync testing
agent-recipes sync             # Test sync functionality
agent-recipes list             # Verify skills detected
```

## Recording Changes

- Update `CHANGELOG.md` whenever skills, instructions, or CLI features change
- Keep the `Unreleased` section current during development
- Move entries to versioned sections during release prep
- Include manual follow-up steps users must perform
- Capture instruction changes, skill updates, and CLI behavior adjustments

## Code Quality Standards

### Style Guidelines

- Write clean, readable code following existing patterns
- Use TypeScript strict mode with no implicit any
- Prefer async/await over callbacks
- Add JSDoc comments for public APIs
- Follow Deno formatting conventions

### Architecture Decisions

- **Convention over configuration**: Predictable file locations and naming
- **Declarative configs**: Keep logic in code, data in configs
- **Simplicity first**: Prefer straightforward solutions
- **Type safety**: Leverage TypeScript for correctness
- **Zero dependencies (where possible)**: Minimize external deps

## Troubleshooting

### Common Issues

**Config merge conflicts**:

- Check `~/.stashaway-agent-recipes/state.json` for base config
- Compare with your current config to see what changed
- Use `--force` flag to replace user config entirely (destructive)

**Repository not found**:

- Verify `AGENT_RECIPES_HOME` points to correct directory
- Check that `instructions/` or `skills/` directories exist
- Try reinstalling: remove `~/.stashaway-agent-recipes` and run install again

**Skills not syncing**:

- Ensure skill directories have `sa-` prefix for managed skills
- Verify frontmatter has required `name` and `description` fields
- Check `agent-recipes list` to see what's detected

**Agents/Commands not syncing**:

- Verify files are in `agents/` or `commands/` directories
- Check frontmatter has required `name` and `description` fields
- Ensure YAML frontmatter is valid (quote values with special characters)
- Run `agent-recipes sync --verbose` to see detailed sync output
- Verify platform supports agents/commands (Codex: commands only)

**Template rendering errors**:

- Validate Eta syntax in `.eta` files
- Ensure context variables are correctly referenced: `<%= variable %>`
- Check for missing closing tags

**State management issues**:

- Delete `~/.stashaway-agent-recipes/state.json` to reset merge tracking
- Next sync will treat managed config as base (may lose user customizations)

## Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Sanitize all user inputs
- Follow OWASP best practices
- Review security implications of all changes

## Branch Naming & Commits

Use the **sa-commit-message** skill for proper formatting following StashAway standards.

---

_For repository structure details and conventions, see AGENTS.md. For detailed development workflows, see CONTRIBUTING.md._
