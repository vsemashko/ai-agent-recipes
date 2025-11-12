# Contributing to StashAway Agent Recipes

Thank you for contributing! This guide covers the essentials for adding skills and making changes.

> **For detailed architecture, conventions, and development instructions**, see [CLAUDE.md](./CLAUDE.md).

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Adding a New Skill](#adding-a-new-skill)
- [Adding a New Agent](#adding-a-new-agent)
- [Adding a New Command](#adding-a-new-command)
- [Modifying Templates](#modifying-templates)
- [Adding CLI Commands](#adding-cli-commands)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Development Setup

### Prerequisites

- **Deno 2.x**: https://deno.land/install.sh
- **Git**: For version control
- **StashAway GitLab Access**: For pushing changes

### Quick Start

```bash
# Clone repository
git clone git@gitlab.stashaway.com:vladimir.semashko/stashaway-agent-recipes.git
cd stashaway-agent-recipes

# Development
deno task dev --help

# Build
deno task build

# Test
deno task lint
deno task fmt
```

## Project Structure

```
stashaway-agent-recipes/
├── main.ts                  # CLI entry point
├── cli/
│   ├── commands/            # sync.ts, list.ts, convert.ts, info.ts
│   └── lib/                 # installer.ts, converter.ts, agents-commands-converter.ts
├── skills/                  # Skill definitions (sa- prefix)
├── agents/                  # Agent definitions (*.md)
├── commands/                # Command definitions (*.md)
├── instructions/            # Platform templates (Eta)
│   ├── GLOBAL_INSTRUCTIONS.md            # Global guidance (shared)
│   ├── common/
│   │   └── skills.eta      # Skills section template
│   ├── claude/             # claude and other platforms configs
│   │   ├── CLAUDE.md.eta   # → ~/.claude/CLAUDE.md
│   │   └── AGENTS.md.eta   # → ~/.claude/AGENTS.md
├── install.sh              # configs installation script
└── README.md                # User documentation
```

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and technology stack information.

## Adding a New Skill

### 1. Create Skill

```bash
mkdir skills/sa-my-skill
```

**Note**: Managed skills use `sa-` prefix in directory, but `name` in frontmatter omits it.

### 2. Create SKILL.md

```markdown
---
name: my-skill
description: Brief one-line description
---

# My Skill

## When to Use

Describe when this skill should be invoked.

## How It Works

Provide step-by-step instructions:

1. First step
2. Second step
3. Third step

## Example Usage

Show realistic examples.

## Important Notes

- Caveats
- Limitations
```

### 3. Test

```bash
agent-recipes sync       # Sync to local tools
agent-recipes list       # Verify skill appears
```

### 4. Verify Conversion

```bash
agent-recipes convert skills/sa-my-skill/SKILL.md --format agent-md
```

### Best Practices

- **Be Specific**: Detailed, actionable steps
- **Be Clear**: Simple, direct language
- **Add Examples**: Realistic usage scenarios
- **Document Limits**: Edge cases and constraints

## Adding a New Agent

Agents are sub-agents that provide specialized behavior within AI coding assistants. They work across Claude Code, OpenCode, and Codex.

### 1. Create Agent File

```bash
# Create in agents/ directory
touch agents/my-agent.md
```

### 2. Define Agent

```markdown
---
name: my-agent
description: Brief one-line description of agent's purpose
model: claude-sonnet-4
tools: Read, Grep, Glob, Bash
---

# Agent Name

You are a specialized agent for [purpose].

## Responsibilities

- First responsibility
- Second responsibility

## Guidelines

Provide clear instructions on:

1. How the agent should behave
2. What it should focus on
3. What it should avoid
```

### 3. Test Agent

```bash
agent-recipes sync       # Sync to platforms
# Test in Claude Code / OpenCode / Codex
```

### Provider-Specific Overrides

Use `provider-overrides` when different platforms need different settings:

```yaml
---
name: code-reviewer
description: Code review specialist
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
      glob: true
  codex:
    model: gpt-4.1
---
```

### Best Practices

- **Clear Purpose**: One-sentence description of what the agent does
- **Specific Instructions**: Detailed behavior guidelines
- **Tool Selection**: Only specify tools the agent needs
- **Model Choice**: Use appropriate model for the task complexity

## Adding a New Command

Commands (slash commands) are quick prompts that can be invoked with arguments. They work across Claude Code, OpenCode, and Codex.

### 1. Create Command File

```bash
# Create in commands/ directory
touch commands/my-command.md
```

### 2. Define Command

```markdown
---
name: my-command
description: Brief one-line description
argument-hint: '[arg1] [arg2]'
---

Execute task with argument $1 and parameter $2.

Use $ARGUMENTS for all arguments as a single string.
```

### 3. Test Command

```bash
agent-recipes sync       # Sync to platforms
# Test in Claude Code / OpenCode / Codex
# Usage: /my-command value1 value2
```

### Command Features

**Argument Placeholders**:

- `$ARGUMENTS` - All arguments as a single string
- `$1`, `$2`, `$3`, etc. - Individual positional arguments

**Link to Agent**:

```yaml
---
name: review-pr
description: Review pull request
argument-hint: '[pr-number]'
agent: code-reviewer
---

Review PR #$1 following our code review standards.
```

**Tool Restrictions**:

```yaml
---
name: safe-git-status
description: Check git status safely
allowed-tools: Bash(git status:*), Bash(git diff:*)
---

Check the current git status and show uncommitted changes.
```

### Best Practices

- **Clear Arguments**: Use `argument-hint` to document expected parameters
- **Single Purpose**: Each command should do one thing well
- **Descriptive Names**: Use kebab-case, descriptive names
- **Quote Hints**: Always quote `argument-hint` values in YAML

## Modifying Templates

Templates use [Eta](https://eta.js.org/) templating.

### Structure

- `instructions/GLOBAL_INSTRUCTIONS.md` - Global guidance
- `instructions/common/skills.eta` - Skills section
- `instructions/{platform}/*.eta` - Platform templates (filenames determine outputs)

### Making Changes

1. Edit `.eta` files
2. Use Eta syntax: `<%= it.variableName %>`
3. Test: `agent-recipes sync`
4. Verify: Check `~/.{platform}/`

See [instructions/README.md](./instructions/README.md) for template documentation.

## Adding CLI Commands

### 1. Create Command

```typescript
// cli/commands/my-command.ts
import { Command } from '@cliffy/command'

export const myCommand = new Command()
  .description('What this does')
  .action(async () => {
    console.log('Executing...')
  })
```

### 2. Register

```typescript
// main.ts
import { myCommand } from './cli/commands/my-command.ts'

const main = new Command()
  .command('my-command', myCommand)
```

### 3. Test

```bash
deno task dev my-command
```

## Testing

### Development

```bash
deno task fmt        # Format
deno task lint       # Lint
deno task build      # Build
deno task dev sync   # Test sync
```

### Installation

```bash
./install.sh              # Test install
agent-recipes sync        # Test sync
ls ~/.claude ~/.codex     # Verify output
```

## Submitting Changes

### 1. Branch Naming

```
<type>/<ticket>-<description>
```

Examples:

- `feat/SA-604-add-skill`
- `fix/SA-1234-fix-bug`

### 2. Commit Messages

Use **sa-commit-message** skill or follow format:

```
<type>: <ticket> <subject>

<body>
```

Example:

```
feat: SA-123 Add database migration skill

Adds skill for safe database migrations.
```

### 3. Push and Create MR

```bash
git push -u origin feat/SA-XXX-description
```

Create Merge Request with:

- Clear description
- Reference ticket
- Screenshots if relevant

### Pre-submission Checklist

- [ ] Formatted (`deno fmt`)
- [ ] Linted (`deno lint`)
- [ ] Build passes (`deno task build`)
- [ ] `CHANGELOG.md` updated
- [ ] Documentation updated
- [ ] Branch/commit conventions followed

## Code Style

See [CLAUDE.md](./CLAUDE.md) for detailed guidelines.

**Key points:**

- TypeScript strict mode
- Prefer `async/await`
- JSDoc for public APIs
- Follow existing patterns

## Troubleshooting

### Permission Errors

```bash
deno run --allow-all main.ts
```

### Import Errors

Use JSR imports:

```typescript
import { Command } from '@cliffy/command' // ✅
```

### Build Errors

```bash
rm -rf bin/
deno task build
```

---

**Additional Resources:**

- [CLAUDE.md](./CLAUDE.md) - Development instructions & architecture
- [instructions/README.md](./instructions/README.md) - Template system
- [CHANGELOG.md](./CHANGELOG.md) - Release history
