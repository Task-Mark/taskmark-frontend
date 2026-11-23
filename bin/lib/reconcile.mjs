/**
 * Initial reconciliation through the Taskmark Cloud backfill: the App reads the
 * recent commits of every stage branch, says where each task is (development,
 * quality, shipped) and proposes closes and new tasks for a person to review.
 *
 *   POST /v1/board-sync/integration/backfill             { commits?, branches? } → 202 { runId, jobs, skipped, repos, model }
 *   GET  /v1/board-sync/integration/backfill/:runId      → { status, total, done, failed, pending, tasks, proposals, ... }
 *   POST /v1/board-sync/integration/backfill/:runId/apply { accept, leaveForLater? }
 *
 * Links and stage moves are facts from the commits and are always applied;
 * closes and new tasks are reviewed. The API applies only the ids in `accept`;
 * `leaveForLater` sends the rest to the review inbox (else they are dismissed).
 */
import { api } from "./sync-board.mjs"

export const DEFAULT_BACKFILL_COMMITS = 30
/** The API refuses more commits per stage branch. */
export const MAX_BACKFILL_COMMITS = 200

const BASE = "/board-sync/integration/backfill"

export const STAGE_BLOCKS = [
  { stage: "development", title: "In development" },
  { stage: "testing", title: "In quality" },
  { stage: "production", title: "Shipped" },
]

export const STAGES = ["development", "testing", "production"]

/** Proposals that are facts read from the commits: always applied. */
export const FACT_KINDS = ["link", "stage"]
/** Proposals a person decides on: accept, or leave for the review inbox. */
export const REVIEW_KINDS = ["close", "new_task"]

const OPEN_STATUSES = new Set(["proposed", "", undefined, null])

function list(value) {
  return Array.isArray(value) ? value : []
}

/**
 * The parts of `GET .../backfill/:runId` the CLI uses:
 * `{ status, total, done, failed, pending, tasks[], proposals[] }`.
 */
export function normalizeBackfill(data) {
  const d = data && typeof data === "object" ? data : {}
  return {
    status: String(d.status ?? ""),
    total: Number(d.total ?? 0) || 0,
    done: Number(d.done ?? 0) || 0,
    failed: Number(d.failed ?? 0) || 0,
    pending: Number(d.pending ?? 0) || 0,
    tasks: list(d.tasks).map((t) => ({
      id: String(t.taskId ?? ""),
      title: String(t.title ?? ""),
      fromStage: t.fromStage ?? null,
      stage: STAGES.includes(t.stage) ? t.stage : null,
      branches: list(t.branches).map(String),
    })),
    proposals: list(d.proposals).filter((p) => p?.id && OPEN_STATUSES.has(p.status)),
  }
}

/** Splits proposals into the facts applied automatically and the ones to review. */
export function splitProposals(proposals) {
  return {
    facts: proposals.filter((p) => FACT_KINDS.includes(p.kind)),
    review: proposals.filter((p) => REVIEW_KINDS.includes(p.kind)),
  }
}

/** The three blocks, each with its tasks. Tasks without a stage are left out. */
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

/** What the start call read: one line per repo, then the model note if any. */
export function renderStart(started) {
  const lines = list(started.repos).map((repo) => {
    const name = `${repo.owner}/${repo.name}`
    if (repo.error) return `${name}: could not be read (${repo.error})`
    const branches = list(repo.branches).map((b) => `${b.name} ${b.commits}`)
    return `${name}: ${branches.length ? branches.join(", ") : "no stage branches"}`
  })
  if (started.skipped) lines.push(`${started.skipped} group(s) were already analysed and are skipped.`)
  return { lines, note: started.model?.note ?? null }
}

export function proposalLabel(p) {
  const confidence = typeof p.confidence === "number" ? ` (${Math.round(p.confidence * 100)}%)` : ""
  const reason = p.reason ? `: ${p.reason}` : ""
  if (p.kind === "close") return `Close ${p.taskId}${p.title ? `  ${p.title}` : ""}${confidence}${reason}`
  if (p.kind === "new_task") {
    const story = p.storyId ? ` in ${p.storyId}` : ""
    return `New task${story}: ${p.title || p.summary}${confidence}${reason}`
  }
  if (p.kind === "stage") return `${p.taskId} ${p.fromStage ?? "none"} to ${p.stage}`
  return `Link ${p.taskId}${p.title ? `  ${p.title}` : ""}`
}

// ------------------------------------------------------------------ requests

function messageOf(res) {
  const m = res.data?.message
  return Array.isArray(m) ? m.join("; ") : typeof m === "string" ? m : ""
}

function failure(res, what) {
  const message = messageOf(res)
  if (res.status === 401) return new Error("The project secret was rejected. Run npx taskmark init again.")
  if (res.status === 404) return new Error(`${what}: this reconciliation run was not found.`)
  if (res.status === 409) return new Error(message || `${what}: not possible right now.`)
  if (res.status === 502) {
    return new Error("Could not write the board. Nothing was applied. Run npx taskmark reconcile to try again.")
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
  if (!res.data.runId) throw new Error("Taskmark Cloud did not return a reconciliation run id.")
  return res.data
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

/**
 * Polls the run until it is done or failed.
 * @param {{ fetchRun: () => Promise<any>, intervalMs?: number, timeoutMs?: number,
 *           sleep?: (ms: number) => Promise<void>, now?: () => number, onProgress?: (data: any) => void }} options
 */
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
    if (status === "done" || status === "failed") return data
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
 * @param {{ ui: any, baseUrl: string, token: string, commits?: number, branches?: string[],
 *           fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void> }} options
 */
export async function runReconcile({
  ui,
  baseUrl,
  token,
  commits = DEFAULT_BACKFILL_COMMITS,
  branches = [],
  fetchImpl = fetch,
  sleep = sleepMs,
}) {
  const started = await startBackfill({ baseUrl, token, commits, branches, fetchImpl })
  const read = renderStart(started)
  if (read.lines.length) ui.note(read.lines.join("\n"), "Branches read (commits)")
  if (read.note) ui.log.warn(read.note)
  const spin = ui.spinner()
  spin.start(`Analysing ${started.jobs} group(s) of commits`)
  let data
  try {
    data = await pollBackfill({
      fetchRun: () => getBackfill({ baseUrl, token, runId: started.runId, fetchImpl }),
      sleep,
      onProgress: (d) => {
        if (d?.total) spin.message(`Analysing commits (${d.done ?? 0} of ${d.total})`)
      },
    })
  } catch (err) {
    spin.error("Reconciliation did not finish")
    throw err
  }
  const result = normalizeBackfill(data)
  if (result.status === "failed") {
    spin.error("The reconciliation failed")
    throw new Error("Taskmark Cloud could not analyse the commits. Check the App access, then run npx taskmark reconcile.")
  }
  spin.stop(result.failed ? `Done, ${result.failed} of ${result.total} group(s) failed` : "Done")

  for (const block of renderResults(result)) ui.note(block)

  const { facts, review } = splitProposals(result.proposals)
  if (facts.length) {
    const links = facts.filter((p) => p.kind === "link").length
    ui.log.info(`From the commits: ${links} link(s) and ${facts.length - links} stage move(s) will be written.`)
  }
  let chosen = []
  if (review.length) {
    ui.note(review.map((p) => `- ${proposalLabel(p)}`).join("\n"), `Proposals to review (${review.length})`)
    const choice = await ui.select({
      message: "What should happen with these proposals?",
      options: [
        { value: "all", label: "Accept all" },
        { value: "pick", label: "Choose one by one" },
        { value: "later", label: "Leave all for later", hint: "they wait in the review inbox" },
      ],
      initialValue: "later",
    })
    if (choice === "all") chosen = review.map((p) => p.id)
    else if (choice === "pick") {
      chosen = await ui.multiselect({
        message: "Accept which ones? (the rest wait in the review inbox)",
        options: review.map((p) => ({ value: p.id, label: proposalLabel(p) })),
        required: false,
        initialValues: [],
      })
    }
  }
  const accept = [...facts.map((p) => p.id), ...chosen]
  const leaveForLater = chosen.length < review.length
  const applied = await applyBackfill({ baseUrl, token, runId: started.runId, accept, leaveForLater, fetchImpl })
  if (applied?.message) ui.log.success(applied.message)
  const counts = groupByStage(result.tasks).map((b) => b.tasks.length)
  return {
    runId: started.runId,
    development: counts[0],
    testing: counts[1],
    production: counts[2],
    accepted: chosen.length,
    leftForLater: review.length - chosen.length,
    applied: applied?.applied ?? null,
    boardCommitSha: applied?.boardCommitSha ?? null,
  }
}
