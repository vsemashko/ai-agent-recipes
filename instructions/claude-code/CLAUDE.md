# StashAway Global Instructions for Claude Code

These are global instructions for Claude Code users at StashAway. They apply to all projects unless overridden by project-specific configurations.

## Coding Standards

### Branch Naming & Commit Messages

For branch naming conventions and commit message formatting, use the **commit-message** skill. This skill will guide you through proper formatting following StashAway standards.

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

## Using Skills

Claude Code has access to specialized skills for StashAway workflows in the `skills/` directory. These provide step-by-step guidance for common tasks.

To use a skill, simply ask about the task naturally (e.g., "Can you check if this service is rightsized?").

## Getting Help

- For AI tool issues: Check the agent-recipes repository
- For project-specific questions: Refer to project's CLAUDE.md or README
- For general questions: Ask in Slack or check internal documentation

---

*These instructions are managed by the stashaway-agent-recipes repository. To update, modify the source and run `agent-recipes sync`.*
