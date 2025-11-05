# StashAway Agent Recipes

A centralized repository for reusable configurations, instructions, prompts, skills, and tools for AI coding agents (Claude Code, Codex CLI, Cursor, and more).

## 🎯 What is This?

Agent Recipes is a knowledge base and quick-start toolkit that makes it easy to:
- 🤖 Configure AI coding assistants with StashAway's standards and best practices
- 🔧 Share reusable skills across your team
- 📚 Maintain consistent AI agent behavior across projects
- 🚀 Get new team members productive with AI tools quickly

## ✨ Features

- **One-Command Installation**: Get started in seconds
- **Cross-Platform**: Works with Claude Code, Codex CLI, and Cursor
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

The CLI tracks previously installed versions and will prompt before overwriting any changes you make to `CLAUDE.md`, `AGENTS.md`, or `agents.json`.

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
- **Protection**: Sync prompts before overwriting your local edits

### Cursor
- **Scope**: Project-specific (future enhancement)
- **Status**: Support for automatic setup will return in a future release

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

## 🔧 Development

### Project Structure

```
stashaway-agent-recipes/
├── cli/                    # CLI source code
│   ├── main.ts            # Entry point
│   ├── commands/          # Command implementations
│   └── lib/               # Shared utilities
├── skills/                # Skill definitions
│   ├── rightsize/
│   └── commit-message/
├── instructions/          # Platform-specific instructions
│   ├── claude-code/
│   ├── codex/
│   └── cursor/
├── templates/             # Project templates
└── install.sh            # Installation script
```

### Adding a New Skill

1. Create a new directory in `skills/`:
```bash
mkdir skills/my-skill
```

2. Create `SKILL.md` with frontmatter:
```markdown
---
name: my-skill
description: What this skill does
---

# My Skill

## When to Use
...

## How It Works
...
```

3. Test with Claude Code:
```bash
agent-recipes sync
```

4. Convert to other formats:
```bash
agent-recipes convert skills/my-skill/SKILL.md --format cursor-mdc
```

### Building the CLI

```bash
cd cli
deno task build
```

### Running Tests

```bash
cd cli
deno test
```

## 🔄 Keeping Up to Date

```bash
# Check for updates and sync latest instructions
agent-recipes sync

# Force reinstall
agent-recipes sync --force
```

## 🤝 Contributing

We welcome contributions! To add a new skill or improve existing ones:

1. Fork the repository
2. Create a feature branch
3. Add your skill or improvements
4. Test with multiple AI tools
5. Submit a merge request

## 📝 Branch Naming Convention

When creating branches, follow this format:
```
<type>/<ticket-number>-<short-description>
```

Examples:
- `feat/SA-604-add-execution-mode`
- `fix/SA-1234-prevent-xss`
- `chore/SA-789-upgrade-deps`

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

## 📚 Additional Resources

- [PLAN_claude.md](./PLAN_claude.md) - Detailed implementation plan
- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [Cursor Documentation](https://cursor.sh/docs)

## 📄 License

Internal StashAway tool - not for external distribution

## 🙋 Support

- **Slack**: #agent-recipes (to be created)
- **Issues**: [GitLab Issues](https://gitlab.stashaway.com/vladimir.semashko/stashaway-agent-recipes/-/issues)
- **Documentation**: This README and [PLAN_claude.md](./PLAN_claude.md)

---

**Built with ❤️ by the StashAway Platform Team**
