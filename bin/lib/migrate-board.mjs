import fs from "node:fs"
import path from "node:path"
import { stringify as stringifyYaml, parse as parseYaml } from "yaml"

/**
 * One-off migration from the legacy layout (`epics/<epic>/...`) to the
 * request layout (`requests/<slug>/brief.md` + `requests/<slug>/epics/<epic>`).
 *
 * - Every legacy epic becomes its own request; people can merge requests later.
 * - The epic folder moves unchanged under the request, so ids, stories, tasks,
 *   work logs and commit tables keep working.
 * - Done tasks without a stage get `stage: production` and `shipped_at`, since
 *   there is no branch history to classify them.
 * - The old epic id is kept as an alias on the request.
 * Nothing is deleted except the empty legacy `epics/` folder.
 */

const EPIC_TO_REQUEST_STATUS = {
  done: "shipped",
  shelved: "shelved",
  cancelled: "cancelled",
}

export function slugify(text) {
  return (
    String(text)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "request"
  )
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/

function normalize(raw) {
  return raw.replace(/^(---\r?\n[\s\S]*?\S)---(\r?\n)/, "$1\n---$2")
}

function readFrontmatter(raw) {
  const source = normalize(raw)
  const match = FRONTMATTER_RE.exec(source)
  if (!match) return { data: {}, body: source.trim(), source }
  let data = {}
  try {
    data = parseYaml(match[1]) ?? {}
  } catch {
    data = {}
  }
  return { data, body: source.slice(match[0].length).trim(), source }
}

function sections(body) {
  const out = {}
  let current = null
  let buf = []
  const flush = () => {
    if (current != null) out[current.toLowerCase()] = buf.join("\n").trim()
    buf = []
  }
  for (const line of body.split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*$/.exec(line)
    if (heading) {
      flush()
      current = heading[1].trim()
    } else if (current != null) {
      buf.push(line)
    }
  }
  flush()
  return out
}

function section(map, ...names) {
  for (const name of names) {
    const value = map[name.toLowerCase()]
    if (value) return value
  }
  return ""
}

function leafFiles(dir) {
  const out = []
  const walk = (current) => {
    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        path.basename(current) === "items"
      ) {
        out.push(full)
      }
    }
  }
  walk(dir)
  return out.sort()
}

function isGeneralEpic(data, dirName) {
  const title = String(data.title ?? "").trim().toLowerCase()
  const tags = Array.isArray(data.tags) ? data.tags.map((t) => String(t).toLowerCase()) : []
  return (
    title === "general" ||
    tags.includes("general") ||
    dirName.toLowerCase().endsWith("-general")
  )
}

function requestStatus(epicData, leaves) {
  if (leaves.length > 0) {
    const statuses = leaves.map((l) => String(l.data.status ?? "").toLowerCase())
    const terminal = ["done", "shelved", "cancelled"]
    if (statuses.every((s) => terminal.includes(s))) {
      if (statuses.includes("done")) return "shipped"
      return statuses.includes("shelved") ? "shelved" : "cancelled"
    }
    if (statuses.some((s) => s === "in_progress" || s === "blocked" || s === "done")) {
      return "building"
    }
    return "ready"
  }
  return EPIC_TO_REQUEST_STATUS[String(epicData.status ?? "").toLowerCase()] ?? "proposed"
}

/** Insert `stage` and `shipped_at` into a done leaf that has no stage yet. */
export function stageDoneLeaf(raw) {
  const { data, source } = readFrontmatter(raw)
  if (String(data.status ?? "").toLowerCase() !== "done") return null
  if (data.stage != null && String(data.stage).trim() !== "") return null
  const match = FRONTMATTER_RE.exec(source)
  if (!match) return null
  const shippedAt = String(data.completed_at ?? data.updated ?? "").trim()
  const extra = [`stage: production`]
  if (shippedAt && data.shipped_at == null) extra.push(`shipped_at: ${shippedAt}`)
  const head = `---\n${match[1]}\n${extra.join("\n")}\n---${match[2]}`
  return head + source.slice(match[0].length)
}

function briefMarkdown({ slug, epicId, epicData, epicSections, status, general }) {
  const reporters = Array.isArray(epicData.reporters) ? epicData.reporters : []
  const resolvers = Array.isArray(epicData.resolvers) ? epicData.resolvers : []
  const owner = (resolvers.length ? resolvers : reporters).slice(0, 1)
  const title = general ? "Maintenance" : String(epicData.title ?? slug)
  const frontmatter = {
    id: `R-${slug}`,
    type: "request",
    title,
    status: general ? "building" : status,
    requested_by: reporters,
    owner,
    created: epicData.created ?? null,
    updated: epicData.updated ?? null,
    forecast: null,
    tags: Array.isArray(epicData.tags) ? epicData.tags : [],
    aliases: [epicId],
    source_meetings: [],
    links: [],
  }
  const goal = general
    ? "Small fixes, bugs and chores that do not need their own brief."
    : section(epicSections, "Goal", "Description", "Objective")
  const doneWhen = section(epicSections, "Success metrics", "Done when", "Acceptance criteria")
  const outOfScope = section(epicSections, "Out of scope")
  const scope = section(epicSections, "Scope")
  const parts = [
    `---\n${stringifyYaml(frontmatter, { aliasDuplicateObjects: false }).trimEnd()}\n---`,
    `# ${title}`,
    `## Goal\n\n${goal || "_To be written._"}`,
  ]
  if (scope) parts.push(`## Scope\n\n${scope}`)
  parts.push(`## Done when\n\n${doneWhen || "_To be written._"}`)
  parts.push(`## Out of scope\n\n${outOfScope || "_Nothing yet._"}`)
  parts.push(`## Open questions\n\n_None yet._`)
  return parts.join("\n\n") + "\n"
}

function migrationLogEntry({ epicId, at }) {
  const frontmatter = {
    kind: "note",
    at,
    title: `Migrated from epic ${epicId}`,
    targets: [epicId],
  }
  return `---\n${stringifyYaml(frontmatter, { aliasDuplicateObjects: false }).trimEnd()}\n---\nThis request was created from the legacy epic ${epicId}. Its epics, stories, tasks and work logs moved here unchanged.\n`
}

/**
 * Plan (and, unless dryRun, apply) the migration of one board.
 * @returns {{ requests: Array<{epicId:string,title:string,slug:string,status:string,from:string,to:string,stagedLeaves:number}>, stagedLeaves:number, removedLegacyDir:boolean }}
 */
export function migrateBoard({ boardPath, dryRun = false, now = new Date() }) {
  const epicsDir = path.join(boardPath, "epics")
  const requestsDir = path.join(boardPath, "requests")
  let epicDirs = []
  try {
    epicDirs = fs
      .readdirSync(epicsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort()
  } catch {
    return { requests: [], stagedLeaves: 0, removedLegacyDir: false }
  }

  const usedSlugs = new Set()
  try {
    for (const name of fs.readdirSync(requestsDir)) usedSlugs.add(name)
  } catch {
    // no requests yet
  }

  const at = now.toISOString().replace(/\.\d{3}Z$/, "Z")
  const stamp = at.slice(0, 10)
  const plan = []
  let stagedTotal = 0

  for (const dirName of epicDirs) {
    const epicDir = path.join(epicsDir, dirName)
    const epicFile = path.join(epicDir, "epic.md")
    if (!fs.existsSync(epicFile)) continue
    const { data: epicData, body } = readFrontmatter(fs.readFileSync(epicFile, "utf8"))
    const epicId = String(epicData.id ?? dirName)
    const general = isGeneralEpic(epicData, dirName)

    let slug = general ? "maintenance" : slugify(epicData.title ?? dirName)
    if (usedSlugs.has(slug)) {
      let n = 2
      while (usedSlugs.has(`${slug}-${n}`)) n += 1
      slug = `${slug}-${n}`
    }
    usedSlugs.add(slug)

    const leaves = leafFiles(epicDir).map((file) => {
      const raw = fs.readFileSync(file, "utf8")
      return { file, raw, data: readFrontmatter(raw).data }
    })
    const status = requestStatus(epicData, leaves)
    const staged = leaves
      .map((leaf) => ({ file: leaf.file, next: stageDoneLeaf(leaf.raw) }))
      .filter((leaf) => leaf.next != null)
    stagedTotal += staged.length

    const requestDir = path.join(requestsDir, slug)
    const target = path.join(requestDir, "epics", dirName)
    plan.push({
      epicId,
      title: general ? "Maintenance" : String(epicData.title ?? dirName),
      slug,
      status: general ? "building" : status,
      from: path.relative(boardPath, epicDir),
      to: path.relative(boardPath, target),
      stagedLeaves: staged.length,
    })
    if (dryRun) continue

    for (const leaf of staged) fs.writeFileSync(leaf.file, leaf.next)
    fs.mkdirSync(path.join(requestDir, "epics"), { recursive: true })
    fs.renameSync(epicDir, target)
    fs.writeFileSync(
      path.join(requestDir, "brief.md"),
      briefMarkdown({
        slug,
        epicId,
        epicData,
        epicSections: sections(body),
        status,
        general,
      })
    )
    fs.mkdirSync(path.join(requestDir, "log"), { recursive: true })
    fs.writeFileSync(
      path.join(requestDir, "log", `${stamp}-migrated-from-${slugify(epicId)}.md`),
      migrationLogEntry({ epicId, at })
    )
  }

  let removedLegacyDir = false
  if (!dryRun) {
    try {
      if (fs.readdirSync(epicsDir).filter((n) => !n.startsWith(".")).length === 0) {
        fs.rmSync(epicsDir, { recursive: true, force: true })
        removedLegacyDir = true
      }
    } catch {
      // keep it
    }
  }

  return { requests: plan, stagedLeaves: stagedTotal, removedLegacyDir }
}
