---
id: S-003
type: story
title: App bar project switcher
status: done
priority: high
size: S
size_source: suggested
size_basis: [T-009, T-010]
points: 2
points_source: suggested
estimate_minutes: 30
actual_minutes: 28
estimate_basis: [T-009, T-010]
session_cap_minutes: 480
parent: E-001
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, app-bar, navigation]
created: 2026-07-21
updated: 2026-07-21T17:48:46Z
started_at: 2026-07-21T16:59:31Z
completed_at: 2026-07-21T17:02:25Z
---
# S-003: App bar project switcher

## User story

As a user, after I set up a master folder, I want an app bar that lets me switch among the discovered (pre-configured) Taskmark projects so I can focus on one project’s epics without re-running setup.

## Acceptance criteria

- [x] Post-setup screens show an app bar with the Taskmark brand.
- [x] App bar lists discovered projects from the current master folder.
- [x] User can switch the active project from the app bar without clearing the master folder.
- [x] Active project is persisted (cookie) and restored on return visits.
- [x] Epic list shows the active project (not all projects at once).
- [x] User can still change the master folder from the app bar (setup).

## Tasks

- [T-009: Build post-setup app bar UI](items/T-009-app-bar-ui.md)
- [T-010: Persist active project and filter epic list](items/T-010-active-project-cookie.md)

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:59:31Z | prompt | After setup, app bar should switch among pre-configured projects |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| 5735f0b | taskmark-frontend | 2026-07-21T17:11:35Z | add app bar and project accumulate |
| 3389ae7 | taskmark-cursor | 2026-07-21T17:11:35Z | sync taskmark board |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:59:31Z | 2026-07-21T17:02:25Z | App bar project switcher shipped |
| 2 | agent | 2026-07-21T16:59:31Z | 2026-07-21T17:11:35Z | auto-recovered: commit span |
