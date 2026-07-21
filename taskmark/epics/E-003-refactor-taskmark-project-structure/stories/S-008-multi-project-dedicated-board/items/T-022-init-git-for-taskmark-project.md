---
id: T-022
type: task
title: Initialize git for dedicated Taskmark project
status: backlog
priority: high
size: XS
size_source: suggested
size_basis: [T-019, T-002]
points: 1
points_source: suggested
estimate_minutes: 14
actual_minutes: 0
estimate_basis: [T-019]
session_cap_minutes: 480
parent: S-008
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [git, multi-repo, init]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-022: Initialize git for dedicated Taskmark project

## Description

When creating the multi-project `<common>_taskmark` folder, run `git init` so the board has its own repository. Skip if `.git` already exists.

## Acceptance criteria

- [ ] New dedicated Taskmark project has a `.git` directory after setup.
- [ ] Existing git repos are left untouched (no re-init).
- [ ] Board commits for multi-project work target this repo’s short name in Commits tables.

## Notes

Remote/push setup is out of scope for this task.

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
