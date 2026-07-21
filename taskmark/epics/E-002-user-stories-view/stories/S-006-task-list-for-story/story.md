---
id: S-006
type: story
title: Task list for selected story
status: backlog
priority: high
size: L
size_source: suggested
size_basis: [T-014, T-015, T-016]
points: 8
points_source: suggested
estimate_minutes: 1080
actual_minutes: 0
estimate_basis: [T-014, T-015, T-016]
session_cap_minutes: 480
parent: E-002
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [dashboard, tasks, stories]
created: 2026-07-21
updated: 2026-07-21T17:41:06Z
started_at: null
completed_at: null
---
# S-006: Task list for selected story

## User story

As a user, I want to select a user story and see the tasks (and bugs) connected to it so I can see the concrete work under that story.

## Acceptance criteria

- [ ] User can select a story from the story list (S-005).
- [ ] Selecting a story shows all items under that story’s `items/` folder (tasks and bugs).
- [ ] Each item row shows at least id, title, type (task/bug), status, size, and points.
- [ ] Stories with no items show an empty state, not a crash.
- [ ] Parse errors for individual items are surfaced without breaking the whole list.
- [ ] Task list updates when the selected story changes; clearing or changing epic clears or resets story selection appropriately.

## Tasks

- [T-014: Parse task and bug markdown under selected story](items/T-014-parse-task-markdown.md)
- [T-015: Build task list UI](items/T-015-task-list-ui.md)
- [T-016: Wire story selection to task list](items/T-016-wire-story-to-task-list.md)

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T17:40:05Z | prompt | Create E-002 user stories view with stories and tasks; select epic → stories, select story → tasks |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
