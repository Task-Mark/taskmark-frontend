/**
 * Regroup requests: after a migration every legacy epic is its own request.
 * The project's AI proposes merging the requests that belong together, a
 * person accepts them, and the CLI moves the folders locally.
 *
 *   POST /v1/board-sync/requests/regroup  { requests: [...] }
 *     → { proposals: [{ id, into: { slug, title } | { newTitle, newSlug }, merge: [slug...], reason, confidence }],
 *         model: { provider, model } }
 *
 * `merge` lists every request of the group (the existing target first).
 *
 * Applying one proposal, for each request merged into the target:
 * - `epics/*` folders and `log/*` files move into the target's `epics/` and `log/`,
 *   any other file or folder moves to the target folder under the same name;
 * - its id and aliases are added to the target brief's `aliases` (old links
 *   keep resolving), its `source_meetings` and `links` are added too;
 * - its goal and "Done when" items are listed in a `## Merged requests`
 *   section at the end of the target brief (the target's own text is kept);
 * - its whole brief is kept as a log entry of the target
 *   (`log/<date>-merged-<slug>.md`), then its folder is removed.
 * A new request gets a brief in the same style as the migration.
 * Every move is planned first; nothing is written when any destination exists.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { parseDocument, stringify as stringifyYaml } from "yaml"

import { gitTopLevel } from "./init-detect.mjs"
import { readFrontmatter, section, sections, slugify } from "./migrate-board.mjs"
import { api } from "./sync-board.mjs"

export const REGROUP_PATH = "/board-sync/requests/regroup"
/** The API refuses more requests in one call. */
export const MAX_REGROUP_REQUESTS = 200
/** `--yes` accepts proposals at least this confident. */
export const AUTO_ACCEPT_CONFIDENCE = 0.8
/** `init` offers regrouping after a migration, or on boards with more requests than this. */
export const REGROUP_SUGGEST_ABOVE = 8
export const MERGED_SECTION = "Merged requests"
export const COMMIT_MESSAGE = "Regroup requests"

const TEXT_LIMIT = 600
const TITLE_LIMIT = 300
const IGNORED = new Set([".DS_Store"])
const isIgnored = (name) => IGNORED.has(name) || name.startsWith("._")

function asList(value) {
  if (Array.isArray(value)) return value.filter((v) => v != null && v !== "")
  return value == null || value === "" ? [] : [value]
}

function clip(text, limit) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim()
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function isPlaceholder(text) {
  return /^_.*_$/.test(String(text).trim())
}

/** `- item` and `- [ ] item` lines as plain text. */
export function listItems(markdown) {
  const out = []
  for (const line of String(markdown ?? "").split(/\r?\n/)) {
    const m = /^\s*[-*]\s+(?:\[[ xX]\]\s+)?(.*\S)\s*$/.exec(line)
    if (m) out.push(m[1].trim())
  }
  return out
}

// ------------------------------------------------------------- read board

function readEpics(requestDir) {
  const epicsDir = path.join(requestDir, "epics")
  let names = []
  try {
    names = fs.readdirSync(epicsDir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith("."))
  } catch {
    return []
  }
  return names
    .map((e) => {
      let data = {}
      try {
        data = readFrontmatter(fs.readFileSync(path.join(epicsDir, e.name, "epic.md"), "utf8")).data
      } catch {
        // an epic folder without epic.md still moves
      }
      return { id: String(data.id ?? e.name), title: String(data.title ?? e.name), dir: e.name }
    })
    .sort((a, b) => a.dir.localeCompare(b.dir))
}

/**
 * The requests of a board (`requests/<slug>/brief.md`), read with the same
 * frontmatter and section rules as the migration.
 */
export function readBoardRequests(boardPath) {
  const requestsDir = path.join(boardPath, "requests")
  let slugs = []
  try {
    slugs = fs
      .readdirSync(requestsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
  const out = []
  for (const slug of slugs) {
    const dir = path.join(requestsDir, slug)
    const briefPath = path.join(dir, "brief.md")
    if (!fs.existsSync(briefPath)) continue
    const raw = fs.readFileSync(briefPath, "utf8")
    const { data, body } = readFrontmatter(raw)
    const map = sections(body)
    out.push({
      id: String(data.id ?? "").trim() || `R-${slug}`,
      slug,
      title: String(data.title ?? "").trim() || slug,
      status: String(data.status ?? "").trim().toLowerCase(),
      goal: section(map, "Goal", "Objective"),
      why: section(map, "Why", "Context", "Background"),
      doneWhen: listItems(section(map, "Done when", "Success metrics", "Acceptance criteria")).filter((t) => !isPlaceholder(t)),
      aliases: asList(data.aliases).map(String),
      data,
      body,
      raw,
      dir,
      briefPath,
      epics: readEpics(dir),
    })
  }
  return out
}

/** The body the API takes: capped, trimmed, only the fields it knows. */
export function toApiRequests(requests) {
  return requests.slice(0, MAX_REGROUP_REQUESTS).map((r) => ({
    id: clip(r.id, 200),
    slug: r.slug,
    title: clip(r.title, TITLE_LIMIT),
    status: clip(r.status, 40),
    goal: isPlaceholder(r.goal) ? "" : clip(r.goal, TEXT_LIMIT),
    why: isPlaceholder(r.why) ? "" : clip(r.why, TEXT_LIMIT),
    epics: r.epics.slice(0, 100).map((e) => ({ id: clip(e.id, 200), title: clip(e.title, TITLE_LIMIT) })),
    aliases: r.aliases.slice(0, 100).map((a) => clip(a, 200)),
  }))
}

// -------------------------------------------------------------------- API

function messageOf(res) {
  const m = res.data?.message
  return Array.isArray(m) ? m.join("; ") : typeof m === "string" ? m : ""
}

export async function requestProposals({ baseUrl, token, requests, fetchImpl = fetch }) {
  const res = await api(baseUrl, token, "POST", REGROUP_PATH, { requests: toApiRequests(requests) }, fetchImpl)
  if (!res.ok) {
    const message = messageOf(res)
    if (res.status === 401) throw new Error("The project secret was rejected. Run npx taskmark init again.")
    if (res.status === 429) throw new Error("Too many regroup requests. Wait a minute and try again.")
    throw new Error(message || `Asking for regroup proposals failed (${res.status}).`)
  }
  return normalizeProposals(res.data, requests)
}

/** Keeps the proposals that still match the local board. */
export function normalizeProposals(data, requests) {
  const known = new Set(requests.map((r) => r.slug))
  const used = new Set()
  const proposals = []
  for (const p of Array.isArray(data?.proposals) ? data.proposals : []) {
    const merge = Array.isArray(p?.merge) ? p.merge.map(String) : []
    if (merge.length < 2 || merge.some((s) => !known.has(s) || used.has(s)) || new Set(merge).size !== merge.length) continue
    const into = p.into ?? {}
    let target
    if (typeof into.slug === "string" && merge.includes(into.slug)) {
      target = { slug: into.slug, title: String(into.title ?? into.slug) }
    } else if (typeof into.newSlug === "string" && into.newSlug && typeof into.newTitle === "string" && into.newTitle.trim()) {
      target = { newSlug: slugify(into.newSlug), newTitle: into.newTitle.trim() }
    } else continue
    merge.forEach((s) => used.add(s))
    proposals.push({
      id: String(p.id ?? `p${proposals.length + 1}`),
      into: target,
      merge,
      reason: String(p.reason ?? ""),
      confidence: typeof p.confidence === "number" ? p.confidence : 0,
    })
  }
  return { proposals, model: data?.model ?? null }
}

// -------------------------------------------------------------- proposals

/** The requests a proposal folds into its target (the target itself excluded). */
export function mergedSlugs(proposal) {
  return "slug" in proposal.into ? proposal.merge.filter((s) => s !== proposal.into.slug) : proposal.merge
}

/** "Merge into Checkout: Checkout v2, Payments (90%) Same goal." */
export function proposalLabel(proposal, requests) {
  const bySlug = new Map(requests.map((r) => [r.slug, r]))
  const target = "slug" in proposal.into ? proposal.into.title : `new request "${proposal.into.newTitle}"`
  const names = mergedSlugs(proposal).map((s) => bySlug.get(s)?.title ?? s)
  const confidence = ` (${Math.round(proposal.confidence * 100)}%)`
  return `Merge into ${target}: ${names.join(", ")}${confidence}${proposal.reason ? ` ${proposal.reason}` : ""}`
}

/**
 * Which proposals to apply: with `yes`, the ones at or above 0.8; otherwise
 * the person accepts all, chooses, or skips.
 */
export async function chooseProposals({ ui, proposals, requests, yes = false }) {
  if (!proposals.length) return []
  if (yes) return proposals.filter((p) => p.confidence >= AUTO_ACCEPT_CONFIDENCE)
  const choice = await ui.select({
    message: "Merge these requests?",
    options: [
      { value: "all", label: "Accept all" },
      { value: "pick", label: "Choose one by one" },
      { value: "skip", label: "Skip", hint: "nothing changes" },
    ],
    initialValue: "skip",
  })
  if (choice === "all") return proposals
  if (choice !== "pick") return []
  const ids = await ui.multiselect({
    message: "Accept which ones?",
    options: proposals.map((p) => ({ value: p.id, label: proposalLabel(p, requests) })),
    required: false,
    initialValues: [],
  })
  return proposals.filter((p) => ids.includes(p.id))
}

// ------------------------------------------------------------------- plan

function combinedStatus(statuses) {
  const s = statuses.map((x) => String(x || "").toLowerCase())
  if (s.length && s.every((x) => x === "shipped")) return "shipped"
  if (s.includes("building") || s.includes("shipped")) return "building"
  if (s.includes("ready") || s.includes("backlog")) return "ready"
  return "proposed"
}

function uniq(list, key = (x) => x) {
  const seen = new Set()
  return list.filter((x) => {
    const k = key(x)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function linkKey(link) {
  if (link && typeof link === "object") return `${link.request ?? link.id ?? ""}|${link.relation ?? ""}`
  return `${link}|`
}

function linkTarget(link) {
  return link && typeof link === "object" ? String(link.request ?? link.id ?? "") : String(link)
}

/** The bullets for one merged request in the `## Merged requests` section. */
export function mergedEntry(request) {
  const goal = isPlaceholder(request.goal) ? "" : clip(request.goal, 240)
  const lines = [`- ${request.id}, ${request.title}${goal ? `: ${goal}` : ""}`]
  for (const item of request.doneWhen.slice(0, 8)) lines.push(`  - ${clip(item, 200)}`)
  return lines.join("\n")
}

/** Appends entries to the `## Merged requests` section, creating it at the end. */
export function appendMergedSection(text, entries) {
  if (!entries.length) return text
  const lines = text.replace(/\s+$/, "").split(/\r?\n/)
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${MERGED_SECTION}\\s*$`, "i").test(l))
  if (start < 0) return `${lines.join("\n")}\n\n## ${MERGED_SECTION}\n\n${entries.join("\n")}\n`
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) {
      end = i
      break
    }
  }
  const current = lines.slice(start + 1, end)
  while (current.length && current[current.length - 1].trim() === "") current.pop()
  const body = current.length ? [...current, ...entries] : ["", ...entries]
  const rest = lines.slice(end)
  return `${[...lines.slice(0, start + 1), ...body, ...(rest.length ? ["", ...rest] : [])].join("\n")}\n`
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/

/** Sets frontmatter fields, keeping the rest of the brief (and its comments) as is. */
export function setFrontmatterFields(raw, fields) {
  const match = FM_RE.exec(raw)
  if (!match) {
    return `---\n${stringifyYaml(fields).trimEnd()}\n---\n${raw}`
  }
  const doc = parseDocument(match[1])
  for (const [key, value] of Object.entries(fields)) doc.set(key, value)
  return `---\n${String(doc).trimEnd()}\n---${match[2] || "\n"}${raw.slice(match[0].length)}`
}

function mergedLogEntry({ request, at }) {
  const frontmatter = {
    kind: "note",
    at,
    title: `Merged request ${request.id}: ${request.title}`,
    targets: [request.id],
  }
  return `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\nThe request ${request.id} (${request.title}) was merged into this request. Its epics and log moved here. Its brief, as it was:\n\n${request.body.trim()}\n`
}

function newBriefMarkdown({ slug, title, members, aliases, sourceMeetings, links, entries }) {
  const people = (key) => uniq(members.flatMap((m) => asList(m.data[key])), (p) => JSON.stringify(p))
  const created = members.map((m) => m.data.created).filter(Boolean).map(String).sort()[0] ?? null
  const frontmatter = {
    id: `R-${slug}`,
    type: "request",
    title,
    status: combinedStatus(members.map((m) => m.status)),
    requested_by: people("requested_by"),
    owner: people("owner").slice(0, 1),
    created,
    updated: null,
    forecast: null,
    tags: uniq(members.flatMap((m) => asList(m.data.tags).map(String))),
    aliases,
    source_meetings: sourceMeetings,
    links,
  }
  const parts = [
    `---\n${stringifyYaml(frontmatter, { aliasDuplicateObjects: false }).trimEnd()}\n---`,
    `# ${title}`,
    `## Goal\n\n_To be written._`,
    `## Done when\n\n_To be written._`,
    `## Out of scope\n\n_Nothing yet._`,
    `## Open questions\n\n_None yet._`,
    `## ${MERGED_SECTION}\n\n${entries.join("\n")}`,
  ]
  return parts.join("\n\n") + "\n"
}

function listDir(dir) {
  try {
    return fs.readdirSync(dir).sort()
  } catch {
    return []
  }
}

/**
 * Plans every accepted proposal: the moves, the briefs and log entries to
 * write, the folders to remove. `errors` is not empty when anything would
 * overwrite a file or the proposals no longer match the board; then nothing
 * may be applied.
 */
export function planRegroup({ boardPath, requests, proposals, now = new Date() }) {
  const bySlug = new Map(requests.map((r) => [r.slug, r]))
  const at = now.toISOString().replace(/\.\d{3}Z$/, "Z")
  const stamp = at.slice(0, 10)
  const errors = []
  const steps = []
  const claimed = new Set()
  const destinations = new Set()
  const rel = (p) => path.relative(boardPath, p).split(path.sep).join("/")
  const claim = (dest) => {
    if (fs.existsSync(dest) || destinations.has(dest)) errors.push(`${rel(dest)} already exists`)
    destinations.add(dest)
  }

  for (const proposal of proposals) {
    const missing = proposal.merge.filter((s) => !bySlug.has(s))
    if (missing.length) {
      errors.push(`Unknown request(s) in "${proposalLabel(proposal, requests)}": ${missing.join(", ")}`)
      continue
    }
    const twice = proposal.merge.filter((s) => claimed.has(s))
    if (twice.length) {
      errors.push(`${twice.join(", ")} is in more than one proposal`)
      continue
    }
    proposal.merge.forEach((s) => claimed.add(s))

    const existing = "slug" in proposal.into ? bySlug.get(proposal.into.slug) : null
    const targetSlug = existing ? existing.slug : proposal.into.newSlug
    const targetDir = path.join(boardPath, "requests", targetSlug)
    const step = {
      proposal,
      target: { slug: targetSlug, title: existing ? existing.title : proposal.into.newTitle, dir: targetDir, create: !existing },
      moves: [],
      writes: [],
      removes: [],
      aliases: [],
    }
    if (!existing) claim(targetDir)

    const members = proposal.merge.map((s) => bySlug.get(s))
    const folded = existing ? members.filter((m) => m.slug !== existing.slug) : members
    for (const member of folded) {
      for (const name of listDir(member.dir)) {
        if (name === "brief.md" || isIgnored(name)) continue
        const from = path.join(member.dir, name)
        if ((name === "epics" || name === "log") && fs.statSync(from).isDirectory()) {
          for (const child of listDir(from)) {
            if (isIgnored(child)) continue
            const to = path.join(targetDir, name, child)
            claim(to)
            step.moves.push({ from: path.join(from, child), to })
          }
        } else {
          const to = path.join(targetDir, name)
          claim(to)
          step.moves.push({ from, to })
        }
      }
      const logPath = path.join(targetDir, "log", `${stamp}-merged-${member.slug}.md`)
      claim(logPath)
      step.writes.push({ path: logPath, content: mergedLogEntry({ request: member, at }) })
      step.removes.push(member.dir)
    }

    const groupIds = new Set(members.flatMap((m) => [m.id, ...m.aliases]))
    const targetId = existing ? existing.id : `R-${targetSlug}`
    const aliases = uniq([
      ...(existing ? existing.aliases : []),
      ...folded.flatMap((m) => [m.id, ...m.aliases]),
    ]).filter((a) => a && a !== targetId)
    step.aliases = aliases
    const sourceMeetings = uniq(members.flatMap((m) => asList(m.data.source_meetings).map(String)))
    const links = uniq(
      members.flatMap((m) => asList(m.data.links)),
      linkKey,
    ).filter((l) => !groupIds.has(linkTarget(l)) && linkTarget(l) !== targetId)
    const entries = folded.map(mergedEntry)
    const briefPath = path.join(targetDir, "brief.md")
    if (existing) {
      const fields = { aliases }
      if (sourceMeetings.length || "source_meetings" in existing.data) fields.source_meetings = sourceMeetings
      if (links.length || "links" in existing.data) fields.links = links
      let content = setFrontmatterFields(existing.raw, fields)
      content = appendMergedSection(content, entries)
      step.writes.push({ path: briefPath, content, replaces: true })
    } else {
      claim(briefPath)
      step.writes.push({
        path: briefPath,
        content: newBriefMarkdown({ slug: targetSlug, title: proposal.into.newTitle, members, aliases, sourceMeetings, links, entries }),
      })
    }
    steps.push(step)
  }
  return { steps, errors }
}

/** The plan as lines, for the terminal and dry runs. */
export function renderPlan(plan, boardPath) {
  const rel = (p) => path.relative(boardPath, p).split(path.sep).join("/")
  const lines = []
  for (const step of plan.steps) {
    lines.push(`${step.target.create ? "Create" : "Into"} requests/${step.target.slug}/ (${step.target.title})`)
    for (const move of step.moves) lines.push(`  move   ${rel(move.from)}  to  ${rel(move.to)}`)
    for (const write of step.writes) lines.push(`  ${write.replaces ? "update" : "write "} ${rel(write.path)}`)
    for (const dir of step.removes) lines.push(`  remove ${rel(dir)}/`)
    if (step.aliases.length) lines.push(`  aliases: ${step.aliases.join(", ")}`)
  }
  return lines
}

/** Applies a plan with no errors, then checks every file landed. */
export function applyRegroup(plan) {
  if (plan.errors.length) throw new Error(`Nothing was changed:\n${plan.errors.join("\n")}`)
  for (const step of plan.steps) {
    fs.mkdirSync(step.target.dir, { recursive: true })
    for (const move of step.moves) {
      if (fs.existsSync(move.to)) throw new Error(`Stopped: ${move.to} appeared while regrouping.`)
      fs.mkdirSync(path.dirname(move.to), { recursive: true })
      fs.renameSync(move.from, move.to)
    }
    for (const write of step.writes) {
      if (!write.replaces && fs.existsSync(write.path)) throw new Error(`Stopped: ${write.path} appeared while regrouping.`)
      fs.mkdirSync(path.dirname(write.path), { recursive: true })
      fs.writeFileSync(write.path, write.content)
    }
    for (const dir of step.removes) {
      const left = listDir(dir).filter((n) => n !== "brief.md" && !isIgnored(n))
      const leftInside = ["epics", "log"].flatMap((d) => listDir(path.join(dir, d)).filter((n) => !isIgnored(n)))
      if (left.some((n) => n !== "epics" && n !== "log") || leftInside.length) {
        throw new Error(`Stopped: ${dir} still has files, so it was kept.`)
      }
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
  const problems = verifyRegroup(plan)
  if (problems.length) throw new Error(`The regroup did not land as planned:\n${problems.join("\n")}`)
  return plan
}

export function verifyRegroup(plan) {
  const problems = []
  for (const step of plan.steps) {
    for (const move of step.moves) {
      if (!fs.existsSync(move.to)) problems.push(`missing ${move.to}`)
      if (fs.existsSync(move.from)) problems.push(`still there: ${move.from}`)
    }
    for (const write of step.writes) {
      if (!fs.existsSync(write.path)) problems.push(`missing ${write.path}`)
    }
    for (const dir of step.removes) if (fs.existsSync(dir)) problems.push(`still there: ${dir}`)
    const brief = path.join(step.target.dir, "brief.md")
    if (fs.existsSync(brief)) {
      const aliases = asList(readFrontmatter(fs.readFileSync(brief, "utf8")).data.aliases).map(String)
      const lost = step.aliases.filter((a) => !aliases.includes(a))
      if (lost.length) problems.push(`${brief} lacks the aliases ${lost.join(", ")}`)
    }
  }
  return problems
}

// ------------------------------------------------------------------ commit

function git(dir, args) {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
}

/** The board's git repository top, or null when the board is not in git. */
export function boardRepoTop(boardPath) {
  return gitTopLevel(boardPath)
}

/** Commits only the regrouped request folders. Null when there was nothing to commit. */
export function commitRegroup(boardPath, plan, message = COMMIT_MESSAGE) {
  const top = gitTopLevel(boardPath)
  if (!top) return null
  const real = fs.realpathSync(boardPath)
  const dirs = uniq(plan.steps.flatMap((s) => [s.target.dir, ...s.removes]))
  const paths = dirs
    .map((d) => path.relative(top, path.join(real, path.relative(boardPath, d))) || ".")
    .filter((p) => fs.existsSync(path.join(top, p)) || git(top, ["ls-files", "--", p]))
  if (!paths.length) return null
  git(top, ["add", "-A", "--", ...paths])
  const staged = git(top, ["diff", "--cached", "--name-only", "--", ...paths])
  if (!staged) return null
  git(top, ["commit", "-q", "-m", message, "--", ...paths])
  return git(top, ["rev-parse", "--short", "HEAD"])
}

// -------------------------------------------------------------------- flow

/**
 * The whole flow: read, ask the AI, review, plan, apply, commit.
 * @param {{ ui: any, boardPath: string, baseUrl: string, token: string, dryRun?: boolean, yes?: boolean,
 *           fetchImpl?: typeof fetch, now?: Date, commit?: boolean }} options
 */
export async function runRegroup({ ui, boardPath, baseUrl, token, dryRun = false, yes = false, fetchImpl = fetch, now = new Date(), commit = true }) {
  const requests = readBoardRequests(boardPath)
  const result = { proposals: 0, accepted: 0, merged: 0, commit: null, dryRun }
  if (requests.length < 2) {
    ui.log.info("Fewer than 2 requests on the board, nothing to regroup.")
    return result
  }
  if (requests.length > MAX_REGROUP_REQUESTS) {
    ui.log.warn(`The board has ${requests.length} requests; only the first ${MAX_REGROUP_REQUESTS} are sent.`)
  }
  const spin = ui.spinner()
  spin.start(`Asking the project's AI which of the ${requests.length} requests belong together`)
  let answer
  try {
    answer = await requestProposals({ baseUrl, token, requests, fetchImpl })
  } catch (err) {
    spin.error("No regroup proposals")
    throw err
  }
  const { proposals } = answer
  result.proposals = proposals.length
  spin.stop(proposals.length ? `${proposals.length} proposal(s)` : "No requests to merge")
  if (!proposals.length) return result

  ui.note(proposals.map((p) => `- ${proposalLabel(p, requests)}`).join("\n"), `Regroup proposals (${proposals.length})`)
  const chosen = await chooseProposals({ ui, proposals, requests, yes })
  result.accepted = chosen.length
  if (!chosen.length) {
    ui.log.info("No proposal accepted, the board is unchanged.")
    return result
  }

  const plan = planRegroup({ boardPath, requests, proposals: chosen, now })
  if (plan.errors.length) {
    throw new Error(`Cannot regroup without overwriting files, nothing was changed:\n${plan.errors.join("\n")}`)
  }
  ui.note(renderPlan(plan, boardPath).join("\n"), dryRun ? "Dry run, nothing written" : "Regroup plan")
  if (dryRun) return result

  applyRegroup(plan)
  result.merged = plan.steps.reduce((n, s) => n + s.removes.length, 0)
  ui.log.success(`Merged ${result.merged} request(s) into ${plan.steps.length}.`)

  if (commit && boardRepoTop(boardPath)) {
    const ok = await ui.confirm({ message: `Commit it in the board repository ("${COMMIT_MESSAGE}")?`, initialValue: true })
    if (ok) {
      try {
        result.commit = commitRegroup(boardPath, plan)
        if (result.commit) ui.log.success(`Committed ${result.commit}`)
      } catch {
        ui.log.warn("Regrouped, but the commit failed. Commit the board yourself.")
      }
    }
  }
  return result
}

/** Whether `init` should offer regrouping. */
export function shouldOfferRegroup({ justMigrated, requestCount, aiConfigured }) {
  return Boolean(aiConfigured) && requestCount >= 2 && (Boolean(justMigrated) || requestCount > REGROUP_SUGGEST_ABOVE)
}
