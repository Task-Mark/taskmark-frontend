---
id: T-029
type: task
title: Migrate existing multi-copy boards
status: backlog
priority: medium
size: M
size_source: suggested
size_basis: [T-023, T-027]
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
tags: [migration, multi-repo, plugin]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-029: Migrate existing multi-copy boards

## Description

Document and implement a migration path for workspaces that already keep identical `taskmark/` copies in every product repo: promote one canonical tree into `<name>_taskmark`, init git, update `REPOS.md`, and remove or stop syncing leftover copies.

## Acceptance criteria

- [ ] Migration steps are documented for agents and humans.
- [ ] Script or skill path can promote the richest/canonical copy into the dedicated project.
- [ ] Guidance covers conflict resolution when copies diverged.
- [ ] After migration, product repos no longer receive board copies.

## Notes

This workspace (taskmark-frontend + taskmark-cursor) is a target example.

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
