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
curl https://agent-recipes.stashaway.internal | sh

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
- **Location**: `~/.config/claude-code/`
- **Format**: Global instructions (CLAUDE.md) + skills directory
- **Setup**: Automatic via `agent-recipes sync`

### Codex CLI
- **Location**: `~/.codex/`
- **Format**: Auto-generated AGENTS.md from global instructions + skills
- **Setup**: Automatic via `agent-recipes sync`

### Cursor
- **Status**: Coming in a future release
- **Note**: Cursor only supports project-specific configuration

## 🔄 Keeping Up to Date

The CLI automatically checks for updates:

```bash
# Check for updates and sync instructions
agent-recipes sync

# Update to latest version and re-sync everything
agent-recipes sync --force
```

**How it works:**
- Installed as a git repository in `~/.stashaway-agent-recipes/`
- `sync` checks if remote has new commits
- `--force` pulls latest changes and re-syncs everything
- Instructions and skills are automatically updated

## 📁 What Gets Installed?

### For Claude Code Users
- Global instructions → `~/.config/claude-code/CLAUDE.md`
- Skills directory → `~/.config/claude-code/skills/` (symlinked)

### For Codex CLI Users
- Combined file → `~/.codex/AGENTS.md` (auto-generated from instructions + skills)

### CLI Tool
- Installed to `~/.stashaway-agent-recipes/`
- Binary at `~/.stashaway-agent-recipes/bin/agent-recipes`
- Added to your PATH automatically

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- How to add new skills
- Development setup
- Testing guidelines
- Code style guide

Quick overview:
1. Create a feature branch: `<type>/<ticket>-<description>`
2. Add your skill in `skills/my-skill/SKILL.md`
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
ls ~/.config/claude-code/skills/
```

### AGENTS.md not updating for Codex
```bash
agent-recipes sync --force
cat ~/.codex/AGENTS.md
```

## 🙋 Support

- **Slack**: #agent-recipes (to be created)
- **Issues**: [GitLab Issues](https://gitlab.stashaway.com/vladimir.semashko/stashaway-agent-recipes/-/issues)
- **Documentation**: [CONTRIBUTING.md](./CONTRIBUTING.md) for development details

---

**Built with ❤️ by the StashAway Platform Team**
