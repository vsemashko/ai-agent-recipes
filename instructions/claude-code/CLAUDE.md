# StashAway Global Instructions for Claude Code

These are global instructions for Claude Code users at StashAway. They apply to all projects unless overridden by project-specific configurations.

## Coding Standards

### Branch Naming Convention

Always follow this format when creating branches:
```
<type>/<ticket-number>-<short-description>
```

**Examples:**
- `feat/SA-604-add-execution-mode`
- `fix/SA-1234-prevent-xss`
- `chore/SA-789-upgrade-deps`

**Types:**
- `feat` - New features
- `fix` - Bug fixes
- `chore` - Maintenance, package upgrades
- `refactor` - Code refactors without behavior changes

### Commit Message Format

```
<type>: <ticket-number> <subject>

<body>
```

**Components:**
- **Type**: Same as branch types (feat, fix, chore, refactor)
- **Ticket Number**: Jira ticket (e.g., SA-604) or GitLab issue (#123)
- **Subject**: Imperative mood, concise description
- **Body**: Optional - explain why or how if not obvious

**Examples:**
```
feat: SA-604 Add execution mode to kafka topic

- Add env to kafka topic to not interfere with prod execution
- Delete grist records on node closure
```

```
fix: SA-1234 Prevent XSS in user input fields

Sanitize user input before rendering to prevent cross-site scripting.
Added DOMPurify for client-side sanitization.
```

### Code Quality

- Write clean, readable code
- Follow existing patterns in the codebase
- Add comments for complex logic
- Write tests for new features
- Update documentation when needed

### Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Sanitize all user inputs
- Follow OWASP best practices
- Review security implications of all changes

## Available Skills

Claude Code has access to specialized skills for StashAway workflows. Skills are located in the `skills/` directory and provide step-by-step guidance for common tasks.

To use a skill, simply ask Claude about the task (e.g., "Can you check if this service is rightsized?") or mention the skill name in your request.

**Available Skills:**
- **rightsize** - Check and optimize Kubernetes resource allocations
- **commit-message** - Generate properly formatted commit messages

See the `skills/` directory for detailed documentation on each skill.

## Getting Help

- For AI tool issues: Check the agent-recipes repository
- For project-specific questions: Refer to project's CLAUDE.md or README
- For general questions: Ask in Slack or check internal documentation

---

*These instructions are managed by the stashaway-agent-recipes repository. To update, modify the source and run `agent-recipes sync`.*
