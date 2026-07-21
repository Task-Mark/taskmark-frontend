---
id: T-013
type: task
title: Wire epic selection to story list
status: backlog
priority: high
size: S
size_source: suggested
size_basis: [T-007]
points: 2
points_source: suggested
estimate_minutes: 120
actual_minutes: 0
estimate_basis: [T-007]
session_cap_minutes: 480
parent: S-005
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [wiring, stories, epics]
created: 2026-07-21
updated: 2026-07-21T17:41:06Z
started_at: null
completed_at: null
---
# T-013: Wire epic selection to story list

## Description

Connect epic selection in the dashboard to the story parser (T-011) and story list UI (T-012). When the user selects an epic, load and display that epic’s stories for the active project. Clear or reset story selection when the epic or project changes.

## Acceptance criteria

- [ ] Selecting an epic loads stories for that epic from the active project board.
- [ ] Changing epic refreshes the story list.
- [ ] Changing active project clears epic/story selection or reloads safely.
- [ ] Loading and failure states are visible to the user.

## Notes

Pair with T-016 for the next level of drill-down (story → tasks).

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
