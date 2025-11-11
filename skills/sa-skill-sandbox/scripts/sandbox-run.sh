#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"

log() { echo "[skill-sandbox] $*"; }
debug() { if [[ "${SKILL_SANDBOX_DEBUG:-}" != "" ]]; then echo "[skill-sandbox][debug] $*"; fi }
err() { echo "[skill-sandbox][error] $*" >&2; }

usage() {
  cat <<USAGE
${SCRIPT_NAME} - Run commands in an ephemeral asdf-managed sandbox

Usage:
  ${SCRIPT_NAME} --runtime "nodejs 20.11.1" [--runtime "python 3.11.7"] \\
                 [--workdir ./path] --cmd "<command>" \\
                 [--artifact "glob1"] [--artifact "glob2"] \\
                 [--dest ./out] [--keep]

Options:
  --runtime  "<tool> <version>"  Add a tool/version to .tool-versions (repeatable)
  --workdir  <path>               Copy directory contents into sandbox before running
  --cmd      "<command>"          Command to execute inside the sandbox
  --artifact "<glob>"             Glob to export from sandbox (repeatable)
  --dest     <path>               Destination directory for exported artifacts
  --keep                          Do not delete the sandbox directory
  -h, --help                      Show this help

Environment:
  SKILL_SANDBOX_BASE   Base directory for sandboxes
  AGENT_RECIPES_HOME   Fallback base (uses \$AGENT_RECIPES_HOME/tmp)
  SKILL_SANDBOX_DEBUG  Set to any value for verbose logs
USAGE
}

RUNTIMES=()
ARTIFACTS=()
WORKDIR=""
CMD=""
DEST=""
KEEP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime)
      shift; [[ $# -gt 0 ]] || { err "--runtime requires an argument"; exit 2; }
      RUNTIMES+=("$1"); shift ;;
    --workdir)
      shift; [[ $# -gt 0 ]] || { err "--workdir requires a path"; exit 2; }
      WORKDIR="$1"; shift ;;
    --cmd)
      shift; [[ $# -gt 0 ]] || { err "--cmd requires a command string"; exit 2; }
      CMD="$1"; shift ;;
    --artifact)
      shift; [[ $# -gt 0 ]] || { err "--artifact requires a glob pattern"; exit 2; }
      ARTIFACTS+=("$1"); shift ;;
    --dest)
      shift; [[ $# -gt 0 ]] || { err "--dest requires a path"; exit 2; }
      DEST="$1"; shift ;;
    --keep)
      KEEP=1; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      err "Unknown argument: $1"; usage; exit 2 ;;
  esac
done

if [[ ${#RUNTIMES[@]} -eq 0 ]]; then
  err "At least one --runtime \"<tool> <version>\" is required"; usage; exit 2
fi
if [[ -z "$CMD" ]]; then
  err "--cmd is required"; usage; exit 2
fi

pick_base_dir() {
  if [[ -n "${SKILL_SANDBOX_BASE:-}" ]]; then
    echo "$SKILL_SANDBOX_BASE"
    return
  fi
  if [[ -n "${AGENT_RECIPES_HOME:-}" ]]; then
    echo "$AGENT_RECIPES_HOME/tmp"
    return
  fi
  for d in "$HOME/.codex" "$HOME/.claude" "$HOME/.opencode"; do
    if [[ -d "$d" ]]; then echo "$d/tmp"; return; fi
  done
  echo "$HOME/.stashaway-agent-recipes/tmp"
}

BASE_DIR="$(pick_base_dir)"
mkdir -p "$BASE_DIR"
SANDBOX="$(mktemp -d "$BASE_DIR/sandbox.XXXXXXXX")"
debug "Using base: $BASE_DIR"
log "Created sandbox: $SANDBOX"

cleanup() {
  if [[ $KEEP -eq 1 ]]; then
    log "Keeping sandbox at $SANDBOX (requested)"
    return
  fi
  if [[ -d "$SANDBOX" ]]; then
    rm -rf "$SANDBOX" || true
    log "Cleaned up sandbox"
  fi
}
trap cleanup EXIT

ensure_asdf() {
  if command -v asdf >/dev/null 2>&1; then return 0; fi
  # try common locations
  if [[ -f "$HOME/.asdf/asdf.sh" ]]; then
    # shellcheck disable=SC1090
    . "$HOME/.asdf/asdf.sh" || true
  elif [[ -f "/opt/homebrew/opt/asdf/libexec/asdf.sh" ]]; then
    # shellcheck disable=SC1091
    . "/opt/homebrew/opt/asdf/libexec/asdf.sh" || true
  fi
  if ! command -v asdf >/dev/null 2>&1; then
    err "asdf not found. Install and configure asdf (see asdf skill)."
    exit 1
  fi
}

ensure_asdf

# Write .tool-versions
{
  for rt in "${RUNTIMES[@]}"; do
    echo "$rt"
  done
} > "$SANDBOX/.tool-versions"
debug "Wrote .tool-versions:\n$(cat "$SANDBOX/.tool-versions")"

plugin_url_for() {
  case "$1" in
    nodejs) echo "https://github.com/asdf-vm/asdf-nodejs.git" ;;
    python) echo "https://github.com/asdf-community/asdf-python.git" ;;
    golang) echo "https://github.com/asdf-community/asdf-golang.git" ;;
    java)   echo "https://github.com/halcyon/asdf-java.git" ;;
    ruby)   echo "https://github.com/asdf-vm/asdf-ruby.git" ;;
    *)      echo "" ;;
  esac
}

ensure_plugin() {
  local plugin="$1"
  if asdf plugin list | grep -qx "$plugin"; then
    debug "Plugin $plugin already installed"
    return 0
  fi
  local url; url="$(plugin_url_for "$plugin")"
  if [[ -n "$url" ]]; then
    log "Adding asdf plugin: $plugin ($url)"
    asdf plugin add "$plugin" "$url"
  else
    log "Adding asdf plugin: $plugin (no URL override)"
    asdf plugin add "$plugin"
  fi
}

# Ensure plugins for requested tools
for rt in "${RUNTIMES[@]}"; do
  tool="${rt%% *}"
  ensure_plugin "$tool"
done

# Install requested versions inside sandbox context
pushd "$SANDBOX" >/dev/null
log "Installing runtimes via asdf"
asdf install
popd >/dev/null

# Copy workdir contents (if provided) into sandbox root
if [[ -n "$WORKDIR" ]]; then
  if [[ ! -d "$WORKDIR" ]]; then
    err "--workdir path not found or not a directory: $WORKDIR"; exit 1
  fi
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete --exclude .git/ "$WORKDIR"/ "$SANDBOX"/
  else
    # Fallback: cp -a contents
    (shopt -s dotglob; cp -a "$WORKDIR"/* "$SANDBOX"/ 2>/dev/null || true)
  fi
fi

# Execute command inside sandbox root
log "Running command in sandbox"
(
  cd "$SANDBOX"
  # Ensure asdf is available for the subshell
  ensure_asdf
  bash -lc "$CMD"
)

# Export artifacts if requested
if [[ -n "$DEST" && ${#ARTIFACTS[@]} -gt 0 ]]; then
  mkdir -p "$DEST"
  (
    cd "$SANDBOX"
    shopt -s nullglob globstar dotglob
    for pattern in "${ARTIFACTS[@]}"; do
      matches=( $pattern )
      if [[ ${#matches[@]} -eq 0 ]]; then
        debug "No artifacts match pattern: $pattern"
        continue
      fi
      for p in "${matches[@]}"; do
        if [[ -d "$p" ]]; then
          mkdir -p "$DEST/$p"
          # Copy directory contents preserving structure
          if command -v rsync >/dev/null 2>&1; then
            rsync -a "$p"/ "$DEST/$p"/
          else
            cp -a "$p" "$DEST/$(dirname "$p")"/
          fi
        else
          mkdir -p "$DEST/$(dirname "$p")"
          cp -a "$p" "$DEST/$p"
        fi
      done
    done
  )
  log "Exported artifacts to $DEST"
fi

log "Done"

