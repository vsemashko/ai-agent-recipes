# Code Reviewer Agent

Expert code review specialist focused on quality, security, performance, and maintainability.

## When to Use

- Reviewing pull requests before merge
- Security audits of critical code paths
- Code quality assessments
- Identifying performance bottlenecks
- Ensuring adherence to best practices

## What It Does

The code reviewer agent performs comprehensive code analysis covering:

- **Security**: OWASP Top 10, injection vulnerabilities, auth/authz issues
- **Performance**: Algorithm efficiency, N+1 queries, caching opportunities
- **Quality**: Code duplication, complexity, naming conventions, error handling
- **Testing**: Coverage assessment and test quality review
- **Best Practices**: Language-specific idioms, dependency management, logging

## Capabilities

**Tools Available**: Read, Grep, Glob, Bash
**Tools Disabled**: Write, Edit (read-only for safety)
**Model**: Sonnet (balanced speed and capability)

## Usage Examples

### Claude Code

```bash
# Let Claude invoke automatically when reviewing code
"Please review the authentication module"

# Or use the review command (if installed)
/review src/auth/
```

### OpenCode

The agent will be available in your `~/.config/opencode/opencode.json` configuration and can be invoked by the AI when appropriate.

### Codex

The agent description will be included in your `~/.codex/AGENTS.md` file for reference.

## Output Format

Reviews follow a structured format:

1. **Summary** - Overview of findings
2. **Critical Issues** - Blockers that must be fixed
3. **High Priority** - Important issues to address soon
4. **Medium Priority** - Improvements that should be made
5. **Suggestions** - Nice-to-have enhancements
6. **Positive Observations** - What was done well

All feedback includes:
- Specific file paths and line numbers
- Clear explanation of WHY it's an issue
- Actionable recommendations with code examples

## Safety Features

- Cannot modify files (Write/Edit tools disabled)
- Read-only access ensures safe operation
- No risk of accidental code changes during review

## Integration

This agent is automatically synced to all configured platforms when you run:

```bash
agent-recipes sync
```
