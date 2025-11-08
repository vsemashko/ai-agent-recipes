# Contributing to StashAway Agent Recipes

Thank you for contributing! This guide covers the essentials for adding skills and making changes.

> **For detailed architecture, conventions, and development instructions**, see [CLAUDE.md](./CLAUDE.md).

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Adding a New Skill](#adding-a-new-skill)
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
│   └── lib/                 # installer.ts, converter.ts
├── skills/                  # Skill definitions (sa_ prefix)
├── instructions/            # Platform templates (Eta)
│   ├── GLOBAL_INSTRUCTIONS.md            # Global guidance (shared)
│   ├── common/
│   │   └── skills.eta      # Skills section template
│   ├── claude/             # claude and other platforms configs
│   │   └── main.eta        # → ~/.claude/CLAUDE.md
├── install.sh              # configs installation script
└── README.md                # User documentation
```

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and technology stack information.

## Adding a New Skill

### 1. Create Skill

```bash
mkdir skills/sa_my-skill
```

**Note**: Managed skills use `sa_` prefix in directory, but `name` in frontmatter omits it.

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
agent-recipes convert skills/sa_my-skill/SKILL.md --format agent-md
```

### Best Practices

- **Be Specific**: Detailed, actionable steps
- **Be Clear**: Simple, direct language
- **Add Examples**: Realistic usage scenarios
- **Document Limits**: Edge cases and constraints

## Modifying Templates

Templates use [Eta](https://eta.js.org/) templating.

### Structure

- `instructions/GLOBAL_INSTRUCTIONS.md` - Global guidance
- `instructions/common/skills.eta` - Skills section
- `instructions/{platform}/main.eta` - Platform templates

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

Use **sa_commit-message** skill or follow format:

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
