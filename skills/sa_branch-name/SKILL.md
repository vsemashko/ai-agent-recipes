---
name: branch-name
description: Generate and validate git branch names following StashAway conventions
---

# Branch Name Generator

## When to Use

Use this skill when:
- Creating a new git branch
- Validating an existing branch name
- User asks for help with branch naming
- Starting work on a new ticket/feature

## Branch Naming Convention

Branches should follow this format:

```
<type>/<ticket-number>-<short-description-in-kebab-case>
```

### Components

#### Type (Required)

- `feat` - New features that change behavior
- `fix` - Bug fixes
- `chore` - Package upgrades, version bumps, maintenance
- `refactor` - Code refactors that do NOT change behavior
- `docs` - Documentation only changes
- `test` - Adding or updating tests
- `hotfix` - Urgent production fixes

#### Ticket Number (Required)

- **Jira tickets**: Use full ticket ID (e.g., `SA-604`, `ENG-123`)
- **GitLab issues**: Use issue number with hash (e.g., `#123`)
- Format: All caps for project key, hyphen, then number
- No spaces or special characters except hyphen

#### Description (Required)

- Short, descriptive summary of the change
- Use kebab-case (lowercase with hyphens)
- 2-5 words typically
- Focus on WHAT, not WHY
- No special characters except hyphens
- Examples: `add-user-auth`, `fix-login-timeout`, `upgrade-node-version`

## Valid Examples

### Feature Branches

```
feat/SA-604-add-execution-mode-to-kafka-topic
feat/SA-123-implement-user-authentication
feat/ENG-456-create-admin-dashboard
feat/#789-add-dark-mode-toggle
```

### Bug Fix Branches

```
fix/SA-1234-prevent-xss-in-user-input
fix/SA-789-resolve-token-expiration
fix/#456-correct-date-formatting
```

### Chore Branches

```
chore/SA-100-upgrade-dependencies
chore/SA-200-update-docker-image
chore/#50-cleanup-unused-imports
```

### Refactor Branches

```
refactor/SA-456-extract-auth-logic
refactor/SA-789-simplify-payment-flow
```

### Hotfix Branches

```
hotfix/SA-999-fix-critical-payment-bug
hotfix/SA-888-patch-security-vulnerability
```

## Usage in AI Agent

When the user wants to create a new branch:

1. **Identify the ticket number**:
   - Ask user: "What's the ticket number for this work?"
   - Validate format (SA-XXX, ENG-XXX, or #XXX)
   - If no ticket exists, suggest creating one or ask if it's truly needed

2. **Determine the type**:
   - Ask what type of change this is
   - Suggest based on user's description:
     - New feature → `feat`
     - Bug fix → `fix`
     - Dependency update, cleanup → `chore`
     - Code restructuring without behavior change → `refactor`
     - Critical production fix → `hotfix`

3. **Generate description**:
   - Extract key words from user's explanation
   - Convert to kebab-case
   - Keep it concise (2-5 words)
   - Focus on the WHAT

4. **Assemble and validate**:
   - Combine: `<type>/<ticket>-<description>`
   - Check format matches convention
   - Verify no invalid characters
   - Ensure all lowercase (except ticket ID)

5. **Present to user**:
   - Show generated branch name
   - Offer to create the branch or just provide the name
   - Show the git command: `git checkout -b <branch-name>`

## Workflow Example

```
User: I need to create a branch for adding a new payment gateway

Agent: I'll help you create a branch name following StashAway conventions.

What's the ticket number for this work? (e.g., SA-123, ENG-456, #789)

User: SA-604

Agent: Got it! Based on your description "adding a new payment gateway",
here's the suggested branch name:

feat/SA-604-add-payment-gateway

Would you like me to:
1. Create this branch now (git checkout -b feat/SA-604-add-payment-gateway)
2. Just use this name

User: Create it

Agent: [Runs git checkout -b feat/SA-604-add-payment-gateway]
✓ Created and switched to branch 'feat/SA-604-add-payment-gateway'
```

## Validation Rules

When validating a branch name, check:

- ✅ Starts with valid type (`feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `hotfix`)
- ✅ Has forward slash after type
- ✅ Contains ticket number in correct format
- ✅ Has hyphen after ticket number
- ✅ Description is in kebab-case
- ✅ No spaces anywhere
- ✅ No special characters except hyphens and hash (for GitLab issues)
- ✅ Total length is reasonable (< 80 characters preferred)

## Anti-patterns to Avoid

❌ `feature-branch` (no ticket, no type)
❌ `SA-604-add-feature` (missing type)
❌ `feat/add_feature` (missing ticket, uses underscores)
❌ `feat/SA604-add-feature` (missing hyphen in ticket)
❌ `feat/sa-604-add-feature` (ticket should be uppercase)
❌ `feat/SA-604-Add-Feature` (description should be lowercase)
❌ `feat/SA-604 add feature` (contains spaces)
❌ `feat/SA-604-add-a-brand-new-payment-gateway-integration-with-stripe` (too long, too verbose)

✅ `feat/SA-604-add-payment-gateway` (correct)
✅ `fix/SA-1234-resolve-login-timeout` (correct)
✅ `chore/SA-789-upgrade-node-version` (correct)

## Extracting Ticket from Branch Name

For use in other skills (like commit messages):

To extract ticket number from a branch name:

```
Pattern: <type>/<TICKET>-<description>

Examples:
- feat/SA-604-add-feature → SA-604
- fix/#123-fix-bug → #123
- hotfix/ENG-999-critical-fix → ENG-999
```

**Extraction Logic**:
1. Split by `/` to get: `<type>` and `<ticket-description>`
2. Take second part after `/`
3. Split by `-` (first hyphen after ticket)
4. First segment is the ticket number

**Edge Cases**:
- If branch is `main`, `master`, `develop`: No ticket
- If branch doesn't follow convention: Ask user for ticket
- If ticket has multiple hyphens (e.g., `PROJ-SUB-123`): Take everything before description

## Integration with Other Skills

This skill is used by:

- **Commit Message Formatter** (`sa_commit-message`): Extracts ticket number from branch name for commit messages
- **Pull Request Generator**: Uses branch name to pre-fill PR title and ticket references

## Tips for Good Branch Names

1. **Be specific**: "add-user-auth" is better than "add-feature"
2. **Use verbs**: Start description with action word (add, fix, update, remove)
3. **Keep it short**: Aim for 2-5 words in description
4. **Match ticket**: Description should align with ticket title
5. **Stay lowercase**: Description always lowercase (ticket uppercase)
6. **Think atomic**: One branch = one feature/fix/change

## Special Cases

### Working on Multiple Tickets

If working on multiple related tickets, pick the primary ticket:

```
feat/SA-604-implement-payment-flow
(Even if also touches SA-605, SA-606)
```

Reference other tickets in commit messages and PR description.

### No Ticket Available

If truly no ticket exists (rare in team environment):
- Consider creating a ticket first (preferred)
- If absolutely necessary, discuss with team lead
- Never use placeholder like "SA-000" or "no-ticket"

### Personal/Experimental Branches

For personal experiments or spikes:
```
spike/<your-name>-<experiment-name>
experiment/<your-name>-<test-name>
```

These are typically not merged to main.

## Common Questions

**Q: Can I use underscores instead of hyphens?**
A: No, always use hyphens (kebab-case) for consistency.

**Q: Should I include my name in the branch?**
A: No, git already tracks who created the branch. Ticket number is sufficient.

**Q: What if my description needs multiple words?**
A: Use hyphens between words: `add-payment-gateway-integration`

**Q: Can I abbreviate words?**
A: Use clear abbreviations that are well-understood (e.g., `auth`, `db`, `api`)
Avoid cryptic abbreviations (e.g., `usr`, `pymnt`)

**Q: What's the difference between `feat` and `chore`?**
A:
- `feat`: Changes user-facing behavior or adds new functionality
- `chore`: Maintenance work like dependency updates, cleanup, tooling

## Quick Reference

```bash
# Format
<type>/<TICKET>-<description>

# Types
feat | fix | chore | refactor | docs | test | hotfix

# Ticket
SA-604 | ENG-123 | #456

# Description
lowercase-with-hyphens

# Create branch
git checkout -b <branch-name>

# Examples
git checkout -b feat/SA-604-add-payment-gateway
git checkout -b fix/SA-1234-resolve-timeout
git checkout -b chore/SA-789-upgrade-deps
```
