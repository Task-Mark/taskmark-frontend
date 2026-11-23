import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  buildAiRequest,
  describeAi,
  parseAiArgs,
  runAiCommand,
} from "../../bin/lib/ai-key.mjs"

const TOKEN = "tmk_" + "a".repeat(40)
const KEY = "sk-ant-api03-secret-key-1234"

function board(config = `TASKMARK_SYNC_TOKEN=${TOKEN}\nTASKMARK_CLOUD_URL=https://cloud.example.com/\n`) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-ai-"))
  fs.writeFileSync(path.join(dir, ".config"), config)
  return dir
}

const env = (values: Record<string, string> = {}) => values as NodeJS.ProcessEnv

type Call = { url: string; init: RequestInit }

function fakeFetch(status: number, body: unknown) {
  const calls: Call[] = []
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(body), { status })
  }
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch }
}

function output() {
  const lines: string[] = []
  return { lines, log: (line: string) => lines.push(line), error: (line: string) => lines.push(line) }
}

test("parseAiArgs reads the set flags in both forms", () => {
  assert.deepEqual(
    parseAiArgs(["set", "--provider", "anthropic", "--model=claude-opus-5-5", "--key", KEY, "--board", "."]),
    {
      action: "set",
      provider: "anthropic",
      model: "claude-opus-5-5",
      key: KEY,
      baseUrl: null,
      board: ".",
      help: false,
      error: null,
    },
  )
  assert.equal(parseAiArgs(["status"]).error, null)
  assert.equal(parseAiArgs(["clear"]).action, "clear")
  assert.equal(parseAiArgs(["--help"]).help, true)
})

test("parseAiArgs reports mistakes without echoing a key", () => {
  assert.match(parseAiArgs([]).error ?? "", /Missing ai command/)
  assert.match(parseAiArgs(["nope"]).error ?? "", /Unknown ai command/)
  assert.match(parseAiArgs(["set"]).error ?? "", /--provider/)
  assert.match(parseAiArgs(["set", "--provider", "gemini"]).error ?? "", /Unknown provider/)
  assert.match(parseAiArgs(["set", "--provider", "anthropic", "--model"]).error ?? "", /--model needs a value/)
  assert.match(
    parseAiArgs(["set", "--provider", "anthropic", "--base-url", "https://x"]).error ?? "",
    /only used with --provider openai/,
  )
  const unknown = parseAiArgs(["status", "--wat"]).error ?? ""
  assert.match(unknown, /Unknown argument: --wat/)
})

test("buildAiRequest targets /v1/board-sync/ai with the sync token", () => {
  const credentials = { token: TOKEN, cloudUrl: "https://cloud.example.com/" }
  const put = buildAiRequest(
    { action: "set", provider: "openai", key: "sk-1", model: "gpt-5-mini", baseUrl: "https://llm.example.com/v1" },
    credentials,
  )
  assert.equal(put.method, "PUT")
  assert.equal(put.url, "https://cloud.example.com/v1/board-sync/ai")
  assert.equal(put.headers.authorization, `Bearer ${TOKEN}`)
  assert.deepEqual(JSON.parse(put.body as string), {
    provider: "openai",
    apiKey: "sk-1",
    model: "gpt-5-mini",
    baseUrl: "https://llm.example.com/v1",
  })
  assert.equal(buildAiRequest({ action: "status" }, credentials).method, "GET")
  assert.equal(buildAiRequest({ action: "clear" }, credentials).method, "DELETE")
  assert.equal(
    buildAiRequest({ action: "status" }, { token: TOKEN, cloudUrl: "" }).url,
    "https://cloud.taskmark.dev/v1/board-sync/ai",
  )
})

test("describeAi names the provider, model and last 4, never the key", () => {
  assert.equal(
    describeAi({ provider: "anthropic", model: "claude-opus-5-5", keyConfigured: true, keyLast4: "1234" }),
    "Claude (claude-opus-5-5), key ending in …1234, used by the GitHub/Bitbucket App to reconcile this board",
  )
  assert.match(describeAi({ provider: null, model: null, keyConfigured: false, keyLast4: null }), /No AI key/)
})

test("ai set sends the key from --key and prints a friendly line without it", async () => {
  const dir = board()
  const { calls, fetchImpl } = fakeFetch(200, {
    provider: "anthropic",
    model: "claude-opus-5-5",
    keyConfigured: true,
    keyLast4: "1234",
  })
  const out = output()
  const code = await runAiCommand({
    args: parseAiArgs(["set", "--provider", "anthropic", "--key", KEY]),
    boardPath: dir,
    env: env(),
    fetchImpl,
    stdinIsTTY: false,
    ...out,
  })
  assert.equal(code, 0)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "https://cloud.example.com/v1/board-sync/ai")
  assert.equal(calls[0].init.method, "PUT")
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { provider: "anthropic", apiKey: KEY })
  assert.match(out.lines.join("\n"), /Claude \(claude-opus-5-5\), key ending in …1234/)
  assert.ok(!out.lines.join("\n").includes(KEY))
})

test("ai set reads TASKMARK_AI_KEY, else prompts on a terminal, else fails", async () => {
  const dir = board()
  const ok = { provider: "openai", model: "gpt-4o-mini", keyConfigured: true, keyLast4: "9999" }

  const fromEnv = fakeFetch(200, ok)
  await runAiCommand({
    args: parseAiArgs(["set", "--provider", "openai"]),
    boardPath: dir,
    env: env({ TASKMARK_AI_KEY: "sk-env-9999" }),
    fetchImpl: fromEnv.fetchImpl,
    stdinIsTTY: false,
    ...output(),
  })
  assert.equal(JSON.parse(fromEnv.calls[0].init.body as string).apiKey, "sk-env-9999")

  const prompted = fakeFetch(200, ok)
  const prompts: string[] = []
  await runAiCommand({
    args: parseAiArgs(["set", "--provider", "openai"]),
    boardPath: dir,
    env: env(),
    fetchImpl: prompted.fetchImpl,
    stdinIsTTY: true,
    readSecret: async (prompt: string) => {
      prompts.push(prompt)
      return "sk-typed-9999\n"
    },
    ...output(),
  })
  assert.deepEqual(prompts, ["OpenAI API key (hidden): "])
  assert.equal(JSON.parse(prompted.calls[0].init.body as string).apiKey, "sk-typed-9999")

  const none = fakeFetch(200, ok)
  const out = output()
  const code = await runAiCommand({
    args: parseAiArgs(["set", "--provider", "openai"]),
    boardPath: dir,
    env: env(),
    fetchImpl: none.fetchImpl,
    stdinIsTTY: false,
    ...out,
  })
  assert.equal(code, 1)
  assert.equal(none.calls.length, 0)
  assert.match(out.lines.join("\n"), /TASKMARK_AI_KEY/)
})

test("ai status, clear and errors", async () => {
  const dir = board()
  const status = fakeFetch(200, { provider: null, model: null, keyConfigured: false, keyLast4: null })
  const out = output()
  assert.equal(
    await runAiCommand({ args: parseAiArgs(["status"]), boardPath: dir, env: env(), fetchImpl: status.fetchImpl, ...out }),
    0,
  )
  assert.equal(status.calls[0].init.method, "GET")
  assert.match(out.lines[0], /No AI key/)

  const clear = fakeFetch(200, {})
  await runAiCommand({ args: parseAiArgs(["clear"]), boardPath: dir, env: env(), fetchImpl: clear.fetchImpl, ...output() })
  assert.equal(clear.calls[0].init.method, "DELETE")

  const rejected = fakeFetch(422, { error: "invalid_api_key" })
  const bad = output()
  const code = await runAiCommand({
    args: parseAiArgs(["set", "--provider", "anthropic", "--key", KEY]),
    boardPath: dir,
    env: env(),
    fetchImpl: rejected.fetchImpl,
    ...bad,
  })
  assert.equal(code, 1)
  assert.match(bad.lines[0], /rejected this API key/)
  assert.ok(!bad.lines.join("\n").includes(KEY))

  const noToken = output()
  assert.equal(
    await runAiCommand({ args: parseAiArgs(["status"]), boardPath: board(""), env: env(), fetchImpl: status.fetchImpl, ...noToken }),
    1,
  )
  assert.match(noToken.lines[0], /Sync is not configured/)
})
