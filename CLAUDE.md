# Claude Code Instructions for StashAway Agent Recipes

This file contains instructions for working on the StashAway Agent Recipes repository itself.

## Repository Overview

**Repository**: stashaway-agent-recipes

**Purpose**: Centralized repository for reusable AI agent configurations, instructions, skills, and tools for StashAway engineering teams.

## Technology Stack

- **Runtime**: Deno 2.x
- **CLI Framework**: Cliffy (from JSR)
- **Templating**: Eta templating engine
- **Language**: TypeScript (strict mode)
- **Testing**: Deno's built-in test runner

## Core Principles

### Template System

- Uses Eta (`.eta` files) for flexible, maintainable templates
- `instructions/GLOBAL_INSTRUCTIONS.md` is the single source of truth for global guidance
- Platform templates in `instructions/{platform}/main.eta` compose the final output
- Skills template in `instructions/common/skills.eta` provides shared boilerplate

### Platform Configuration

Platforms are configured declaratively in `cli/lib/installer.ts`:

```typescript
interface PlatformConfig {
  name: string // Display name
  dir: string // Home directory (.claude, .codex, .opencode)
  outputFile: string // Output filename (CLAUDE.md, AGENTS.md)
  skillsFormat?: 'agent-md' // If set, convert & embed skills
  pathReplacements?: Record<string, string> // Path adjustments
}
```

**To add a new platform**: Create a config entry + `instructions/{platform-key}/main.eta` template (platform key must match instructions directory
name).

### Skills Management

- Managed skills use `sa_` prefix in directory names
- Frontmatter: `name` (without prefix), `description`
- Synced to `~/{platform-dir}/skills/` during `agent-recipes sync`

## Development Workflow

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions on:

- Adding skills
- Creating CLI commands
- Modifying templates
- Testing and releasing

### Quick Commands

```bash
# Development
deno task dev --help           # Run CLI in dev mode
deno task build                # Compile binary
deno task lint                 # Run linter
deno task fmt                  # Format code

# Testing
agent-recipes sync             # Test sync functionality
agent-recipes list             # Verify skills detected
```

## Recording Changes

- Update `CHANGELOG.md` whenever skills, instructions, or CLI features change
- Keep the `Unreleased` section current during development
- Move entries to versioned sections during release prep
- Include manual follow-up steps users must perform
- Capture instruction changes, skill updates, and CLI behavior adjustments

## Code Quality Standards

### Style Guidelines

- Write clean, readable code following existing patterns
- Use TypeScript strict mode with no implicit any
- Prefer async/await over callbacks
- Add JSDoc comments for public APIs
- Follow Deno formatting conventions

### Architecture Decisions

- **Convention over configuration**: Predictable file locations and naming
- **Declarative configs**: Keep logic in code, data in configs
- **Simplicity first**: Prefer straightforward solutions
- **Type safety**: Leverage TypeScript for correctness
- **Zero dependencies (where possible)**: Minimize external deps

## Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Sanitize all user inputs
- Follow OWASP best practices
- Review security implications of all changes

## Branch Naming & Commits

Use the **sa_commit-message** skill for proper formatting following StashAway standards.

---

_For repository structure details and conventions, see AGENTS.md. For detailed development workflows, see CONTRIBUTING.md._
