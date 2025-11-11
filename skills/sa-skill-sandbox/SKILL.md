---
name: skill-sandboxing
description: Use when required runtimes (Node/Python/etc.) aren't available in this repo. Runs tasks in a temporary asdf-managed sandbox to avoid polluting the project and ensure reproducible installs.
---

# Skill Sandboxing

Use this skill when a workflow requires a specific runtime (e.g. Node.js or Python) that is not available in the current working directory. It
provides a safe, reproducible pattern to run tasks in an isolated environment without polluting the project.

This skill works alongside the asdf version manager. See the `asdf` skill for full background and installation guidance.

## What this provides

- Ephemeral sandbox folder under the managed agent directory (or a configured base)
- Local `.tool-versions` with the runtimes you request
- Automatic plugin setup and `asdf install` for those runtimes
- Command execution within the sandbox
- Artifact export to your chosen destination
- Cleanup of the sandbox directory

## Requirements

- asdf available on the machine and sourced into non-interactive shells
  - Prefer one of:
    - `$HOME/.asdf/asdf.sh`
    - `/opt/homebrew/opt/asdf/libexec/asdf.sh` (Homebrew on macOS)
    - Or `asdf` in PATH as a standalone executable
- Internet access for first-time plugin/version installs

Recommended plugins used by default (overridable):

- nodejs → https://github.com/asdf-vm/asdf-nodejs.git
- python → https://github.com/asdf-community/asdf-python.git

## Quick start

The helper script `scripts/sandbox-run.sh` implements the sandbox flow.

Basic usage:

```bash
skills/sa-skill-sandbox/scripts/sandbox-run.sh \
  --runtime "nodejs 20.11.1" \
  --runtime "python 3.11.7" \
  --workdir path/to/inputs \
  --cmd "npm ci && npm run build" \
  --artifact "dist/**/*" \
  --dest ./build-output
```

Key flags:

- `--runtime "<tool> <version>"` Add one or more tool/version pairs
- `--workdir <path>` Copy this directory into the sandbox before running
- `--cmd "<command>"` Command to execute inside the sandbox root
- `--artifact "<glob>"` Glob(s) to export from the sandbox (repeatable)
- `--dest <path>` Destination directory for exported artifacts
- `--keep` Keep the sandbox directory (skip cleanup)

Environment variables:

- `SKILL_SANDBOX_BASE` Force a base directory for sandboxes (default detection below)
- `SKILL_SANDBOX_DEBUG=1` Verbose logging

Base directory resolution order:

1. `$SKILL_SANDBOX_BASE`
2. `$AGENT_RECIPES_HOME/tmp`
3. `~/.codex/tmp`, `~/.claude/tmp`, or `~/.opencode/tmp` (first existing)
4. `~/.stashaway-agent-recipes/tmp`

## Examples

Node.js build:

```bash
skills/sa-skill-sandbox/scripts/sandbox-run.sh \
  --runtime "nodejs 20.11.1" \
  --workdir ./my-node-app \
  --cmd "npm ci && npm run build" \
  --artifact "dist/**/*" \
  --dest ./artifacts/node-build
```

Python script:

```bash
skills/sa-skill-sandbox/scripts/sandbox-run.sh \
  --runtime "python 3.11.7" \
  --workdir ./py-task \
  --cmd "python main.py" \
  --artifact "output/**/*" \
  --dest ./artifacts/py-output
```

Multiple runtimes (rare but supported):

```bash
skills/sa-skill-sandbox/scripts/sandbox-run.sh \
  --runtime "python 3.11.7" \
  --runtime "nodejs 20.11.1" \
  --workdir ./hybrid \
  --cmd "python gen_assets.py && node build.js" \
  --artifact "build/**/*" \
  --dest ./artifacts/hybrid
```

## Operational flow

1. Determine sandbox base (see resolution order) and create a unique temp directory
2. Write a `.tool-versions` file with the requested runtimes
3. Ensure asdf and required plugins are available; run `asdf install`
4. Copy `--workdir` into the sandbox root (if provided)
5. Execute `--cmd` inside the sandbox
6. Copy `--artifact` files to `--dest` (if provided)
7. Cleanup sandbox directory unless `--keep` is set

## Notes and guidance

- Always pin explicit versions in `--runtime` for reproducibility
- Prefer `npm ci` over `npm install` in CI-like contexts
- For Python, consider `uv`/`pip-tools` lockfiles when reproducibility matters
- If your operation writes outside the sandbox path, adjust the command or use artifacts to collect outputs
- If `asdf` is not found, install and configure it (see `asdf` skill)

## Troubleshooting

- Plugins fail to install: ensure network access and that the plugin Git URLs are reachable
- `asdf: command not found`: source `asdf.sh` in your shell or set PATH appropriately
- Artifacts not copied: verify your `--artifact` globs and that outputs are inside the sandbox
- Permission errors: the script uses `mktemp -d` and `cp -a`/`rsync` when available; ensure write permissions to the selected base directory
