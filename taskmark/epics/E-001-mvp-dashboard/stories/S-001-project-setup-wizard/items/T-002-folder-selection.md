---
id: T-002
type: task
title: Implement project folder selection
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
tags: [mvp, wizard, filesystem]
created: 2026-07-21
updated: 2026-07-21T16:37:18Z
started_at: 2026-07-21T16:35:18Z
completed_at: 2026-07-21T16:37:18Z
---

# T-002: Implement project folder selection

## Description

Let the user provide a local **master folder** path (path input and/or native folder picker via the mechanism available to this Next.js app — e.g. server-side path, File System Access API, or similar). Capture an absolute path the rest of the app can use to **discover** Taskmark projects in subfolders—not assume a single `taskmark/` at the selected root.

## Acceptance criteria

- [x] User can enter or pick a local master folder.
- [x] Selected path is available to subsequent discovery, validation, and load steps.
- [x] Invalid empty selection is blocked with inline feedback.
- [x] Approach for local folder access is documented in Notes if it requires env/dev constraints.

## Notes

Browser sandboxes limit arbitrary disk access; prefer a practical local-dev approach (e.g. path string + Node fs on the server, or directory handle) and document the choice. The selected folder is a workspace root that may contain multiple project subfolders.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:24:55Z | prompt | Create MVP epic with setup wizard + epic list; create stories and tasks |
| 2 | 2026-07-21T16:31:04Z | feedback | Selection is a master folder; Taskmark projects live in subfolders |
| 3 | 2026-07-21T16:37:18Z | prompt | Implement S-001 setup wizard |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:35:18Z | 2026-07-21T16:36:18Z | Implemented as part of S-001 setup wizard |
