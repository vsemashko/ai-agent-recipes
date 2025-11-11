# asdf Troubleshooting Guide

## Common Issues

### Command Not Found After Install

**Symptoms:**

```bash
asdf install nodejs 20.11.0
node --version
# bash: node: command not found
```

**Solutions:**

1. **Recreate shims:**

```bash
asdf reshim nodejs
node --version
```

2. **Verify PATH includes asdf shims:**

```bash
echo $PATH | grep asdf
# Should show something like: /Users/you/.asdf/shims
```

If not in PATH, check shell configuration:

```bash
# For bash
cat ~/.bashrc | grep asdf

# For zsh
cat ~/.zshrc | grep asdf

# Ensure it has:
. "$HOME/.asdf/asdf.sh"
```

3. **Restart shell:**

```bash
exec bash  # or: exec zsh
```

### Version Not Activating

**Symptoms:**

```bash
asdf set nodejs 20.11.0
node --version
# v18.19.0 (wrong version)
```

**Solutions:**

1. **Check version resolution:**

```bash
asdf current nodejs
# nodejs         18.19.0      /Users/you/.tool-versions
```

This shows which version is active and where it's set.

2. **Check .tool-versions hierarchy:**

```bash
# asdf searches from current directory upward
cat .tool-versions              # Current directory
cat ../.tool-versions           # Parent
cat ~/.tool-versions            # Home directory
```

3. **Override with environment variable:**

```bash
export ASDF_NODEJS_VERSION=20.11.0
node --version
```

4. **Check for shell aliases:**

```bash
type node
# If it shows an alias, unset it:
unalias node
```

### Plugin Installation Fails

**Symptoms:**

```bash
asdf install nodejs 20.11.0
# Error: Failed to install nodejs 20.11.0
```

**Solutions by Plugin:**

**Node.js:**

```bash
# macOS - install gpg
brew install gpg

# Ubuntu/Debian
sudo apt install dirmngr gpg curl gawk

# Import Node.js release team keys (if needed)
bash -c '${ASDF_DATA_DIR:=$HOME/.asdf}/plugins/nodejs/bin/import-release-team-keyring'
```

**Python:**

```bash
# macOS
brew install openssl readline sqlite3 xz zlib

# Ubuntu/Debian
sudo apt install -y build-essential libssl-dev zlib1g-dev \
  libbz2-dev libreadline-dev libsqlite3-dev curl \
  libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev

# Then retry
asdf install python 3.11.7
```

**Ruby:**

```bash
# macOS
brew install openssl@3 readline libyaml gmp rust

# Ubuntu/Debian
sudo apt install -y autoconf bison patch build-essential rustc \
  libssl-dev libyaml-dev libreadline6-dev zlib1g-dev libgmp-dev \
  libncurses5-dev libffi-dev libgdbm6 libgdbm-dev libdb-dev uuid-dev
```

### Global Packages Not Found

**Symptoms:**

```bash
npm install -g typescript
tsc --version
# bash: tsc: command not found
```

**Solution:**

```bash
# Recreate shims after installing global packages
asdf reshim nodejs

# Verify shim exists
ls ~/.asdf/shims/tsc
which tsc
```

### Multiple Plugins Conflict

**Symptoms:**

- Both `nodejs` and `node` plugins installed
- Commands not working

**Solution:**

```bash
# List plugins
asdf plugin list
# nodejs
# node

# Remove duplicate
asdf plugin remove node

# Keep only 'nodejs' (official plugin)
asdf reshim nodejs
```

### Permission Errors

**Symptoms:**

```bash
asdf install nodejs 20.11.0
# Permission denied errors
```

**Solutions:**

1. **Check asdf directory ownership:**

```bash
ls -la ~/.asdf
# Should be owned by your user

# Fix if needed
sudo chown -R $(whoami) ~/.asdf
```

2. **Check plugin directory:**

```bash
ls -la ~/.asdf/plugins/nodejs
sudo chown -R $(whoami) ~/.asdf/plugins
```

3. **Never use sudo with asdf:**

```bash
# DON'T DO THIS:
sudo asdf install nodejs 20.11.0

# INSTEAD:
asdf install nodejs 20.11.0
```

### asdf Command Not Found

**Symptoms:**

```bash
asdf --version
# bash: asdf: command not found
```

**Solutions:**

1. **Check if asdf is installed:**

```bash
ls -la ~/.asdf
# or for Homebrew:
brew list asdf
```

2. **Verify shell configuration:**

```bash
# For bash
grep asdf ~/.bashrc

# For zsh
grep asdf ~/.zshrc

# Should contain:
. "$HOME/.asdf/asdf.sh"
# or for Homebrew:
. /opt/homebrew/opt/asdf/libexec/asdf.sh
```

3. **Reload shell config:**

```bash
source ~/.bashrc  # or ~/.zshrc
# or restart terminal
exec bash
```

4. **Reinstall if needed:** See @installation.md

### Legacy Version Files Not Working

**Symptoms:**

```bash
cat .nvmrc
# 20.11.0
node --version
# asdf doesn't pick up version from .nvmrc
```

**Solution:**

Enable in `~/.asdfrc`:

```bash
echo "legacy_version_file = yes" >> ~/.asdfrc

# Verify
cat ~/.asdfrc
# legacy_version_file = yes

# Test
cd project-with-nvmrc
asdf current nodejs
# nodejs         20.11.0      /path/to/.nvmrc
```

### Version Install Hangs

**Symptoms:**

```bash
asdf install python 3.11.7
# Hangs for long time
```

**Solutions:**

1. **Check if it's actually compiling:**

```bash
# Some versions compile from source (takes time)
# Check CPU usage: top or htop
# Python can take 5-15 minutes to compile
```

2. **Use pre-compiled versions when available:**

```bash
# For Python, some versions have pre-built binaries
ASDF_PYTHON_INSTALL_TYPE=pypy asdf install python pypy3.9-7.3.9
```

3. **Cancel and retry with verbose output:**

```bash
# Cancel: Ctrl+C
# Retry with logging
ASDF_NODEJS_VERBOSE_INSTALL=true asdf install nodejs 20.11.0
```

### Different Versions in Different Terminals

**Symptoms:**

- Terminal A shows Node.js 20.11.0
- Terminal B shows Node.js 18.19.0
- Both in same directory

**Solutions:**

1. **Check environment variables:**

```bash
env | grep ASDF
# May have ASDF_NODEJS_VERSION set in one terminal
```

2. **Check for different .tool-versions files:**

```bash
# Terminal A might be in subdirectory with different .tool-versions
pwd
cat .tool-versions
cat ../.tool-versions
```

3. **Verify same shell config:**

```bash
echo $SHELL
# Both should use same shell
```

### Diagnostic Commands

When troubleshooting, gather info with:

```bash
# asdf info (shows system details)
asdf info

# Check current versions
asdf current

# List installed versions
asdf list

# Check shims
ls -la ~/.asdf/shims/

# Check PATH
echo $PATH

# Check shell config
cat ~/.bashrc | grep asdf  # or ~/.zshrc

# Test version resolution
cd /tmp
asdf set nodejs 20.11.0
asdf current nodejs
node --version
```

## Getting Help

1. **Check asdf documentation:**
   - https://asdf-vm.com

2. **Check plugin-specific issues:**
   - Node.js: https://github.com/asdf-vm/asdf-nodejs/issues
   - Python: https://github.com/asdf-community/asdf-python/issues
   - Go: https://github.com/asdf-community/asdf-golang/issues

3. **asdf GitHub issues:**
   - https://github.com/asdf-vm/asdf/issues

4. **Reset and start fresh (last resort):**

```bash
# Backup current state
mv ~/.asdf ~/.asdf.backup
mv ~/.tool-versions ~/.tool-versions.backup

# Reinstall
# See @installation.md

# Restore versions list
cat ~/.asdf.backup/installs/*/
```
