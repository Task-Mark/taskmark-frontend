import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { createDefaultsUi } from "../../bin/lib/prompts.mjs"
import { parseRequestsArgs } from "../../bin/lib/init-args.mjs"
import {
  appendMergedSection,
  applyRegroup,
  chooseProposals,
  normalizeProposals,
  planRegroup,
  proposalLabel,
  readBoardRequests,
  renderPlan,
  requestProposals,
  runRegroup,
  setFrontmatterFields,
  shouldOfferRegroup,
  toApiRequests,
} from "../../bin/lib/regroup.mjs"
import { findRequest, parseRequestsForProject } from "./parse-requests"
import type { DiscoveredProject } from "./types"

const NOW = new Date("2026-11-23T10:00:00.000Z")

function write(file: string, text: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

function brief(slug: string, title: string, extra: string[] = [], body = "## Goal\n\nSomething.\n") {
  return [
    "---",
    `id: R-${slug}`,
    "type: request",
    `title: ${title}`,
    "status: ready",
    ...extra,
    "---",
    `# ${title}`,
    "",
    body,
  ].join("\n")
}

function epic(dir: string, id: string, title: string) {
  write(path.join(dir, "epic.md"), `---\nid: ${id}\ntype: epic\ntitle: ${title}\n---\n# ${title}\n`)
  write(path.join(dir, "stories", "S-1-x", "items", `T-${id}-a.md`), `---\nid: T-${id}\ntype: task\ntitle: A\nstatus: todo\n---\n`)
}

/** A migrated board: checkout (target), checkout-v2 and payments (merged), search. */
function board() {
  const boardPath = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-regroup-"))
  const req = (slug: string) => path.join(boardPath, "requests", slug)
  write(
    path.join(req("checkout"), "brief.md"),
    brief("checkout", "Checkout", ["aliases:", "  - E-3", "# kept comment", "links: []"], "## Goal\n\nPeople pay online.\n\n## Done when\n\n- Card payments work\n\n## Out of scope\n\n_Nothing yet._\n"),
  )
  epic(path.join(req("checkout"), "epics", "E-3-checkout"), "E-3", "Checkout")
  write(path.join(req("checkout"), "log", "2026-11-20-migrated-from-e-3.md"), "---\nkind: note\nat: 2026-11-20T00:00:00Z\ntitle: Migrated\n---\nx\n")

  write(
    path.join(req("checkout-v2"), "brief.md"),
    brief("checkout-v2", "Checkout v2", ["aliases:", "  - E-9", "source_meetings:", "  - M-1", "links:", "  - request: R-checkout", "    relation: relates-to", "  - R-search"], "## Goal\n\nA faster checkout.\n\n## Done when\n\n- [ ] One page checkout\n- [x] Saved cards\n"),
  )
  epic(path.join(req("checkout-v2"), "epics", "E-9-checkout-v2"), "E-9", "Checkout v2")
  write(path.join(req("checkout-v2"), "log", "2026-11-20-migrated-from-e-9.md"), "---\nkind: note\nat: 2026-11-20T00:00:00Z\ntitle: Migrated\n---\ny\n")
  write(path.join(req("checkout-v2"), "notes.txt"), "keep me\n")

  write(path.join(req("payments"), "brief.md"), brief("payments", "Payments", ["aliases:", "  - E-4"]))
  epic(path.join(req("payments"), "epics", "E-4-payments"), "E-4", "Payments")

  write(path.join(req("search"), "brief.md"), brief("search", "Search", ["aliases:", "  - E-5"]))
  epic(path.join(req("search"), "epics", "E-5-search"), "E-5", "Search")
  write(path.join(req("filters"), "brief.md"), brief("filters", "Search filters", ["aliases:", "  - E-6", "tags:", "  - ux"]))
  epic(path.join(req("filters"), "epics", "E-6-filters"), "E-6", "Filters")
  return boardPath
}

function project(boardPath: string): DiscoveredProject {
  return { id: "p", name: "p", projectPath: boardPath, boardPath } as DiscoveredProject
}

const INTO_CHECKOUT = {
  id: "p1",
  into: { slug: "checkout", title: "Checkout" },
  merge: ["checkout", "checkout-v2", "payments"],
  reason: "Same checkout work.",
  confidence: 0.9,
}
const NEW_SEARCH = {
  id: "p2",
  into: { newTitle: "Search and filters", newSlug: "search-and-filters" },
  merge: ["search", "filters"],
  reason: "One search feature.",
  confidence: 0.7,
}

test("readBoardRequests reads briefs, epics and done-when items", () => {
  const boardPath = board()
  const requests = readBoardRequests(boardPath)
  assert.deepEqual(requests.map((r) => r.slug), ["checkout", "checkout-v2", "filters", "payments", "search"])
  const v2 = requests.find((r) => r.slug === "checkout-v2")!
  assert.equal(v2.id, "R-checkout-v2")
  assert.equal(v2.goal, "A faster checkout.")
  assert.deepEqual(v2.doneWhen, ["One page checkout", "Saved cards"])
  assert.deepEqual(v2.epics.map((e) => e.id), ["E-9"])
  const body = toApiRequests(requests)
  assert.deepEqual(Object.keys(body[0]).sort(), ["aliases", "epics", "goal", "id", "slug", "status", "title", "why"])
  assert.deepEqual(body[1].epics, [{ id: "E-9", title: "Checkout v2" }])
})

test("plan and apply a merge into an existing request", () => {
  const boardPath = board()
  const requests = readBoardRequests(boardPath)
  const plan = planRegroup({ boardPath, requests, proposals: [INTO_CHECKOUT], now: NOW })
  assert.deepEqual(plan.errors, [])
  const lines = renderPlan(plan, boardPath)
  assert.ok(lines.includes("  move   requests/checkout-v2/epics/E-9-checkout-v2  to  requests/checkout/epics/E-9-checkout-v2"))
  assert.ok(lines.includes("  remove requests/payments/"))
  applyRegroup(plan)

  const req = (...p: string[]) => path.join(boardPath, "requests", ...p)
  assert.ok(!fs.existsSync(req("checkout-v2")))
  assert.ok(!fs.existsSync(req("payments")))
  for (const e of ["E-3-checkout", "E-9-checkout-v2", "E-4-payments"]) assert.ok(fs.existsSync(req("checkout", "epics", e, "epic.md")))
  assert.ok(fs.existsSync(req("checkout", "log", "2026-11-20-migrated-from-e-9.md")))
  assert.ok(fs.existsSync(req("checkout", "log", "2026-11-23-merged-checkout-v2.md")))
  assert.ok(fs.existsSync(req("checkout", "log", "2026-11-23-merged-payments.md")))
  assert.equal(fs.readFileSync(req("checkout", "notes.txt"), "utf8"), "keep me\n")
  assert.match(fs.readFileSync(req("checkout", "log", "2026-11-23-merged-checkout-v2.md"), "utf8"), /## Goal\n\nA faster checkout\./)

  const text = fs.readFileSync(req("checkout", "brief.md"), "utf8")
  assert.match(text, /# kept comment/)
  assert.match(text, /## Goal\n\nPeople pay online\./)
  assert.match(text, /## Merged requests\n\n- R-checkout-v2, Checkout v2: A faster checkout\.\n  - One page checkout\n  - Saved cards\n- R-payments, Payments: Something\.\n$/)

  // The board parser sees one request with every old id as an alias.
  const list = parseRequestsForProject(project(boardPath))
  assert.deepEqual(list.requests.map((r) => r.slug).sort(), ["checkout", "filters", "search"])
  const checkout = findRequest(list, "checkout")!
  assert.deepEqual(checkout.aliases, ["E-3", "R-checkout-v2", "E-9", "R-payments", "E-4"])
  assert.deepEqual(checkout.sourceMeetings, ["M-1"])
  assert.deepEqual(checkout.links.map((l) => l.request), ["R-search"])
  assert.equal(checkout.leafCount, 3)
  for (const old of ["E-9", "R-payments", "R-checkout-v2"]) assert.equal(findRequest(list, old)?.slug, "checkout")
})

test("a new-request proposal creates a brief and moves everything under it", () => {
  const boardPath = board()
  const requests = readBoardRequests(boardPath)
  const plan = planRegroup({ boardPath, requests, proposals: [NEW_SEARCH], now: NOW })
  applyRegroup(plan)
  const dir = path.join(boardPath, "requests", "search-and-filters")
  assert.ok(fs.existsSync(path.join(dir, "epics", "E-5-search")))
  assert.ok(fs.existsSync(path.join(dir, "epics", "E-6-filters")))
  assert.ok(!fs.existsSync(path.join(boardPath, "requests", "search")))
  const list = parseRequestsForProject(project(boardPath))
  const created = findRequest(list, "E-6")!
  assert.equal(created.id, "R-search-and-filters")
  assert.equal(created.title, "Search and filters")
  assert.equal(created.status, "ready")
  assert.deepEqual(created.aliases, ["R-search", "E-5", "R-filters", "E-6"])
  assert.match(fs.readFileSync(path.join(dir, "brief.md"), "utf8"), /tags:\n {2}- ux/)
})

test("refuses the whole plan when a destination exists, and writes nothing", () => {
  const boardPath = board()
  write(path.join(boardPath, "requests", "checkout", "epics", "E-4-payments", "epic.md"), "clash")
  write(path.join(boardPath, "requests", "search-and-filters", "x.md"), "taken")
  const requests = readBoardRequests(boardPath)
  const plan = planRegroup({ boardPath, requests, proposals: [INTO_CHECKOUT, NEW_SEARCH], now: NOW })
  assert.ok(plan.errors.includes("requests/checkout/epics/E-4-payments already exists"))
  assert.ok(plan.errors.includes("requests/search-and-filters already exists"))
  assert.throws(() => applyRegroup(plan), /Nothing was changed/)
  assert.ok(fs.existsSync(path.join(boardPath, "requests", "payments", "brief.md")))
  assert.ok(fs.existsSync(path.join(boardPath, "requests", "checkout-v2", "epics", "E-9-checkout-v2")))
})

test("refuses a slug in two proposals or an unknown slug", () => {
  const boardPath = board()
  const requests = readBoardRequests(boardPath)
  const plan = planRegroup({
    boardPath,
    requests,
    proposals: [INTO_CHECKOUT, { ...NEW_SEARCH, merge: ["payments", "gone"] }, { ...NEW_SEARCH, id: "p3", merge: ["payments", "search"] }],
    now: NOW,
  })
  assert.equal(plan.errors.length, 2)
})

test("appendMergedSection adds to an existing section before the next heading", () => {
  const text = "# T\n\n## Merged requests\n\n- R-a, A\n\n## Open questions\n\n_None yet._\n"
  assert.equal(
    appendMergedSection(text, ["- R-b, B"]),
    "# T\n\n## Merged requests\n\n- R-a, A\n- R-b, B\n\n## Open questions\n\n_None yet._\n",
  )
  assert.equal(setFrontmatterFields("---\na: 1 # c\n---\nbody\n", { aliases: ["x"] }), "---\na: 1 # c\naliases:\n  - x\n---\nbody\n")
})

test("proposal labels, normalization and selection", async () => {
  const requests = readBoardRequests(board())
  assert.equal(proposalLabel(INTO_CHECKOUT, requests), "Merge into Checkout: Checkout v2, Payments (90%) Same checkout work.")
  assert.equal(proposalLabel(NEW_SEARCH, requests), 'Merge into new request "Search and filters": Search, Search filters (70%) One search feature.')

  const { proposals } = normalizeProposals(
    { proposals: [INTO_CHECKOUT, { ...NEW_SEARCH, merge: ["search", "nope"] }, { ...NEW_SEARCH, id: "p3", merge: ["payments", "search"] }] },
    requests,
  )
  assert.deepEqual(proposals.map((p) => p.id), ["p1"])

  const both = [INTO_CHECKOUT, NEW_SEARCH]
  assert.deepEqual((await chooseProposals({ ui: null, proposals: both, requests, yes: true })).map((p) => p.id), ["p1"])
  const scripted = (select: string, picked: string[] = []) => ({
    select: async () => select,
    multiselect: async (o: { options: { value: string; label: string }[] }) => {
      assert.equal(o.options[1].label, proposalLabel(NEW_SEARCH, requests))
      return picked
    },
  })
  assert.equal((await chooseProposals({ ui: scripted("all"), proposals: both, requests })).length, 2)
  assert.deepEqual((await chooseProposals({ ui: scripted("pick", ["p2"]), proposals: both, requests })).map((p) => p.id), ["p2"])
  assert.deepEqual(await chooseProposals({ ui: scripted("skip"), proposals: both, requests }), [])
  // Without a terminal the default is to skip.
  assert.deepEqual(await chooseProposals({ ui: createDefaultsUi({ out: () => {}, err: () => {} }), proposals: both, requests }), [])
})

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(body), { status })
  }) as unknown as typeof fetch
  return { calls, fetchImpl }
}

test("requestProposals posts the parsed requests with the sync token", async () => {
  const requests = readBoardRequests(board())
  const { calls, fetchImpl } = fakeFetch(200, { proposals: [INTO_CHECKOUT], model: { provider: "anthropic", model: "claude-opus-5-5" } })
  const out = await requestProposals({ baseUrl: "https://cloud.test/", token: "tmk_x", requests, fetchImpl })
  assert.equal(calls[0].url, "https://cloud.test/v1/board-sync/requests/regroup")
  assert.equal(calls[0].init.method, "POST")
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, "Bearer tmk_x")
  const sent = JSON.parse(String(calls[0].init.body))
  assert.equal(sent.requests.length, 5)
  assert.equal(sent.requests[0].slug, "checkout")
  assert.equal(out.proposals.length, 1)
  assert.equal(out.model.provider, "anthropic")

  const noKey = fakeFetch(400, { statusCode: 400, message: "This project has no AI key. Add one with npx taskmark ai set, then try again." })
  await assert.rejects(requestProposals({ baseUrl: "https://cloud.test", token: "t", requests, fetchImpl: noKey.fetchImpl }), /no AI key/)
  const rejected = fakeFetch(401, {})
  await assert.rejects(requestProposals({ baseUrl: "https://cloud.test", token: "t", requests, fetchImpl: rejected.fetchImpl }), /secret was rejected/)
})

test("runRegroup: --yes applies confident proposals and commits; dry run writes nothing", async () => {
  const quiet = () => createDefaultsUi({ out: () => {}, err: () => {} })
  const dryBoard = board()
  const dry = await runRegroup({
    ui: quiet(),
    boardPath: dryBoard,
    baseUrl: "https://cloud.test",
    token: "t",
    dryRun: true,
    yes: true,
    now: NOW,
    fetchImpl: fakeFetch(200, { proposals: [INTO_CHECKOUT, NEW_SEARCH] }).fetchImpl,
  })
  assert.equal(dry.accepted, 1)
  assert.equal(dry.merged, 0)
  assert.ok(fs.existsSync(path.join(dryBoard, "requests", "payments")))

  const boardPath = board()
  const git = (...args: string[]) => execFileSync("git", ["-C", boardPath, ...args], { encoding: "utf8" }).trim()
  git("init", "-q", "-b", "main")
  git("-c", "user.name=T", "-c", "user.email=t@example.com", "add", "-A")
  git("-c", "user.name=T", "-c", "user.email=t@example.com", "commit", "-q", "-m", "board")
  const identity = { GIT_AUTHOR_NAME: "T", GIT_COMMITTER_NAME: "T", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_EMAIL: "t@example.com" }
  const saved = Object.fromEntries(Object.keys(identity).map((k) => [k, process.env[k]]))
  Object.assign(process.env, identity)
  const result = await runRegroup({
    ui: quiet(),
    boardPath,
    baseUrl: "https://cloud.test",
    token: "t",
    yes: true,
    now: NOW,
    fetchImpl: fakeFetch(200, { proposals: [INTO_CHECKOUT, NEW_SEARCH] }).fetchImpl,
  }).finally(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })
  assert.equal(result.merged, 2)
  assert.ok(result.commit)
  assert.equal(git("log", "-1", "--format=%s"), "Regroup requests")
  assert.equal(git("status", "--porcelain"), "")
  assert.ok(fs.existsSync(path.join(boardPath, "requests", "search")))
})

test("init offers regrouping only after a migration or on bigger boards with an AI key", () => {
  assert.equal(shouldOfferRegroup({ justMigrated: true, requestCount: 3, aiConfigured: true }), true)
  assert.equal(shouldOfferRegroup({ justMigrated: false, requestCount: 3, aiConfigured: true }), false)
  assert.equal(shouldOfferRegroup({ justMigrated: false, requestCount: 9, aiConfigured: true }), true)
  assert.equal(shouldOfferRegroup({ justMigrated: true, requestCount: 9, aiConfigured: false }), false)
  assert.deepEqual(
    { ...parseRequestsArgs(["regroup", "--dry-run", "--yes"]) },
    { action: "regroup", dryRun: true, yes: true, board: null, cloudUrl: null, help: false, error: null },
  )
  assert.match(parseRequestsArgs(["merge"]).error, /Unknown requests command/)
})
