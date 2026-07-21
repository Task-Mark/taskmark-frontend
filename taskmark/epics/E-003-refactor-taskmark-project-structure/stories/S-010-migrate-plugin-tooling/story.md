---
id: S-010
type: story
title: Migrate plugin tooling to new layout
status: backlog
priority: high
size: XL
size_source: suggested
size_basis: [T-026, T-027, T-028, T-029]
points: 12
points_source: suggested
estimate_minutes: 1920
actual_minutes: 0
estimate_basis: [T-026, T-027, T-028, T-029]
session_cap_minutes: 480
parent: E-003
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [plugin, conventions, migration, multi-repo]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# S-010: Migrate plugin tooling to new layout

## User story

As a Taskmark plugin user, I want skills, scripts, conventions, and the always-apply rule updated to the new single vs dedicated-board model so agents stop copying the board into every product repo.

## Acceptance criteria

- [ ] `multi-repo.md`, always-apply project-memory rule, and related docs describe single-in-project vs dedicated `_taskmark` git project.
- [ ] `sync-taskmark-repos` skill/script no longer whole-tree-copies `taskmark/` into every product git root; it ensures/uses the dedicated board project in multi mode.
- [ ] `taskmark-init`, create/start/complete/sync skills, and `REPOS.md` guidance match the new layout.
- [ ] Existing workspaces that already have per-repo copies have a documented migration path to the dedicated board repo.
- [ ] Local plugin install is synced after the package changes.

## Tasks

- [T-026: Rewrite multi-repo conventions and rule](items/T-026-rewrite-multi-repo-conventions.md)
- [T-027: Update sync-taskmark-repos skill and script](items/T-027-update-sync-taskmark-repos.md)
- [T-028: Update init and related skills](items/T-028-update-init-and-skills.md)
- [T-029: Migrate existing multi-copy boards](items/T-029-migrate-existing-multi-copy-boards.md)

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T22:26:00Z | prompt | Create epic: single-project board inside project git; multi-project sibling `_taskmark` repo; create stories/tasks |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
