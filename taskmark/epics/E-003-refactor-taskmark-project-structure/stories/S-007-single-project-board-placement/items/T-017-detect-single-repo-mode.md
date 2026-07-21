---
id: T-017
type: task
title: Detect single-repo workspace mode
status: backlog
priority: high
size: S
size_source: suggested
size_basis: [T-008, T-003]
points: 2
points_source: suggested
estimate_minutes: 120
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-007
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [architecture, single-repo, detection]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-017: Detect single-repo workspace mode

## Description

Define and implement detection for single-project mode: exactly one workspace folder that is a git root (or one active git root). Document edge cases (nested `.git`, multi-root with one git, etc.).

## Acceptance criteria

- [ ] Clear rule: one git root → single-project mode.
- [ ] Detection is usable by init/sync skills and any helper script.
- [ ] Edge cases documented (when to treat as multi vs single).

## Notes

Feeds S-007 placement and S-008 branching.

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
