---
name: review-pull-request
description: Review pull request for quality and security
allowed-tools: Bash(git add:*), Bash(git status:*)
argument-hint: "[pr-number] [priority] [assignee]"
---

Review PR #$1 with priority $2 and assign to $3. Focus on security, performance, and code style.
