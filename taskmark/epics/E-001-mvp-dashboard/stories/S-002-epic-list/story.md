---
id: S-002
type: story
title: Epic list for selected project
status: done
priority: high
size: L
size_source: suggested
size_basis: [T-005, T-006, T-007]
points: 8
points_source: suggested
estimate_minutes: 765
actual_minutes: 48
estimate_basis: [T-005, T-006, T-007]
session_cap_minutes: 480
parent: E-001
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, epics, dashboard]
created: 2026-07-21
updated: 2026-07-21T17:41:06Z
started_at: 2026-07-21T16:49:52Z
completed_at: 2026-07-21T16:51:19Z
---

# S-002: Epic list for selected project

## User story

As a user, I want to see every epic for **each** Taskmark project discovered under my master folder so I can understand the initiative backlog per project at a glance.

## Acceptance criteria

- [x] After master-folder selection, the app shows epics for each discovered project’s `taskmark/epics/`.
- [x] Epics are identifiable by project (grouped or labeled with project name/path).
- [x] Each row shows at least id, title, status, size, and points (and estimate/actual when available).
- [x] Empty boards / projects with no epics show an empty state, not a crash.
- [x] Parse errors for individual epics are surfaced without breaking the whole list.
- [x] List refreshes when the master folder (cookie) changes or discovery results change.

## Tasks

- [T-005: Parse epic markdown from local taskmark folder](items/T-005-parse-epic-markdown.md)
- [T-006: Build epic list UI](items/T-006-epic-list-ui.md)
- [T-007: Wire selected project to epic list](items/T-007-wire-project-to-epic-list.md)
- [B-001: Epic list fails after board frontmatter fence corruption](items/B-001-epic-frontmatter-parse.md)

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:24:55Z | prompt | Create MVP epic with setup wizard + epic list; create stories and tasks |
| 2 | 2026-07-21T16:31:04Z | feedback | Master folder may contain multiple Taskmark projects in subfolders; list epics per project |
| 3 | 2026-07-21T16:49:52Z | prompt | Implement S-002 epic list for selected projects |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| cc992dc | taskmark-frontend | 2026-07-21T16:58:32Z | add epic list and fix frontmatter parse |
| 8f1a801 | taskmark-cursor | 2026-07-21T16:58:32Z | sync taskmark board |
| 3d64d0e | taskmark-frontend | 2026-07-21T17:35:33Z | format epic list durations and status badges |
| 622a560 | taskmark-cursor | 2026-07-21T17:35:33Z | add recompute-actuals and update effort skills |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:49:52Z | 2026-07-21T16:51:19Z | Implemented epic parser and per-project epic list on /board |
| 2 | agent | 2026-07-21T16:49:52Z | 2026-07-21T17:35:33Z | auto-recovered: commit span |
