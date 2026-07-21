---
id: S-006
type: story
title: Task list for selected story
status: done
priority: high
size: L
size_source: suggested
size_basis: [T-014, T-015, T-016]
points: 8
points_source: suggested
estimate_minutes: 1080
actual_minutes: 3
estimate_basis: [T-014, T-015, T-016]
session_cap_minutes: 480
parent: E-002
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [dashboard, tasks, stories]
created: 2026-07-21
updated: 2026-07-21T22:21:39Z
started_at: 2026-07-21T18:00:53Z
completed_at: 2026-07-21T18:02:46Z
---

# S-006: Task list for selected story

## User story

As a user, I want to select a user story and see the tasks (and bugs) connected to it so I can see the concrete work under that story.

## Acceptance criteria

- [x] User can select a story from the story list (S-005).
- [x] Selecting a story shows all items under that story’s `items/` folder (tasks and bugs).
- [x] Each item row shows at least id, title, type (task/bug), status, size, and points.
- [x] Stories with no items show an empty state, not a crash.
- [x] Parse errors for individual items are surfaced without breaking the whole list.
- [x] Task list updates when the selected story changes; clearing or changing epic clears or resets story selection appropriately.

## Tasks

- [T-014: Parse task and bug markdown under selected story](items/T-014-parse-task-markdown.md)
- [T-015: Build task list UI](items/T-015-task-list-ui.md)
- [T-016: Wire story selection to task list](items/T-016-wire-story-to-task-list.md)

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T17:40:05Z | prompt | Create E-002 user stories view with stories and tasks; select epic → stories, select story → tasks |
| 2 | 2026-07-21T18:00:53Z | prompt | Implement S-006 task list for selected story |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| 4e49022 | taskmark-frontend | 2026-07-21T22:21:39Z | add task list for selected story |
| ca69fce | taskmark-cursor | 2026-07-21T22:21:39Z | sync taskmark board |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T18:00:53Z | 2026-07-21T18:02:46Z | Delivered task list for selected story (parse + UI + wiring) |
