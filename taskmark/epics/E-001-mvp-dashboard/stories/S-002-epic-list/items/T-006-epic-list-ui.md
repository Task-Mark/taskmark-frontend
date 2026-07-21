---
id: T-006
type: task
title: Build epic list UI
status: backlog
priority: high
size: M
size_source: suggested
size_basis: []
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-002
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, epics, ui]
created: 2026-07-21
updated: 2026-07-21T16:31:04Z
started_at: null
completed_at: null
---

# T-006: Build epic list UI

## Description

Build the epics list view using existing table/UI primitives: show every epic for **each** discovered project under the master folder, with project identity (name/path) plus id, title, status, size, points, and estimate/actual minutes. Include loading and empty states (no projects, or projects with no epics).

## Acceptance criteria

- [ ] Renders a list/table of epics with the core summary columns.
- [ ] Epics are grouped or labeled by discovered project.
- [ ] Empty board / no projects shows a helpful empty state.
- [ ] Loading and error states are distinct.
- [ ] Uses project UI components (e.g. table) where appropriate.

## Notes

Story/task drill-down is out of scope for this MVP slice.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:24:55Z | prompt | Create MVP epic with setup wizard + epic list; create stories and tasks |
| 2 | 2026-07-21T16:31:04Z | feedback | List epics per project discovered under master folder |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
