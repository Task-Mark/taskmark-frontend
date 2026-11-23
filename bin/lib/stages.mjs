import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"

/**
 * Branch stages, computed from local git clones of the code repositories.
 *
 * A commit belongs to a task when the task id appears in its message, in the
 * message of the merge that brought it into a stage branch, or in the name of
 * the branch it came from. A commit's stage is the most advanced stage branch
 * that contains it (development < testing < production); commits only on
 * feature branches are in development. A task is as far along as its least
 * advanced commit, across every repository. Only production counts as shipped.
 *
 * Results are written into the board markdown: `stage` and `shipped_at` in task
 * frontmatter, missing rows in the `## Commits` table, and one log file per
 * merge, promotion or release under `requests/<slug>/log/`. Running it twice
 * changes nothing the second time.
 */

export const DEFAULT_STAGE_BRANCHES = {
  development: ["develop", "dev", "development"],
  testing: ["quality", "qa", "staging", "test"],
  production: ["main", "master", "production"],
}

const STAGE_ORDER = ["development", "testing", "production"]
const LOG_KIND = { development: "merge", testing: "promote", production: "release" }
const SEP = "\x1f"
const REC = "\x1e"
const ID_TOKEN = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/g

// ---------------------------------------------------------------- git helpers

function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  })
}

function refExists(repo, ref) {
  try {
    git(repo, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`])
    return true
  } catch {
    return false
  }
}

/** Prefer the remote branch (what the team shares), else the local one. */
export function resolveStageRef(repo, names, remote = "origin") {
  for (const name of names) {
    if (refExists(repo, `refs/remotes/${remote}/${name}`)) return `${remote}/${name}`
  }
  for (const name of names) {
    if (refExists(repo, `refs/heads/${name}`)) return name
  }
  return null
}

function providerOf(repo) {
  try {
    const url = git(repo, ["remote", "get-url", "origin"]).trim().toLowerCase()
    if (url.includes("github")) return "github"
    if (url.includes("bitbucket")) return "bitbucket"
    if (url.includes("gitlab")) return "gitlab"
  } catch {
    // no remote
  }
  return "git"
}

function readCommits(repo, revs) {
  const out = new Map()
  if (revs.length === 0) return out
  let raw = ""
  try {
    raw = git(repo, ["log", ...revs, `--format=%H${SEP}%an${SEP}%ae${SEP}%aI${SEP}%s${SEP}%b${REC}`])
  } catch {
    return out
  }
  for (const record of raw.split(REC)) {
    const [sha, author, email, date, subject, body] = record.replace(/^\s+/, "").split(SEP)
    if (!sha) continue
    out.set(sha, { sha, author, email, date, subject: subject ?? "", body: (body ?? "").trim() })
  }
  return out
}

function revList(repo, args) {
  try {
    return git(repo, ["rev-list", ...args]).split("\n").map((s) => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Walk the first-parent history of a stage branch. Each first-parent commit is
 * the moment some commits entered the branch (a merge brings many, a direct
 * commit brings itself).
 */
function stageEntries(repo, ref, since) {
  const entries = []
  const sinceArgs = since ? [`--since=${since}`] : []
  for (const fp of revList(repo, ["--first-parent", "--reverse", ...sinceArgs, ref])) {
    let meta
    try {
      meta = git(repo, ["show", "-s", `--format=%P${SEP}%cn${SEP}%ce${SEP}%cI${SEP}%s${SEP}%b`, fp])
    } catch {
      continue
    }
    const [parents, name, email, at, subject, body] = meta.split(SEP)
    const parentList = (parents ?? "").trim().split(/\s+/).filter(Boolean)
    const brought = parentList.length > 1 ? revList(repo, [`${parentList[0]}..${fp}`]) : [fp]
    entries.push({
      sha: fp,
      at: (at ?? "").trim(),
      person: { name: (name ?? "").trim(), email: (email ?? "").trim() },
      subject: (subject ?? "").trim(),
      body: (body ?? "").trim(),
      isMerge: parentList.length > 1,
      brought,
    })
  }
  return entries
}

/** Source branch named in a merge message (GitHub, Bitbucket, plain git). */
export function mergeSourceBranch(subject) {
  const patterns = [
    /^Merge pull request #\d+ from [^/\s]+\/(\S+)/,
    /^Merged in (\S+) \(pull request #\d+\)/,
    /^Merge branch '([^']+)'/,
    /^Merge remote-tracking branch '(?:[^/']+\/)?([^']+)'/,
  ]
  for (const re of patterns) {
    const m = re.exec(subject)
    if (m) return m[1]
  }
  return ""
}

function remoteBranches(repo) {
  try {
    return git(repo, ["for-each-ref", "--format=%(refname:short)", "refs/remotes", "refs/heads"])
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && !s.endsWith("/HEAD"))
  } catch {
    return []
  }
}

// -------------------------------------------------------------- board helpers

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/

function normalize(raw) {
  return raw.replace(/^(---\r?\n[\s\S]*?\S)---(\r?\n)/, "$1\n---$2")
}

function readFrontmatter(raw) {
  const match = FRONTMATTER_RE.exec(normalize(raw))
  if (!match) return {}
  try {
    return parseYaml(match[1]) ?? {}
  } catch {
    return {}
  }
}

/** Set top-level scalar frontmatter keys, keeping every other line as is. */
export function setFrontmatterFields(raw, fields) {
  const source = normalize(raw)
  const match = FRONTMATTER_RE.exec(source)
  if (!match) return raw
  const lines = match[1].split(/\r?\n/)
  for (const [key, value] of Object.entries(fields)) {
    const rendered = `${key}: ${value}`
    const idx = lines.findIndex((line) => new RegExp(`^${key}:`).test(line))
    if (idx >= 0) lines[idx] = rendered
    else lines.push(rendered)
  }
  return `---\n${lines.join("\n")}\n---${match[2]}` + source.slice(match[0].length)
}

function boardItemFiles(boardPath) {
  const roots = []
  if (fs.existsSync(path.join(boardPath, "epics"))) roots.push(path.join(boardPath, "epics"))
  try {
    for (const slug of fs.readdirSync(path.join(boardPath, "requests"))) {
      const dir = path.join(boardPath, "requests", slug, "epics")
      if (fs.existsSync(dir)) roots.push(dir)
    }
  } catch {
    // no requests
  }
  const files = []
  const walk = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(full)
    }
  }
  roots.forEach(walk)
  return files.sort()
}

function requestSlugOf(boardPath, filePath) {
  const parts = path.relative(boardPath, filePath).split(path.sep)
  return parts[0] === "requests" ? parts[1] ?? null : null
}

/** Board work items: leaves (task, bug) plus stories, so story ids match too. */
function readBoardItems(boardPath) {
  const items = []
  for (const filePath of boardItemFiles(boardPath)) {
    const raw = fs.readFileSync(filePath, "utf8")
    const fm = readFrontmatter(raw)
    const id = String(fm.id ?? "").trim()
    if (!id) continue
    const type = String(fm.type ?? "").toLowerCase()
    items.push({
      id,
      type,
      parent: String(fm.parent ?? "").trim(),
      filePath,
      raw,
      fm,
      requestSlug: requestSlugOf(boardPath, filePath),
    })
  }
  return items
}

function idsIn(text, known) {
  const found = new Set()
  for (const token of String(text).toUpperCase().match(ID_TOKEN) ?? []) {
    // `S-2-ENDPOINTS` (a branch name) should still find `S-2`: try prefixes.
    const parts = token.split("-")
    for (let n = parts.length; n >= 2; n -= 1) {
      const candidate = parts.slice(0, n).join("-")
      if (known.has(candidate)) {
        found.add(known.get(candidate))
        break
      }
    }
  }
  return found
}

function appendCommitRows(raw, rows) {
  if (rows.length === 0) return raw
  const header = "| SHA | Repo | Date (UTC) | Author | Message |\n|-----|------|------------|--------|---------|"
  const rendered = rows.map(
    (r) => `| ${r.sha} | ${r.repo} | ${r.date} | ${r.author} | ${r.message.replace(/\|/g, "/")} |`
  )
  const sectionRe = /(^## Commits[ \t]*\r?\n)([\s\S]*?)(?=^## |\s*$(?![\s\S]))/m
  const match = sectionRe.exec(raw)
  if (!match) {
    return `${raw.trimEnd()}\n\n## Commits\n\n${header}\n${rendered.join("\n")}\n`
  }
  const body = match[2]
  const hasTable = /^\|.*\|\s*$/m.test(body)
  const nextBody = hasTable
    ? `${body.trimEnd()}\n${rendered.join("\n")}\n\n`
    : `\n${header}\n${rendered.join("\n")}\n\n`
  return raw.slice(0, match.index) + match[1] + nextBody + raw.slice(match.index + match[0].length)
}

function existingShas(raw) {
  const shas = new Set()
  const match = /^## Commits[ \t]*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(raw)
  if (!match) return shas
  for (const line of match[1].split(/\r?\n/)) {
    const cell = /^\|\s*([0-9a-f]{7,40})\s*\|/i.exec(line.trim())
    if (cell) shas.add(cell[1].toLowerCase().slice(0, 7))
  }
  return shas
}

function utc(date) {
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? String(date) : d.toISOString().replace(/\.\d{3}Z$/, "Z")
}

// -------------------------------------------------------------- configuration

/** Repositories to read: board package.json `taskmark.repos`, else REPOS.md. */
export function resolveRepos(boardPath) {
  const repos = []
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(boardPath, "package.json"), "utf8"))
    const configured = pkg?.taskmark?.repos
    if (Array.isArray(configured)) {
      for (const entry of configured) {
        const rel = typeof entry === "string" ? entry : entry?.path
        if (rel) repos.push(path.resolve(boardPath, rel))
      }
      if (repos.length) return repos
    }
  } catch {
    // no package.json config
  }
  try {
    const md = fs.readFileSync(path.join(boardPath, "REPOS.md"), "utf8")
    for (const line of md.split(/\r?\n/)) {
      const cells = line.split("|").map((c) => c.trim())
      const candidate = cells.find((c) => c.startsWith("/") || c.startsWith("."))
      if (candidate) repos.push(path.resolve(boardPath, candidate))
    }
  } catch {
    // no REPOS.md
  }
  const board = path.resolve(boardPath)
  return [...new Set(repos)].filter((r) => r !== board && fs.existsSync(path.join(r, ".git")))
}

export function resolveStageBranches(boardPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(boardPath, "package.json"), "utf8"))
    const branches = pkg?.taskmark?.branches
    if (branches && typeof branches === "object") {
      const pick = (key) =>
        Array.isArray(branches[key]) ? branches[key] : branches[key] ? [branches[key]] : DEFAULT_STAGE_BRANCHES[key]
      return { development: pick("development"), testing: pick("testing"), production: pick("production") }
    }
  } catch {
    // defaults
  }
  return DEFAULT_STAGE_BRANCHES
}

// ---------------------------------------------------------------------- main

/**
 * @param {{ boardPath: string, repos?: string[], branches?: object, since?: string,
 *           fetch?: boolean, dryRun?: boolean }} options
 */
export function syncStages({
  boardPath,
  repos = resolveRepos(boardPath),
  branches = resolveStageBranches(boardPath),
  since = "365 days ago",
  fetch = false,
  dryRun = false,
}) {
  const items = readBoardItems(boardPath)
  const known = new Map()
  for (const item of items) known.set(item.id.toUpperCase(), item.id)
  const byId = new Map(items.map((item) => [item.id, item]))
  const childrenOf = new Map()
  for (const item of items) {
    if (!item.parent) continue
    if (!childrenOf.has(item.parent)) childrenOf.set(item.parent, [])
    childrenOf.get(item.parent).push(item.id)
  }
  const isLeaf = (item) => item.type === "task" || item.type === "bug"

  // task id → [{ repo, sha, stage, enteredAt (production) }]
  const commitsByTask = new Map()
  const logEntries = []
  const reposRead = []

  for (const repo of repos) {
    if (fetch) {
      try {
        git(repo, ["fetch", "--quiet", "--prune", "origin"])
      } catch {
        // offline: use what is there
      }
    }
    const repoName = path.basename(repo)
    const provider = providerOf(repo)
    const refs = {}
    for (const stage of STAGE_ORDER) refs[stage] = resolveStageRef(repo, branches[stage] ?? [])
    reposRead.push({ repo: repoName, provider, refs })

    // Which stage branch holds each commit, and when it entered production.
    const inStage = { development: new Set(), testing: new Set(), production: new Set() }
    const enteredProduction = new Map()
    const mergeIds = new Map()
    const sinceArgs = since ? [`--since=${since}`] : []
    for (const stage of STAGE_ORDER) {
      const ref = refs[stage]
      if (!ref) continue
      for (const sha of revList(repo, [...sinceArgs, ref])) inStage[stage].add(sha)
      for (const entry of stageEntries(repo, ref, since)) {
        const sourceBranch = entry.isMerge ? mergeSourceBranch(entry.subject) : ""
        const ids = idsIn(`${entry.subject}\n${entry.body}\n${sourceBranch}`, known)
        for (const sha of entry.brought) {
          if (!mergeIds.has(sha)) mergeIds.set(sha, new Set())
          for (const id of ids) mergeIds.get(sha).add(id)
          if (stage === "production" && !enteredProduction.has(sha)) enteredProduction.set(sha, entry.at)
        }
        logEntries.push({ stage, repo: repoName, provider, ref, sourceBranch, entry, mergeIds: ids })
      }
    }

    // Commits on feature branches named after a task count as development.
    const branchIds = new Map()
    const stageRefs = STAGE_ORDER.map((s) => refs[s]).filter(Boolean)
    for (const branch of remoteBranches(repo)) {
      if (stageRefs.includes(branch)) continue
      const ids = idsIn(branch.replace(/^origin\//, ""), known)
      if (ids.size === 0) continue
      // Only what the branch has that no stage branch has yet.
      const exclusive = [...sinceArgs, branch, ...stageRefs.map((r) => `^${r}`)]
      for (const sha of revList(repo, exclusive)) {
        if (!branchIds.has(sha)) branchIds.set(sha, new Set())
        for (const id of ids) branchIds.get(sha).add(id)
      }
    }

    const commits = readCommits(repo, [...sinceArgs, "--branches", "--remotes"])
    for (const commit of commits.values()) {
      const ids = new Set([
        ...idsIn(`${commit.subject}\n${commit.body}`, known),
        ...(mergeIds.get(commit.sha) ?? []),
        ...(branchIds.get(commit.sha) ?? []),
      ])
      if (ids.size === 0) continue
      const stage = inStage.production.has(commit.sha)
        ? "production"
        : inStage.testing.has(commit.sha)
          ? "testing"
          : "development"
      for (const id of ids) {
        // A story id stands for every leaf under it.
        const item = byId.get(id)
        const targets = item && !isLeaf(item) ? childrenOf.get(id) ?? [] : [id]
        for (const target of targets) {
          if (!commitsByTask.has(target)) commitsByTask.set(target, [])
          commitsByTask.get(target).push({
            repo: repoName,
            sha: commit.sha,
            stage,
            enteredAt: enteredProduction.get(commit.sha) ?? "",
            date: commit.date,
            author: commit.author,
            subject: commit.subject,
          })
        }
      }
    }
  }

  // ------------------------------------------------------------- task updates
  const changes = []
  for (const [id, commits] of commitsByTask) {
    const item = byId.get(id)
    if (!item || !isLeaf(item)) continue
    const rank = Math.min(...commits.map((c) => STAGE_ORDER.indexOf(c.stage)))
    const stage = STAGE_ORDER[rank]
    const fields = {}
    if (String(item.fm.stage ?? "") !== stage) fields.stage = stage
    if (stage === "production") {
      const shippedAt = commits.map((c) => c.enteredAt).filter(Boolean).sort().at(-1)
      if (shippedAt && utc(shippedAt) !== String(item.fm.shipped_at ?? "")) fields.shipped_at = utc(shippedAt)
    }
    const have = existingShas(item.raw)
    const seen = new Set()
    const rows = commits
      .filter((c) => {
        const short = c.sha.slice(0, 7)
        if (have.has(short) || seen.has(short)) return false
        seen.add(short)
        return true
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((c) => ({ sha: c.sha.slice(0, 7), repo: c.repo, date: utc(c.date), author: c.author, message: c.subject }))
    if (Object.keys(fields).length === 0 && rows.length === 0) continue
    let next = item.raw
    if (Object.keys(fields).length) next = setFrontmatterFields(next, fields)
    next = appendCommitRows(next, rows)
    changes.push({ id, filePath: item.filePath, stage, fields, newCommits: rows.length })
    if (!dryRun) fs.writeFileSync(item.filePath, next)
  }

  // --------------------------------------------------------------- log files
  const written = []
  for (const log of logEntries) {
    const targets = new Set()
    for (const id of log.mergeIds) {
      const item = byId.get(id)
      for (const target of item && !isLeaf(item) ? childrenOf.get(id) ?? [] : [id]) targets.add(target)
    }
    for (const sha of log.entry.brought) {
      for (const [id, commits] of commitsByTask) {
        if (commits.some((c) => c.sha === sha && c.repo === log.repo)) targets.add(id)
      }
    }
    const bySlug = new Map()
    for (const id of targets) {
      const slug = byId.get(id)?.requestSlug
      if (!slug) continue
      if (!bySlug.has(slug)) bySlug.set(slug, new Set())
      bySlug.get(slug).add(id)
    }
    for (const [slug, ids] of bySlug) {
      const at = utc(log.entry.at)
      const stamp = at.slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1-$2")
      const kind = log.entry.isMerge || log.stage !== "development" ? LOG_KIND[log.stage] : "push"
      const name = `${stamp}-${kind}-${log.repo}-${log.entry.sha.slice(0, 7)}.md`
      const file = path.join(boardPath, "requests", slug, "log", name)
      if (fs.existsSync(file)) continue
      const frontmatter = {
        kind,
        at,
        title: log.entry.subject,
        person: log.entry.person,
        repo: log.repo,
        provider: log.provider,
        from: log.sourceBranch || null,
        to: log.ref.replace(/^origin\//, ""),
        shas: log.entry.brought.map((s) => s.slice(0, 7)),
        targets: [...ids].sort(),
      }
      const body = `${log.entry.brought.length} commit${log.entry.brought.length === 1 ? "" : "s"} reached ${frontmatter.to}.`
      written.push(path.relative(boardPath, file))
      if (!dryRun) {
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, `---\n${stringifyYaml(frontmatter, { aliasDuplicateObjects: false }).trimEnd()}\n---\n${body}\n`)
      }
    }
  }

  const stageCounts = { development: 0, testing: 0, production: 0 }
  for (const change of changes) stageCounts[change.stage] += 1
  return { repos: reposRead, changes, logFiles: written, stageCounts }
}
