---
id: S-009
type: story
title: Ambiguous common-name resolution
status: backlog
priority: high
size: M
size_source: suggested
size_basis: [T-024, T-025]
points: 4
points_source: suggested
estimate_minutes: 240
actual_minutes: 0
estimate_basis: [T-024, T-025]
session_cap_minutes: 480
parent: E-003
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [architecture, multi-repo, ux]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# S-009: Ambiguous common-name resolution

## User story

As a developer in a multi-project workspace, when the shared project name is ambiguous, I want Taskmark to ask me for the board project name so we do not create a wrongly named `<…>_taskmark` folder.

## Acceptance criteria

- [ ] Heuristics detect when a common prefix/name cannot be derived confidently (e.g. unrelated folder names, conflicting prefixes).
- [ ] On ambiguity, the agent/tooling asks the user for the intended common project name before creating the dedicated folder.
- [ ] The chosen name is persisted (e.g. in `REPOS.md` or a board config field) so later syncs do not re-ask unless missing.
- [ ] Non-ambiguous cases still auto-derive `<common>_taskmark` without prompting.

## Tasks

- [T-024: Detect ambiguous common-name cases](items/T-024-detect-ambiguous-common-name.md)
- [T-025: Prompt user and persist board project name](items/T-025-prompt-persist-board-name.md)

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T22:26:00Z | prompt | Create epic: single-project board inside project git; multi-project sibling `_taskmark` repo; create stories/tasks |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
