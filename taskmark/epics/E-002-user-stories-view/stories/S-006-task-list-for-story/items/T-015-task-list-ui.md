---
id: T-015
type: task
title: Build task list UI
status: done
priority: high
size: M
size_source: suggested
size_basis: [T-006, T-012]
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 1
estimate_basis: [T-006]
session_cap_minutes: 480
parent: S-006
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [ui, tasks, dashboard]
created: 2026-07-21
updated: 2026-07-21T22:21:39Z
started_at: 2026-07-21T18:00:53Z
completed_at: 2026-07-21T18:02:46Z
---

# T-015: Build task list UI

## Description

Build a UI that lists tasks and bugs for the currently selected story. Align with epic/story list styling. Clearly distinguish bugs from tasks (e.g. type badge). Support empty and partial-error states.

## Acceptance criteria

- [x] Item list renders id, title, type (task/bug), status, size, and points.
- [x] Empty state when the story has no items.
- [x] Partial-error state when some items fail to parse.
- [x] Visual style is consistent with epic and story lists.
- [x] Bugs are visually distinguishable from tasks.

## Notes

Reuse shared list/row patterns from T-006 / T-012.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T17:40:05Z | prompt | Create E-002 user stories view with stories and tasks |
| 2 | 2026-07-21T18:00:53Z | prompt | Implement S-006 task list for selected story |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| 4e49022 | taskmark-frontend | 2026-07-21T22:21:39Z | add task list for selected story |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T18:00:53Z | 2026-07-21T18:02:46Z | Built task list UI with type badges |
