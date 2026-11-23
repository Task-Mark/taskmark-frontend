/**
 * The Taskmark section `taskmark init` writes into AGENTS.md and CLAUDE.md of
 * each connected code repository. Same wording as the docs page
 * (taskmark-website app/docs/agents), plus the hook and the App lines.
 */
import fs from "node:fs"
import path from "node:path"

export const SECTION_BEGIN = "<!-- taskmark:begin -->"
export const SECTION_END = "<!-- taskmark:end -->"
export const AGENT_FILES = ["AGENTS.md", "CLAUDE.md"]

/** `{{board}}` is replaced with the board path relative to the code repository. */
export const AGENT_INSTRUCTIONS_TEMPLATE = `## Taskmark board

This project plans its work on a Taskmark board: plain markdown in git at
\`{{board}}\`. Treat it as a read-only reference.

- Before you change code, find the board item for the work: a task or bug
  file under \`requests/<slug>/epics/**/items/\` (\`epics/**/items/\` on boards
  that were not migrated yet). Search by id, title, or description.
- The spec is the request brief (\`requests/<slug>/brief.md\`), the item's
  \`## Description\`, and its \`## Acceptance criteria\` (\`## Fix criteria\`
  for bugs). Read the parent story and epic for context.
- Never edit, rename, move, or delete any board file. Do not change status,
  dates, people, or checkboxes, and do not add Work log, Commits, or
  Prompt & feedback rows. The Taskmark App updates the board from pushes
  and merged pull requests.
- Work on a branch named \`<task-id>-<short-slug>\`, for example
  \`T-MM-457b0290-login-mockup\`. If the current branch name already contains
  the id, stay on it. For a story with several tasks, use the story id.
- Keep the task id in the branch name or in the commit message. The git hook
  adds a \`Task: <id>\` trailer to commits made on a task branch.
- When the work is pushed, the Taskmark App for GitHub or Bitbucket matches
  the commits to the task and marks it done. You do not update the board.
- If no item fits the request, say so and ask. Do not invent an item.`

/** The board path as the agent sees it from `repoPath`, with a trailing slash. */
export function boardPathFromRepo(repoPath, boardPath) {
  const rel = path.relative(repoPath, boardPath).split(path.sep).join("/")
  if (!rel) return "./"
  return `${rel}/`
}

export function renderSection(boardRel) {
  const body = AGENT_INSTRUCTIONS_TEMPLATE.replaceAll("{{board}}", boardRel)
  return `${SECTION_BEGIN}\n${body}\n${SECTION_END}`
}

/** Inserts the marked section, or replaces only an existing one. */
export function upsertSection(text, section) {
  const current = text ?? ""
  const begin = current.indexOf(SECTION_BEGIN)
  const end = begin >= 0 ? current.indexOf(SECTION_END, begin) : -1
  if (begin >= 0 && end >= 0) {
    return current.slice(0, begin) + section + current.slice(end + SECTION_END.length)
  }
  if (!current.trim()) return `${section}\n`
  const trimmed = current.replace(/\s+$/, "")
  return `${trimmed}\n\n${section}\n`
}

/** The section currently in `text`, or null. */
export function currentSection(text) {
  const begin = (text ?? "").indexOf(SECTION_BEGIN)
  if (begin < 0) return null
  const end = text.indexOf(SECTION_END, begin)
  return end < 0 ? null : text.slice(begin, end + SECTION_END.length)
}

/** CLAUDE.md that pulls AGENTS.md in with an `@AGENTS.md` import line. */
export function importsAgents(text) {
  return /^\s*@(?:\.\/)?AGENTS\.md\s*$/m.test(text ?? "")
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8")
  } catch {
    return null
  }
}

/**
 * The changes for one code repo.
 * @returns {Array<{ file: string, path: string, before: string | null, after: string, changed: boolean }>}
 */
export function planAgentInstructions({ repoPath, boardPath }) {
  const section = renderSection(boardPathFromRepo(repoPath, boardPath))
  const claude = read(path.join(repoPath, "CLAUDE.md"))
  const targets = importsAgents(claude) ? ["AGENTS.md"] : AGENT_FILES
  return targets.map((file) => {
    const full = path.join(repoPath, file)
    const before = read(full)
    const after = upsertSection(before, section)
    return { file, path: full, before, after, changed: before !== after }
  })
}

/** A short preview: `+` for new lines of the section, `-` for removed ones. */
export function previewChange(change) {
  const oldLines = (currentSection(change.before) ?? "").split("\n").filter(Boolean)
  const newLines = (currentSection(change.after) ?? "").split("\n").filter(Boolean)
  const header = change.before === null ? `${change.file} (new file)` : change.file
  if (!change.changed) return `${header}: up to date`
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)
  const lines = [header]
  for (const line of oldLines) if (!newSet.has(line)) lines.push(`- ${line}`)
  for (const line of newLines) lines.push(`${oldSet.has(line) ? " " : "+"} ${line}`)
  return lines.join("\n")
}

export function applyAgentInstructions(changes) {
  const written = []
  for (const change of changes) {
    if (!change.changed) continue
    fs.writeFileSync(change.path, change.after)
    written.push(change.path)
  }
  return written
}
