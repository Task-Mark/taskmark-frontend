---
id: E-001
type: epic
title: MVP Taskmark dashboard
status: done
priority: high
size: XL
size_source: suggested
size_basis: [S-001, S-002, S-003, S-004]
points: 28
points_source: suggested
estimate_minutes: 3480
actual_minutes: 11
estimate_basis: [S-001, S-002, S-003, S-004]
session_cap_minutes: 480
parent: null
epic: null
owner: ""
blocked: false
cancelled: false
tags: [mvp, dashboard, frontend]
created: 2026-07-21
updated: 2026-07-21T17:12:10Z
started_at: 2026-07-21T16:35:18Z
completed_at: 2026-07-21T17:02:25Z
---


# E-001: MVP Taskmark dashboard

## Goal

Ship an MVP dashboard that reads Taskmark markdown boards from a local **master folder** (a workspace that may contain multiple projects) and presents a clear view of the work. Near-term delivery focuses on a setup wizard to select that master folder, discovering Taskmark projects in its subfolders, and listing epics **per project**. Longer-term, the same board reader should power a complete epic / story / task dashboard.

## Scope

- Setup wizard: user selects a local **master folder** (workspace root), not necessarily a single repo with `taskmark/` at its root.
- Discover one or more Taskmark projects by scanning **subfolders** for `taskmark/` board files.
- Persist the selected **master folder** path in a **cookie** so returning users skip setup when already configured.
- Allow switching master folders by re-entering setup; cookie overwritten on switch.
- Validate that the master folder yields at least one discoverable Taskmark project (or guide the user clearly when none are found).
- Read and parse epic markdown under each discovered project’s `taskmark/epics/`.
- Show a list of epics **for each** discovered project (id, title, status, size, points, and related summary fields).

## Out of scope

- Full story / task / bug detail views and nested drill-down (beyond what is needed to list epics).
- Editing board files from the UI.
- Favorites / parallel unrelated workspaces beyond one master-folder cookie for MVP.
- Cloud sync, accounts, or remote boards.

## Success metrics

- A user can open the app, pick a master folder that contains multiple Taskmark projects in subfolders, and see epics grouped (or listed) per project.
- Master folders with no discoverable boards are handled with clear feedback.
- Selected master folder path is remembered in a cookie across sessions; setup is not required again until the user switches or the cookie is gone.

## Stories

- [S-001: Project setup wizard](stories/S-001-project-setup-wizard/story.md)
- [S-002: Epic list for selected project](stories/S-002-epic-list/story.md)
- [S-003: App bar project switcher](stories/S-003-app-bar-project-switcher/story.md)
- [S-004: Add project accumulates workspaces](stories/S-004-add-project-accumulate/story.md)

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| 5735f0b | taskmark-frontend | 2026-07-21T17:11:35Z | add app bar and project accumulate |
| 3389ae7 | taskmark-cursor | 2026-07-21T17:11:35Z | sync taskmark board |
| cc992dc | taskmark-frontend | 2026-07-21T16:58:32Z | add epic list and fix frontmatter parse |
| 8f1a801 | taskmark-cursor | 2026-07-21T16:58:32Z | sync taskmark board |
| 1fcb25f | taskmark-frontend | 2026-07-21T16:48:57Z | add native folder picker to setup |
| e1923e9 | taskmark-cursor | 2026-07-21T16:48:57Z | sync taskmark board |
| 9c3c5c5 | taskmark-frontend | 2026-07-21T16:40:53Z | add setup wizard and taskmark board |
| 489cdff | taskmark-cursor | 2026-07-21T16:40:54Z | add taskmark board and update plugin |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
