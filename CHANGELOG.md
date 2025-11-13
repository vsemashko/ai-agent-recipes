# Changelog

## Unreleased

### Added

- **Project-Level Provider Support** - Simplified centrally-managed project sync
  - New `agent-recipes project sync` command for syncing to project repositories
  - Central configuration in `project-sync-config.json` (no per-project config needed)
  - Support for Claude Code, OpenCode, Codex, Cursor
  - Syncs to `.agent-recipes/.claude/`, `.agent-recipes/.config/opencode/`, etc.

- **Central Skill Curation**
  - Centrally-defined skill lists in `project-sync-config.json`
  - Include/exclude patterns (e.g., `"document-skills-*"`)
  - Default exclusions for large documentation skills (~2.6MB total)
  - All projects get same curated set of skills

- **Project Templates**
  - `instructions/project/AGENTS.md.eta` - Global instructions + skills section
  - `instructions/project/CLAUDE.md.eta` - Claude-specific with global instructions
  - Uses same GLOBAL_INSTRUCTIONS approach as user-level

- **Cursor Support**
  - Added Cursor platform configuration
  - Support for `.cursor/rules/` directory
  - Cursor MDC format with globs and alwaysApply

- **New Modules**
  - `cli/lib/project-installer.ts` - Simplified project sync logic (450+ lines)
  - `cli/commands/project.ts` - Single sync command
  - `project-sync-config.json` - Central configuration file

### Benefits

- **Zero Configuration**: No per-project setup, just run `agent-recipes project sync`
- **Team Consistency**: Central config ensures all projects use same setup
- **Multi-Tool Support**: Works across Claude Code, OpenCode, Codex, Cursor
- **Easy Onboarding**: Single command to get correct setup
- **Reduced Footprint**: Only essential skills synced to projects

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
