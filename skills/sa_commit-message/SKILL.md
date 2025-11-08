---
name: commit-message
description: Format commit messages according to StashAway conventions with automatic ticket extraction
---

# Commit Message Formatter

## When to Use

Use this skill when creating git commits to ensure messages follow team standards.

## Branch Naming Convention

Branches should follow this format:

```
<type>/<ticket-number>-<short-description-in-kebab-case>
```

**Examples**:

- `feat/SA-604-add-execution-mode-to-kafka-topic`
- `fix/SA-1234-prevent-xss-in-user-input`
- `chore/SA-789-upgrade-dependencies`
- `refactor/SA-456-extract-auth-logic`

**Extracting Ticket Number from Branch**:

- If branch follows naming convention, extract ticket number automatically
- If branch doesn't contain ticket number (e.g., `main`, `develop`, `feature-branch`), ask user for it
- User can skip providing ticket number if not applicable

## Commit Message Format

```
<type><(optional scope)>: <ticket number> <subject>

<body>
```

### Components

#### Type (Required)

- `feat` - New features that change behavior
- `fix` - Bug fixes
- `chore` - Package upgrades, version bumps, maintenance
- `refactor` - Code refactors that do NOT change behavior

#### Scope (Optional)

Defines the domain/area of the system:

- Examples: `(security)`, `(localisation)`, `(goals)`, `(auth)`

#### Ticket Number (Recommended but Optional)

- **Recommended**: Always include ticket number when available
- **Optional**: Can be omitted if no ticket exists (e.g., minor fixes, experiments)
- **GitLab tickets**: Use `#123` format
- **Jira tickets**: Use `ABC-123` format (e.g., `SA-604`)
- **Multiple tickets**: Include all, e.g., `SA-604 #123`
- **Auto-detection**: Try to extract from branch name first
- **User prompt**: If not in branch name and not obvious, ask user (allow skip)

**Examples without ticket number**:

```
chore: Update README documentation
fix: Correct typo in error message
```

#### Subject (Required)

- Describes WHAT the commit does (not why or how)
- Written in imperative mood: "Add feature" not "Added feature" or "Adds feature"
- Concise and clear
- Proper English spelling and grammar
- No period at the end

#### Body (Optional)

- Explains WHY or HOW
- Required only if context isn't clear from subject/ticket/code
- Can use any format (paragraphs, bullets, etc.)
- Proper English spelling and grammar
- **Do NOT include AI attribution footers** (no "Generated with Claude Code", "Co-Authored-By: Claude", etc.)

## Examples

### Example 1: Feature with multiple changes

```
feat: SA-604 Improve slack events listening node

- Add env to kafka topic to not interfere with prod execution if manual node execution is started
- Delete grist records on node closure, to only have active n8n configs in grist table
```

### Example 2: Bug fix

```
fix: SA-1234 Prevent XSS in user input fields

Sanitize user input before rendering to prevent cross-site scripting attacks.
Added DOMPurify for client-side sanitization.
```

### Example 3: Refactor

```
feat: SA-456 Extract auth logic into separate service

Moves authentication logic from controllers to a dedicated AuthService
to improve testability and reusability.
```

### Example 4: Chore

```
chore: #789 Upgrade dependencies to latest versions

Updates all patch and minor versions. Major version upgrades will be
handled in separate PRs.
```

### Example 5: Without ticket number

```
chore: Update README with installation instructions
```

### Example 6: Branch name with ticket

```
Branch: feat/SA-604-add-kafka-topic-env
Commit: feat: SA-604 Add execution mode to kafka topic

- Add env to kafka topic to not interfere with prod execution
- Delete grist records on node closure
```

## Usage in AI Agent

When the user asks to create a commit or commit message:

1. Analyze the changes (use `git diff`, `git status`)
2. Check current branch name (use `git branch --show-current`)
3. Try to extract ticket number from branch name:
   - Look for pattern: `<type>/<TICKET-NUMBER>-<description>`
   - Example: `feat/SA-604-add-feature` → ticket is `SA-604`
4. If no ticket in branch name:
   - Ask user: "What's the ticket number for this change? (or press Enter to skip)"
   - Allow user to skip if no ticket exists
5. Identify the type of change (feat, fix, chore, refactor)
6. Generate subject in imperative mood
7. Add body only if changes require explanation
8. Present to user for approval

**Workflow Example**:

```
Agent: I'll create a commit message for these changes.
[Checks branch: feat/SA-604-add-kafka-topic-env]
[Extracts ticket: SA-604]
Agent: Detected ticket SA-604 from branch name.
[Analyzes changes]
Agent: Here's the proposed commit message:

feat: SA-604 Add execution mode to kafka topic

- Add env to kafka topic to not interfere with prod execution if manual node execution is started
- Delete grist records on node closure, to only have active n8n configs in grist table

Proceed with this commit? (yes/no)
```

## Anti-patterns to Avoid

❌ `feat: Added new feature` (not imperative)
❌ `fix: Fix bug.` (period at end)
❌ `Update code` (missing type and ticket)
❌ `feat: Did some changes` (vague subject)
❌ Adding AI attribution footers like "🤖 Generated with [Claude Code]" or "Co-Authored-By: Claude"
✅ `feat: SA-123 Add user authentication` (correct)

## Git Commit Workflow

When user asks to commit changes:

1. **Check for staged changes**:
   ```bash
   git status
   ```

2. **Review changes**:
   ```bash
   git diff --staged
   ```

3. **Get branch name**:
   ```bash
   git branch --show-current
   ```

4. **Extract ticket from branch** (if present):
   - Parse branch name for pattern `<type>/<TICKET>-<description>`
   - Extract TICKET portion

5. **Generate commit message**:
   - Determine type from changes
   - Use extracted or prompted ticket number
   - Create concise subject
   - Add detailed body if needed

6. **Create commit**:
   ```bash
   git commit -m "$(cat <<'EOF'
   <commit message>
   EOF
   )"
   ```

7. **Verify commit**:
   ```bash
   git log -1
   ```

## Special Cases

### Multiple Files Changed

Group related changes in the body:

```
feat: SA-123 Implement user authentication

Changes:
- Add JWT middleware
- Create auth controller
- Update user model with password hashing
- Add authentication tests
```

### Breaking Changes

Use `!` after type:

```
feat!: SA-456 Change API response format

BREAKING CHANGE: API responses now use camelCase instead of snake_case.
Update clients accordingly.
```

### Scope Usage

Use scope when changes affect specific area:

```
fix(auth): SA-789 Prevent token expiration race condition

Adds mutex to prevent multiple threads from refreshing token simultaneously.
```

## Tips for Good Commits

1. **Keep commits atomic**: One logical change per commit
2. **Write for reviewers**: Make it easy to understand what and why
3. **Reference tickets**: Helps with traceability and project management
4. **Use present tense**: "Add feature" not "Added feature"
5. **Be specific**: "Fix login timeout" not "Fix bug"
6. **Explain why**: Use body to explain motivation if not obvious

## Integration with Other Skills

This skill is automatically used by:

- **RightSize Checker**: When committing resource updates
- **Deploy Config Generator**: When generating new configurations
- **Dependency Updater**: When updating package versions

## Validation

Before committing, verify:

- ✅ Type is one of: feat, fix, chore, refactor
- ✅ Subject is in imperative mood
- ✅ Subject has no period at end
- ✅ Ticket number format is correct (if present)
- ✅ Body explains why (if needed)
- ✅ Proper spelling and grammar
