---
id: T-010
type: task
title: Persist active project and filter epic list
status: done
priority: high
size: S
size_source: suggested
size_basis: []
points: 2
points_source: suggested
estimate_minutes: 120
actual_minutes: 1
estimate_basis: []
session_cap_minutes: 480
parent: S-003
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, cookie, navigation]
created: 2026-07-21
updated: 2026-07-21T17:02:25Z
started_at: 2026-07-21T16:59:31Z
completed_at: 2026-07-21T17:02:25Z
---


# T-010: Persist active project and filter epic list

## Description

Store the active discovered project in a cookie (separate from the master folder cookie). Switching in the app bar updates the cookie. The board epic list shows only the active project. If the cookie is missing or stale, default to the first discovered project. Clearing/changing the master folder clears or resets the active project.

## Acceptance criteria

- [x] Active project id/path is stored in a cookie.
- [x] Switching projects updates the cookie and refreshes the epic list.
- [x] Epic list is scoped to the active project.
- [x] Invalid/missing active project falls back to the first discovered project.
- [x] Changing master folder resets active project appropriately.

## Notes

Cookie name: `taskmark_active_project` (project id / folder name under discovery).

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:59:31Z | prompt | After setup, app bar should switch among pre-configured projects |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:59:31Z | 2026-07-21T17:02:25Z | Active project cookie + filtered epic list |
