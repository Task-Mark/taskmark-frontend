---
id: T-009
type: task
title: Build post-setup app bar UI
status: done
priority: high
size: XS
size_source: suggested
size_basis: [calibrated:T-009]
points: 1
points_source: suggested
estimate_minutes: 15
actual_minutes: 14
estimate_basis: [calibrated:T-009]
session_cap_minutes: 480
parent: S-003
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, app-bar, ui]
created: 2026-07-21
updated: 2026-07-21T17:31:00Z
started_at: 2026-07-21T16:59:31Z
completed_at: 2026-07-21T17:02:25Z
---
# T-009: Build post-setup app bar UI

## Description

Add a sticky/top app bar on post-setup views with Taskmark branding, a project switcher control for discovered projects, and an action to change the master folder (open setup).

## Acceptance criteria

- [x] App bar appears on `/board` after setup.
- [x] Brand is visible in the app bar.
- [x] Project switcher lists discovered projects by name.
- [x] Master-folder change action is available from the app bar.

## Notes

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:59:31Z | prompt | After setup, app bar should switch among pre-configured projects |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| 5735f0b | taskmark-frontend | 2026-07-21T17:11:35Z | add app bar and project accumulate |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:59:31Z | 2026-07-21T17:02:25Z | Built sticky app bar with project select and change master folder |
| 2 | agent | 2026-07-21T16:59:31Z | 2026-07-21T17:11:35Z | auto-recovered: commit span |
