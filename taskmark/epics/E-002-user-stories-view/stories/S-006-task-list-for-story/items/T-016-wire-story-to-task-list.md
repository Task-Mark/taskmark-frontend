---
id: T-016
type: task
title: Wire story selection to task list
status: backlog
priority: high
size: S
size_source: suggested
size_basis: [T-007, T-013]
points: 2
points_source: suggested
estimate_minutes: 120
actual_minutes: 0
estimate_basis: [T-007]
session_cap_minutes: 480
parent: S-006
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [wiring, tasks, stories]
created: 2026-07-21
updated: 2026-07-21T17:41:06Z
started_at: null
completed_at: null
---
# T-016: Wire story selection to task list

## Description

Connect story selection (from S-005) to the item parser (T-014) and task list UI (T-015). When the user selects a story, load and display its tasks/bugs. Clear the task list when the story or epic selection changes.

## Acceptance criteria

- [ ] Selecting a story loads items for that story from the active project board.
- [ ] Changing story refreshes the task list.
- [ ] Changing or clearing epic/story selection clears or resets the task list safely.
- [ ] Loading and failure states are visible to the user.

## Notes

Completes the epic → story → task drill-down for E-002.

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
