---
id: T-027
type: task
title: Update sync-taskmark-repos skill and script
status: backlog
priority: high
size: M
size_source: suggested
size_basis: [T-023, T-026]
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-010
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [plugin, sync, multi-repo]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-027: Update sync-taskmark-repos skill and script

## Description

Rewrite `sync-taskmark-repos` skill and `scripts/sync-taskmark-repos.sh` for the new model: ensure dedicated board project exists in multi mode; do not rsync `taskmark/` into product repos; keep `REPOS.md` product-root listing accurate.

## Acceptance criteria

- [ ] Skill steps match dedicated-board semantics.
- [ ] Script no longer copies the board tree into every discovered git root.
- [ ] Multi mode resolves/creates the `_taskmark` project as canonical.
- [ ] Single mode is a no-op copy (board already in project).

## Notes

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T22:26:00Z | prompt | Create epic + stories/tasks for Taskmark project structure refactor |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
