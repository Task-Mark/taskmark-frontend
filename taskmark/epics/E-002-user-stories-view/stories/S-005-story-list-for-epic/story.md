---
id: S-005
type: story
title: Story list for selected epic
status: backlog
priority: high
size: L
size_source: suggested
size_basis: [T-011, T-012, T-013]
points: 8
points_source: suggested
estimate_minutes: 1080
actual_minutes: 0
estimate_basis: [T-011, T-012, T-013]
session_cap_minutes: 480
parent: E-002
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [dashboard, stories, epics]
created: 2026-07-21
updated: 2026-07-21T17:41:06Z
started_at: null
completed_at: null
---
# S-005: Story list for selected epic

## User story

As a user, I want to select an epic and see all user stories under it so I can understand how that initiative is broken down.

## Acceptance criteria

- [ ] User can select an epic from the current project’s epic list (or equivalent picker).
- [ ] Selecting an epic shows all stories under that epic’s `stories/` folder.
- [ ] Each story row shows at least id, title, status, size, and points (and estimate/actual when available).
- [ ] Empty epics (no stories) show an empty state, not a crash.
- [ ] Parse errors for individual stories are surfaced without breaking the whole list.
- [ ] Story list updates when the selected epic changes.

## Tasks

- [T-011: Parse story markdown under selected epic](items/T-011-parse-story-markdown.md)
- [T-012: Build story list UI](items/T-012-story-list-ui.md)
- [T-013: Wire epic selection to story list](items/T-013-wire-epic-to-story-list.md)

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
