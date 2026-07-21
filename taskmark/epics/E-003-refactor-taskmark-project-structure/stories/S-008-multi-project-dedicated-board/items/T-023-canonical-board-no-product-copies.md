---
id: T-023
type: task
title: Canonical board without product-repo copies
status: backlog
priority: high
size: M
size_source: suggested
size_basis: [T-007, T-005]
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-008
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [architecture, multi-repo, canonical]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-023: Canonical board without product-repo copies

## Description

Make the dedicated `_taskmark` project the only board location in multi-project mode. `REPOS.md` still lists product git roots for commit attribution, but agents must not keep or sync full `taskmark/` copies inside those product repos.

## Acceptance criteria

- [ ] Canonical path is the dedicated Taskmark project’s `taskmark/`.
- [ ] Product repos are listed in `REPOS.md` without requiring a local `taskmark/` copy.
- [ ] Sync behavior no longer overwrites product repos with board trees.
- [ ] Commits log still records product-repo SHAs with correct Repo names.

## Notes

Replaces the current “copy board into every git root” model.

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
