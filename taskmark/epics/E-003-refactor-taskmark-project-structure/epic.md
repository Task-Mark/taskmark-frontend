---
id: E-003
type: epic
title: Refactor Taskmark project structure
status: backlog
priority: high
size: XL
size_source: suggested
size_basis: [S-007, S-008, S-009, S-010]
points: 29
points_source: suggested
estimate_minutes: 3148
actual_minutes: 0
estimate_basis: [S-007, S-008, S-009, S-010]
session_cap_minutes: 480
parent: null
epic: null
owner: ""
blocked: false
cancelled: false
tags: [architecture, multi-repo, plugin, board-layout]
created: 2026-07-21
updated: 2026-07-21T22:31:15Z
started_at: null
completed_at: null
---

# E-003: Refactor Taskmark project structure

## Goal

Stop copying `taskmark/` into every product repo. Place the board where git ownership is clear: inside the sole project for single-repo workspaces, or in a dedicated sibling `<common_project_name>_taskmark` git project for multi-repo workspaces.

## Scope

- Single-folder / single-git workspaces: `taskmark/` lives inside that project and uses the project’s git history.
- Multi-folder / multi-git workspaces: create a sibling project named `<common_project_name>_taskmark` (ask the user when the common name is ambiguous).
- Initialize a new git repository for the dedicated multi-project Taskmark folder.
- Update plugin conventions, skills, scripts, and the always-apply rule to match the new model.
- Provide a migration path away from per-repo board copies.

## Out of scope

- Changing epic/story/task markdown schema or INDEX format beyond repo-layout docs.
- Frontend dashboard UI redesign (discovery may need follow-up once layout lands).
- Hosting or remotes for the new Taskmark git repo (local `git init` only unless later requested).

## Success metrics

- Single-repo workspaces never create a sibling Taskmark project; board commits land in the product repo.
- Multi-repo workspaces have exactly one canonical board under `<name>_taskmark` with its own `.git`.
- Agents no longer sync/copy `taskmark/` into every linked product repo.
- Ambiguous naming always prompts the user before creating the dedicated project.

## Stories

- [S-007: Single-project board placement](stories/S-007-single-project-board-placement/story.md)
- [S-008: Multi-project dedicated board repo](stories/S-008-multi-project-dedicated-board/story.md)
- [S-009: Ambiguous common-name resolution](stories/S-009-ambiguous-common-name/story.md)
- [S-010: Migrate plugin tooling to new layout](stories/S-010-migrate-plugin-tooling/story.md)

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| 87ec6aa | taskmark-frontend | 2026-07-21T22:31:15Z | add e-003 project structure epic |
| 6962bd4 | taskmark-cursor | 2026-07-21T22:31:15Z | sync taskmark board |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
