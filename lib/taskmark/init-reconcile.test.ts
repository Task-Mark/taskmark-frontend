import assert from "node:assert/strict"
import test from "node:test"

import {
  buildBackfillBody,
  groupByStage,
  normalizeBackfill,
  normalizeStage,
  pollBackfill,
  proposalLabel,
  renderResults,
  runReconcile,
} from "../../bin/lib/reconcile.mjs"
import { createDefaultsUi } from "../../bin/lib/prompts.mjs"
import {
  parseInitArgs,
  parseReconcileArgs,
  parseSecretArgs,
  validateNonInteractive,
} from "../../bin/lib/init-args.mjs"

const RUN = {
  status: "done",
  total: 2,
  done: 2,
  failed: 0,
  results: [
    { taskId: "T-MM-11111111", title: "Login form", stage: "development", branches: ["T-MM-11111111-login", "develop"] },
    { taskId: "T-MM-22222222", title: "Signup", stage: "quality", branches: [{ repo: "acme/api", branch: "quality" }] },
    { taskId: "T-MM-33333333", title: "Logout", stage: "production", branches: ["main"] },
    { taskId: "T-MM-44444444", title: "Search", stage: "shipped", branches: ["main"] },
  ],
  proposals: {
    close: [{ id: "c1", taskId: "T-MM-11111111", title: "Login form", confidence: 0.82, reason: "all criteria in the diff" }],
    newTasks: [{ id: "n1", title: "Rate limit the API", reason: "commit without a task" }],
  },
}

test("stages map to the three blocks", () => {
  assert.equal(normalizeStage("develop"), "development")
  assert.equal(normalizeStage("QA"), "testing")
  assert.equal(normalizeStage("shipped"), "production")
  assert.equal(normalizeStage("weird"), null)
})

test("results render into In development, In quality and Shipped with counts", () => {
  const normalized = normalizeBackfill(RUN)
  const blocks = renderResults(normalized)
  assert.deepEqual(blocks, [
    "In development (1)\n  T-MM-11111111  Login form  (T-MM-11111111-login, develop)",
    "In quality (1)\n  T-MM-22222222  Signup  (acme/api@quality)",
    "Shipped (2)\n  T-MM-33333333  Logout  (main)\n  T-MM-44444444  Search  (main)",
  ])
  assert.deepEqual(normalized.proposals.map((p) => [p.id, p.kind]), [["c1", "close"], ["n1", "new"]])
  assert.equal(proposalLabel(normalized.proposals[0]), "Close T-MM-11111111  Login form (82%): all criteria in the diff")
  assert.equal(proposalLabel(normalized.proposals[1]), "New task: Rate limit the API (commit without a task)")
})

test("parsing tolerates other shapes: results keyed by task, job lists, flat proposals", () => {
  const keyed = normalizeBackfill({
    status: "done",
    results: { "T-1": { title: "A", stage: "testing", foundOn: ["qa"] }, "T-2": "main" },
  })
  assert.deepEqual(groupByStage(keyed.tasks).map((b) => b.tasks.map((t) => t.id)), [[], ["T-1"], ["T-2"]])
  const jobs = normalizeBackfill({
    status: "done",
    results: [{ repo: "acme/api", tasks: [{ id: "T-3", stage: "dev" }], proposals: [{ proposalId: "x", type: "close", taskId: "T-3" }] }],
    proposals: [{ kind: "new_task", title: "B" }],
  })
  assert.deepEqual(jobs.tasks.map((t) => t.id), ["T-3"])
  assert.deepEqual(jobs.proposals.map((p) => [p.id, p.kind]), [["x", "close"], ["new:B", "new"]])
  assert.deepEqual(normalizeBackfill(null).tasks, [])
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
    onProgress: (d: { done: number }) => progress.push(d.done),
  })
  assert.equal(data.status, "done")
  assert.equal(sleeps, 2)
  assert.deepEqual(progress, [0, 1])
})

test("runReconcile starts, polls, and applies with the review choice", async () => {
  const calls: Array<{ method: string; url: string; body: unknown }> = []
  const fetchImpl = async (url: string, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method: String(init.method), url, body })
    if (url.endsWith("/backfill")) return Response.json({ runId: "r1", jobs: 2 })
    if (url.endsWith("/backfill/r1")) {
      return Response.json(calls.filter((c) => c.url.endsWith("/r1")).length < 2 ? { status: "running" } : RUN)
    }
    return Response.json({ ok: true })
  }
  const notes: string[] = []
  const ui = { ...createDefaultsUi({ out: () => {}, err: () => {} }), note: (m: string) => notes.push(m) }
  const pick = { ...ui, select: async () => "pick", multiselect: async () => ["n1"] }
  const result = await runReconcile({ ui: pick, baseUrl: "https://c.example", token: "tmk_t", commits: 10, branches: ["develop"], fetchImpl, sleep: async () => {} })
  assert.deepEqual(calls[0], { method: "POST", url: "https://c.example/v1/board-sync/integration/backfill", body: { commits: 10, branches: ["develop"] } })
  const apply = calls.at(-1)!
  assert.equal(apply.url, "https://c.example/v1/board-sync/integration/backfill/r1/apply")
  assert.deepEqual(apply.body, { accept: ["n1"], leaveForLater: true })
  assert.deepEqual(result, { runId: "r1", development: 1, testing: 1, production: 2, accepted: 1, leftForLater: 1 })
  assert.ok(notes[0].startsWith("In development (1)"))

  calls.length = 0
  await runReconcile({ ui: { ...ui, select: async () => "all" }, baseUrl: "https://c.example", token: "t", fetchImpl, sleep: async () => {} })
  assert.deepEqual(calls[0].body, { commits: 30 })
  assert.deepEqual(calls.at(-1)!.body, { accept: ["c1", "n1"], leaveForLater: false })

  calls.length = 0
  await runReconcile({ ui, baseUrl: "https://c.example", token: "t", fetchImpl, sleep: async () => {} })
  assert.deepEqual(calls.at(-1)!.body, { accept: [], leaveForLater: true }, "without a terminal everything waits for later")
})

test("init flags parse and validate", () => {
  const args = parseInitArgs(["--yes", "--provider", "GitHub", "--repo", "acme/api", "--repo=acme/web", "--ai", "openai", "--last", "12", "--skip-backfill"])
  assert.equal(args.error, null)
  assert.equal(args.provider, "github")
  assert.deepEqual(args.repos, ["acme/api", "acme/web"])
  assert.equal(args.last, 12)
  assert.equal(args.skipBackfill, true)
  assert.match(parseInitArgs(["--provider", "gitlab"]).error, /Unknown provider/)
  assert.match(parseInitArgs(["--ai", "gemini"]).error, /Unknown AI provider/)
  assert.match(parseInitArgs(["--last", "0"]).error, /--last/)
  assert.match(parseInitArgs(["--model", "x"]).error, /--model needs --ai/)
  assert.match(parseInitArgs(["--bogus"]).error, /Unknown argument/)
})

test("non-interactive runs list exactly what is missing", () => {
  const none = parseInitArgs([])
  assert.equal(validateNonInteractive(none, { stdinIsTTY: true, env: {} }).ok, true)

  const noTty = validateNonInteractive(none, { stdinIsTTY: false, env: {} })
  assert.equal(noTty.ok, false)
  assert.deepEqual(noTty.missing, ["--provider github|bitbucket", "--ai anthropic|openai"])
  assert.match(noTty.message!, /--yes/)

  const yes = parseInitArgs(["--yes", "--ai", "anthropic"])
  const missingKey = validateNonInteractive(yes, { stdinIsTTY: false, env: {} })
  assert.deepEqual(missingKey.missing, ["--provider github|bitbucket", "TASKMARK_AI_KEY (the AI key, in the environment)"])

  const full = parseInitArgs(["--yes", "--provider", "bitbucket", "--ai", "anthropic"])
  assert.equal(validateNonInteractive(full, { stdinIsTTY: false, env: { TASKMARK_AI_KEY: "sk" } }).ok, true)
  assert.equal(
    validateNonInteractive(parseInitArgs(["--yes"]), {
      stdinIsTTY: false,
      env: {},
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
  assert.match(parseSecretArgs([]).error, /Missing/)
  assert.match(parseSecretArgs(["show"]).error, /Unknown/)
})
