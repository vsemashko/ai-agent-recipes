# Changelog

All notable changes to the StashAway agent-recipes project are recorded here. Add new entries to the top of the file and group them under meaningful
headings (for example, Added/Changed/Fixed).

## Unreleased

### Added

- New `sa_branch-name` skill for generating and validating git branch names following StashAway conventions
- Codex and OpenCode `AGENT.template.md` samples now demonstrate exactly how to embed the shared instructions (`{{AGENTS.md}}`) plus the reusable
  skills boilerplate (`{{SKILLS_INSTRUCTIONS.template.md}}`), making it easier to add future tools.

### Changed

- Updated `sa_commit-message` skill to explicitly prohibit AI attribution footers in commit messages (no "Generated with Claude Code" or "Co-Authored-By: Claude" footers)
- Renamed `instructions/GLOBAL_INSTRUCTIONS.md` to `instructions/AGENTS.md` and updated every template, doc, and installer path to treat it as the
  single managed source.
- Simplified the template stack: removed `instructions/common/AGENTS.template.md` and the unused Claude `AGENT.template.md`, so per-tool templates now
  embed the shared instructions directly.
- Dropped `instructions/codex/CODEX_INSTRUCTIONS.md`; Codex-only guidance now belongs directly inside `instructions/codex/AGENT.template.md`.
- Updated the installer to render `{{AGENTS.md}}` directly for Claude and Codex, only providing the shared skills partial when required.
- Refreshed README, CLAUDE.md, CONTRIBUTING.md, `instructions/README.md`, and AGENTS.md to document the new structure and expectations.

## 0.1.2

### Added

- Introduced `instructions/AGENTS.md` as the single source of truth for managed instructions consumed by all AI tool templates.
- Created `instructions/common/AGENTS.template.md` so Codex, OpenCode, and future tools can share a single agent layout while still injecting
  tool-specific fragments.
- Added `instructions/codex/CODEX_INSTRUCTIONS.md` (since removed) and documented how to extend it when Codex-only guidance is needed.
- Documented the instruction layout in `instructions/README.md` so contributors know where to place new templates or per-tool fragments.

### Changed

- `instructions/claude/CLAUDE.template.md` now acts as a template that renders `{{AGENTS.md}}`, and the CLI injects those instructions for both Claude
  Code and Codex sync targets.
- Codex sync now renders the shared agent template, plus any optional Codex instructions fragment, keeping future tool additions consistent.
- README/CLAUDE/CONTRIBUTING/AGENTS were updated to reflect the reorganized instruction hierarchy and future agent-configuration workflow.
- README and internal agent guidance now document the shared instructions flow and require contributors to update `CHANGELOG.md` with every change.

## 0.1.0

### Added

- Initial release of the `agent-recipes` CLI (commands: `sync`, `list`, `convert`, `info`).
- Managed skills shipped under `sa_`-prefixed directories while keeping frontmatter names unprefixed (includes `sa_commit-message`, `sa_rightsize`).
- Installation workflow with `<stashaway-recipes-managed-section>` markers for Claude Code and Codex instruction sync.
- Documentation and internal agent guidance on versioning, changelog maintenance, and instruction updates.
- Update checks that surface `CHANGELOG.md` diffs when newer versions are detected.

## 0.1.1

### Changed

- `agent-recipes sync` now always reinstalls managed content: it fetches/refreshes the repository when possible and re-syncs instructions and skills
  without needing a `--force` flag.
- `agent-recipes list` locates the real skills repository via the installer helper, so packaged installs now list bundled skills correctly.
- Installation flow runs `sync` automatically and the post-install tip points to `agent-recipes sync`.

### Fixed

- Skills copied for Codex have their path references rewritten during sync, preventing stale `~/.claude` references in `AGENTS.md`.
