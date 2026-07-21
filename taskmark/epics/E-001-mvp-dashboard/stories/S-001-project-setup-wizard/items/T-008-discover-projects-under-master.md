---
id: T-008
type: task
title: Discover Taskmark projects under master folder
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
parent: S-001
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, discovery, filesystem]
created: 2026-07-21
updated: 2026-07-21T17:31:00Z
started_at: 2026-07-21T16:35:18Z
completed_at: 2026-07-21T16:37:18Z
---
# T-008: Discover Taskmark projects under master folder

## Description

Given a selected **master folder**, walk its subfolders to find configured Taskmark boards (`taskmark/` with expected markers such as `INDEX.md` and/or `epics/`). Return a list of discovered projects (name/path) so the app can treat the master folder as a workspace that may contain **multiple** Taskmark projects—not a single board at the root.

## Acceptance criteria

- [x] Scans subfolders of the master folder for Taskmark boards (at least one level deep; document depth policy).
- [x] Returns zero or more project entries with a stable id/name and absolute path to each board root.
- [x] Skips noise (e.g. `node_modules`, `.git`) so discovery stays practical.
- [x] A master folder with several git/project subfolders each containing `taskmark/` yields multiple discoveries (e.g. this workspace’s `taskmark-frontend` and `taskmark-cursor`).
- [x] Does not require `taskmark/` to exist at the master folder root itself.

## Notes

Example: master `/Users/.../taskmark` → discover `/Users/.../taskmark/taskmark-frontend/taskmark` and `/Users/.../taskmark/taskmark-cursor/taskmark`.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:31:04Z | feedback | Master folder may contain multiple Taskmark projects in subfolders; discover by venturing into children |
| 2 | 2026-07-21T16:37:18Z | prompt | Implement S-001 setup wizard |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:35:18Z | 2026-07-21T16:36:18Z | Implemented as part of S-001 setup wizard |
