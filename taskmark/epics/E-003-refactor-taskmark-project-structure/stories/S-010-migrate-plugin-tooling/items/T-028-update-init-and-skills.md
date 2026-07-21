---
id: T-028
type: task
title: Update init and related skills
status: backlog
priority: high
size: M
size_source: suggested
size_basis: [T-027, T-026]
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-010
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [plugin, init, skills]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-028: Update init and related skills

## Description

Update `taskmark-init`, create/start/complete/log-commits/commit-all, and any skill that assumes per-repo board copies so they locate the board in the project (single) or dedicated `_taskmark` repo (multi).

## Acceptance criteria

- [ ] Init chooses correct target path by workspace mode.
- [ ] Skills that previously called “sync copies to all repos” point at the new sync behavior.
- [ ] Local plugin package synced after edits (`sync-plugin-local`).

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
