# Agent Skills

## How to Use Skills

Skills are specialized agents that handle specific tasks. Each skill has detailed instructions available in the skills directory.

### Invoking Skills

To use a skill, you can:
1. Invoke it directly using the Skill tool: `Skill({ skill: "skill-name" })`
2. The skill name should match the `name` field from the skill's frontmatter (without the `sa_` prefix if present)

### Accessing Skill Instructions

Full skill instructions are available in:
- **Local directory**: `~/.codex/skills/sa_<skill-name>/SKILL.md`
- **Repository**: The skills are synced from the agent-recipes repository

When you invoke a skill, read its SKILL.md file first to understand:
- When to use the skill
- How it works (step-by-step process)
- Example usage
- Important notes and considerations

### Example Workflow

```
1. User requests a task that matches a skill (e.g., "check if service is rightsized")
2. You identify the relevant skill from the list below
3. Read the skill's SKILL.md: ~/.codex/skills/sa_rightsize/SKILL.md
4. Follow the instructions in the skill file
5. Execute the task according to the skill's guidelines
```
