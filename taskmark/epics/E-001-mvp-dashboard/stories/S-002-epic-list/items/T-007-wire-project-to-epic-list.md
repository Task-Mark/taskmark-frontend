---
id: T-007
type: task
title: Wire selected project to epic list
status: backlog
priority: high
size: S
size_source: suggested
size_basis: []
points: 2
points_source: suggested
estimate_minutes: 120
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-002
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, epics, integration]
created: 2026-07-21
updated: 2026-07-21T16:31:04Z
started_at: null
completed_at: null
---

# T-007: Wire selected project to epic list

## Description

Connect the persisted **master folder** cookie from the setup wizard to discovery, the epic parser, and the list UI: discover projects under the master folder, load epics for each, refetch when the master folder changes, and show errors if discovery or boards become unavailable.

## Acceptance criteria

- [ ] Epic list loads from all Taskmark projects discovered under the cookie’s master folder.
- [ ] Changing master folder re-runs discovery and reloads epic lists.
- [ ] Failure to read the master folder or boards shows an actionable error (including return to wizard).
- [ ] End-to-end path works: wizard → discover/validate → list epics per project.

## Notes

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:24:55Z | prompt | Create MVP epic with setup wizard + epic list; create stories and tasks |
| 2 | 2026-07-21T16:31:04Z | feedback | Wire master folder discovery to per-project epic lists |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
