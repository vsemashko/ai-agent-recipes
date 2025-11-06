# Contributing to StashAway Agent Recipes

Thank you for contributing to the StashAway Agent Recipes repository! This guide will help you understand how to add new skills, modify the CLI, and
contribute to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Adding a New Skill](#adding-a-new-skill)
- [Modifying the CLI](#modifying-the-cli)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)

## Development Setup

### Prerequisites

- **Deno 2.x**: Install from https://deno.land/install.sh
- **Git**: For version control
- **Access to StashAway GitLab**: For pushing changes

### Initial Setup

```bash
# Clone the repository
git clone git@gitlab.stashaway.com:vladimir.semashko/stashaway-agent-recipes.git
cd stashaway-agent-recipes

# Navigate to CLI directory
cd cli

# Run in development mode
deno task dev --help

# Build the CLI
deno task build
```

## Project Structure

```
stashaway-agent-recipes/
├── cli/                       # CLI application (Deno + Cliffy)
│   ├── main.ts               # Entry point
│   ├── commands/             # Command implementations
│   │   ├── sync.ts          # Install/update/sync command
│   │   ├── list.ts          # List skills
│   │   ├── convert.ts       # Format conversion
│   │   └── info.ts          # Show info
│   └── lib/                  # Shared utilities
│       ├── installer.ts      # Installation logic
│       └── converter.ts      # Format conversions
├── skills/                   # Skill definitions
│   ├── rightsize/           # RightSize checker skill
│   └── commit-message/      # Commit message formatter
├── instructions/             # Platform-specific instructions
│   └── claude-code/         # Claude Code global instructions
│       └── CLAUDE.md        # Global instructions template
├── install.sh               # Installation script
├── CLAUDE.md                # Instructions for working ON this repo
├── AGENTS.md                # Agent definitions for this repo
├── PLAN_claude.md           # Implementation plan
├── CONTRIBUTING.md          # This file
└── README.md                # User documentation
```

## Adding a New Skill

Skills provide specialized guidance to AI agents for common StashAway workflows.

### 1. Create Skill Directory

```bash
mkdir skills/my-skill
```

### 2. Create SKILL.md

Create `skills/my-skill/SKILL.md` with frontmatter and content:

```markdown
---
name: my-skill
description: Brief one-line description of what this skill does
---

# My Skill

## When to Use

Describe when this skill should be invoked. Include:

- Trigger conditions
- Use cases
- When NOT to use this skill

## How It Works

Provide step-by-step instructions for the AI agent:

### 1. First Step

Detailed instructions for the first step

### 2. Second Step

Detailed instructions for the second step

### 3. Third Step

And so on...

## Example Usage

Show example interactions:

\`\`\` User: Can you do [task]? Agent: I'll use the my-skill skill to accomplish this. [Agent follows the steps...] \`\`\`

## Output Format

Describe the expected output format, if applicable.

## Important Notes

- Any caveats
- Limitations
- Special considerations
```

### 3. Test the Skill

```bash
# Sync to your local Claude Code
agent-recipes sync

# Test with Claude Code
# Ask Claude to perform the task related to your skill
```

### 4. Verify Format Conversion

```bash
# Convert to AGENTS.md format (for Codex)
cd cli
deno run --allow-read main.ts convert ../skills/my-skill/SKILL.md --format agent-md

# Or batch convert all skills
deno run --allow-read main.ts convert ../skills --batch --format agent-md
```

### Skill Best Practices

- **Be Specific**: Provide detailed, actionable steps
- **Be Clear**: Use simple, direct language
- **Be Complete**: Include all necessary information
- **Add Examples**: Show realistic usage scenarios
- **Consider Edge Cases**: Document limitations and special cases
- **Use Proper Frontmatter**: Always include name and description

## Modifying the CLI

### Adding a New Command

1. **Create command file** in `cli/commands/`:

```typescript
// cli/commands/my-command.ts
import { Command } from '@cliffy/command'

export const myCommand = new Command()
  .description('What this command does')
  .option('-f, --flag <value>', 'Description of flag')
  .action(async (options) => {
    // Implementation
    console.log('Executing my command...')
  })
```

2. **Register in main.ts**:

```typescript
import { myCommand } from './commands/my-command.ts'

const main = new Command()
  // ... existing commands
  .command('my-command', myCommand)
```

3. **Test the command**:

```bash
cd cli
deno run --allow-all main.ts my-command
```

### Modifying Installation Logic

The installation logic is in `cli/lib/installer.ts`. Key methods:

- `isInstalled()`: Check if already installed
- `detectAITools()`: Auto-detect installed AI tools
- `syncInstructions()`: Sync instructions to AI tools
- `addToPath()`: Add CLI to system PATH

**Important:**

- Preserve backward compatibility
- Test on fresh install
- Test on update scenario
- Verify PATH modification works

## Testing

### Manual Testing

```bash
cd cli

# Test specific command
deno run --allow-all main.ts sync
deno run --allow-all main.ts list
deno run --allow-all main.ts info

# Test with different flags
deno run --allow-all main.ts sync --force
```

### Testing Installation

```bash
# Test installation script
./install.sh

# Verify PATH
which agent-recipes

# Test sync
agent-recipes sync

# Check installed files
ls ~/.config/claude-code/
ls ~/.codex/
```

### Running Tests

```bash
cd cli

# Run tests
deno test

# Run tests with coverage
deno test --coverage=coverage

# Generate coverage report
deno coverage coverage
```

## Code Style

We follow Deno and TypeScript best practices:

### Formatting

```bash
# Format code
cd cli
deno fmt

# Check formatting
deno fmt --check
```

### Linting

```bash
# Lint code
deno lint
```

### Style Guidelines

- Use TypeScript strict mode
- Prefer `async/await` over callbacks
- Use destructuring where appropriate
- Add JSDoc comments for public APIs
- Follow existing code patterns
- Use meaningful variable names

**Example:**

```typescript
/**
 * Syncs instructions from repository to AI tool configuration directories
 * @param tools - Array of tool names to sync
 * @param config - Installation configuration
 * @returns Updated configuration with new hashes
 */
async syncInstructions(
  tools: string[],
  config: InstallConfig
): Promise<InstallConfig> {
  // Implementation
}
```

## Submitting Changes

### Branch Naming

Follow the StashAway convention:

```
<type>/<ticket-number>-<description>
```

**Examples:**

- `feat/SA-604-add-new-skill`
- `fix/SA-1234-fix-sync-issue`
- `chore/SA-789-update-deps`

### Commit Messages

Follow the StashAway format:

```
<type>: <ticket-number> <subject>

<body>
```

**Example:**

```
feat: SA-123 Add database migration skill

Adds a new skill to help with database migrations:
- Query current schema
- Generate migration files
- Test migrations safely
```

### Pull Request Process

1. **Create feature branch** following naming convention
2. **Make your changes**:
   - Add/modify skills or code
   - Test thoroughly
   - Update documentation
   - Run linter and formatter
3. **Commit changes** with proper commit messages
4. **Push to GitLab**:
   ```bash
   git push -u origin feat/SA-XXX-description
   ```
5. **Create Merge Request**:
   - Provide clear description
   - Reference related issues
   - Add screenshots if relevant
6. **Address review feedback**
7. **Merge** once approved

### Pre-submission Checklist

- [ ] Code follows style guidelines
- [ ] Code passes linting (`deno lint`)
- [ ] Code is formatted (`deno fmt`)
- [ ] Tests pass (`deno test`)
- [ ] Documentation is updated
- [ ] Skill frontmatter is correct
- [ ] Commit messages follow convention
- [ ] Branch name follows convention

## Troubleshooting Development Issues

### Deno Permission Errors

Add necessary permissions:

```bash
deno run --allow-read --allow-write --allow-env --allow-run main.ts
# Or for development:
deno run --allow-all main.ts
```

### Import Errors

Ensure using JSR imports:

```typescript
import { Command } from '@cliffy/command' // ✅ Correct
import { Command } from 'https://deno.land/x/cliffy' // ❌ Old style
```

### Build Errors

```bash
cd cli
rm -rf dist/
deno task build
```

## Questions or Help?

- **Issues**: [GitLab Issues](https://gitlab.stashaway.com/vladimir.semashko/stashaway-agent-recipes/-/issues)
- **Slack**: #agent-recipes (to be created)
- **Documentation**: README.md and PLAN_claude.md

## Resources

- [Deno Documentation](https://deno.land/manual)
- [Cliffy Documentation](https://cliffy.io/)
- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

_Thank you for contributing to StashAway Agent Recipes!_
