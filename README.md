# StashAway Agent Recipes

A centralized repository for reusable configurations, instructions, prompts, skills, and tools for AI coding agents (Claude Code, Codex CLI, and more).

## 🎯 What is This?

Agent Recipes is a knowledge base and quick-start toolkit that makes it easy to:
- 🤖 Configure AI coding assistants with StashAway's standards and best practices
- 🔧 Share reusable skills across your team
- 📚 Maintain consistent AI agent behavior across projects
- 🚀 Get new team members productive with AI tools quickly

## ✨ Features

- **One-Command Installation**: Get started in seconds
- **Cross-Platform**: Works with Claude Code and Codex CLI
- **Pre-built Skills**: RightSize checker, commit message formatter, and more
- **CLI Tool**: Easy management and synchronization
- **Global Instructions**: Keep Claude Code and Codex CLI in sync automatically

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

The CLI tracks previously installed versions and will prompt before overwriting any changes you make to your global configuration files.

## 📦 Available Skills

### RightSize Checker
Automatically check if Kubernetes resources are appropriately sized based on actual usage.

**Usage**: Ask Claude "Can you check if this service is rightsized?"

**What it does**:
- Queries RightSize API for CPU/memory recommendations
- Compares with current deployment configurations
- Updates values.yaml files with optimized resources
- Creates a commit with the changes

### Commit Message Formatter
Generate properly formatted commit messages following StashAway conventions.

**Usage**: Ask Claude "Create a commit for these changes"

**What it does**:
- Analyzes your git changes
- Extracts ticket number from branch name
- Generates properly formatted commit message
- Follows type conventions (feat, fix, chore, refactor)

## 💻 CLI Commands

```bash
# Core commands
agent-recipes sync           # Install/update/sync everything
agent-recipes list           # List available skills
agent-recipes info           # Show installation info

# For maintainers
agent-recipes convert <path> # Convert skill formats
```

## 🛠️ Supported AI Tools

### Claude Code
- **Scope**: Global instructions
- **Location**: `~/.config/claude-code/`
- **Setup**: Automatic via `agent-recipes sync`
- **Protection**: Sync prompts before overwriting your local edits

### Codex CLI
- **Scope**: Global instructions
- **Location**: `~/.codex/`
- **Setup**: Automatic via `agent-recipes sync`
- **Format**: Auto-generates `AGENTS.md` from skills
- **Protection**: Sync prompts before overwriting your local edits

### Cursor
- **Status**: Coming in a future release
- **Note**: Cursor only supports project-specific configuration

## 📖 Usage Examples

### Checking Resource Sizing

```bash
# In any StashAway service repository
# Just ask Claude:
"Can you check if this service is rightsized?"

# Claude will:
# 1. Find the service name and namespace
# 2. Query RightSize API for all regions
# 3. Compare with current configs
# 4. Show recommendations
# 5. Offer to update files and commit
```

### Creating Commits

```bash
# After making changes
# Ask Claude:
"Create a commit for these changes"

# Claude will:
# 1. Analyze git diff
# 2. Extract ticket number from branch name
# 3. Generate formatted commit message
# 4. Ask for your approval
```

## 🔄 Keeping Up to Date

```bash
# Check for updates and sync latest instructions
agent-recipes sync

# Force reinstall
agent-recipes sync --force
```

## 🤝 Contributing

We welcome contributions! To add a new skill or improve existing ones, see our [Contributing Guide](./CONTRIBUTING.md).

Quick overview:
1. Fork the repository
2. Create a feature branch following naming convention: `<type>/<ticket>-<description>`
3. Add your skill or improvements
4. Test with multiple AI tools
5. Submit a merge request

For detailed development instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📁 What Gets Installed?

When you run `agent-recipes sync`, the following happens:

### For Claude Code Users
- Global instructions synced to `~/.config/claude-code/CLAUDE.md`
- Skills directory linked to `~/.config/claude-code/skills/`
- Your existing edits are detected and you're prompted before overwriting

### For Codex CLI Users
- `AGENTS.md` auto-generated from all skills to `~/.codex/AGENTS.md`
- Includes all skill instructions and metadata
- Your existing edits are detected and you're prompted before overwriting

### CLI Tool
- Installed to `~/.stashaway-agent-recipes/`
- Binary available at `~/.stashaway-agent-recipes/bin/agent-recipes`
- Added to your PATH automatically

## 🐛 Troubleshooting

### CLI not found after installation
```bash
# Restart your shell
source ~/.zshrc  # or ~/.bashrc

# Or manually add to PATH
export PATH="$PATH:$HOME/.stashaway-agent-recipes/bin"
```

### Deno not installed
```bash
curl -fsSL https://deno.land/install.sh | sh
```

### Permission errors
```bash
chmod +x ~/.stashaway-agent-recipes/bin/agent-recipes
```

### Skills not showing up in Claude Code
```bash
# Re-sync
agent-recipes sync

# Check if skills directory exists
ls ~/.config/claude-code/skills/
```

### AGENTS.md not updating for Codex
```bash
# Force regenerate
agent-recipes sync --force

# Check the generated file
cat ~/.codex/AGENTS.md
```

## 📚 Additional Resources

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development and contribution guide
- [PLAN_claude.md](./PLAN_claude.md) - Detailed implementation plan
- [Claude Code Documentation](https://docs.claude.com/claude-code)

## 📄 License

Internal StashAway tool - not for external distribution

## 🙋 Support

- **Slack**: #agent-recipes (to be created)
- **Issues**: [GitLab Issues](https://gitlab.stashaway.com/vladimir.semashko/stashaway-agent-recipes/-/issues)
- **Documentation**: This README and [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Built with ❤️ by the StashAway Platform Team**
