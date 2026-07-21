---
id: B-001
type: bug
title: Epic list fails after board frontmatter fence corruption
status: done
priority: high
size: S
size_source: suggested
size_basis: []
points: 2
points_source: suggested
estimate_minutes: 120
actual_minutes: 1
estimate_basis: []
session_cap_minutes: 480
parent: S-002
epic: E-001
owner: ""
blocked: false
cancelled: false
tags: [mvp, parser, bug]
created: 2026-07-21
updated: 2026-07-21T16:58:32Z
started_at: 2026-07-21T16:56:26Z
completed_at: 2026-07-21T16:56:26Z
---

# B-001: Epic list fails after board frontmatter fence corruption

## Description

After setup → Switch master folder → select the same workspace again, `/board` showed a parse error for `epic.md` (“Missing or invalid YAML frontmatter”) and an empty epic list instead of E-001.

## Repro steps

1. Complete setup with a master folder that has Taskmark projects.
2. Click **Switch master folder**.
3. Select the same master folder again and continue.

## Fix criteria

- [x] `epic.md` files with a glued closing fence (`completed_at: …Z---`) parse successfully (or are repaired).
- [x] Epic list shows epics again for discovered projects after switch + re-select.
- [x] Parser normalizes glued closing fences so this corruption does not blank the list.

## Notes

Root cause: board status updates concatenated `---` onto the last frontmatter line, so the YAML fence no longer matched. Not caused by cookie/switch logic itself.

## Prompt & feedback log

| # | When (UTC) | Kind | Summary |
|---|------------|------|---------|
| 1 | 2026-07-21T16:56:26Z | prompt | Bug: switch master folder then re-add same project → epic parse error |

## Commits

| SHA | Repo | Date (UTC) | Message |
|-----|------|------------|---------|
| cc992dc | taskmark-frontend | 2026-07-21T16:58:32Z | add epic list and fix frontmatter parse |
| 8f1a801 | taskmark-cursor | 2026-07-21T16:58:32Z | sync taskmark board |

## Work log

| Session | Actor | Started (UTC) | Ended (UTC) | Summary |
|---------|-------|---------------|-------------|---------|
| 1 | agent | 2026-07-21T16:56:26Z | 2026-07-21T16:56:26Z | Repaired glued frontmatter fences; hardened epic parser |
