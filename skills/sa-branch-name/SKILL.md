---
name: branch-name
description: Generate and validate git branch names following StashAway conventions
---

# Branch Name Conventions

Use this skill when you need to create a new work branch, or to validate an existing branch name.

## Format

```
<type>/(<TICKET>-)?<short-kebab-description>
```

- Type: one of `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `hotfix`, `candidate`, `release`.
- Ticket: recommended, not required. All tickets follow `<short-name>-<number>` (e.g., `SA-123`).
  - `SA-<number>` → Notion task
  - Any other `<SHORT>-<number>` (e.g., `WOR-123`, `FUN-456`, `TS-321`) → Jira ticket
- Description: 2–5 words, lowercase-kebab-case, focused on what changes.

## Examples

```
feat/SA-604-add-payment-gateway
feat/WOR-1287-improve-search-speed
chore/FUN-233-tidy-ci-scripts
chore/update-node-version
refactor/simplify-auth-flow
```

## Validation checklist

- Starts with a valid type, followed by `/`.
- Optional ticket segment follows the type and ends with `-` if present; if used, it must match `<SHORT>-<number>`.
- Description is lowercase-kebab-case, no spaces or special chars (hyphens allowed).
- Keep total length reasonable (< 80 chars preferred).

## Quick use

- If ticket number or title wasn't provided, ask: "What's the ticket number (e.g., SA-123 or WOR-456) and ticket title?"
- Generate a name from user intent and optional ticket.
- Show the git command: `git checkout -b <branch-name>`.

```bash
git checkout -b feat/SA-604-add-payment-gateway
git checkout -b chore/update-node-version
```
