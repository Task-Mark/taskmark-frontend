import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

/**
 * Git hooks for code repositories. They work in any editor and without AI:
 *
 * - prepare-commit-msg: adds `Task: <id>` to the commit message when the branch
 *   name carries a task id and the message does not mention it yet.
 *
 * Reconciliation (status, work log, commits, stages) belongs to the Taskmark
 * GitHub / Bitbucket App, so no hook writes to the board. Older versions
 * installed a post-merge hook that ran `taskmark stages`; installing again
 * removes it.
 *
 * Hooks go into the repository's own hooks folder (respecting core.hooksPath),
 * never into tracked files. A hook that was not written by Taskmark is left
 * alone.
 */

export const HOOK_MARKER = "# taskmark-hook v1"

/** Task id in a branch name: E-MM-3ed0b601, T-MM-457b0290, S-086, B-8, T-271. */
export const BRANCH_TASK_ID = /(?:^|[/_-])([ESTB]-(?:[A-Za-z]{2}-[0-9a-fA-F]{6,8}|\d{1,6}))(?=$|[/_-])/i

export function taskIdFromBranch(branch) {
  const m = BRANCH_TASK_ID.exec(String(branch ?? ""))
  if (!m) return null
  const [prefix, ...rest] = m[1].split("-")
  if (rest.length === 2) return `${prefix.toUpperCase()}-${rest[0].toUpperCase()}-${rest[1].toLowerCase()}`
  return `${prefix.toUpperCase()}-${rest[0]}`
}

function prepareCommitMsgScript() {
  return `#!/bin/sh
${HOOK_MARKER}
# Adds "Task: <id>" when the branch name carries a Taskmark task id.
msg_file="$1"
source="$2"
[ "$source" = "merge" ] && exit 0
branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null) || exit 0
id=$(printf '%s' "$branch" | sed -nE 's#(^|.*[/_-])([ESTBestb]-([A-Za-z]{2}-[0-9a-fA-F]{6,8}|[0-9]{1,6}))($|[/_-].*)#\\2#p' | head -n1)
[ -z "$id" ] && exit 0
grep -qiF "$id" "$msg_file" && exit 0
printf '\\nTask: %s\\n' "$id" >> "$msg_file"
`
}

/** Hooks Taskmark wrote in earlier versions and no longer installs. */
const RETIRED_HOOKS = ["post-merge"]

function hooksDir(repo) {
  const rel = execFileSync("git", ["-C", repo, "rev-parse", "--git-path", "hooks"], {
    encoding: "utf8",
  }).trim()
  return path.resolve(repo, rel)
}

/**
 * @returns {{ repo: string, written: string[], skipped: string[], removed: string[] }}
 */
export function installHooks({ repo }) {
  const dir = hooksDir(repo)
  fs.mkdirSync(dir, { recursive: true })
  const hooks = {
    "prepare-commit-msg": prepareCommitMsgScript(),
  }
  const written = []
  const skipped = []
  for (const [name, content] of Object.entries(hooks)) {
    const file = path.join(dir, name)
    if (fs.existsSync(file) && !fs.readFileSync(file, "utf8").includes(HOOK_MARKER)) {
      skipped.push(name)
      continue
    }
    fs.writeFileSync(file, content, { mode: 0o755 })
    fs.chmodSync(file, 0o755)
    written.push(name)
  }
  const removed = []
  for (const name of RETIRED_HOOKS) {
    const file = path.join(dir, name)
    if (fs.existsSync(file) && fs.readFileSync(file, "utf8").includes(HOOK_MARKER)) {
      fs.rmSync(file)
      removed.push(name)
    }
  }
  return { repo, written, skipped, removed }
}
