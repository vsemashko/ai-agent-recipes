# Changelog

All notable changes to the StashAway agent-recipes project are recorded here. Add new entries to the top of the file and group them under meaningful headings (for example, Added/Changed/Fixed).

## 0.1.0

### Added
- Initial release of the `agent-recipes` CLI (commands: `sync`, `list`, `convert`, `info`).
- Managed skills shipped under `sa_`-prefixed directories while keeping frontmatter names unprefixed (includes `sa_commit-message`, `sa_rightsize`).
- Installation workflow with `<stashaway-recipes-managed-section>` markers for Claude Code and Codex instruction sync.
- Documentation and internal agent guidance on versioning, changelog maintenance, and instruction updates.
- Update checks that surface `CHANGELOG.md` diffs when newer versions are detected.
