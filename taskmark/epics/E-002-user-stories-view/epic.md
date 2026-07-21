---
id: E-002
type: epic
title: User stories view
status: done
priority: high
size: L
size_source: suggested
size_basis: [S-005, S-006]
points: 16
points_source: suggested
estimate_minutes: 2160
actual_minutes: 51
estimate_basis: [S-005, S-006]
session_cap_minutes: 480
parent: null
epic: null
owner: ""
blocked: false
cancelled: false
tags: [dashboard, stories, frontend]
created: 2026-07-21
updated: 2026-07-21T22:21:39Z
started_at: 2026-07-21T17:45:49Z
completed_at: 2026-07-21T18:02:46Z
---

# E-002: User stories view

## Goal

Let users drill from an epic into its user stories, then from a selected story into the tasks connected to that story—so the dashboard shows the full epic → story → task hierarchy.

## Scope

- Select an epic (from the existing epic list or an epic picker) and show all user stories under that epic.
- Select a user story and show all tasks (and bugs) connected to that story.
- Parse story and item markdown from the local Taskmark board for the active project.
- Present id, title, status, size, points, and related summary fields for stories and tasks.
- Empty and error states when an epic has no stories or a story has no items.

## Out of scope

- Editing board files from the UI.
- Creating or reordering stories/tasks in the UI.
- Full markdown body / work-log detail panes (beyond list summary fields).
- Cross-project story views (stories are scoped to the selected epic’s project board).

## Success metrics

- From the dashboard, a user can pick an epic and see every story under it.
- Selecting a story reveals its connected tasks/bugs without leaving the drill-down flow.
- Parse failures for individual files do not break the whole view.

## Stories

- [S-005: Story list for selected epic](stories/S-005-story-list-for-epic/story.md)
- [S-006: Task list for selected story](stories/S-006-task-list-for-story/story.md)

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| a940d8b | taskmark-frontend | 2026-07-21T17:43:42Z | add e-002 user stories view board |
| 10d1691 | taskmark-cursor | 2026-07-21T17:43:42Z | add e-002 user stories view board |
| 0c104cd | taskmark-frontend | 2026-07-21T17:59:56Z | add story list for selected epic |
| 2aef6ba | taskmark-cursor | 2026-07-21T17:59:56Z | sync taskmark board |
| 4e49022 | taskmark-frontend | 2026-07-21T22:21:39Z | add task list for selected story |
| ca69fce | taskmark-cursor | 2026-07-21T22:21:39Z | sync taskmark board |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T17:45:49Z | 2026-07-21T17:48:46Z | S-005 story list delivered; S-006 still open |
| 2 | agent | 2026-07-21T18:00:53Z | 2026-07-21T18:02:46Z | E-002 complete: story and task drill-down delivered |
| 3 | agent | 2026-07-21T17:43:42Z | 2026-07-21T17:59:56Z | auto-recovered: commit span |
