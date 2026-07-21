---
id: T-014
type: task
title: Parse task and bug markdown under selected story
status: done
priority: high
size: M
size_source: suggested
size_basis: [T-005, T-011]
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 1
estimate_basis: [T-005]
session_cap_minutes: 480
parent: S-006
epic: E-002
owner: ""
blocked: false
cancelled: false
tags: [parser, tasks]
created: 2026-07-21
updated: 2026-07-21T22:21:39Z
started_at: 2026-07-21T18:00:53Z
completed_at: 2026-07-21T18:02:46Z
---

# T-014: Parse task and bug markdown under selected story

## Description

Given a project board path and a story folder (or story id under an epic), scan `items/*.md`, parse YAML frontmatter, and return typed task/bug summaries (id, type, title, status, size, points, estimate_minutes, actual_minutes, priority, tags, parent).

## Acceptance criteria

- [x] Discovers all markdown items under the selected story’s `items/` folder.
- [x] Distinguishes `task` vs `bug` via frontmatter `type` (and/or id prefix).
- [x] Returns structured summaries suitable for a list view.
- [x] Malformed files are skipped or flagged without failing the whole scan.
- [x] Works against real Taskmark boards in this workspace.

## Notes

Reuse shared frontmatter parsing helpers from the epic/story readers.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T17:40:05Z | prompt | Create E-002 user stories view with stories and tasks |
| 2 | 2026-07-21T18:00:53Z | prompt | Implement S-006 task list for selected story |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| 4e49022 | taskmark-frontend | 2026-07-21T22:21:39Z | add task list for selected story |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T18:00:53Z | 2026-07-21T18:02:46Z | Parsed task/bug markdown under selected story |
