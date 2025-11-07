# Claude Code Instructions for StashAway Agent Recipes

This file contains instructions for working on the StashAway Agent Recipes repository itself.

## Repository Overview

**Repository**: stashaway-agent-recipes **Purpose**: Centralized repository for reusable AI agent configurations, instructions, skills, and tools for
StashAway engineering teams.

## Project Structure

```
stashaway-agent-recipes/
├── main.ts                  # CLI entry point
├── cli/                     # CLI modules (commands + shared libs)
│   ├── commands/            # Command implementations
│   │   ├── sync.ts          # Install/update/sync command
│   │   ├── list.ts          # List skills
│   │   ├── convert.ts       # Format conversion
│   │   └── info.ts          # Show info
│   └── lib/                 # Shared utilities
│       ├── installer.ts     # Installation logic
│       └── converter.ts     # Format conversions
├── skills/                  # Skill definitions (managed with sa_ prefix)
│   ├── sa_rightsize/        # RightSize checker skill
│   └── sa_commit-message/   # Commit message formatter
├── instructions/            # Platform-specific instructions
│   └── claude-code/         # Claude Code global instructions
│       └── CLAUDE.md        # Global instructions template
├── install.sh               # Installation script
├── CLAUDE.md                # This file
├── AGENTS.md                # Agent definitions
└── README.md                # User documentation
```

## Technology Stack

- **Runtime**: Deno 2.x
- **CLI Framework**: Cliffy (from JSR)
- **Language**: TypeScript
- **Package Manager**: Deno's built-in package management
- **Testing**: Deno's built-in test runner

## Development Workflow

For detailed development instructions, including adding skills, modifying the CLI, and contributing, see [CONTRIBUTING.md](./CONTRIBUTING.md).

### Quick Reference

```bash
# Install Deno if not already installed
curl -fsSL https://deno.land/install.sh | sh

# Run CLI in development mode
deno task dev --help

# Build the CLI
deno task build
```

### Adding a New Skill

1. **Create skill directory** (managed skills use `sa_` prefix, but keep the `name` in frontmatter without it):
   ```bash
   mkdir skills/sa_my-skill
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

4. **Verify format conversion** (Codex AGENTS.md is auto-generated during sync):
   ```bash
   # Preview how skill will appear in AGENTS.md
   agent-recipes convert skills/sa_my-skill/SKILL.md --format agent-md
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
   deno run --allow-all main.ts my-command
   ```

### Modifying Installation Logic

The installation logic is in `cli/lib/installer.ts`. Key methods:

- `isInstalled()`: Check if already installed
- `detectAITools()`: Auto-detect installed AI tools
- `syncInstructions()`: Sync instructions to AI tools
- `addToPath()`: Add CLI to system PATH
- `checkForUpdates()`: Check git repository for updates
- `pullLatestChanges()`: Pull latest changes from origin

**Update Mechanism:**

- Installation directory is a git repository
- `checkForUpdates()` fetches from origin and compares commits
- `pullLatestChanges()` does a hard reset to `origin/main` (or `origin/master`)
- Supports both `main` and `master` as default branches

When modifying:

1. Preserve backward compatibility
2. Test on fresh install
3. Test on update scenario
4. Test with both main and master branches
5. Verify PATH modification works

## Recording Changes

- Update `CHANGELOG.md` whenever repository-managed skills or global instructions are added or modified. Summaries should highlight user-facing impact (for example, new skills, major rewrites, notable fixes).
- Keep the `Unreleased` section current during development. Move entries into a versioned section (for example, `## 0.2.0`) during release prep.
- Include any manual follow-up that users must perform (like rerunning `agent-recipes sync`) inside the changelog entry so upgrade notes remain actionable.
- Before bumping versions, ensure the changelog captures instruction changes, skill updates, and CLI behaviour adjustments.

## Code Style

- Use Deno/TypeScript best practices
- Follow existing code patterns
- Use TypeScript strict mode
- Prefer async/await over callbacks
- Use destructuring where appropriate
- Add JSDoc comments for public APIs

## Testing

```bash
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

- Instructions go to `~/.config/claude-code/CLAUDE.md`
- Skills symlinked from repository `skills/` directory
- Uses CLAUDE.md + skills/ format (NOT AGENTS.md)

### Codex CLI

- AGENTS.md auto-generated and synced to `~/.codex/AGENTS.md`
- Generated from all skills during sync
- Uses markdown format (AGENTS.md)

### Cursor

- **Status**: Support deferred to future release
- Project-specific only (no global config)
- Uses `.cursor/rules/*.mdc` format

## Release Process

1. **Finalize changelog**:
   - Move entries from `## Unreleased` to a new version section in `CHANGELOG.md`
   - Summarize notable instruction updates, new/updated skills, and CLI changes

2. **Update version numbers**:
   - Update version in `deno.json` (manual edit; no automated helper yet)
   - Update VERSION constant in `main.ts`

3. **Test thoroughly**:
   - Test installation from scratch
   - Test update scenario
   - Test all commands
   - Test with each AI tool

4. **Create release**:
   - Tag with version: `git tag v0.1.0`
   - Push tag: `git push origin v0.1.0`
   - Create release in GitLab

5. **Update documentation**:
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
import { Command } from '@cliffy/command' // ✅ Correct
import { Command } from 'https://deno.land/x/cliffy' // ❌ Old style
```

### Build Errors

```bash
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

_This repository is the foundation for standardized AI assistance across StashAway engineering._
