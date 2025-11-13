# Changelog

## Unreleased

### Added

- **Project-Level Provider Support** - Major new feature enabling project-level agent recipes
  - New `agent-recipes project` command suite for managing project configurations
  - Initialize project recipes: `agent-recipes project init`
  - Sync project configurations: `agent-recipes project sync`
  - Manage skills: `agent-recipes project add-skill`, `agent-recipes project remove-skill`
  - List and validate: `agent-recipes project list`, `agent-recipes project validate`

- **Provider-Agnostic Configuration**
  - Commit AI agent configurations directly to repositories
  - Support for multiple providers: Claude Code, OpenCode, Codex, Cursor
  - Provider-specific overrides in configuration
  - Team-wide consistency with `.agent-recipes/` directory

- **Selective Skill Sync**
  - Curated skill lists per project
  - Include/exclude patterns (e.g., `"document-skills-*"`)
  - Default exclusions for large documentation skills
  - Reduced repository footprint

- **Project-Specific Agents & Commands**
  - Define project-local agents in `.agent-recipes/agents/`
  - Define project-local commands in `.agent-recipes/commands/`
  - Inherit from user-level or use local configurations

- **New Modules**
  - `cli/lib/project-installer.ts` - Project-level sync logic (600+ lines)
  - `cli/lib/project-config.ts` - Configuration schema and validation (300+ lines)
  - `cli/commands/project.ts` - CLI commands for project operations

- **Provider Templates**
  - `instructions/project/claude.eta` - Claude Code project template
  - `instructions/project/opencode.eta` - OpenCode project template
  - `instructions/project/codex.eta` - Codex project template
  - `instructions/project/cursor.eta` - Cursor project template

### Documentation

- Added comprehensive migration guide: `docs/PROJECT_LEVEL_MIGRATION.md`
- Updated `AGENTS.md` with project-level support section
- Added examples for configuration, agents, and commands
- Documented best practices and troubleshooting

### Benefits

- **Team Consistency**: Everyone uses same AI agent configurations
- **Multi-Tool Support**: Works across Claude Code, OpenCode, Codex, Cursor, and more
- **Easy Onboarding**: New team members get correct setup on clone
- **Version Control**: All configurations committed to repository
- **Flexible**: Both user-level (personal) and project-level (team) configs coexist

## 0.1.3

- feat: SA-665 integrate agents and commands sync
   - add subagents and slash commands sync 
   - use standardized Markdown with YAML frontmatter format, that is converted to tool specific ones
   - add configs for opencode

## 0.1.2

- feat: SA-665 Exclude skills scripts from deno linting
- feat: SA-665 Exclude skills scripts from deno linting
- feat: SA-665 Improve skills
-
  - make skill names consistent
-
  - add more skills, copy some skills from claude skills repo
-
  - improve skills
-
  - fix platform configs
-
  - add opencode configs
-
  -

## 0.1.1

- Merge branch 'feat/improve-release' into 'main'
- feat: SA-665 Improve release process
- See merge request vladimir.semashko/stashaway-agent-recipes!8
- feat: SA-665 Improve release process
- Merge branch 'feat/add-support-for-configs-merge' into 'main'
- feat: SA-665 Add support for config merging
- See merge request vladimir.semashko/stashaway-agent-recipes!7
- feat: SA-665 Add support for config merging
-
  - Improve instructions templates handling
-
  - Improve local development
-
  - Improve config merging
-
  - Improve release process
- feat: Add branch-name skill and update commit-message guidelines
-
  - Add new sa-branch-name skill for generating and validating git branch names
-
  - Update sa-commit-message skill to prohibit AI attribution footers
-
  - Extract branch naming conventions from commit-message skill for focused guidance
- Merge branch 'feat/improve-templates' into 'main'
- feat: SA-665 Improve templates management
- See merge request vladimir.semashko/stashaway-agent-recipes!6
- feat: SA-665 Improve templates management
- feat: SA-665 Improve commands
- feat: SA-665 Improve commands
- feat: SA-665 Improve commands
- feat: SA-665 Fix installation
- feat: SA-665 Remove template engine to keep it simple
- feat: SA-665 Add template engine
- feat: SA-665 Add separate AGENTS.md spec
- feat: SA-665 Add separate AGENTS.md spec
- feat: SA-665 Init recipes repo
- feat: SA-665 Init recipes repo
- Merge branch 'feat/add-agant-instructions' into 'main'
- Feat/add agant instructions
- See merge request vladimir.semashko/stashaway-agent-recipes!4
- feat: SA-665 Init recipes repo
- feat: SA-665 Init recipes repo
- feat: SA-665 Init recipes repo
- Merge branch 'feat/add-agant-instructions' into 'main'
- feat: SA-665 Init recipes repo
- See merge request vladimir.semashko/stashaway-agent-recipes!3
- feat: SA-665 Init recipes repo
- Merge branch 'feat/add-agant-instructions' into 'main'
- feat: SA-665 Init recipes repo
- See merge request vladimir.semashko/stashaway-agent-recipes!2
- feat: SA-665 Init recipes repo
- Merge branch 'feat/init-recipes' into 'main'
- Feat/init recipes
- See merge request vladimir.semashko/stashaway-agent-recipes!1
- feat: SA-665 Init recipes repo
- feat: SA-665 Init recipes repo
- feat: SA-665 Init recipes repo
- feat: SA-665 Init recipes repo
- feat: SA-665 Init recipes repo
- Initial commit

## 0.1.0

Initial release of @stashaway/agent-recipes — a toolkit and set of “recipes” for building and running AI agents consistently across projects.

Highlights:

- Deno-based CLI with commands to list, inspect, sync, and convert recipes (see README for usage).
- Config utilities with safe merging for JSONC/TOML/YAML, plus tests.
- Skills catalog:
  - sa-commit-message — enforce conventional commits and block AI attribution footers.
  - sa-branch-name — generate and validate Git branch names from issue IDs/titles.
  - sa-rightsize — guidance/tooling for right‑sizing tasks.
- Instruction templates for multiple providers (Claude, OpenAI “codex”), with shared common parts.
- Simple release workflow (release.ts) to bump versions and update the changelog.
