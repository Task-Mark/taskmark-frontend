---
id: S-007
type: story
title: Single-project board placement
status: backlog
priority: high
size: M
size_source: suggested
size_basis: [T-017, T-018, T-019]
points: 5
points_source: suggested
estimate_minutes: 254
actual_minutes: 0
estimate_basis: [T-017, T-018, T-019]
session_cap_minutes: 480
parent: E-003
epic: E-003
owner: ""
blocked: false
cancelled: false
tags: [architecture, single-repo, board-layout]
created: 2026-07-21
updated: 2026-07-21T22:26:00Z
started_at: null
completed_at: null
---

# S-007: Single-project board placement

## User story

As a developer with a single-folder / single-git workspace, I want the Taskmark board to live inside that project and use its git so product memory stays with the code without a separate Taskmark repo.

## Acceptance criteria

- [ ] Workspace with exactly one git root is classified as single-project mode.
- [ ] `taskmark/` is created or expected only under that git root (not a sibling folder).
- [ ] Board commits and history use the project’s existing git repository.
- [ ] `REPOS.md` lists that single project; no multi-repo copy sync is required.
- [ ] Docs/skills describe single-project placement clearly.

## Tasks

- [T-017: Detect single-repo workspace mode](items/T-017-detect-single-repo-mode.md)
- [T-018: Place board inside project git root](items/T-018-place-board-in-project-git.md)
- [T-019: Configure single-repo REPOS.md](items/T-019-single-repo-repos-md.md)

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
