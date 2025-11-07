# Changelog

All notable changes to the StashAway agent-recipes project are recorded here. Add new entries to the top of the file and group them under meaningful
headings (for example, Added/Changed/Fixed).

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
