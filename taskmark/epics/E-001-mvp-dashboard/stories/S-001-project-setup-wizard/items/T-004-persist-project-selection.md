---
id: T-004
type: task
title: Persist selected project and enter app
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
parent: S-001
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, wizard, persistence]
created: 2026-07-21
updated: 2026-07-21T18:02:46Z
started_at: 2026-07-21T16:35:18Z
completed_at: 2026-07-21T16:37:18Z
---
# T-004: Persist selected project and enter app

## Description

On successful validation, store the selected **master folder** path in a **cookie** and navigate the user into the main app surface (epic lists for discovered projects). On subsequent launches, if the cookie holds a master folder path, skip the setup wizard and go straight to the app. Users who already set up must not be forced through setup again. Provide a clear path back into the setup wizard to **switch** master folders and overwrite the cookie.

## Acceptance criteria

- [x] Valid master folder path is stored in a cookie (not localStorage) and survives reload / browser restart for the cookie’s lifetime.
- [x] Returning users with a master-folder cookie skip the setup wizard and enter the app directly.
- [x] After first successful setup, the user is not required to set up again unless they choose to switch or the cookie is missing/invalid.
- [x] After save, user lands on the epic list surface for projects discovered under that master folder.
- [x] Saved invalid/missing path (or master with no discoverable projects) clears or ignores the cookie and falls back to the wizard with an explanation.
- [x] User can open setup again to switch master folders; confirming a new valid folder updates the cookie.

## Notes

Cookie name `taskmark_master_folder`, httpOnly, maxAge 1 year, stores master folder path.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:24:55Z | prompt | Create MVP epic with setup wizard + epic list; create stories and tasks |
| 2 | 2026-07-21T16:29:20Z | feedback | Persist project in cookies; skip setup when already configured; allow switching projects via setup |
| 3 | 2026-07-21T16:31:04Z | feedback | Cookie stores master folder; multiple Taskmark projects live in subfolders |
| 4 | 2026-07-21T16:37:18Z | prompt | Implement S-001 setup wizard |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:35:18Z | 2026-07-21T16:36:18Z | Implemented as part of S-001 setup wizard |
