# StashAway Agent Recipes

A centralized repository for reusable configurations, instructions, skills, agents, and slash commands for AI coding assistants (Claude Code,
OpenCode, Codex CLI).

## 🎯 What is This?

Agent Recipes makes it easy to:

- 🤖 Configure AI coding assistants with StashAway's standards and best practices
- 🔧 Share reusable skills, agents, and slash commands across your team
- 📚 Maintain consistent AI agent behavior across projects
- 🚀 Get new team members productive with AI tools quickly

## 🚀 Quick Start

### Installation

```bash
# Option 1: Quick install (recommended)
command -v glab >/dev/null || brew install glab
glab api --hostname gitlab.stashaway.com \
  "projects/vladimir.semashko%2Fstashaway-agent-recipes/repository/files/install.sh/raw?ref=main" \
  | sh

# Option 2: From source
git clone git@gitlab.stashaway.com:vladimir.semashko/stashaway-agent-recipes.git
cd stashaway-agent-recipes
./install.sh
```

After installation, restart your shell:

```bash
source ~/.zshrc  # or ~/.bashrc
```

### Sync Instructions

```bash
# Install and configure instructions for Claude Code and Codex CLI
agent-recipes sync
```

The CLI will prompt before overwriting any local changes.

## 💻 Usage

### Available Commands

```bash
agent-recipes sync           # Install/update/sync everything
agent-recipes list           # List available skills
agent-recipes info           # Show installation info
```

### Using Skills

Skills provide specialized guidance for common StashAway workflows. Browse available skills in the `skills/` directory:

- **rightsize** - Check and optimize Kubernetes resource allocations
- **commit-message** - Generate properly formatted commit messages

To use a skill, simply ask Claude naturally:

```
"Can you check if this service is rightsized?"
"Create a commit for these changes"
```

### Using Agents & Slash Commands

**Agents** are sub-agents with specialized expertise. They automatically get invoked based on context or you can explicitly request them:

```
"Can you review this code?" (uses code-reviewer agent)
"Switch to the code-reviewer agent and check this PR"
```

**Slash Commands** are quick prompts with arguments:

```
/fix-issue 123                    # Fix issue #123
/review-pull-request 456 high     # Review PR #456 with high priority
```

Available agents and commands are synced to your AI tool and discovered automatically. Browse the `agents/` and `commands/` directories to see what's
available.

## 🛠️ Supported AI Tools

### Claude Code

- **Location**: `~/.claude/`
- **Format**: Global instructions (CLAUDE.md, AGENTS.md) + skills, agents, and commands
- **Setup**: Automatic via `agent-recipes sync`

### OpenCode

- **Location**: `~/.config/opencode/`
- **Format**: AGENTS.md with embedded instructions + skills, agents, and commands
- **Setup**: Automatic via `agent-recipes sync`

### Codex CLI

- **Location**: `~/.codex/`
- **Format**: AGENTS.md with embedded instructions + skills and commands
- **Setup**: Automatic via `agent-recipes sync`

## 🔄 Keeping Up to Date

The CLI automatically checks for updates:

```bash
agent-recipes sync
```

**How it works:**

- Installed as a git repository in `~/.stashaway-agent-recipes/`
- `sync` checks for new commits, pulls them, and refreshes instructions
- Instructions and skills are automatically updated

## 📁 What Gets Installed?

### For Claude Code Users

- Global instructions → `~/.claude/CLAUDE.md` and `~/.claude/AGENTS.md`
- Skills directory → `~/.claude/skills/` (managed copies with `sa-` prefix)
- Agents directory → `~/.claude/agents/` (sub-agents for specialized tasks)
- Commands directory → `~/.claude/commands/` (slash commands with arguments)
- Settings → `~/.claude/settings.json` (merged with user settings)

### For OpenCode Users

- Instructions → `~/.config/opencode/AGENTS.md` (auto-generated from instructions + skills)
- Agents directory → `~/.config/opencode/agent/` (sub-agents for specialized tasks)
- Commands directory → `~/.config/opencode/command/` (slash commands with arguments)
- Config → `~/.config/opencode/opencode.json` (merged with user config)

### For Codex CLI Users

- Instructions → `~/.codex/AGENTS.md` (auto-generated from instructions + skills)
- Commands directory → `~/.codex/prompts/` (slash commands with arguments)
- Config → `~/.codex/config.toml` (merged with user config)

### CLI Tool

- Installed to `~/.stashaway-agent-recipes/`
- Binary at `~/.stashaway-agent-recipes/bin/agent-recipes`
- Added to your PATH automatically
- State tracking → `~/.stashaway-agent-recipes/state.json` (for config merging)

## ✏️ Customizing

### Global Instructions (CLAUDE.md / AGENTS.md)

The synced files use **managed sections**. You can safely add your own content above the custom instructions tag:

```markdown
# My Custom Instructions

- Add team policies here
- Everything above the tag stays untouched

<stashaway-recipes-managed-section>
[Managed instructions live here and are replaced on sync]
</stashaway-recipes-managed-section>
```

`instructions/GLOBAL_INSTRUCTIONS.md` is the single source of truth for the managed block. Update that file when editing global guidance—platform
templates automatically inject it during `agent-recipes sync`.

### Template System

We use [Eta](https://eta.js.org/) templating for flexible, maintainable instruction generation:

- `instructions/GLOBAL_INSTRUCTIONS.md` - Shared guidance embedded into all platforms
- `instructions/{platform}/*.eta` - Platform-specific templates (filenames determine outputs)
- `instructions/common/skills.eta` - Shared skills section template

### Platform-Specific Customization

To customize instructions for a specific platform:

1. Edit `instructions/{platform}/*.eta` (e.g., `codex/AGENTS.md.eta`)
2. Add platform-specific content using Eta syntax
3. Run `agent-recipes sync` to apply changes

See `instructions/README.md` for detailed template documentation.

**On sync:**

- ✅ Your content above the marker is preserved
- ✅ Managed section is updated with latest from repo
- ✅ No conflicts, no prompts needed

### Custom Skills

Skills with the `sa-` prefix are managed by agent-recipes. To add custom skills:

**Option 1: Add alongside (recommended)**

```bash
~/.claude/skills/
├── sa-rightsize/        # Managed - updated on sync
├── sa-commit-message/   # Managed - updated on sync
├── my-custom-skill/     # Yours - never touched!
└── db-migration/        # Yours - never touched!
```

**Option 2: Customize a managed skill**

```bash
# Copy and remove sa- prefix
cp -r ~/.claude/skills/sa-rightsize ~/.claude/skills/rightsize

# Now edit rightsize/ - it's yours!
# Note: You won't get automatic updates for this skill
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed information on:

- How to add new skills, agents, and slash commands
- Development setup and workflow
- Testing guidelines and code style
- Versioning and release process

Quick links:

- [AGENTS.md](./AGENTS.md) - Development instructions & architecture
- [CHANGELOG.md](./CHANGELOG.md) - Release history
