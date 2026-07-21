---
id: T-026
type: task
title: Rewrite multi-repo conventions and rule
status: backlog
priority: high
size: M
size_source: suggested
size_basis: [T-023, T-005]
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
tags: [plugin, conventions, docs]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-026: Rewrite multi-repo conventions and rule

## Description

Update `multi-repo.md`, related convention refs, and the always-apply Taskmark project-memory rule so they describe single-in-project vs dedicated `<name>_taskmark` git project — not per-repo board copies.

## Acceptance criteria

- [ ] Convention docs match the new layout model end-to-end.
- [ ] Always-apply rule no longer requires copying `taskmark/` into every git project.
- [ ] Examples in docs show both single and multi layouts.

## Notes

Source of truth in `taskmark-cursor/plugins/taskmark`; sync local plugin after.

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
