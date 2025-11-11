# Changelog

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
