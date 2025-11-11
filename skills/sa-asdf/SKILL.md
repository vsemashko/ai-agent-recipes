---
name: asdf
description: Use when a project has .tool-versions files or when required runtime versions are missing. Manage runtime versions (Node.js, Python, Go, Java, etc.) with asdf.
---

# asdf Version Manager

## When to use

This skill triggers automatically when:

- A project contains `.tool-versions` file
- Required runtime (Node.js, Python, Go, etc.) is not available or wrong version
- Need to switch between different tool versions across projects
- Setting up development environments with specific versions

**asdf is the preferred version manager** for all runtime tools at StashAway (replaces nvm, pyenv, rbenv, etc.).

## Prerequisites

asdf must be installed. If not available, see @installation.md for setup instructions.

## Core Workflow

### 1. Add a plugin (one-time per tool)

```bash
# Use Git URLs (recommended - more reliable)
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf plugin add python https://github.com/asdf-community/asdf-python.git
asdf plugin add golang https://github.com/asdf-community/asdf-golang.git
asdf plugin add java https://github.com/halcyon/asdf-java.git

# List all available plugins
asdf plugin list all

# List installed plugins
asdf plugin list
```

### 2. Install a version

```bash
# List available versions
asdf list all nodejs
asdf list all python

# Install specific version
asdf install nodejs 20.11.0
asdf install python 3.11.7

# Install latest
asdf install nodejs latest
asdf install python latest

# Install all versions from .tool-versions
asdf install
```

### 3. Set a version

```bash
# Current directory (./.tool-versions)
asdf set nodejs 20.11.0
asdf set python 3.11.7

# Home directory (~/.tool-versions)
asdf set -u nodejs 20.11.0

# Use system version (not managed by asdf)
asdf set nodejs system

# Check current versions
asdf current
asdf current nodejs
```

## `.tool-versions` File

Create or edit `.tool-versions` in project root to specify versions:

```
# Simple format
nodejs 20.11.0
python 3.11.7
golang 1.21.5

# Multiple fallback versions (space-separated)
python 3.11.7 3.10.13 system

# Comments supported
nodejs 20.11.0  # LTS version
```

**Supported version formats:**

- `20.11.0` - Specific version number
- `latest` - Latest stable (for install command only)
- `system` - Use system-installed version
- `ref:v1.0.2` - Git tag/commit/branch
- `path:~/src/tool` - Local custom build

## Essential Commands

### Version Management

```bash
# Show installed versions
asdf list nodejs
asdf list

# Uninstall a version
asdf uninstall nodejs 18.19.0

# Which version will be used
asdf which node
asdf which python

# Where version is installed
asdf where nodejs
```

### Plugin Management

```bash
# Update all plugins
asdf plugin update --all

# Update specific plugin
asdf plugin update nodejs

# Remove plugin (deletes all versions)
asdf plugin remove nodejs
```

### Utilities

```bash
# Recreate shims (after global package install)
asdf reshim nodejs

# Show which plugins provide a command
asdf shim-versions node

# Diagnostic info
asdf info
```

## Common Patterns

### New Project Setup

```bash
cd my-project
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf install nodejs 20.11.0
asdf set nodejs 20.11.0  # Creates ./.tool-versions

# Verify
node --version  # Should show 20.11.0
```

### Clone Project with .tool-versions

```bash
cd existing-project
cat .tool-versions  # Review required versions

# Add plugins if needed
asdf plugin add nodejs
asdf plugin add python

# Install all versions
asdf install

# Verify
asdf current
```

### Handle Global Packages

```bash
# After installing global npm/pip packages
npm install -g typescript
asdf reshim nodejs

# Verify shim created
which tsc  # Should point to asdf shim
```

### Multiple Versions

```bash
# Keep multiple versions, switch per project
asdf install nodejs 18.19.0
asdf install nodejs 20.11.0

cd project-a
asdf set nodejs 18.19.0

cd ../project-b
asdf set nodejs 20.11.0
```

## Configuration

### Enable Legacy Version Files

To read `.nvmrc`, `.python-version`, etc., add to `~/.asdfrc`:

```
legacy_version_file = yes
```

### Environment Variables

Usually we don't need to set environment variables. However, if you need to change configuration, see @configuration.md for configuration options.

## Troubleshooting

For troubleshooting, see @troubleshooting.md.
