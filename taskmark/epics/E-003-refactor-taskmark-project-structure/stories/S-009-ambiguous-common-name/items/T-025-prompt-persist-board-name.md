---
id: T-025
type: task
title: Prompt user and persist board project name
status: backlog
priority: high
size: S
size_source: suggested
size_basis: [T-024, T-004]
points: 2
points_source: suggested
estimate_minutes: 120
actual_minutes: 0
estimate_basis: []
session_cap_minutes: 480
parent: S-009
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [multi-repo, naming, ux]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# T-025: Prompt user and persist board project name

## Description

When the common name is ambiguous, ask the user for the intended `<common_project_name>` (or full `<name>_taskmark` folder name), then persist the choice so later sessions reuse it.

## Acceptance criteria

- [ ] Agent/skill prompts the user instead of guessing when T-024 flags ambiguity.
- [ ] Choice is stored in board metadata (e.g. `REPOS.md` Canonical / Board project field).
- [ ] Subsequent sync/init reads the persisted name and does not re-prompt unless missing.

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
