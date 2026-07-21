---
id: S-005
type: story
title: Story list for selected epic
status: done
priority: high
size: L
size_source: suggested
size_basis: [T-011, T-012, T-013]
points: 8
points_source: suggested
estimate_minutes: 1080
actual_minutes: 6
estimate_basis: [T-011, T-012, T-013]
session_cap_minutes: 480
parent: E-002
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [dashboard, stories, epics]
created: 2026-07-21
updated: 2026-07-21T17:48:46Z
started_at: 2026-07-21T17:45:49Z
completed_at: 2026-07-21T17:48:46Z
---
# S-005: Story list for selected epic

## User story

As a user, I want to select an epic and see all user stories under it so I can understand how that initiative is broken down.

## Acceptance criteria

- [x] User can select an epic from the current project’s epic list (or equivalent picker).
- [x] Selecting an epic shows all stories under that epic’s `stories/` folder.
- [x] Each story row shows at least id, title, status, size, and points (and estimate/actual when available).
- [x] Empty epics (no stories) show an empty state, not a crash.
- [x] Parse errors for individual stories are surfaced without breaking the whole list.
- [x] Story list updates when the selected epic changes.

## Tasks

- [T-011: Parse story markdown under selected epic](items/T-011-parse-story-markdown.md)
- [T-012: Build story list UI](items/T-012-story-list-ui.md)
- [T-013: Wire epic selection to story list](items/T-013-wire-epic-to-story-list.md)

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T17:40:05Z | prompt | Create E-002 user stories view with stories and tasks; select epic → stories, select story → tasks |
| 2 | 2026-07-21T17:45:49Z | prompt | Start developing S-005 story list for selected epic |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T17:45:49Z | 2026-07-21T17:48:46Z | Delivered story list for selected epic (parse + UI + wiring) |
