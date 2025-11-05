# Testing Guide for StashAway Agent Recipes

This document provides comprehensive testing procedures for the agent-recipes repository.

## Prerequisites

### Required Tools

1. **Deno** (v2.1.4 or higher)
   ```bash
   # Install Deno
   curl -fsSL https://deno.land/install.sh | sh

   # Or using asdf (if .tool-versions is configured)
   asdf install

   # Verify installation
   deno --version
   ```

2. **Git**
   ```bash
   git --version
   ```

3. **Shell** (bash or zsh)
   ```bash
   echo $SHELL
   ```

## Testing Phases

### Phase 1: Installation Testing

#### 1.1 Fresh Installation

Test installing from scratch on a clean system.

```bash
# Clone the repository
git clone git@gitlab.stashaway.com:vladimir.semashko/stashaway-agent-recipes.git
cd stashaway-agent-recipes

# Run installation script
./install.sh

# Expected output:
# ✓ Deno found: deno x.x.x
# 📦 Installing StashAway Agent Recipes...
# ✓ Running from repository directory
# 🔨 Building CLI...
# ✓ CLI built successfully
# ✓ Added to PATH in ~/.zshrc (or ~/.bashrc)
# ✅ Installation complete!
```

**Verification Steps:**
1. Check that binary was created:
   ```bash
   ls -la ~/.stashaway-agent-recipes/bin/agent-recipes
   ```

2. Verify PATH was updated:
   ```bash
   grep "stashaway-agent-recipes" ~/.zshrc  # or ~/.bashrc
   ```

3. Restart shell or source rc file:
   ```bash
   source ~/.zshrc  # or source ~/.bashrc
   ```

4. Verify command is available:
   ```bash
   which agent-recipes
   agent-recipes --version
   ```

#### 1.2 Installation with --no-modify-path

Test installation without PATH modification.

```bash
./install.sh --no-modify-path

# Verify PATH was NOT modified
grep "stashaway-agent-recipes" ~/.zshrc  # Should return nothing
```

### Phase 2: CLI Command Testing

#### 2.1 Test `agent-recipes sync`

**First Run (Initial Setup):**
```bash
agent-recipes sync

# Expected prompts:
# 📦 Setting up StashAway Agent Recipes...
# ✓ Detected AI tools: [list of detected tools]
# Would you like to set up instructions for these tools? (Y/n)
```

**Test Cases:**
- Accept detected tools
- Decline detected tools and select manually
- Select no tools (edge case)
- Run sync twice (update scenario)

**Verification:**
1. Check config file was created:
   ```bash
   cat ~/.stashaway-agent-recipes/config.json
   ```

2. Check Claude Code instructions (if selected):
   ```bash
   ls -la ~/.config/claude-code/
   # Should see: CLAUDE.md, AGENTS.md, skills (symlink)
   ```

3. Check Codex instructions (if selected):
   ```bash
   ls -la ~/.codex/
   # Should see: agents.json
   ```

4. Verify skills symlink:
   ```bash
   ls -la ~/.config/claude-code/skills
   # Should point to: ~/.stashaway-agent-recipes/repo/instructions/claude-code/skills
   ```

#### 2.2 Test `agent-recipes list`

```bash
agent-recipes list

# Expected output:
# 📚 StashAway Agent Recipes
# Found 2 skill(s):
# [Table with skills]
```

**Test Cases:**
- Default list view (table)
- Verbose mode: `agent-recipes list --verbose`
- Empty skills directory (edge case)

#### 2.3 Test `agent-recipes info`

```bash
agent-recipes info

# Expected output:
# ℹ️  StashAway Agent Recipes Information
# Installation: ✅ Installed
# Version: x.x.x
# Location: ~/.stashaway-agent-recipes
# ...
```

**Test Cases:**
- Before installation (should show not installed)
- After installation
- With custom AGENT_RECIPES_HOME environment variable

#### 2.4 Test `agent-recipes convert`

**Single Skill Conversion:**
```bash
# Convert to AGENTS.md format
agent-recipes convert skills/rightsize/SKILL.md --format agent-md

# Convert to Codex JSON
agent-recipes convert skills/rightsize/SKILL.md --format codex-json

# Convert to Cursor MDC
agent-recipes convert skills/rightsize/SKILL.md --format cursor-mdc
```

**Batch Conversion:**
```bash
# Convert all skills to AGENTS.md
agent-recipes convert skills/ --batch --format agent-md --output test-agents.md

# Verify output
cat test-agents.md

# Clean up
rm test-agents.md
```

### Phase 3: Hash Tracking and Merge Testing

#### 3.1 Test Hash Tracking

```bash
# 1. Initial sync
agent-recipes sync

# 2. Modify a synced file
echo "# Custom comment" >> ~/.config/claude-code/CLAUDE.md

# 3. Run sync again
agent-recipes sync

# Expected: Should prompt about local changes
# "Claude Code CLAUDE.md has local changes. Overwrite with repository version? (y/N)"
```

**Test Cases:**
- Accept overwrite
- Decline overwrite
- Files with no changes (should skip)
- Files that match repository (should skip)

### Phase 4: Skill Functionality Testing

#### 4.1 Test RightSize Skill

**In Claude Code:**
```
User: Can you check if this service is rightsized?
```

**Expected Behavior:**
- Claude should recognize the request relates to the rightsize skill
- Claude should ask for namespace and app name (or extract from files)
- Claude should attempt to query RightSize API
- Claude should compare with deployment configs

**Verification:**
1. Check that Claude Code loaded the skill:
   ```bash
   # Skills should be accessible via symlink
   ls -la ~/.config/claude-code/skills/rightsize/SKILL.md
   ```

#### 4.2 Test Commit Message Skill

**In Claude Code:**
```
User: Create a commit for these changes
```

**Expected Behavior:**
- Claude should analyze git changes
- Claude should extract ticket from branch name
- Claude should generate properly formatted commit message
- Claude should follow StashAway conventions

### Phase 5: Error Handling Testing

#### 5.1 Missing HOME Directory

```bash
# Test with missing HOME (edge case)
env -u HOME -u USERPROFILE agent-recipes info

# Expected: Error about missing home directory
```

#### 5.2 Invalid Skill File

```bash
# Create invalid skill (missing frontmatter)
mkdir -p test-skills/invalid
echo "# Invalid Skill" > test-skills/invalid/SKILL.md

# Try to convert
agent-recipes convert test-skills/invalid/SKILL.md --format agent-md

# Expected: Error about invalid format
```

#### 5.3 Permissions Issues

```bash
# Make config read-only
chmod 000 ~/.stashaway-agent-recipes/config.json

# Try to sync
agent-recipes sync

# Expected: Error about permissions

# Fix permissions
chmod 644 ~/.stashaway-agent-recipes/config.json
```

### Phase 6: Update Testing

#### 6.1 Test Update Flow

```bash
# Simulate update scenario
# 1. Install version A
agent-recipes sync

# 2. Make changes to repository
# (Modify skills or instructions)

# 3. Run sync again
agent-recipes sync

# Expected: Should detect and apply updates
```

## Integration Testing

### With Claude Code

1. **Setup:**
   ```bash
   agent-recipes sync
   # Select Claude Code
   ```

2. **Verify Files:**
   ```bash
   cat ~/.config/claude-code/CLAUDE.md
   cat ~/.config/claude-code/AGENTS.md
   ls ~/.config/claude-code/skills/
   ```

3. **Test in Claude:**
   - Start new Claude Code session
   - Check if global instructions are loaded
   - Test rightsize skill
   - Test commit-message skill

### With Codex CLI

1. **Setup:**
   ```bash
   agent-recipes sync
   # Select Codex
   ```

2. **Verify Files:**
   ```bash
   cat ~/.codex/agents.json
   ```

3. **Test in Codex:**
   - Start Codex CLI
   - Check if agents are available
   - Test skill functionality

## Performance Testing

### Installation Speed

```bash
time ./install.sh
# Should complete in < 30 seconds
```

### Sync Speed

```bash
time agent-recipes sync
# First run: < 10 seconds
# Subsequent runs: < 5 seconds
```

## Regression Testing

Create a test suite to run before each release:

```bash
#!/bin/bash
# test-suite.sh

set -e

echo "🧪 Running test suite..."

# Test 1: Installation
echo "Test 1: Installation"
./install.sh --no-modify-path
[ -f ~/.stashaway-agent-recipes/bin/agent-recipes ] || exit 1

# Test 2: List command
echo "Test 2: List command"
agent-recipes list | grep -q "rightsize" || exit 1

# Test 3: Info command
echo "Test 3: Info command"
agent-recipes info | grep -q "Installed" || exit 1

# Test 4: Convert command
echo "Test 4: Convert command"
agent-recipes convert skills/rightsize/SKILL.md --format agent-md > /tmp/test-convert.md
[ -s /tmp/test-convert.md ] || exit 1
rm /tmp/test-convert.md

echo "✅ All tests passed!"
```

## Troubleshooting Common Issues

### Issue: Command not found

**Symptoms:**
```bash
agent-recipes: command not found
```

**Solutions:**
1. Restart shell: `exec $SHELL`
2. Source rc file: `source ~/.zshrc`
3. Check PATH: `echo $PATH | grep stashaway`
4. Reinstall: `./install.sh`

### Issue: Deno not found

**Symptoms:**
```bash
deno: command not found
```

**Solutions:**
1. Install Deno: `curl -fsSL https://deno.land/install.sh | sh`
2. Add Deno to PATH: `export PATH="$HOME/.deno/bin:$PATH"`

### Issue: Permission denied

**Symptoms:**
```bash
Permission denied: ~/.stashaway-agent-recipes/...
```

**Solutions:**
1. Check ownership: `ls -la ~/.stashaway-agent-recipes/`
2. Fix permissions: `chmod -R u+rw ~/.stashaway-agent-recipes/`

### Issue: Symlink creation failed

**Symptoms:**
```
ℹ Could not create symlink, copying directory instead
```

**Solutions:**
This is expected behavior on Windows or filesystems that don't support symlinks. The tool automatically falls back to copying the directory.

## Manual Test Checklist

Before each release, manually verify:

- [ ] Fresh installation works
- [ ] Update installation works
- [ ] All CLI commands run without errors
- [ ] Skills are properly formatted
- [ ] Instructions sync to Claude Code correctly
- [ ] Instructions sync to Codex correctly
- [ ] Hash tracking works
- [ ] Merge prompts appear correctly
- [ ] Symlinks are created (or copied)
- [ ] README is accurate
- [ ] CLAUDE.md is accurate
- [ ] PLAN_claude.md is up to date

## Automated Testing (Future)

For future releases, consider adding:

1. **Unit Tests:**
   ```typescript
   // cli/lib/installer.test.ts
   Deno.test("detectAITools finds Claude Code", async () => {
     // Test implementation
   })
   ```

2. **Integration Tests:**
   - Docker containers with different environments
   - GitHub Actions workflow

3. **End-to-End Tests:**
   - Automated Claude Code interaction tests
   - Skill validation tests

## Reporting Issues

When reporting issues, include:

1. Operating system and version
2. Shell (bash/zsh)
3. Deno version (`deno --version`)
4. Command that failed
5. Full error output
6. Contents of `~/.stashaway-agent-recipes/config.json` (if exists)

---

*Last updated: November 5, 2025*
