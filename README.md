# StashAway Agent Recipes

A centralized repository for reusable configurations, instructions, and skills for AI coding agents (Claude Code, Codex CLI, and more).

## 🎯 What is This?

Agent Recipes makes it easy to:

- 🤖 Configure AI coding assistants with StashAway's standards and best practices
- 🔧 Share reusable skills across your team
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

## 🛠️ Supported AI Tools

### Claude Code

- **Location**: `~/.claude/`
- **Format**: Global instructions (CLAUDE.md) + skills directory
- **Setup**: Automatic via `agent-recipes sync`

### Codex CLI

- **Location**: `~/.codex/`
- **Format**: AGENTS.md with embedded instructions + skills
- **Setup**: Automatic via `agent-recipes sync`

### OpenCode

- **Location**: `~/.opencode/`
- **Format**: AGENTS.md with embedded instructions + skills
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

- Global instructions → `~/.claude/CLAUDE.md`
- Skills directory → `~/.claude/skills/` (managed copies with `sa_` prefix)

### For Codex CLI Users

- Combined file → `~/.codex/AGENTS.md` (auto-generated from instructions + skills)

### CLI Tool

- Installed to `~/.stashaway-agent-recipes/`
- Binary at `~/.stashaway-agent-recipes/bin/agent-recipes`
- Added to your PATH automatically

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
- `instructions/{platform}/main.eta` - Platform-specific templates
- `instructions/common/skills.eta` - Shared skills section template

### Platform-Specific Customization

To customize instructions for a specific platform:

1. Edit `instructions/{platform}/main.eta` (e.g., `codex/main.eta`)
2. Add platform-specific content using Eta syntax
3. Run `agent-recipes sync` to apply changes

See `instructions/README.md` for detailed template documentation.

**On sync:**

- ✅ Your content above the marker is preserved
- ✅ Managed section is updated with latest from repo
- ✅ No conflicts, no prompts needed

### Custom Skills

Skills with the `sa_` prefix are managed by agent-recipes. To add custom skills:

**Option 1: Add alongside (recommended)**

```bash
~/.claude/skills/
├── sa_rightsize/        # Managed - updated on sync
├── sa_commit-message/   # Managed - updated on sync
├── my-custom-skill/     # Yours - never touched!
└── db-migration/        # Yours - never touched!
```

**Option 2: Customize a managed skill**

```bash
# Copy and remove sa_ prefix
cp -r ~/.claude/skills/sa_rightsize ~/.claude/skills/rightsize

# Now edit rightsize/ - it's yours!
# Note: You won't get automatic updates for this skill
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- How to add new skills
- Development setup
- Testing guidelines
- Code style guide

Quick overview:

1. Create a feature branch: `<type>/<ticket>-<description>`
2. Add your skill in `skills/sa_my-skill/SKILL.md` (keep the `name` field without the prefix)
3. Test with `agent-recipes sync`
4. Submit a merge request

## 🐛 Troubleshooting

### CLI not found after installation

```bash
source ~/.zshrc  # or ~/.bashrc
# Or manually add to PATH
export PATH="$PATH:$HOME/.stashaway-agent-recipes/bin"
```

### Skills not showing up in Claude Code

```bash
agent-recipes sync
ls ~/.claude/skills/
```

### AGENTS.md not updating for Codex

```bash
agent-recipes sync
cat ~/.codex/AGENTS.md
```

## 🙋 Support

- **Slack**: #agent-recipes (to be created)
- **Issues**: [GitLab Issues](https://gitlab.stashaway.com/vladimir.semashko/stashaway-agent-recipes/-/issues)
- **Documentation**: This README and [CONTRIBUTING.md](./CONTRIBUTING.md)
