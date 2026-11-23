import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  generateSecret,
  isProviderReady,
  registerProject,
  rotateProjectSecret,
  upsertConfigLine,
  waitForConnection,
  writeSyncToken,
} from "../../bin/lib/cloud-project.mjs"
import { runSecretRotate } from "../../bin/lib/init.mjs"
import { isTaskmarkSyncToken, readBoardDotConfig } from "./sync-config.mjs"

type Call = { url: string; init: RequestInit }

function fakeFetch(responses: Array<{ status: number; body: unknown }>) {
  const calls: Call[] = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const next = responses.shift() ?? { status: 500, body: {} }
    return new Response(JSON.stringify(next.body), { status: next.status })
  }) as unknown as typeof fetch
  return { calls, impl }
}

test("generateSecret is tmk_ plus 32 random bytes in base64url", () => {
  const secret = generateSecret()
  assert.match(secret, /^tmk_[A-Za-z0-9_-]{43}$/)
  assert.ok(isTaskmarkSyncToken(secret))
  assert.equal(generateSecret(() => Buffer.alloc(32, 255)), `tmk_${Buffer.alloc(32, 255).toString("base64url")}`)
})

test("registerProject posts name and secret without a token", async () => {
  const { calls, impl } = fakeFetch([{ status: 201, body: { projectId: "p1", name: "shop" } }])
  const result = await registerProject({ baseUrl: "https://c.example/", name: "shop", secret: "tmk_x", fetchImpl: impl })
  assert.deepEqual(result, { projectId: "p1", name: "shop" })
  assert.equal(calls[0].url, "https://c.example/v1/board-sync/projects")
  assert.equal(calls[0].init.method, "POST")
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { name: "shop", secret: "tmk_x" })
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, undefined)

  const limited = fakeFetch([{ status: 429, body: {} }])
  await assert.rejects(
    registerProject({ baseUrl: "https://c.example", name: "s", secret: "tmk_x", fetchImpl: limited.impl }),
    /5 new projects per hour.*Try again in an hour/,
  )
})

test("rotateProjectSecret authenticates with the old secret and sends the new one", async () => {
  const { calls, impl } = fakeFetch([{ status: 200, body: { projectId: "p1", rotatedAt: "now" } }])
  await rotateProjectSecret({ baseUrl: "https://c.example", token: "tmk_old", secret: "tmk_new", fetchImpl: impl })
  assert.equal(calls[0].url, "https://c.example/v1/board-sync/secret/rotate")
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, "Bearer tmk_old")
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { secret: "tmk_new" })
})

test("secret rotate updates .config only after the server accepted it", async () => {
  const board = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-rotate-"))
  const old = "tmk_" + "a".repeat(43)
  fs.writeFileSync(path.join(board, ".config"), `# keep me\nTASKMARK_SYNC_TOKEN=${old}\nOTHER=1\n`)
  const env = { TASKMARK_CLOUD_URL: "https://c.example" } as unknown as NodeJS.ProcessEnv
  const rejected = fakeFetch([{ status: 401, body: {} }])
  const errors: string[] = []
  let code = await runSecretRotate({ args: {}, boardPath: board, env, fetchImpl: rejected.impl, log: () => {}, error: (m: string) => errors.push(m) })
  assert.equal(code, 1)
  assert.equal(readBoardDotConfig(board).token, old)

  const ok = fakeFetch([{ status: 200, body: {} }])
  code = await runSecretRotate({ args: {}, boardPath: board, env, fetchImpl: ok.impl, log: () => {}, error: () => {} })
  assert.equal(code, 0)
  const sent = JSON.parse(String(ok.calls[0].init.body)).secret
  assert.equal(readBoardDotConfig(board).token, sent)
  assert.notEqual(sent, old)
  const text = fs.readFileSync(path.join(board, ".config"), "utf8")
  assert.ok(text.startsWith("# keep me\n") && text.includes("OTHER=1"))
})

test(".config lines: replace in place, append when missing, drop duplicates", () => {
  assert.equal(upsertConfigLine("", "K", "v"), "K=v\n")
  assert.equal(upsertConfigLine("A=1\nK=old\nB=2", "K", "v"), "A=1\nK=v\nB=2\n")
  assert.equal(upsertConfigLine("K=1\nK=2\n", "K", "v"), "K=v\n")
  const board = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-config-"))
  const secret = generateSecret()
  writeSyncToken(board, secret)
  assert.equal(readBoardDotConfig(board).token, secret)
  assert.throws(() => writeSyncToken(board, "nope"))
})

test("isProviderReady reads the GitHub install and the Bitbucket authorization", () => {
  assert.equal(isProviderReady({ connection: { github: { installed: true } } }, "github"), true)
  assert.equal(isProviderReady({ connection: { github: { installed: false } } }, "github"), false)
  assert.equal(isProviderReady({ connection: { bitbucket: { authorized: true } } }, "bitbucket"), true)
  assert.equal(isProviderReady({ connection: null }, "github"), false)
})

test("waitForConnection polls every interval until installed, ignoring blips", async () => {
  const states = [
    { ok: true, status: 200, data: { connection: { github: { installed: false } } } },
    null,
    { ok: true, status: 200, data: { connection: { github: { installed: true } } } },
  ]
  let clock = 0
  const sleeps: number[] = []
  const result = await waitForConnection({
    fetchStatus: async () => {
      const next = states.shift()
      if (!next) throw new Error("network")
      return next
    },
    providers: ["github"],
    sleep: async (ms: number) => {
      sleeps.push(ms)
      clock += ms
    },
    now: () => clock,
  })
  assert.equal(result.ok, true)
  assert.deepEqual(sleeps, [2000, 2000])
})

test("waitForConnection gives up after the timeout and on a rejected secret", async () => {
  let clock = 0
  let polls = 0
  const timeout = await waitForConnection({
    fetchStatus: async () => {
      polls += 1
      return { ok: true, status: 200, data: { connection: { github: { installed: true }, bitbucket: { authorized: false } } } }
    },
    providers: ["github", "bitbucket"],
    timeoutMs: 10_000,
    sleep: async (ms: number) => {
      clock += ms
    },
    now: () => clock,
  })
  assert.deepEqual(timeout, { ok: false, reason: "timeout" })
  assert.equal(polls, 6)
  const rejected = await waitForConnection({
    fetchStatus: async () => ({ ok: false, status: 401, data: {} }),
    providers: ["github"],
    sleep: async () => {},
  })
  assert.deepEqual(rejected, { ok: false, reason: "rejected" })
})
