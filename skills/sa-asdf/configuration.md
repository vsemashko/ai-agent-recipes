# asdf Configuration Reference

## `.asdfrc` Configuration File

Located at `~/.asdfrc` (or `$ASDF_CONFIG_FILE` if set), this file contains machine-specific settings.

### Creating Configuration

```bash
# Create config file
cat > ~/.asdfrc << 'EOF'
# Enable reading legacy version files
legacy_version_file = yes

# Keep downloaded source code after install
always_keep_download = no

# Minutes between plugin repository syncs
plugin_repository_last_check_duration = 60

# Disable plugin repository sync
disable_plugin_short_name_repository = no

# CPU cores for compilation (default: auto)
concurrency = auto
EOF
```

### Configuration Options

#### `legacy_version_file`

**Default:** `no`

**Purpose:** Read version files from other version managers (`.nvmrc`, `.python-version`, `.ruby-version`, etc.)

**Recommended:** `yes`

```bash
legacy_version_file = yes
```

**Benefits:**

- Works with existing projects using nvm, pyenv, rbenv
- Team members can use either asdf or legacy tools
- Gradual migration path

#### `always_keep_download`

**Default:** `no`

**Purpose:** Keep downloaded source code and binaries after installation

```bash
always_keep_download = yes
```

**When to enable:**

- Debugging build issues
- Offline environments (can reuse downloads)
- Disk space not a concern

**Location:** `~/.asdf/downloads/`

#### `plugin_repository_last_check_duration`

**Default:** `60` (minutes)

**Purpose:** How often to sync the plugin short-name repository

```bash
plugin_repository_last_check_duration = 1440  # Once per day
```

**Notes:**

- Only affects `asdf plugin add <name>` without URL
- Does not affect Git URL installs
- Set to `0` to sync on every use

#### `disable_plugin_short_name_repository`

**Default:** `no`

**Purpose:** Completely disable plugin short-name repository

```bash
disable_plugin_short_name_repository = yes
```

**When to enable:**

- Corporate environments blocking GitHub access
- Always use Git URLs for plugins
- Reduce network requests

#### `concurrency`

**Default:** `auto` (number of CPU cores)

**Purpose:** Number of parallel jobs for compilation

```bash
concurrency = 4
```

**When to set:**

- Limit CPU usage during builds
- Faster builds on high-core systems
- Slower builds to prevent overheating

## Environment Variables

### Core Variables

#### `ASDF_DATA_DIR`

**Default:** `~/.asdf`

**Purpose:** Where asdf stores plugins, versions, and shims

```bash
export ASDF_DATA_DIR=~/custom/asdf-location
```

**Structure:**

```
$ASDF_DATA_DIR/
├── downloads/      # Downloaded source/binaries
├── installs/       # Installed versions
│   ├── nodejs/
│   │   ├── 20.11.0/
│   │   └── 18.19.0/
│   └── python/
│       └── 3.11.7/
├── plugins/        # Plugin repositories
│   ├── nodejs/
│   └── python/
└── shims/          # Command wrappers
    ├── node
    ├── npm
    └── python
```

#### `ASDF_CONFIG_FILE`

**Default:** `~/.asdfrc`

**Purpose:** Location of configuration file

```bash
export ASDF_CONFIG_FILE=~/dotfiles/asdfrc
```

#### `ASDF_DEFAULT_TOOL_VERSIONS_FILENAME`

**Default:** `.tool-versions`

**Purpose:** Name of version specification file

```bash
export ASDF_DEFAULT_TOOL_VERSIONS_FILENAME=.runtime-versions
```

**Notes:**

- Changes filename asdf looks for
- Useful for organizations with naming conventions
- Team must use same setting

#### `ASDF_DIR`

**Default:** Auto-detected installation location

**Purpose:** Where asdf scripts are located

```bash
export ASDF_DIR=/opt/asdf
```

**When to set:**

- Custom asdf installation location
- System-wide installation

### Tool-Specific Variables

#### Override Version

Override version for specific tool:

```bash
# Override Node.js version
export ASDF_NODEJS_VERSION=20.11.0

# Override Python version
export ASDF_PYTHON_VERSION=3.11.7

# Override Go version
export ASDF_GOLANG_VERSION=1.21.5
```

**Use cases:**

- CI/CD scripts requiring specific version
- Temporary testing with different version
- Override without modifying .tool-versions

#### `ASDF_CONCURRENCY`

**Purpose:** Override concurrency setting

```bash
export ASDF_CONCURRENCY=2
```

Overrides `.asdfrc` setting.

### Plugin-Specific Variables

Many plugins support additional environment variables:

#### Node.js Plugin

```bash
# Use pre-compiled binaries (faster)
export NODEJS_CHECK_SIGNATURES=no

# Custom mirror
export NODEJS_ORG_MIRROR=https://npm.taobao.org/mirrors/node

# Verbose install
export ASDF_NODEJS_VERBOSE_INSTALL=true
```

#### Python Plugin

```bash
# Install type
export ASDF_PYTHON_INSTALL_TYPE=pypy  # or: cpython (default)

# Patch URL for custom patches
export ASDF_PYTHON_PATCH_URL=https://example.com/python-3.11.7.patch

# Configure options
export PYTHON_CONFIGURE_OPTS="--enable-optimizations --with-lto"

# Build flags
export CFLAGS="-O2 -pipe"
```

#### Go Plugin

```bash
# Custom GOROOT
export ASDF_GOLANG_GOROOT=$HOME/.asdf/installs/golang/1.21.5/go

# Custom download mirror
export ASDF_GOLANG_DOWNLOAD_MIRROR=https://golang.google.cn
```

## Shell Configuration

### Bash

Add to `~/.bashrc`:

```bash
# asdf
. "$HOME/.asdf/asdf.sh"
. "$HOME/.asdf/completions/asdf.bash"

# Optional: Custom data directory
export ASDF_DATA_DIR=~/custom/asdf

# Optional: Enable legacy files
# (Or use ~/.asdfrc)
```

### Zsh

Add to `~/.zshrc`:

```bash
# asdf
. "$HOME/.asdf/asdf.sh"

# Completions (must be before compinit)
fpath=(${ASDF_DIR}/completions $fpath)
autoload -Uz compinit && compinit

# Optional: Custom configuration
export ASDF_DATA_DIR=~/custom/asdf
```

### Fish

Add to `~/.config/fish/config.fish`:

```fish
# asdf
source ~/.asdf/asdf.fish

# Completions
mkdir -p ~/.config/fish/completions
ln -s ~/.asdf/completions/asdf.fish ~/.config/fish/completions

# Optional: Custom configuration
set -x ASDF_DATA_DIR ~/custom/asdf
```

## Advanced Configuration

### Custom Plugin Repository

Use a custom short-name plugin repository:

```bash
# Set environment variable
export ASDF_PLUGIN_REPOSITORY=https://github.com/your-org/asdf-plugins
```

**Use case:** Corporate environment with curated plugin list

### Per-Project Configuration

Create `.envrc` (used with direnv) for project-specific settings:

```bash
# .envrc
export ASDF_NODEJS_VERSION=20.11.0
export ASDF_CONCURRENCY=2

# Load .tool-versions
use asdf
```

### CI/CD Configuration

Example for GitHub Actions:

```yaml
- name: Setup asdf
  uses: asdf-vm/actions/setup@v2

- name: Install tools
  run: |
    asdf plugin add nodejs
    asdf plugin add python
    asdf install
  env:
    ASDF_NODEJS_VERSION: 20.11.0
    ASDF_CONCURRENCY: 4
```

Example for GitLab CI:

```yaml
before_script:
  - git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.18.0
  - echo '. "$HOME/.asdf/asdf.sh"' >> ~/.bashrc
  - source ~/.bashrc
  - asdf plugin add nodejs
  - asdf install nodejs 20.11.0
  - asdf set -u nodejs 20.11.0
```

## Configuration Best Practices

1. **Use `.asdfrc` for machine settings:**
   - `legacy_version_file`
   - `concurrency`
   - System-specific options

2. **Use `.tool-versions` for project settings:**
   - Commit to version control
   - Team-wide versions

3. **Use environment variables for temporary overrides:**
   - CI/CD pipelines
   - Testing different versions
   - One-off scripts

4. **Document requirements:**
   ```markdown
   # README.md

   ## Development Setup

   Required:

   - asdf with `legacy_version_file = yes` in ~/.asdfrc
   - Plugins: nodejs, python

   Install:

   - asdf install
   ```

5. **Version pinning:**
   ```bash
   # Use specific versions, not 'latest'
   nodejs 20.11.0  # Good
   nodejs latest   # Bad (can cause inconsistency)
   ```

## Troubleshooting Configuration

**Check current configuration:**

```bash
# Show config file location
echo $ASDF_CONFIG_FILE
# Default: ~/.asdfrc

# View current settings
cat ~/.asdfrc

# Check environment variables
env | grep ASDF
```

**Reset to defaults:**

```bash
# Remove config file
rm ~/.asdfrc

# Unset environment variables
unset ASDF_DATA_DIR
unset ASDF_CONFIG_FILE
unset ASDF_CONCURRENCY
```

**Verify configuration is applied:**

```bash
# After changing legacy_version_file
cd project-with-nvmrc
asdf current nodejs
# Should show version from .nvmrc if enabled
```
