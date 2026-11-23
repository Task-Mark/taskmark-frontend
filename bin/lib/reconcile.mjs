/**
 * Initial reconciliation through the Taskmark Cloud backfill: the App reads the
 * recent commits of every stage branch, says where each task is (development,
 * quality, shipped) and proposes closes and new tasks for a person to review.
 *
 *   POST /v1/board-sync/integration/backfill             { commits?, branches? } → { runId, jobs }
 *   GET  /v1/board-sync/integration/backfill/:runId      → { status, total, done, failed, results }
 *   POST /v1/board-sync/integration/backfill/:runId/apply { accept, leaveForLater? }
 *
 * The response parsing is tolerant on purpose: field names may still move.
 */
import { api } from "./sync-board.mjs"

export const DEFAULT_BACKFILL_COMMITS = 30

const BASE = "/board-sync/integration/backfill"

export const STAGE_BLOCKS = [
  { stage: "development", title: "In development" },
  { stage: "testing", title: "In quality" },
  { stage: "production", title: "Shipped" },
]

const STAGE_ALIASES = {
  development: ["development", "develop", "dev", "in_development", "in-development"],
  testing: ["testing", "test", "quality", "qa", "staging", "in_quality", "in-quality"],
  production: ["production", "prod", "shipped", "released", "release", "main", "master"],
}

export function normalizeStage(value) {
  const v = String(value ?? "").trim().toLowerCase()
  for (const [stage, aliases] of Object.entries(STAGE_ALIASES)) {
    if (aliases.includes(v)) return stage
  }
  return null
}

function str(value) {
  return value === undefined || value === null ? "" : String(value)
}

function branchLabel(branch) {
  if (typeof branch === "string") return branch
  if (!branch || typeof branch !== "object") return ""
  const name = str(branch.branch ?? branch.name ?? branch.ref)
  const repo = str(branch.repo ?? branch.repository)
  return repo && name ? `${repo}@${name}` : name || repo
}

function asList(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) =>
      item && typeof item === "object" ? { id: key, ...item } : { id: key, stage: item },
    )
  }
  return []
}

function normalizeTask(entry) {
  const task = entry.task && typeof entry.task === "object" ? entry.task : {}
  const branches = entry.branches ?? entry.foundOn ?? entry.found_on ?? entry.refs ?? []
  return {
    id: str(entry.taskId ?? entry.id ?? task.id),
    title: str(entry.title ?? entry.taskTitle ?? task.title),
    stage: normalizeStage(entry.stage ?? entry.status ?? task.stage),
    branches: [...new Set(asList(branches).map(branchLabel).filter(Boolean))],
  }
}

function proposalKind(p, fallback) {
  const raw = str(p.kind ?? p.type ?? p.action ?? fallback).toLowerCase()
  if (raw.includes("close") || raw.includes("done")) return "close"
  if (raw.includes("new") || raw.includes("create")) return "new"
  return fallback ?? (raw || "other")
}

function normalizeProposal(p, fallbackKind) {
  const kind = proposalKind(p, fallbackKind)
  const taskId = str(p.taskId ?? p.task?.id ?? (kind === "close" ? p.itemId : ""))
  const title = str(p.title ?? p.taskTitle ?? p.task?.title ?? p.summary)
  const confidence = p.confidence ?? p.score ?? null
  return {
    id: str(p.id ?? p.proposalId ?? p._id ?? (taskId ? `${kind}:${taskId}` : `${kind}:${title}`)),
    kind,
    taskId,
    title,
    confidence: typeof confidence === "number" ? confidence : confidence ? Number(confidence) : null,
    reason: str(p.reason ?? p.why ?? p.explanation),
  }
}

/** Flattens whatever the run returns into tasks and proposals. */
export function normalizeBackfill(data) {
  const d = data && typeof data === "object" ? data : {}
  const results = d.results ?? {}
  let entries = []
  if (Array.isArray(results)) entries = results
  else if (Array.isArray(results.tasks)) entries = results.tasks
  else if (results && typeof results === "object" && !results.proposals) entries = asList(results)
  // A job-shaped result carries its own tasks / proposals.
  const tasks = []
  const proposals = []
  const takeProposals = (source) => {
    if (!source) return
    if (Array.isArray(source)) {
      for (const p of source) proposals.push(normalizeProposal(p))
      return
    }
    for (const p of asList(source.close ?? source.closes ?? [])) proposals.push(normalizeProposal(p, "close"))
    for (const p of asList(source.newTasks ?? source.new ?? source.create ?? [])) {
      proposals.push(normalizeProposal(p, "new"))
    }
  }
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue
    if (Array.isArray(entry.tasks)) {
      for (const t of entry.tasks) tasks.push(normalizeTask(t))
      takeProposals(entry.proposals)
      continue
    }
    tasks.push(normalizeTask(entry))
    if (entry.proposal) takeProposals([{ taskId: entry.taskId ?? entry.id, ...entry.proposal }])
  }
  takeProposals(d.proposals ?? (Array.isArray(results) ? null : results.proposals))
  const seen = new Set()
  const unique = proposals.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
  return {
    status: str(d.status || "done").toLowerCase(),
    total: Number(d.total ?? 0) || 0,
    done: Number(d.done ?? 0) || 0,
    failed: Number(d.failed ?? 0) || 0,
    tasks: tasks.filter((t) => t.id || t.title),
    proposals: unique,
  }
}

/** The three blocks, each with its tasks. Tasks without a known stage are left out. */
export function groupByStage(tasks) {
  return STAGE_BLOCKS.map((block) => ({
    ...block,
    tasks: tasks.filter((t) => t.stage === block.stage),
  }))
}

export function taskLine(task) {
  const branches = task.branches.length ? `  (${task.branches.join(", ")})` : ""
  return `${task.id || "?"}  ${task.title || "(untitled)"}${branches}`
}

/** The results as text blocks: "In development (2)", then one line per task. */
export function renderResults(normalized) {
  return groupByStage(normalized.tasks).map((block) => {
    const lines = [`${block.title} (${block.tasks.length})`]
    for (const task of block.tasks) lines.push(`  ${taskLine(task)}`)
    return lines.join("\n")
  })
}

export function proposalLabel(p) {
  const confidence = p.confidence !== null && Number.isFinite(p.confidence)
    ? ` ${Math.round(p.confidence <= 1 ? p.confidence * 100 : p.confidence)}%`
    : ""
  if (p.kind === "close") {
    const reason = p.reason ? `: ${p.reason}` : ""
    return `Close ${p.taskId || p.id}${p.title ? `  ${p.title}` : ""}${confidence ? ` (${confidence.trim()})` : ""}${reason}`
  }
  if (p.kind === "new") return `New task: ${p.title || p.id}${p.reason ? ` (${p.reason})` : ""}`
  return `${p.title || p.id}${p.reason ? `: ${p.reason}` : ""}`
}

// ------------------------------------------------------------------ requests

function failure(res, what) {
  const message = Array.isArray(res.data?.message) ? res.data.message.join("; ") : res.data?.message
  if (res.status === 401) return new Error("The sync secret was rejected. Run npx taskmark init again.")
  if (res.status === 404) {
    return new Error(`${what}: this Taskmark Cloud does not support the initial reconciliation yet.`)
  }
  return new Error(`${what} failed (${res.status})${message ? `: ${message}` : ""}`)
}

export function buildBackfillBody({ commits, branches } = {}) {
  const body = {}
  if (commits !== undefined && commits !== null) body.commits = commits
  if (branches?.length) body.branches = branches
  return body
}

export async function startBackfill({ baseUrl, token, commits, branches, fetchImpl = fetch }) {
  const res = await api(baseUrl, token, "POST", BASE, buildBackfillBody({ commits, branches }), fetchImpl)
  if (!res.ok) throw failure(res, "Starting the reconciliation")
  const runId = res.data.runId ?? res.data.id
  if (!runId) throw new Error("Taskmark Cloud did not return a reconciliation run id.")
  return { runId: String(runId), jobs: res.data.jobs ?? null }
}

export async function getBackfill({ baseUrl, token, runId, fetchImpl = fetch }) {
  const res = await api(baseUrl, token, "GET", `${BASE}/${encodeURIComponent(runId)}`, undefined, fetchImpl)
  if (!res.ok) throw failure(res, "Reading the reconciliation")
  return res.data
}

export async function applyBackfill({ baseUrl, token, runId, accept, leaveForLater, fetchImpl = fetch }) {
  const body = { accept }
  if (leaveForLater !== undefined) body.leaveForLater = leaveForLater
  const res = await api(baseUrl, token, "POST", `${BASE}/${encodeURIComponent(runId)}/apply`, body, fetchImpl)
  if (!res.ok) throw failure(res, "Applying the reconciliation")
  return res.data
}

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Polls the run until it is done or failed. */
export async function pollBackfill({
  fetchRun,
  intervalMs = 2000,
  timeoutMs = 15 * 60 * 1000,
  sleep = sleepMs,
  now = Date.now,
  onProgress = () => {},
}) {
  const started = now()
  for (;;) {
    const data = await fetchRun()
    const status = String(data?.status ?? "").toLowerCase()
    if (status === "done" || status === "failed" || status === "completed") return data
    onProgress(data)
    if (now() - started > timeoutMs) {
      throw new Error("The reconciliation is taking too long. Run npx taskmark reconcile later to see it.")
    }
    await sleep(intervalMs)
  }
}

/**
 * The whole flow: start, wait, show the three blocks, review the proposals,
 * apply. `ui` is the prompt layer (see prompts.mjs). Returns a summary.
 */
export async function runReconcile({
  ui,
  baseUrl,
  token,
  commits = DEFAULT_BACKFILL_COMMITS,
  branches,
  fetchImpl = fetch,
  sleep,
}) {
  const started = await startBackfill({ baseUrl, token, commits, branches, fetchImpl })
  const spin = ui.spinner()
  spin.start(`Reading the last ${commits} commits of each stage branch`)
  let data
  try {
    data = await pollBackfill({
      fetchRun: () => getBackfill({ baseUrl, token, runId: started.runId, fetchImpl }),
      sleep,
      onProgress: (d) => {
        if (d?.total) spin.message(`Reading commits (${d.done ?? 0} of ${d.total} repos)`)
      },
    })
  } catch (err) {
    spin.error("Reconciliation did not finish")
    throw err
  }
  const result = normalizeBackfill(data)
  if (result.status === "failed") {
    spin.error("The reconciliation failed")
    throw new Error("Taskmark Cloud could not read the repositories. Check the App access, then run npx taskmark reconcile.")
  }
  spin.stop(result.failed ? `Done, ${result.failed} of ${result.total} repos could not be read` : "Done")

  for (const block of renderResults(result)) ui.note(block)

  const proposals = result.proposals
  let accept = []
  let leaveForLater = false
  if (proposals.length) {
    ui.note(proposals.map((p) => `- ${proposalLabel(p)}`).join("\n"), `Proposals to review (${proposals.length})`)
    const choice = await ui.select({
      message: "What should happen with these proposals?",
      options: [
        { value: "all", label: "Accept all" },
        { value: "pick", label: "Choose one by one" },
        { value: "later", label: "Leave all for later", hint: "they wait in the review inbox" },
      ],
      initialValue: "later",
    })
    if (choice === "all") accept = proposals.map((p) => p.id)
    else if (choice === "pick") {
      accept = await ui.multiselect({
        message: "Accept which ones? (the rest wait in the review inbox)",
        options: proposals.map((p) => ({ value: p.id, label: proposalLabel(p) })),
        required: false,
        initialValues: [],
      })
    }
    leaveForLater = accept.length < proposals.length
  }
  await applyBackfill({ baseUrl, token, runId: started.runId, accept, leaveForLater, fetchImpl })
  const counts = groupByStage(result.tasks).map((b) => b.tasks.length)
  return {
    runId: started.runId,
    development: counts[0],
    testing: counts[1],
    production: counts[2],
    accepted: accept.length,
    leftForLater: proposals.length - accept.length,
  }
}
