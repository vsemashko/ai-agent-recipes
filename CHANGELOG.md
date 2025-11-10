# Changelog

## 0.1.0

Initial release of @stashaway/agent-recipes — a toolkit and set of “recipes” for building and running AI agents consistently across projects.

Highlights:

- Deno-based CLI with commands to list, inspect, sync, and convert recipes (see README for usage).
- Config utilities with safe merging for JSONC/TOML/YAML, plus tests.
- Skills catalog:
  - sa_commit-message — enforce conventional commits and block AI attribution footers.
  - sa_branch-name — generate and validate Git branch names from issue IDs/titles.
  - sa_rightsize — guidance/tooling for right‑sizing tasks.
- Instruction templates for multiple providers (Claude, OpenAI “codex”), with shared common parts.
- Simple release workflow (release.ts) to bump versions and update the changelog.
