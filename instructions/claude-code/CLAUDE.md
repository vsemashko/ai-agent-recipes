# Claude Code Instructions for StashAway Agent Recipes

This file contains instructions for working on the StashAway Agent Recipes repository itself.

## Repository Overview

**Repository**: stashaway-agent-recipes
**Purpose**: Centralized repository for reusable AI agent configurations, instructions, skills, and tools for StashAway engineering teams.

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
│   ├── claude-code/         # Claude Code global instructions
│   ├── codex/               # Codex CLI instructions
│   └── cursor/              # Cursor rules
├── install.sh               # Installation script
├── CLAUDE.md                # This file
├── AGENTS.md                # Agent definitions
├── PLAN_claude.md           # Implementation plan
└── README.md                # User documentation
```

## Technology Stack

- **Runtime**: Deno 2.x
- **CLI Framework**: Cliffy (from JSR)
- **Language**: TypeScript
- **Package Manager**: Deno's built-in package management
- **Testing**: Deno's built-in test runner

## Development Workflow

### Getting Started

```bash
# Install Deno if not already installed
curl -fsSL https://deno.land/install.sh | sh

# Navigate to CLI directory
cd cli

# Run CLI in development mode
deno task dev --help

# Build the CLI
deno task build
```

### Adding a New Skill

1. **Create skill directory**:
   ```bash
   mkdir skills/my-skill
   ```

2. **Create SKILL.md with frontmatter**:
   ```markdown
   ---
   name: my-skill
   description: Brief description of what this skill does
   ---

   # My Skill

   ## When to Use
   [When should this skill be invoked?]

   ## How It Works
   [Detailed implementation instructions]

   ## Example Usage
   [Example interactions]
   ```

3. **Test the skill**:
   - Run `agent-recipes sync` to sync the skill
   - Test with Claude Code
   - Verify it works as expected

4. **Convert to other formats**:
   ```bash
   agent-recipes convert skills/my-skill/SKILL.md --format cursor-mdc
   agent-recipes convert skills/my-skill/SKILL.md --format codex-json
   ```

### Adding a New CLI Command

1. **Create command file** in `cli/commands/`:
   ```typescript
   import { Command } from '@cliffy/command'

   export const myCommand = new Command()
     .description('What this command does')
     .action(async () => {
       // Implementation
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

When modifying:
1. Preserve backward compatibility
2. Test on fresh install
3. Test on update scenario
4. Verify PATH modification works

## Code Style

- Use Deno/TypeScript best practices
- Follow existing code patterns
- Use TypeScript strict mode
- Prefer async/await over callbacks
- Use destructuring where appropriate
- Add JSDoc comments for public APIs

## Testing

```bash
cd cli

# Run tests
deno test

# Run tests with coverage
deno test --coverage=coverage

# Generate coverage report
deno coverage coverage
```

## Skill Format Specification

### Frontmatter (Required)
```yaml
---
name: skill-name        # Lowercase, hyphenated
description: Brief one-line description
---
```

### Content Sections (Recommended)
1. **When to Use**: Trigger conditions
2. **How It Works**: Step-by-step process
3. **Example Usage**: Sample interactions
4. **Output Format**: Expected outputs
5. **Important Notes**: Caveats and considerations

## Platform-Specific Notes

### Claude Code
- Instructions go to `~/.config/claude-code/`
- Skills are loaded from the skills directory
- Uses CLAUDE.md and AGENTS.md formats

### Codex CLI
- Instructions go to `~/.codex/`
- Uses agents.json format
- May need format conversion

### Cursor
- Project-specific only (no global config)
- Uses `.cursor/rules/*.mdc` format
- New format as of 2025 (replaces .cursorrules)

## Release Process

1. **Update version**:
   - Update version in `cli/deno.json`
   - Update VERSION constant in `cli/main.ts`

2. **Test thoroughly**:
   - Test installation from scratch
   - Test update scenario
   - Test all commands
   - Test with each AI tool

3. **Create release**:
   - Tag with version: `git tag v0.1.0`
   - Push tag: `git push origin v0.1.0`
   - Create release in GitLab

4. **Update documentation**:
   - Update README.md if needed
   - Update PLAN_claude.md if architecture changed

## Troubleshooting

### Deno Permission Errors
Add necessary permissions to command:
```bash
deno run --allow-read --allow-write --allow-env --allow-run main.ts
```

Or use `--allow-all` for development.

### Import Errors
Ensure using JSR imports:
```typescript
import { Command } from '@cliffy/command'  // ✅ Correct
import { Command } from 'https://deno.land/x/cliffy'  // ❌ Old style
```

### Build Errors
```bash
cd cli
rm -rf dist/
deno task build
```

## Contributing Guidelines

1. **Follow existing patterns**: Look at existing skills and commands
2. **Test thoroughly**: Test on multiple platforms and scenarios
3. **Document well**: Update README and inline docs
4. **Keep it simple**: Prefer simplicity over cleverness
5. **Think about users**: Make it easy to understand and use

## Important Conventions

### Branch Naming
```
<type>/<ticket>-<description>
```
Example: `feat/SA-123-add-new-skill`

### Commit Messages
```
<type>: <ticket> <subject>

<body>
```
Example: `feat: SA-123 Add database migration skill`

### Skill Naming
- Lowercase with hyphens
- Descriptive and concise
- Example: `rightsize`, `commit-message`, `db-migration`

## Resources

- [Deno Documentation](https://deno.land/manual)
- [Cliffy Documentation](https://cliffy.io/)
- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [Cursor Documentation](https://cursor.sh/docs)

## Support

- **Issues**: [GitLab Issues](https://gitlab.stashaway.com/vladimir.semashko/stashaway-agent-recipes/-/issues)
- **Slack**: #agent-recipes (to be created)
- **Documentation**: README.md and PLAN_claude.md

## Architecture Decisions

### Why Deno?
- TypeScript native
- Secure by default (explicit permissions)
- Modern standard library
- Single executable compilation
- Consistency with stash CLI

### Why Cliffy?
- Excellent TypeScript support
- Rich features (prompts, tables, colors)
- Well-maintained
- Used by stash CLI

### Why Multiple Formats?
Different AI tools use different formats. We maintain Claude Code format as the source of truth and convert to other formats as needed.

## Future Enhancements

See PLAN_claude.md for:
- Short-term enhancements
- Medium-term features
- Long-term vision

---

*This repository is the foundation for standardized AI assistance across StashAway engineering.*
