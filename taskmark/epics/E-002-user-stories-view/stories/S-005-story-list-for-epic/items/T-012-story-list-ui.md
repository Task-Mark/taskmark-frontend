---
id: T-012
type: task
title: Build story list UI
status: backlog
priority: high
size: M
size_source: suggested
size_basis: [T-006]
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 0
estimate_basis: [T-006]
session_cap_minutes: 480
parent: S-005
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [ui, stories, dashboard]
created: 2026-07-21
updated: 2026-07-21T17:41:06Z
started_at: null
completed_at: null
---
# T-012: Build story list UI

## Description

Build a UI that lists user stories for the currently selected epic. Match the existing epic list visual language (status badges, size/points, estimate/actual formatting) so the drill-down feels continuous. Support empty and error states. Rows should be selectable for the task list (S-006).

## Acceptance criteria

- [ ] Story list renders id, title, status, size, and points (plus estimate/actual when present).
- [ ] Empty state when the epic has no stories.
- [ ] Partial-error state when some stories fail to parse.
- [ ] Visual style is consistent with the epic list.
- [ ] A story can be highlighted/selected for drill-down.

## Notes

Reuse shared list/row patterns from the epic list (T-006) where practical.

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
