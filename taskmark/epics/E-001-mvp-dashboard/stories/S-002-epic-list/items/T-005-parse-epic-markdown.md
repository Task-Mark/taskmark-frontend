---
id: T-005
type: task
title: Parse epic markdown from local taskmark folder
status: backlog
priority: high
size: M
size_source: suggested
size_basis: []
points: 3
points_source: suggested
estimate_minutes: 480
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-002
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, parser, epics]
created: 2026-07-21
updated: 2026-07-21T16:31:04Z
started_at: null
completed_at: null
---

# T-005: Parse epic markdown from local taskmark folder

## Description

Implement a reader that, for a given discovered project board path, scans `taskmark/epics/*/epic.md`, parses YAML frontmatter and key fields (id, title, status, size, points, estimate_minutes, actual_minutes, priority, tags), and returns a typed list of epics. Support calling this per project so the UI can show epics **for each** project under the master folder.

## Acceptance criteria

- [ ] Discovers all epic folders with an `epic.md` under a given board path.
- [ ] Returns structured epic summaries suitable for a list view, including which project they belong to when requested.
- [ ] Malformed files are skipped or flagged without failing the whole scan.
- [ ] Works against real Taskmark board paths (e.g. boards under this workspace’s subfolders).

## Notes

Foundation for later story/task dashboard parsing; keep the API extensible. Pair with T-008 discovery results.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:24:55Z | prompt | Create MVP epic with setup wizard + epic list; create stories and tasks |
| 2 | 2026-07-21T16:31:04Z | feedback | Parse epics per discovered project under master folder |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
