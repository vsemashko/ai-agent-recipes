# StashAway Global Instructions for Claude Code

**Important:** This file uses managed sections. Content above the managed section marker is yours and will never be modified. The section below is
automatically updated when you run `agent-recipes sync`.

## Coding Standards

### Branch Naming & Commit Messages

For branch naming conventions and commit message formatting, use the **sa_commit-message** skill. This skill will guide you through proper formatting
following StashAway standards.

### Code Quality

- Write clean, readable code
- Follow existing patterns in the codebase
- Add comments for complex logic
- Write tests for new features
- Update documentation when needed

## Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Sanitize all user inputs
- Follow OWASP best practices
- Review security implications of all changes

## Using Skills

Skills with the `sa_` prefix are managed by agent-recipes and provide specialized guidance for StashAway workflows:

- **sa_rightsize** - Check and optimize Kubernetes resource allocations
- **sa_commit-message** - Generate properly formatted commit messages

To use a skill, simply ask about the task naturally (e.g., "Can you check if this service is rightsized?").

**Custom Skills:** You can add your own skills to the `skills/` directory without the `sa_` prefix. They will be preserved when syncing.

## Getting Help

- For AI tool issues: Check the agent-recipes repository
- For project-specific questions: Refer to project's CLAUDE.md or README
- For general questions: Ask in Slack or check internal documentation

---

_This section is managed by agent-recipes. To customize these instructions, edit content above the managed section marker._
