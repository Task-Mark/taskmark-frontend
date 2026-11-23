import assert from "node:assert/strict"
import { execFileSync, spawn } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import type { AddressInfo } from "node:net"
import os from "node:os"
import path from "node:path"
import test from "node:test"

const CLI = path.resolve(import.meta.dirname, "../../bin/taskmark.js")

type Seen = { method: string; url: string; auth?: string; body: unknown }

/** A local Taskmark Cloud with just the endpoints `init` calls. */
async function stubCloud() {
  const seen: Seen[] = []
  let connection: Record<string, unknown> | null = null
  let ai: Record<string, unknown> | null = null
  let polls = 0
  const server = http.createServer((req, res) => {
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : undefined
      const url = req.url ?? ""
      seen.push({ method: req.method ?? "", url, auth: req.headers.authorization, body })
      const send = (status: number, data: unknown) => {
        res.writeHead(status, { "content-type": "application/json" })
        res.end(JSON.stringify(data))
      }
      const key = `${req.method} ${url}`
      if (key === "POST /v1/board-sync/projects") return send(201, { projectId: "proj_1", name: body.name })
      if (key === "GET /v1/board-sync/integration") {
        // Installed on the second poll, as if the user finished in the browser.
        if (connection) polls += 1
        const view = connection ? { ...connection, github: { installed: polls > 1, installationId: "9" } } : null
        return send(200, { connection: view, ai, features: { github: true, bitbucket: true } })
      }
      if (key === "PUT /v1/board-sync/integration") {
        connection = { enabled: true, mode: body.mode ?? "shadow", ...body }
        return send(200, connection)
      }
      if (key === "GET /v1/board-sync/integration/github/install-url") return send(200, { url: "https://github.com/apps/taskmark/installations/new?state=x" })
      if (key === "PUT /v1/board-sync/ai") {
        ai = { provider: body.provider, model: body.model, keyConfigured: true, keyLast4: body.apiKey.slice(-4) }
        return send(200, ai)
      }
      if (key === "POST /v1/board-sync/integration/backfill") {
        return send(202, {
          runId: "run_1",
          jobs: 1,
          skipped: 0,
          repos: [{ owner: "acme", name: "shop", branches: [{ name: "main", stage: "production", commits: 3 }], error: null }],
          model: { used: true, provider: "anthropic", cap: 1, note: null },
        })
      }
      if (key === "GET /v1/board-sync/integration/backfill/run_1") {
        const p = { storyId: null, summary: "", source: "explicit", groupKey: "g1", fromStage: null, stage: null, branches: ["main"], status: "proposed" }
        return send(200, {
          runId: "run_1",
          status: "done",
          total: 1,
          done: 1,
          failed: 0,
          pending: 0,
          results: [],
          tasks: [{ taskId: "T-001", title: "Old task", fromStage: null, stage: "production", branches: ["main"], groups: ["g1"] }],
          stageMoves: [],
          proposals: [
            { ...p, id: "l1", kind: "link", taskId: "T-001", title: "Old task", confidence: 1, reason: "id in the branch" },
            { ...p, id: "c1", kind: "close", taskId: "T-002", title: "Other", confidence: 0.9, reason: "merged", source: "model" },
            { ...p, id: "stage:T-001", kind: "stage", taskId: "T-001", title: "Old task", confidence: 1, reason: "", stage: "production", groupKey: null },
          ],
        })
      }
      if (key === "POST /v1/board-sync/integration/backfill/run_1/apply") {
        return send(200, { applied: body.accept.length, boardCommitSha: "b0a4d", leftForLater: 1, dismissed: 0, notApplied: [], message: "Wrote 2 change(s) to the board in one commit." })
      }
      if (key === "GET /v1/board-sync/manifest") return send(200, { files: [], projectName: "shop", slug: "shop" })
      if (key === "PUT /v1/board-sync") return send(200, { version: 1 })
      send(404, { message: `stub has no ${key}` })
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  return { url: `http://127.0.0.1:${port}`, seen, close: () => new Promise((r) => server.close(r)) }
}

function run(args: string[], cwd: string, env: Record<string, string>) {
  return new Promise<{ code: number | null; out: string; err: string }>((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd,
      env: { ...process.env, INIT_CWD: cwd, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let out = ""
    let err = ""
    child.stdout.on("data", (c) => (out += c))
    child.stderr.on("data", (c) => (err += c))
    child.on("exit", (code) => resolve({ code, out, err }))
  })
}

function repo(dir: string, remote: string) {
  fs.mkdirSync(dir, { recursive: true })
  execFileSync("git", ["-C", dir, "init", "-q", "-b", "main"])
  execFileSync("git", ["-C", dir, "remote", "add", "origin", remote])
  return dir
}

const GIT_ENV = {
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
}

test("init without a terminal and without --yes lists the missing flags", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-init-"))
  const result = await run(["init"], dir, { TASKMARK_CLOUD_URL: "http://127.0.0.1:9" })
  assert.equal(result.code, 1)
  assert.match(result.err, /--yes/)
  assert.match(result.err, /--provider github\|bitbucket/)
  assert.match(result.err, /--ai anthropic\|openai/)
})

test("init --yes on a legacy board: register, connect, AI, hooks, agents, migrate, reconcile", { timeout: 120_000 }, async () => {
  const cloud = await stubCloud()
  try {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-init-")))
    const shop = repo(path.join(root, "shop"), "git@github.com:acme/shop.git")
    const epic = path.join(shop, "taskmark", "epics", "E-001-checkout")
    fs.mkdirSync(path.join(epic, "items"), { recursive: true })
    fs.writeFileSync(path.join(epic, "epic.md"), "---\nid: E-001\ntitle: Checkout\nstatus: in_progress\n---\n")
    fs.writeFileSync(path.join(epic, "items", "T-001-pay.md"), "---\nid: T-001\ntitle: Pay\nstatus: done\nparent: E-001\n---\n")
    fs.writeFileSync(path.join(shop, "CLAUDE.md"), "# Shop\n")
    execFileSync("git", ["-C", shop, "add", "-A"])
    execFileSync("git", ["-C", shop, "commit", "-q", "-m", "start"], { env: { ...process.env, ...GIT_ENV } })

    const result = await run(
      ["init", "--yes", "--provider", "github", "--ai", "anthropic", "--last", "7", "--cloud-url", cloud.url],
      shop,
      { TASKMARK_AI_KEY: "sk-ant-secret-1234", ...GIT_ENV, CI: "true" },
    )
    assert.equal(result.code, 0, `${result.out}\n${result.err}`)

    const board = path.join(shop, "taskmark")
    const pkg = JSON.parse(fs.readFileSync(path.join(board, "package.json"), "utf8"))
    assert.equal(pkg.taskmark.projectId, "proj_1")
    assert.equal(pkg.taskmark.writingLanguage, "English")
    assert.deepEqual(pkg.taskmark.repos, [".."])
    const config = fs.readFileSync(path.join(board, ".config"), "utf8")
    const secret = /TASKMARK_SYNC_TOKEN=(tmk_\S+)/.exec(config)?.[1]
    assert.ok(secret)
    assert.ok(!result.out.includes(secret!) && !result.err.includes(secret!), "the secret is never printed")
    assert.ok(!result.out.includes("sk-ant-secret"), "the AI key is never printed")

    const calls = cloud.seen.map((s) => `${s.method} ${s.url}`)
    const register = cloud.seen.find((s) => s.url === "/v1/board-sync/projects")!
    assert.deepEqual(register.body, { name: "shop", secret })
    const put = cloud.seen.find((s) => s.method === "PUT" && s.url === "/v1/board-sync/integration")!
    assert.equal(put.auth, `Bearer ${secret}`)
    assert.deepEqual(put.body, {
      provider: "github",
      codeRepos: [{ owner: "acme", name: "shop" }],
      boardRepo: { provider: "github", owner: "acme", name: "shop", branch: "main", root: "taskmark" },
      mode: "write",
    })
    assert.deepEqual(cloud.seen.find((s) => s.url === "/v1/board-sync/ai")!.body, {
      provider: "anthropic",
      apiKey: "sk-ant-secret-1234",
      model: "claude-opus-5-5",
    })
    assert.deepEqual(cloud.seen.find((s) => s.url === "/v1/board-sync/integration/backfill")!.body, { commits: 7 })
    assert.deepEqual(cloud.seen.find((s) => s.url.endsWith("/apply"))!.body, { accept: ["l1", "stage:T-001"], leaveForLater: true })
    assert.ok(calls.filter((c) => c === "GET /v1/board-sync/integration").length >= 2, "waited for the install")
    assert.ok(calls.includes("GET /v1/board-sync/manifest"), "synced the board")

    // Migrated and committed in the board repository.
    assert.ok(!fs.existsSync(path.join(board, "epics")))
    assert.ok(fs.existsSync(path.join(board, "requests", "checkout", "brief.md")))
    const log = execFileSync("git", ["-C", shop, "log", "--format=%s"], { encoding: "utf8" })
    assert.match(log, /Migrate the Taskmark board from epics to requests/)

    // Hook and agent instructions, left uncommitted.
    assert.ok(fs.existsSync(path.join(shop, ".git", "hooks", "prepare-commit-msg")))
    const claude = fs.readFileSync(path.join(shop, "CLAUDE.md"), "utf8")
    assert.ok(claude.startsWith("# Shop\n\n<!-- taskmark:begin -->"))
    assert.ok(claude.includes("`taskmark/`"))
    assert.ok(fs.existsSync(path.join(shop, "AGENTS.md")))
    const status = execFileSync("git", ["-C", shop, "status", "--porcelain"], { encoding: "utf8" })
    assert.match(status, /CLAUDE\.md/)
    assert.match(status, /AGENTS\.md/)

    assert.match(result.out, /acme\/shop: main 3/)
    assert.match(result.out, /Wrote 2 change\(s\) to the board in one commit\./)
    assert.match(result.out, /In development \(0\)/)
    assert.match(result.out, /Shipped \(1\)\n {2}T-001 {2}Old task {2}\(main\)/)

    // Re-run: the project is reused, not registered again.
    const again = await run(["init", "--yes", "--skip-backfill", "--cloud-url", cloud.url], shop, { ...GIT_ENV, CI: "true" })
    assert.equal(again.code, 0, `${again.out}\n${again.err}`)
    assert.equal(cloud.seen.filter((s) => s.url === "/v1/board-sync/projects").length, 1)
    assert.match(again.out, /already registered/)
    assert.match(again.out, /already connected/)
  } finally {
    await cloud.close()
  }
})

test("interactive init on a new multi-repo project: new board repo, typed board remote, 422 key retry", async () => {
  const { runInit } = await import("../../bin/lib/init.mjs")
  const { createDefaultsUi, CancelledError } = await import("../../bin/lib/prompts.mjs")
  const { parseInitArgs } = await import("../../bin/lib/init-args.mjs")
  Object.assign(process.env, GIT_ENV) // the new board repo gets a first commit
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-init-")))
  const api = repo(path.join(root, "shop-api"), "git@github.com:acme/shop-api.git")
  repo(path.join(root, "shop-web"), "https://github.com/acme/shop-web.git")

  const seen: Seen[] = []
  let connection: Record<string, unknown> | null = null
  let keyTries = 0
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    const u = new URL(url)
    seen.push({ method: String(init.method), url: u.pathname, body })
    const key = `${init.method} ${u.pathname}`
    if (key === "POST /v1/board-sync/projects") return Response.json({ projectId: "p9", name: body.name })
    if (key === "GET /v1/board-sync/integration") {
      return Response.json({ connection: connection && { ...connection, github: { installed: true } }, ai: null })
    }
    if (key === "PUT /v1/board-sync/integration") {
      connection = { ...body }
      return Response.json(connection)
    }
    if (key.endsWith("/github/install-url")) return Response.json({ url: "https://github.example/install" })
    if (key === "PUT /v1/board-sync/ai") {
      keyTries += 1
      if (keyTries === 1) return Response.json({ message: "bad key" }, { status: 422 })
      return Response.json({ provider: body.provider, model: body.model, keyConfigured: true, keyLast4: "abcd" })
    }
    return Response.json({ message: "no" }, { status: 404 })
  }) as unknown as typeof fetch

  const asked: string[] = []
  const answers: Array<[RegExp, unknown]> = [
    [/Where should the board live/, path.join(root, "shop-taskmark")],
    [/^Then:/, "type"],
    [/Board repository on GitHub/, "acme/shop-taskmark"],
    [/Which AI/, "openai"],
    [/OpenAI API key/, "sk-wrong"],
    [/OpenAI API key/, "sk-right"],
  ]
  const answer = async (o: { message: string; initialValue?: unknown; initialValues?: unknown[] }) => {
    asked.push(o.message)
    const i = answers.findIndex(([re]) => re.test(o.message))
    if (i >= 0) return answers.splice(i, 1)[0][1]
    return o.initialValues ?? o.initialValue ?? (o.message.includes("language") ? "English" : true)
  }
  const quiet = createDefaultsUi({ out: () => {}, err: () => {} })
  const ui = { ...quiet, interactive: true, select: answer, multiselect: answer, confirm: answer, text: answer, password: answer }
  const opened: string[] = []
  const code = await runInit({
    args: parseInitArgs([]),
    cwd: api,
    ui,
    env: { TASKMARK_CLOUD_URL: "https://cloud.test" } as unknown as NodeJS.ProcessEnv,
    fetchImpl,
    openUrl: ((u: string) => opened.push(u)) as never,
    stdinIsTTY: true,
    sleep: async () => {},
    syncBoard: (async () => ({ version: 3 })) as never,
  })
  assert.equal(code, 0, asked.join("\n"))
  assert.equal(answers.length, 0, "every scripted answer was used")
  assert.ok(CancelledError)

  const board = path.join(root, "shop-taskmark")
  assert.ok(fs.existsSync(path.join(board, ".git")), "git init on the new board repo")
  const pkg = JSON.parse(fs.readFileSync(path.join(board, "package.json"), "utf8"))
  assert.deepEqual(pkg.taskmark.repos, ["../shop-api", "../shop-web"])
  assert.equal(pkg.taskmark.projectId, "p9")
  assert.equal(pkg.name, "shop-taskmark")
  const committed = execFileSync("git", ["-C", board, "log", "--format=%s"], { encoding: "utf8" }).trim()
  assert.equal(committed, "Create the Taskmark board")
  const tracked = execFileSync("git", ["-C", board, "ls-files"], { encoding: "utf8" })
  assert.ok(!tracked.includes(".config"), "the secret is never committed")

  const put = seen.find((s) => s.method === "PUT" && s.url === "/v1/board-sync/integration")!
  assert.deepEqual(put.body, {
    provider: "github",
    codeRepos: [{ owner: "acme", name: "shop-api" }, { owner: "acme", name: "shop-web" }],
    boardRepo: { provider: "github", owner: "acme", name: "shop-taskmark", branch: "main", root: "" },
    mode: "write",
  })
  assert.deepEqual(opened, ["https://github.example/install"])
  assert.equal(keyTries, 2)
  assert.deepEqual(seen.filter((s) => s.url === "/v1/board-sync/ai").at(-1)!.body, { provider: "openai", apiKey: "sk-right", model: "gpt-4o-mini" })
  assert.ok(!seen.some((s) => s.url.includes("backfill")), "a new board has nothing to reconcile")
  for (const name of ["shop-api", "shop-web"]) {
    assert.ok(fs.readFileSync(path.join(root, name, "AGENTS.md"), "utf8").includes("`../shop-taskmark/`"))
  }
})

test("Ctrl+C on a prompt stops cleanly before anything is written", async () => {
  const { runInit } = await import("../../bin/lib/init.mjs")
  const { createDefaultsUi, CancelledError } = await import("../../bin/lib/prompts.mjs")
  const { parseInitArgs } = await import("../../bin/lib/init-args.mjs")
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-init-")))
  const shop = repo(path.join(root, "shop"), "git@github.com:acme/shop.git")
  const cancelled: string[] = []
  const quiet = createDefaultsUi({ out: () => {}, err: () => {} })
  const ui = {
    ...quiet,
    interactive: true,
    cancel: (m: string) => cancelled.push(m),
    select: async () => {
      throw new CancelledError()
    },
  }
  const code = await runInit({ args: parseInitArgs([]), cwd: shop, ui, env: {} as NodeJS.ProcessEnv, fetchImpl: fetch, stdinIsTTY: true })
  assert.equal(code, 130)
  assert.equal(cancelled.length, 1)
  assert.ok(!fs.existsSync(path.join(shop, "taskmark")))
})
