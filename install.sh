#!/bin/sh

set -e

print_help_and_exit() {
  echo "Setup script for installing StashAway Agent Recipes

Options:
  --no-modify-path
    Don't add agent-recipes to the PATH environment variable
  -h, --help
    Print help
"
  echo "Note: agent-recipes was not installed"
  exit 0
}

ensure_command() {
  command_name="$1"
  shift
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "❌ ${command_name} is not installed"
    if [ "$#" -gt 0 ]; then
      echo ""
      printf "%s\n" "$@"
    fi
    exit 1
  fi
}

# Parse arguments
modify_path=true
for arg in "$@"; do
  case "$arg" in
  "-h")
    print_help_and_exit
    ;;
  "--help")
    print_help_and_exit
    ;;
  "--no-modify-path")
    modify_path=false
    ;;
  esac
done

# Check for required tools
ensure_command git \
  "" \
  "Please install Git first:" \
  "  macOS (Homebrew): brew install git" \
  "  Linux (Debian/Ubuntu): sudo apt-get install git" \
  "" \
  "For more options see: https://git-scm.com/downloads"

if ! command -v deno >/dev/null 2>&1; then
  echo "❌ Deno is not installed"
  echo ""
  echo "Suggested install steps:"
  echo "  - Using asdf (recommended if available):"
  echo "      asdf plugin add deno >/dev/null 2>&1 || true"
  echo "      echo \"deno latest\" >> ~/.tool-versions"
  echo "      asdf install"
  echo ""
  echo "  - Official installer:"
  echo "      curl -fsSL https://deno.land/install.sh | sh"
  echo ""
  echo "Once Deno is installed, rerun this script."
  exit 1
fi

echo "✓ Deno found: $(deno --version | head -n 1)"
echo "✓ Git found: $(git --version | head -n 1)"

# Set installation directory
agent_recipes_home="${AGENT_RECIPES_HOME:-$HOME/.stashaway-agent-recipes}"
bin_dir="$agent_recipes_home/bin"

# Create directories
if [ ! -d "$agent_recipes_home" ]; then
  mkdir -p "$agent_recipes_home"
fi

if [ ! -d "$bin_dir" ]; then
  mkdir -p "$bin_dir"
fi

echo ""
echo "📦 Installing StashAway Agent Recipes..."
echo "   Installation directory: $agent_recipes_home"
echo ""

# Check if we're running from the cloned repo
if [ -f "$(pwd)/main.ts" ]; then
  echo "✓ Running from repository directory"
  repo_dir="$(pwd)"
else
  # Clone or update the repository
  if [ -d "$agent_recipes_home/repo/.git" ]; then
    echo "✓ Repository exists, updating..."
    cd "$agent_recipes_home/repo"
    git pull origin main
    repo_dir="$agent_recipes_home/repo"
  else
    echo "📥 Cloning repository..."
    git clone git@gitlab.stashaway.com:vladimir.semashko/stashaway-agent-recipes.git "$agent_recipes_home/repo"
    repo_dir="$agent_recipes_home/repo"
  fi
fi

# Prepare temp directory for compile (avoid permission issues)
tmp_dir="$agent_recipes_home/tmp"
mkdir -p "$tmp_dir"

# Build the CLI
echo ""
echo "🔨 Building CLI..."
cd "$repo_dir"
TMPDIR="$tmp_dir" deno compile --allow-all --output="$bin_dir/agent-recipes" main.ts

if [ ! -f "$bin_dir/agent-recipes" ]; then
  echo "❌ Failed to build CLI"
  exit 1
fi

chmod +x "$bin_dir/agent-recipes"

echo "✓ CLI built successfully"

echo ""
echo "🧩 Running agent-recipes sync to finish setup..."
if [ "$modify_path" = true ]; then
  export AGENT_RECIPES_MODIFY_PATH=1
else
  export AGENT_RECIPES_MODIFY_PATH=0
fi

"$bin_dir/agent-recipes" sync
sync_status=$?

if [ $sync_status -ne 0 ]; then
  echo ""
  echo "⚠ Initial sync failed. To retry later run:"
  echo "  AGENT_RECIPES_MODIFY_PATH=$([ \"$modify_path\" = true ] && echo 1 || echo 0) \"$bin_dir/agent-recipes\" sync"
  exit $sync_status
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "💡 Next steps:"
echo "  1. Restart your shell or run: source ~/.zshrc (or ~/.bashrc)"
echo "  2. Run: agent-recipes list   # explore available skills"
