# asdf Installation Guide

## Prerequisites

asdf requires:

- `git` (version control)
- `bash` (shell, even if you use zsh/fish)

## Installation Methods

### macOS (Homebrew) - Recommended

```bash
# Install asdf
brew install asdf

# Add to shell configuration
# For bash:
echo -e '\n. /opt/homebrew/opt/asdf/libexec/asdf.sh' >> ~/.bashrc

# For zsh:
echo -e '\n. /opt/homebrew/opt/asdf/libexec/asdf.sh' >> ~/.zshrc

# Restart shell or reload configuration
source ~/.bashrc  # or source ~/.zshrc
```

### Linux (apt/yum/pacman)

```bash
# Ubuntu/Debian
sudo apt install curl git
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.18.0

# Add to ~/.bashrc
echo -e '\n. "$HOME/.asdf/asdf.sh"' >> ~/.bashrc
echo -e '\n. "$HOME/.asdf/completions/asdf.bash"' >> ~/.bashrc

# Restart shell
exec bash
```

### Universal (Git Clone)

```bash
# Clone asdf repository
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.18.0

# For bash, add to ~/.bashrc:
echo -e '\n. "$HOME/.asdf/asdf.sh"' >> ~/.bashrc
echo -e '\n. "$HOME/.asdf/completions/asdf.bash"' >> ~/.bashrc

# For zsh, add to ~/.zshrc:
echo -e '\n. "$HOME/.asdf/asdf.sh"' >> ~/.zshrc
# fpath must be set before compinit
echo -e '\nfpath=(${ASDF_DIR}/completions $fpath)' >> ~/.zshrc
echo -e '\nautoload -Uz compinit && compinit' >> ~/.zshrc

# For fish, add to ~/.config/fish/config.fish:
echo -e '\nsource ~/.asdf/asdf.fish' >> ~/.config/fish/config.fish
echo -e '\nmkdir -p ~/.config/fish/completions; and ln -s ~/.asdf/completions/asdf.fish ~/.config/fish/completions' >> ~/.config/fish/config.fish
```

## Verification

```bash
# Verify installation
asdf --version

# Should show something like: v0.18.0

# Verify shell integration
which asdf
echo $PATH | grep asdf  # Should show asdf shims directory
```

## Post-Installation Setup

### 1. Enable Legacy Version Files (Recommended)

Create `~/.asdfrc`:

```bash
cat > ~/.asdfrc << 'EOF'
# Read legacy version files (.nvmrc, .python-version, etc.)
legacy_version_file = yes
EOF
```

This allows asdf to read version files from other version managers.

### 2. Add Common Plugins

```bash
# Node.js
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git

# Python
asdf plugin add python https://github.com/asdf-community/asdf-python.git

# Go
asdf plugin add golang https://github.com/asdf-community/asdf-golang.git

# Verify plugins
asdf plugin list
```

### 3. Install Plugin Dependencies

Some plugins require system dependencies:

**Node.js:**

```bash
# macOS (usually no extra deps needed)
brew install gpg

# Ubuntu/Debian
sudo apt install dirmngr gpg curl gawk
```

**Python:**

```bash
# macOS
brew install openssl readline sqlite3 xz zlib

# Ubuntu/Debian
sudo apt install build-essential libssl-dev zlib1g-dev \
  libbz2-dev libreadline-dev libsqlite3-dev curl \
  libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev
```

**Go:**

```bash
# Usually no dependencies needed
```

## Updating asdf

```bash
# If installed via Homebrew
brew upgrade asdf

# If installed via Git
cd ~/.asdf
git fetch --all --tags
git checkout "$(git describe --tags $(git rev-list --tags --max-count=1))"
```

## Uninstallation

```bash
# Remove asdf directory
rm -rf ~/.asdf

# Remove from shell configuration
# Edit ~/.bashrc or ~/.zshrc and remove asdf lines

# Remove plugins and versions (if not in ~/.asdf)
rm -rf ~/.tool-versions
```

## Troubleshooting Installation

**asdf command not found:**

- Verify asdf is sourced in your shell config (~/.bashrc or ~/.zshrc)
- Restart your terminal or run: `source ~/.bashrc`

**Shims not working:**

- Check PATH: `echo $PATH | grep asdf`
- asdf shims should appear early in PATH
- Reload shell: `exec bash` or `exec zsh`

**Permission errors:**

- Ensure ~/.asdf directory is owned by your user: `ls -la ~/.asdf`
- Fix permissions: `chown -R $(whoami) ~/.asdf`
