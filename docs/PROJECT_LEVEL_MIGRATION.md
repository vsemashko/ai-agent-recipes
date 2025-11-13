# Project-Level Agent Recipes Migration Guide

This guide helps you migrate to project-level agent recipes, enabling your team to commit AI agent configurations directly to your repository.

## Overview

**What is Project-Level Support?**

Project-level support allows you to:
- Commit AI agent configurations to your repository
- Ensure consistent setups across all team members
- Support multiple AI coding tools (Claude Code, OpenCode, Codex, Cursor)
- Curate skills relevant to your project (exclude large documentation skills)
- Define project-specific agents and commands

**User-Level vs Project-Level**

| Aspect | User-Level | Project-Level |
|--------|-----------|---------------|
| **Location** | `~/.claude/`, `~/.codex/`, etc. | `.agent-recipes/` in project root |
| **Scope** | Personal preferences | Team-wide standards |
| **Committed** | No | Yes (to repository) |
| **Skills** | All available skills | Curated subset |
| **Updates** | `agent-recipes sync` | `agent-recipes project sync` |

Both levels can coexist. Project-level configurations take precedence for project-specific knowledge.

## Quick Start

### 1. Initialize Project Configuration

Navigate to your project root and run:

```bash
cd /path/to/your/project
agent-recipes project init
```

This will prompt you to:
- Select providers (Claude Code, OpenCode, Codex, etc.)
- Choose default skills to include

Or specify options directly:

```bash
agent-recipes project init --providers=claude,opencode --skills=commit-message,branch-name
```

### 2. Review Configuration

The init command creates `.agent-recipes/config.json`:

```json
{
  "version": "1.0",
  "providers": ["claude", "opencode"],
  "skills": {
    "include": ["commit-message", "branch-name"],
    "exclude": ["document-skills-*"]
  },
  "agents": {
    "source": "local",
    "include": []
  },
  "commands": {
    "source": "local",
    "include": []
  }
}
```

Customize as needed:

**Add more skills:**
```bash
agent-recipes project add-skill rightsize
agent-recipes project add-skill asdf
```

**Edit config directly:**
```json
{
  "skills": {
    "include": ["commit-message", "branch-name", "rightsize"],
    "exclude": ["document-skills-*", "skill-sandbox"]
  }
}
```

### 3. Sync Configurations

Sync the configurations to your project:

```bash
agent-recipes project sync --verbose
```

This creates:
```
.agent-recipes/
├── config.json
├── state.json
├── providers/
│   ├── claude/
│   │   ├── AGENTS.md
│   │   └── skills/
│   │       ├── sa-commit-message/
│   │       └── sa-branch-name/
│   └── opencode/
│       ├── AGENTS.md
│       └── skills/
│           ├── sa-commit-message/
│           └── sa-branch-name/
```

### 4. Add to Git

Create a `.gitignore` entry for state files (optional):

```bash
# .agent-recipes/.gitignore
state.json
```

Commit to repository:

```bash
git add .agent-recipes/
git commit -m "chore: add project-level agent recipes configuration"
git push
```

### 5. Team Adoption

Team members can sync project configurations after pulling:

```bash
git pull
agent-recipes project sync
```

Their AI coding tools will now use the project-specific configurations.

## Advanced Configuration

### Custom Agents

Add project-specific agents in `.agent-recipes/agents/`:

```bash
# .agent-recipes/agents/code-reviewer.md
---
name: code-reviewer
description: Review code changes for this project
model: claude-sonnet-4
tools: Read, Grep, Glob
---

# Code Review Agent

Review code changes according to our team standards:
- Check for proper error handling
- Verify test coverage
- Ensure documentation is updated
```

Update config to include:

```json
{
  "agents": {
    "source": "local",
    "include": ["code-reviewer"]
  }
}
```

### Custom Commands

Add project-specific commands in `.agent-recipes/commands/`:

```bash
# .agent-recipes/commands/build-test.md
---
name: build-test
description: Build and run tests for this project
---

Build the project and run all tests:
1. Run `npm run build`
2. Run `npm test`
3. Report any failures
```

Update config:

```json
{
  "commands": {
    "source": "local",
    "include": ["build-test"]
  }
}
```

### Provider-Specific Overrides

Customize settings for specific providers:

```json
{
  "providerOverrides": {
    "claude": {
      "model": "claude-sonnet-4",
      "additionalSkills": ["claude-specific-skill"]
    },
    "opencode": {
      "model": "anthropic/claude-3-5-sonnet-20241022"
    }
  }
}
```

### Multiple Projects

Use the same user-level installation for multiple projects:

```bash
# Project A
cd /path/to/project-a
agent-recipes project init --providers=claude
agent-recipes project sync

# Project B (different configuration)
cd /path/to/project-b
agent-recipes project init --providers=claude,opencode
agent-recipes project add-skill rightsize
agent-recipes project sync
```

Each project maintains its own `.agent-recipes/` configuration.

## Common Workflows

### Adding a New Skill

```bash
# List available skills
agent-recipes project list --available

# Add skill
agent-recipes project add-skill rightsize

# Sync to apply
agent-recipes project sync
```

### Removing a Skill

```bash
# Remove skill
agent-recipes project remove-skill rightsize

# Sync to apply
agent-recipes project sync
```

### Validating Configuration

```bash
agent-recipes project validate
```

### Updating Provider Templates

When new features are added to agent-recipes:

```bash
# Pull latest changes
git pull

# Update user-level installation
agent-recipes sync

# Re-sync project
agent-recipes project sync
```

## Best Practices

### Skill Curation

**Do include:**
- Core workflow skills (commit-message, branch-name)
- Project-relevant tooling (rightsize, asdf)
- Custom project-specific skills

**Don't include:**
- Large documentation skills (document-skills-*)
- Sandbox/testing skills
- Personal preference skills

**Why?**
- Keep repository footprint small
- Faster cloning and pulling
- Focus on project-relevant knowledge

### Gitignore Recommendations

**Commit to git:**
- `.agent-recipes/config.json`
- `.agent-recipes/agents/`
- `.agent-recipes/commands/`
- `.agent-recipes/providers/` (generated files - team consistency)

**Optional to ignore:**
- `.agent-recipes/state.json` (tracking file, can be regenerated)

**Never commit:**
- Secrets or credentials
- Provider API keys
- Personal configurations

### Team Onboarding

1. **Document in README:**
   ```markdown
   ## AI Coding Setup

   This project uses StashAway Agent Recipes for AI coding tool configurations.

   After cloning:
   ```bash
   agent-recipes project sync
   ```
   ```

2. **Pre-commit hook (optional):**
   Validate configuration on commit:
   ```bash
   #!/bin/sh
   agent-recipes project validate || exit 1
   ```

3. **CI/CD validation:**
   Add validation step to CI pipeline to ensure configuration remains valid.

## Troubleshooting

### "Project not initialized"

**Error:**
```
❌ Project not initialized. Run "agent-recipes project init" first.
```

**Solution:**
```bash
agent-recipes project init
```

### "Skill not found in repository"

**Error:**
```
⚠  Skill "my-skill" not found in repository, skipping
```

**Solution:**
- Check available skills: `agent-recipes project list --available`
- Ensure user-level installation is up to date: `agent-recipes sync`
- Verify skill name (without `sa-` prefix)

### "Invalid provider"

**Error:**
```
Invalid provider: myplatform. Must be one of: claude, codex, opencode, cursor
```

**Solution:**
Edit `.agent-recipes/config.json` and use valid provider names.

### Configuration conflicts

If multiple team members edit configuration simultaneously:

1. Pull latest changes
2. Resolve merge conflicts in `.agent-recipes/config.json`
3. Run `agent-recipes project validate` to ensure valid config
4. Sync: `agent-recipes project sync`

## Migration Checklist

- [ ] Install/update user-level agent-recipes: `agent-recipes sync`
- [ ] Initialize project: `agent-recipes project init`
- [ ] Customize `.agent-recipes/config.json`
- [ ] Add project-specific agents (if any)
- [ ] Add project-specific commands (if any)
- [ ] Sync configurations: `agent-recipes project sync`
- [ ] Test with your AI coding tool
- [ ] Add `.agent-recipes/` to git
- [ ] Update project README with setup instructions
- [ ] Communicate changes to team
- [ ] Verify team members can sync successfully

## FAQ

**Q: Do I need both user-level and project-level?**

A: User-level provides personal configurations and global skills. Project-level adds team-specific standards. Both can coexist.

**Q: Which skills should I include in projects?**

A: Include workflow-relevant skills (commit-message, branch-name) and project-specific needs. Exclude large documentation skills.

**Q: Can I use different providers in different projects?**

A: Yes! Each project configures its own providers independently.

**Q: How do I update project configurations?**

A: Edit `.agent-recipes/config.json`, run `agent-recipes project sync`, and commit changes.

**Q: What happens if I don't sync after git pull?**

A: Your AI tool will use outdated configurations. Always sync after pulling configuration changes.

**Q: Can I override project config locally?**

A: Project configurations are team-wide. For personal preferences, use user-level configurations in `~/.claude/`, `~/.codex/`, etc.

## Support

For issues or questions:
- Check troubleshooting section above
- Review [AGENTS.md](../AGENTS.md) for detailed documentation
- Report issues at [github.com/your-org/agent-recipes/issues](https://github.com/your-org/agent-recipes/issues)

---

**Next Steps:**
- [View Project-Level Examples](./examples/)
- [Read Architecture Documentation](../AGENTS.md#project-level-support)
- [Contribute Custom Skills](../CONTRIBUTING.md)
