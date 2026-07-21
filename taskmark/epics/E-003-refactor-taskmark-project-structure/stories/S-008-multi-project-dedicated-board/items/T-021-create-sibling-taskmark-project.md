---
id: T-021
type: task
title: Create sibling `_taskmark` project folder
status: backlog
priority: high
size: S
size_source: suggested
size_basis: [T-018, T-008]
points: 2
points_source: suggested
estimate_minutes: 120
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-008
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [architecture, multi-repo, init]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-021: Create sibling `_taskmark` project folder

## Description

In multi-project mode, create (or reuse) a sibling directory named `<common_project_name>_taskmark` next to the linked product projects and initialize the Taskmark board tree inside it.

## Acceptance criteria

- [ ] Folder path is sibling to product repos (not nested inside one of them).
- [ ] Name follows `<common>_taskmark` from T-020 / T-025.
- [ ] Existing folder with a valid board is reused, not duplicated.
- [ ] Fresh folder gets `taskmark-init` content under that project.

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
