---
name: review
description: Perform comprehensive code review of specified files or recent changes
agent: code-reviewer
---

Please perform a thorough code review of $ARGUMENTS

If no specific files are mentioned, review the most recent changes (git diff or staged files).

Provide detailed feedback following your standard review process covering:
- Security vulnerabilities
- Performance issues
- Code quality and maintainability
- Best practices adherence
- Testing coverage

Be specific with file paths and line numbers. Provide actionable recommendations.
