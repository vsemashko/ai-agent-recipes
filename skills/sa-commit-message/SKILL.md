---
name: commit-message
description: Guide for creating Conventional Commits that follow company standards. Use this skill to create or validate commit messages so they clearly explain why a change exists and how it achieves its purpose
---

# Commit Message Conventions

## When to use

- Use this skill when creating git commits so messages stay consistent and useful.
- Use the branch naming skill (branch-name) to create or validate your branch before committing.

## Format

```
<type>(<optional-scope>): [<TICKET>] <subject>

<body>  # optional
```

- type: one of `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `hotfix`.
- scope (optional): area in parentheses, e.g., `(auth)`, `(goals)`.
- ticket (recommended, not required):
  - All tickets follow `<SHORT>-<number>` (e.g., `SA-123`).
  - `SA-<number>` → Notion task; any other `<SHORT>-<number>` (e.g., `WOR-123`, `FUN-456`, `ENG-789`, `TS-321`) → Jira ticket.
  - Extract automatically from the current branch if it follows branch-name; otherwise, ask the user.
- subject: imperative mood, concise, no trailing period, ≤ 72 chars. Should clearly state what changed and why.
- body (optional): explain implementation details and context. Use bullets when listing multiple changes. Body should naturally answer:
  - Why do we want to apply this commit?
  - How does it do what it does?

## Examples

### Simple commits (subject answers what + why)

```
feat: SA-604 add Stripe gateway client to enable online payments
fix: WOR-1287 handle null dates in serializer to prevent crashes with legacy data
chore(ci): FUN-233 remove unused workflow steps to speed up builds
refactor(auth): ENG-445 consolidate auth checks into middleware to reduce duplication
```

### Commits with body

Single change with implementation details:

```
feat: SA-201 add custom n8n node to simplify listening to slack events

 - wrap the Slack Socket Mode client in a native n8n trigger node. This eliminates the need for external webhook servers and reduces message delivery latency from ~500ms to ~50ms.
```

List multiple changes with bullets (start with verbs):

```
feat: SA-604 add payment gateway support

- add gateway client and config to enable online Stripe payments
- implement retry with backoff for transient errors
- expose healthcheck endpoint for ops
- document env vars in README
```

Breaking change footer (be explicit):

```
refactor: SA-404 drop legacy token validator

 - simplify validation and remove dead code. New validator is covered by tests.
 - BREAKING CHANGE: remove `LegacyTokenValidator`. Replace with `NewTokenVerifier` and update call sites.
```

## Quick use

1. Read current branch. If it follows branch-name, extract `<TICKET>`.
2. If missing, ask: "Ticket number and title (e.g., SA-123 or WOR-456)? If none, say 'none'."
3. Determine type if not provided, scope, and a short subject with optional body.
4. Render the message and show the commit command.

Command examples

```bash
# single-line
git commit -m "feat: SA-604 add Stripe gateway client to enable online payments"

# with body (each -m is a new paragraph/line)
git commit -m "feat: WOR-892 add retry mechanism to handle rate limiting gracefully" \
           -m "- implement exponential backoff with max 3 retries" \
           -m "- add circuit breaker to prevent cascade failures" \
           -m "- log retry attempts for debugging"
```

## Validation checklist

- Starts with a valid type in lowercase, optional `(scope)`, then `:` and a space.
- If present, ticket appears before the subject and matches `<SHORT>-<number>`.
- Subject clearly states what changed and why, in imperative mood, ≤ 72 chars, no trailing period.
- Body (if any) provides implementation details and context naturally.
- When listing multiple changes, use short bullets starting with verbs (e.g., "- add …", "- implement …").
- Breaking changes include a footer starting with `BREAKING CHANGE:` that clearly states what changed and required actions.

---

Use with: branch-name (to create/validate branches before committing).
