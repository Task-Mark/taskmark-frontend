---
id: T-020
type: task
title: Derive common project name
status: backlog
priority: high
size: S
size_source: suggested
size_basis: [T-008, T-017]
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
tags: [architecture, multi-repo, naming]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-020: Derive common project name

## Description

From multiple workspace git roots, derive a confident `<common_project_name>` (e.g. shared parent folder name or shared prefix like `taskmark` from `taskmark-frontend` / `taskmark-cursor`) used to name `<common>_taskmark`.

## Acceptance criteria

- [ ] Documented heuristic for common name (parent dir, shared prefix, etc.).
- [ ] Returns a name when confidence is high.
- [ ] Defers to S-009 / T-024 when confidence is low.

## Notes

Example for this workspace: parent `taskmark` → `taskmark_taskmark` may be wrong; prefer shared prefix `taskmark` → `taskmark_taskmark` is awkward — heuristics should prefer parent folder or ask (S-009). Capture preferred rule in implementation.

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
