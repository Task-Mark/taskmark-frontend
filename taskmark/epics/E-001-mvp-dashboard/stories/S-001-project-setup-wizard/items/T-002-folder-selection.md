---
id: T-002
type: task
title: Implement project folder selection
status: done
priority: high
size: XS
size_source: suggested
size_basis: [calibrated:T-002]
points: 1
points_source: suggested
estimate_minutes: 15
actual_minutes: 14
estimate_basis: [calibrated:T-002]
session_cap_minutes: 480
parent: S-001
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, wizard, filesystem]
created: 2026-07-21
updated: 2026-07-21T17:31:00Z
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

Browser sandboxes cannot expose absolute disk paths. Folder selection uses a **native OS folder picker** via the Next.js server (`osascript` on macOS, `zenity` on Linux, PowerShell folder browser on Windows), plus a path text field for paste/edit. Local `next dev` / `next start` only — not suitable for a remote hosted deploy without a different picker strategy. The selected folder is a workspace root that may contain multiple project subfolders.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:24:55Z | prompt | Create MVP epic with setup wizard + epic list; create stories and tasks |
| 2 | 2026-07-21T16:31:04Z | feedback | Selection is a master folder; Taskmark projects live in subfolders |
| 3 | 2026-07-21T16:37:18Z | prompt | Implement S-001 setup wizard |
| 4 | 2026-07-21T16:45:20Z | feedback | Find/select project should use a folder picker as well as path input |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| 1fcb25f | taskmark-frontend | 2026-07-21T16:48:57Z | add native folder picker to setup |
| e1923e9 | taskmark-cursor | 2026-07-21T16:48:57Z | sync taskmark board |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:35:18Z | 2026-07-21T16:36:18Z | Implemented as part of S-001 setup wizard |
| 2 | agent | 2026-07-21T16:35:18Z | 2026-07-21T16:48:57Z | auto-recovered: commit span |
