---
id: T-015
type: task
title: Build task list UI
status: backlog
priority: high
size: M
size_source: suggested
size_basis: [T-006, T-012]
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 0
estimate_basis: [T-006]
session_cap_minutes: 480
parent: S-006
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [ui, tasks, dashboard]
created: 2026-07-21
updated: 2026-07-21T17:41:06Z
started_at: null
completed_at: null
---
# T-015: Build task list UI

## Description

Build a UI that lists tasks and bugs for the currently selected story. Align with epic/story list styling. Clearly distinguish bugs from tasks (e.g. type badge). Support empty and partial-error states.

## Acceptance criteria

- [ ] Item list renders id, title, type (task/bug), status, size, and points.
- [ ] Empty state when the story has no items.
- [ ] Partial-error state when some items fail to parse.
- [ ] Visual style is consistent with epic and story lists.
- [ ] Bugs are visually distinguishable from tasks.

## Notes

Reuse shared list/row patterns from T-006 / T-012.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T17:40:05Z | prompt | Create E-002 user stories view with stories and tasks |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
