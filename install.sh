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

# Check for Deno
command -v deno >/dev/null 2>&1 || {
  echo "❌ Deno is not installed"
  echo ""
  echo "Please install Deno first:"
  echo "  curl -fsSL https://deno.land/install.sh | sh"
  echo ""
  echo "Or visit: https://deno.land/#installation"
  exit 1
}

echo "✓ Deno found: $(deno --version | head -n 1)"

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
if [ -f "$(pwd)/cli/main.ts" ]; then
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

# Build the CLI
echo ""
echo "🔨 Building CLI..."
cd "$repo_dir/cli"
deno compile --allow-all --output="$bin_dir/agent-recipes" main.ts

if [ ! -f "$bin_dir/agent-recipes" ]; then
  echo "❌ Failed to build CLI"
  exit 1
fi

chmod +x "$bin_dir/agent-recipes"

echo "✓ CLI built successfully"

# Add to PATH if requested
if [ "$modify_path" = true ]; then
  shell_name="$(basename "$SHELL")"
  rc_file=""

  case "$shell_name" in
    zsh)
      rc_file="$HOME/.zshrc"
      ;;
    bash)
      if [ -f "$HOME/.bashrc" ]; then
        rc_file="$HOME/.bashrc"
      elif [ -f "$HOME/.bash_profile" ]; then
        rc_file="$HOME/.bash_profile"
      fi
      ;;
    *)
      echo "⚠ Unknown shell: $shell_name"
      echo "  Please manually add $bin_dir to your PATH"
      ;;
  esac

  if [ -n "$rc_file" ]; then
    if [ -f "$rc_file" ]; then
      if ! grep -q "stashaway-agent-recipes" "$rc_file"; then
        echo "" >> "$rc_file"
        echo "# StashAway Agent Recipes" >> "$rc_file"
        echo "export PATH=\"\$PATH:$bin_dir\"" >> "$rc_file"
        echo "✓ Added to PATH in $rc_file"
      else
        echo "✓ Already in PATH"
      fi
    else
      echo "$rc_file" > "$rc_file"
      echo "" >> "$rc_file"
      echo "# StashAway Agent Recipes" >> "$rc_file"
      echo "export PATH=\"\$PATH:$bin_dir\"" >> "$rc_file"
      echo "✓ Created $rc_file and added to PATH"
    fi
  fi
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "💡 Next steps:"
echo "  1. Restart your shell or run: source ~/.zshrc (or ~/.bashrc)"
echo "  2. Run: agent-recipes sync"
echo ""

# Check if agent-recipes is now in PATH
if command -v agent-recipes >/dev/null 2>&1; then
  echo "✓ agent-recipes is available in PATH"
  echo "  Run 'agent-recipes --help' to get started"
else
  echo "⚠ agent-recipes is not yet in PATH"
  echo "  Please restart your shell or run: export PATH=\"\$PATH:$bin_dir\""
  echo "  Then run: agent-recipes sync"
fi
