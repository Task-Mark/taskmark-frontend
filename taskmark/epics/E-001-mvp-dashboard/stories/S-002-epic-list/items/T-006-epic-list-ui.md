---
id: T-006
type: task
title: Build epic list UI
status: done
priority: high
size: M
size_source: suggested
size_basis: []
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 1
estimate_basis: []
session_cap_minutes: 480
parent: S-002
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, epics, ui]
created: 2026-07-21
updated: 2026-07-21T16:51:19Z
started_at: 2026-07-21T16:49:52Z
completed_at: 2026-07-21T16:51:19Z
---

# T-006: Build epic list UI

## Description

Build the epics list view using existing table/UI primitives: show every epic for **each** discovered project under the master folder, with project identity (name/path) plus id, title, status, size, points, and estimate/actual minutes. Include loading and empty states (no projects, or projects with no epics).

## Acceptance criteria

- [x] Renders a list/table of epics with the core summary columns.
- [x] Epics are grouped or labeled by discovered project.
- [x] Empty board / no projects shows a helpful empty state.
- [x] Loading and error states are distinct.
- [x] Uses project UI components (e.g. table) where appropriate.

## Notes

Story/task drill-down is out of scope for this MVP slice.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 3 | 2026-07-21T16:51:19Z | prompt | Implement S-002 epic list |
| 1 | 2026-07-21T16:24:55Z | prompt | Create MVP epic with setup wizard + epic list; create stories and tasks |
| 2 | 2026-07-21T16:31:04Z | feedback | List epics per project discovered under master folder |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:49:52Z | 2026-07-21T16:51:19Z | Built per-project epic list table UI |
