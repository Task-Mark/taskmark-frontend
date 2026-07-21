---
id: T-024
type: task
title: Detect ambiguous common-name cases
status: backlog
priority: high
size: S
size_source: suggested
size_basis: [T-020, T-008]
points: 2
points_source: suggested
estimate_minutes: 120
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-009
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [multi-repo, naming, detection]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-024: Detect ambiguous common-name cases

## Description

Define when automatic common-name derivation is not confident enough (unrelated names, multiple plausible prefixes, conflicting parent folders) and surface an “ambiguous” result for prompting.

## Acceptance criteria

- [ ] Explicit ambiguity conditions documented and implemented in the naming helper.
- [ ] Ambiguous result blocks automatic folder creation until the user answers.
- [ ] Clear cases still return a derived name without prompting.

## Notes

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T22:26:00Z | prompt | Create epic + stories/tasks for Taskmark project structure refactor |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
