---
id: T-012
type: task
title: Build story list UI
status: done
priority: high
size: XS
size_source: suggested
size_basis: [calibrated:T-012]
points: 1
points_source: suggested
estimate_minutes: 15
actual_minutes: 16
estimate_basis: [calibrated:T-012]
session_cap_minutes: 480
parent: S-005
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [ui, stories, dashboard]
created: 2026-07-21
updated: 2026-07-21T18:02:46Z
started_at: 2026-07-21T17:45:49Z
completed_at: 2026-07-21T17:48:46Z
---
# T-012: Build story list UI

## Description

Build a UI that lists user stories for the currently selected epic. Match the existing epic list visual language (status badges, size/points, estimate/actual formatting) so the drill-down feels continuous. Support empty and error states. Rows should be selectable for the task list (S-006).

## Acceptance criteria

- [x] Story list renders id, title, status, size, and points (plus estimate/actual when present).
- [x] Empty state when the epic has no stories.
- [x] Partial-error state when some stories fail to parse.
- [x] Visual style is consistent with the epic list.
- [x] A story can be highlighted/selected for drill-down.

## Notes

Reuse shared list/row patterns from the epic list (T-006) where practical.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T17:40:05Z | prompt | Create E-002 user stories view with stories and tasks |
| 2 | 2026-07-21T17:45:49Z | prompt | Start developing S-005 (includes this task) |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| 0c104cd | taskmark-frontend | 2026-07-21T17:59:56Z | add story list for selected epic |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T17:45:49Z | 2026-07-21T17:48:46Z | Built story list UI matching epic list |
| 2 | agent | 2026-07-21T17:45:49Z | 2026-07-21T17:59:56Z | auto-recovered: commit span |
