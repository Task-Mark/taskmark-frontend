import assert from "node:assert/strict"
import test from "node:test"

import {
  buildBackfillBody,
  normalizeBackfill,
  pollBackfill,
  proposalLabel,
  renderResults,
  renderStart,
  runReconcile,
  splitProposals,
} from "../../bin/lib/reconcile.mjs"
import { createDefaultsUi } from "../../bin/lib/prompts.mjs"
import {
  parseInitArgs,
  parseReconcileArgs,
  parseSecretArgs,
  validateNonInteractive,
} from "../../bin/lib/init-args.mjs"

// Shapes from taskmark-api test/accountless.e2e-spec.ts and backfill.service.ts.
const START = {
  runId: "6650a1b2c3d4e5f601234567",
  jobs: 2,
  skipped: 0,
  repos: [
    {
      owner: "acme",
      name: "shop-api",
      branches: [
        { name: "develop", stage: "development", commits: 2 },
        { name: "main", stage: "production", commits: 2 },
      ],
      error: null,
    },
  ],
  model: { used: true, provider: "anthropic", cap: 2, note: null },
}

const NO_KEY_NOTE =
  "This project has no AI key of its own, so only task ids written in branches, pull requests and commits are used. Add a Claude or OpenAI key to also match work by its content."

function proposal(over: Record<string, unknown>) {
  return {
    taskId: null,
    storyId: null,
    title: "",
    summary: "",
    confidence: 1,
    reason: "",
    source: "explicit",
    groupKey: "github:acme/shop-api#pr-5",
    fromStage: null,
    stage: null,
    branches: ["develop", "main"],
    status: "proposed",
    ...over,
  }
}

const DONE = {
  runId: START.runId,
  status: "done",
  total: 2,
  done: 2,
  failed: 0,
  pending: 0,
  results: [],
  tasks: [
    { taskId: "T-110", title: "Order form", fromStage: null, stage: "production", branches: ["develop", "main"], groups: ["g1"] },
    { taskId: "T-111", title: "Inputs", fromStage: null, stage: "development", branches: ["develop"], groups: ["g2"] },
  ],
  stageMoves: [],
  proposals: [
    proposal({ id: "a1", kind: "link", taskId: "T-110", title: "Order form" }),
    proposal({ id: "a2", kind: "close", taskId: "T-110", title: "Order form", confidence: 0.92, reason: "every criterion is in the diff", source: "model" }),
    proposal({ id: "a3", kind: "link", taskId: "T-111", title: "Inputs", branches: ["develop"] }),
    proposal({ id: "a4", kind: "new_task", storyId: "S-20", title: "Rate limit the API", confidence: 0.7, reason: "commit without a task", source: "model" }),
    proposal({ id: "stage:T-110", kind: "stage", taskId: "T-110", title: "Order form", fromStage: null, stage: "production", groupKey: null }),
    proposal({ id: "stage:T-111", kind: "stage", taskId: "T-111", title: "Inputs", fromStage: null, stage: "development", groupKey: null }),
  ],
}

test("results render into In development, In quality and Shipped from tasks[]", () => {
  const normalized = normalizeBackfill(DONE)
  assert.deepEqual(renderResults(normalized), [
    "In development (1)\n  T-111  Inputs  (develop)",
    "In quality (0)",
    "Shipped (1)\n  T-110  Order form  (develop, main)",
  ])
  const { facts, review } = splitProposals(normalized.proposals)
  assert.deepEqual(facts.map((p: { id: string }) => p.id), ["a1", "a3", "stage:T-110", "stage:T-111"])
  assert.deepEqual(review.map((p: { id: string }) => p.id), ["a2", "a4"])
  assert.equal(proposalLabel(review[0]), "Close T-110  Order form (92%): every criterion is in the diff")
  assert.equal(proposalLabel(review[1]), "New task in S-20: Rate limit the API (70%): commit without a task")
  assert.deepEqual(normalizeBackfill(null).tasks, [])
  assert.equal(
    normalizeBackfill({ proposals: [proposal({ id: "x", kind: "close", status: "applied" })] }).proposals.length,
    0,
    "decided proposals are not offered again",
  )
})

test("the start summary lists the branches read and the no-key note", () => {
  assert.deepEqual(renderStart(START), { lines: ["acme/shop-api: develop 2, main 2"], note: null })
  const noKey = renderStart({
    ...START,
    skipped: 2,
    repos: [{ owner: "acme", name: "web", branches: [], error: "Not Found" }],
    model: { used: false, provider: null, cap: 0, note: NO_KEY_NOTE },
  })
  assert.deepEqual(noKey.lines, ["acme/web: could not be read (Not Found)", "2 group(s) were already analysed and are skipped."])
  assert.equal(noKey.note, NO_KEY_NOTE)
})

test("backfill body: commits always, branches when given", () => {
  assert.deepEqual(buildBackfillBody({ commits: 30 }), { commits: 30 })
  assert.deepEqual(buildBackfillBody({ commits: 5, branches: ["develop"] }), { commits: 5, branches: ["develop"] })
})

test("pollBackfill waits until done", async () => {
  const states = [{ status: "running", total: 2, done: 0 }, { status: "running", total: 2, done: 1 }, { status: "done" }]
  let sleeps = 0
  const progress: number[] = []
  const data = await pollBackfill({
    fetchRun: async () => states.shift(),
    sleep: async () => {
      sleeps += 1
    },
    onProgress: (d: { done: number }) => {
      progress.push(d.done)
    },
  })
  assert.equal(data.status, "done")
  assert.equal(sleeps, 2)
  assert.deepEqual(progress, [0, 1])
})

function backfillFetch(applyStatus = 200, start: object = START) {
  const calls: Array<{ method: string; url: string; body: unknown }> = []
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method: String(init.method), url, body })
    if (url.endsWith("/backfill")) return Response.json(start, { status: 202 })
    if (url.endsWith(`/backfill/${START.runId}`)) {
      const polls = calls.filter((c) => c.url.endsWith(START.runId)).length
      return Response.json(polls < 2 ? { status: "running", total: 2, done: 0 } : DONE)
    }
    if (applyStatus === 409) return Response.json({ message: "This backfill was already applied." }, { status: 409 })
    if (applyStatus === 502) return Response.json({ message: "Could not write the board. Nothing was applied; try again." }, { status: 502 })
    return Response.json({ applied: body.accept.length, boardCommitSha: "abc1234", leftForLater: 1, message: "Wrote 5 change(s) to the board in one commit." })
  }) as unknown as typeof fetch
  return { calls, fetchImpl }
}

test("runReconcile applies the facts automatically and the reviewed choice", async () => {
  const { calls, fetchImpl } = backfillFetch()
  const notes: string[] = []
  const ui = { ...createDefaultsUi({ out: () => {}, err: () => {} }), note: (m: string) => notes.push(m) }
  const pick = { ...ui, select: async () => "pick", multiselect: async () => ["a4"] }
  const result = await runReconcile({ ui: pick, baseUrl: "https://c.example", token: "tmk_t", commits: 10, branches: ["develop"], fetchImpl, sleep: async () => {} })
  assert.deepEqual(calls[0], { method: "POST", url: "https://c.example/v1/board-sync/integration/backfill", body: { commits: 10, branches: ["develop"] } })
  const apply = calls.at(-1)!
  assert.equal(apply.url, `https://c.example/v1/board-sync/integration/backfill/${START.runId}/apply`)
  assert.deepEqual(apply.body, { accept: ["a1", "a3", "stage:T-110", "stage:T-111", "a4"], leaveForLater: true })
  assert.equal(result.accepted, 1)
  assert.equal(result.leftForLater, 1)
  assert.equal(result.boardCommitSha, "abc1234")
  assert.deepEqual([result.development, result.testing, result.production], [1, 0, 1])
  assert.equal(notes[0], "acme/shop-api: develop 2, main 2")
  assert.ok(notes.includes("In development (1)\n  T-111  Inputs  (develop)"))

  calls.length = 0
  await runReconcile({ ui: { ...ui, select: async () => "all" }, baseUrl: "https://c.example", token: "t", fetchImpl, sleep: async () => {} })
  assert.deepEqual(calls[0].body, { commits: 30 })
  assert.deepEqual(calls.at(-1)!.body, { accept: ["a1", "a3", "stage:T-110", "stage:T-111", "a2", "a4"], leaveForLater: false })

  calls.length = 0
  await runReconcile({ ui, baseUrl: "https://c.example", token: "t", fetchImpl, sleep: async () => {} })
  assert.deepEqual(
    calls.at(-1)!.body,
    { accept: ["a1", "a3", "stage:T-110", "stage:T-111"], leaveForLater: true },
    "without a terminal the facts are written and the rest waits in the inbox",
  )
})

test("runReconcile shows the no-key note and explains 409 and 502", async () => {
  const warnings: string[] = []
  const quiet = createDefaultsUi({ out: () => {}, err: () => {} })
  const ui = { ...quiet, log: { ...quiet.log, warn: (m: string) => warnings.push(m) } }
  const noKey = backfillFetch(200, { ...START, model: { used: false, provider: null, cap: 0, note: NO_KEY_NOTE } })
  await runReconcile({ ui, baseUrl: "https://c.example", token: "t", fetchImpl: noKey.fetchImpl, sleep: async () => {} })
  assert.deepEqual(warnings, [NO_KEY_NOTE])

  const conflict = backfillFetch(409)
  await assert.rejects(
    runReconcile({ ui, baseUrl: "https://c.example", token: "t", fetchImpl: conflict.fetchImpl, sleep: async () => {} }),
    /already applied/,
  )
  const badGateway = backfillFetch(502)
  await assert.rejects(
    runReconcile({ ui, baseUrl: "https://c.example", token: "t", fetchImpl: badGateway.fetchImpl, sleep: async () => {} }),
    /Could not write the board\. Nothing was applied\. Run npx taskmark reconcile/,
  )
})

test("init flags parse and validate", () => {
  const args = parseInitArgs(["--yes", "--provider", "GitHub", "--repo", "acme/api", "--repo=acme/web", "--ai", "openai", "--last", "12", "--skip-backfill"])
  assert.equal(args.error, null)
  assert.equal(args.provider, "github")
  assert.deepEqual(args.repos, ["acme/api", "acme/web"])
  assert.equal(args.last, 12)
  assert.equal(args.skipBackfill, true)
  assert.match(String(parseInitArgs(["--provider", "gitlab"]).error), /Unknown provider/)
  assert.match(String(parseInitArgs(["--ai", "gemini"]).error), /Unknown AI provider/)
  assert.match(String(parseInitArgs(["--last", "0"]).error), /--last/)
  assert.match(String(parseInitArgs(["--last", "201"]).error), /between 1 and 200/)
  assert.match(String(parseInitArgs(["--model", "x"]).error), /--model needs --ai/)
  assert.match(String(parseInitArgs(["--bogus"]).error), /Unknown argument/)
})

test("non-interactive runs list exactly what is missing", () => {
  const none = parseInitArgs([])
  assert.equal(validateNonInteractive(none, { stdinIsTTY: true, env: {} as unknown as NodeJS.ProcessEnv }).ok, true)

  const noTty = validateNonInteractive(none, { stdinIsTTY: false, env: {} as unknown as NodeJS.ProcessEnv })
  assert.equal(noTty.ok, false)
  assert.deepEqual(noTty.missing, ["--provider github|bitbucket", "--ai anthropic|openai"])
  assert.match(noTty.message!, /--yes/)

  const yes = parseInitArgs(["--yes", "--ai", "anthropic"])
  const missingKey = validateNonInteractive(yes, { stdinIsTTY: false, env: {} as unknown as NodeJS.ProcessEnv })
  assert.deepEqual(missingKey.missing, ["--provider github|bitbucket", "TASKMARK_AI_KEY (the AI key, in the environment)"])

  const full = parseInitArgs(["--yes", "--provider", "bitbucket", "--ai", "anthropic"])
  assert.equal(validateNonInteractive(full, { stdinIsTTY: false, env: { TASKMARK_AI_KEY: "sk" } as unknown as NodeJS.ProcessEnv }).ok, true)
  assert.equal(
    validateNonInteractive(parseInitArgs(["--yes"]), {
      stdinIsTTY: false,
      env: {} as unknown as NodeJS.ProcessEnv,
      existing: { provider: "github", aiConfigured: true },
    }).ok,
    true,
    "a configured project needs no flags",
  )
})

test("reconcile and secret flags", () => {
  const r = parseReconcileArgs(["--last", "5", "--branch", "develop", "--branch=main"])
  assert.deepEqual([r.last, r.branches, r.error], [5, ["develop", "main"], null])
  assert.equal(parseSecretArgs(["rotate"]).error, null)
  assert.match(String(parseSecretArgs([]).error), /Missing/)
  assert.match(String(parseSecretArgs(["show"]).error), /Unknown/)
})
