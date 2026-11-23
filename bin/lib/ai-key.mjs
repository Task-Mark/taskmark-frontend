/**
 * `npx taskmark ai`: the project's own AI key ("bring your own key") that the
 * GitHub / Bitbucket App uses to reconcile the board on every push. Talks to
 * Taskmark Cloud with the board's sync token, like `taskmark sync`.
 */
import { DEFAULT_CLOUD_URL, loadBoardEnv } from "./sync-board.mjs"
import { resolveBoardSyncCredentials } from "../../lib/taskmark/sync-config.mjs"

export const AI_PROVIDERS = ["anthropic", "openai"]
export const AI_KEY_ENV = "TASKMARK_AI_KEY"

const PROVIDER_LABELS = { anthropic: "Claude", openai: "OpenAI" }

export const AI_USAGE = `Usage:
  npx taskmark ai set --provider anthropic|openai [--model <id>] [--key <key>] [--base-url <url>]
  npx taskmark ai status
  npx taskmark ai clear

Without --key the key is read from ${AI_KEY_ENV}, or typed at a hidden prompt.
Options: --board <path> picks the board (its .config holds the sync token).`

/** Parses the arguments after `ai`. Never throws; problems land in `error`. */
export function parseAiArgs(argv) {
  const args = {
    action: null,
    provider: null,
    model: null,
    key: null,
    baseUrl: null,
    board: null,
    help: false,
    error: null,
  }
  const rest = [...argv]
  const takeValue = (flag) => {
    const value = rest.shift()
    if (value === undefined || value.startsWith("--")) {
      args.error ??= `${flag} needs a value`
      if (value !== undefined) rest.unshift(value)
      return null
    }
    return value
  }
  const valued = {
    "--provider": "provider",
    "--model": "model",
    "--key": "key",
    "--base-url": "baseUrl",
    "--board": "board",
  }
  while (rest.length) {
    const token = rest.shift()
    if (token === "--help" || token === "-h") {
      args.help = true
      continue
    }
    const eq = token.indexOf("=")
    const flag = token.startsWith("--") && eq > 0 ? token.slice(0, eq) : token
    if (valued[flag]) {
      args[valued[flag]] = eq > 0 && flag !== token ? token.slice(eq + 1) : takeValue(flag)
    } else if (!token.startsWith("-") && !args.action) {
      args.action = token
    } else {
      args.error ??= `Unknown argument: ${token.startsWith("--key=") ? "--key=…" : token}`
    }
  }
  if (!args.help && !args.error) {
    if (!["set", "status", "clear"].includes(args.action ?? "")) {
      args.error = args.action ? `Unknown ai command: ${args.action}` : "Missing ai command"
    } else if (args.action === "set") {
      if (!args.provider) args.error = "ai set needs --provider anthropic|openai"
      else if (!AI_PROVIDERS.includes(args.provider)) {
        args.error = `Unknown provider: ${args.provider} (use anthropic or openai)`
      } else if (args.baseUrl && args.provider !== "openai") {
        args.error = "--base-url is only used with --provider openai"
      }
    }
  }
  return args
}

/** The HTTP request for one action, against the board's cloud. */
export function buildAiRequest(args, credentials) {
  const base = (credentials.cloudUrl || DEFAULT_CLOUD_URL).replace(/\/+$/, "")
  const url = `${base}/v1/board-sync/ai`
  const headers = { authorization: `Bearer ${credentials.token}` }
  if (args.action === "set") {
    const body = { provider: args.provider, apiKey: args.key }
    if (args.model) body.model = args.model
    if (args.baseUrl) body.baseUrl = args.baseUrl
    return {
      method: "PUT",
      url,
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  }
  return { method: args.action === "clear" ? "DELETE" : "GET", url, headers }
}

/** One line about the project's AI settings, never the key itself. */
export function describeAi(view) {
  if (!view?.keyConfigured || !view.provider) {
    return "No AI key set for this board. The GitHub/Bitbucket App uses the server default, if any."
  }
  const label = PROVIDER_LABELS[view.provider] ?? view.provider
  const model = view.model ? ` (${view.model})` : ""
  const last4 = view.keyLast4 ? `, key ending in …${view.keyLast4}` : ""
  return `${label}${model}${last4}, used by the GitHub/Bitbucket App to reconcile this board`
}

function errorFor(status, data) {
  if (status === 401) {
    return "Sync token was rejected. Copy a fresh token from Cloud Settings."
  }
  if (status === 422) {
    return "The provider rejected this API key. Check it and try again."
  }
  if (status === 502) {
    return "Taskmark Cloud could not reach the provider to check the key. Try again later."
  }
  const message = Array.isArray(data?.message) ? data.message.join("; ") : data?.message
  return message || `Request failed (${status})`
}

/** Reads one line from the terminal without echoing it. */
export function readHiddenLine(prompt, { input = process.stdin, output = process.stderr } = {}) {
  return new Promise((resolve, reject) => {
    output.write(prompt)
    let value = ""
    const wasRaw = input.isRaw
    input.setRawMode?.(true)
    input.resume()
    input.setEncoding("utf8")
    const done = (result, error) => {
      input.setRawMode?.(Boolean(wasRaw))
      input.pause()
      input.removeListener("data", onData)
      output.write("\n")
      if (error) reject(error)
      else resolve(result)
    }
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return done(value)
        if (char === "\u0003") return done(null, new Error("Cancelled"))
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1)
        else value += char
      }
    }
    input.on("data", onData)
  })
}

/**
 * Runs `taskmark ai ...` for one board. Returns the exit code. Everything
 * that touches the outside world is injectable for tests.
 */
export async function runAiCommand({
  args,
  boardPath,
  env = process.env,
  fetchImpl = fetch,
  stdinIsTTY = Boolean(process.stdin.isTTY),
  readSecret = readHiddenLine,
  log = console.log,
  error = console.error,
}) {
  if (env === process.env) loadBoardEnv(boardPath)
  const credentials = resolveBoardSyncCredentials(boardPath, env)
  if (!credentials.token) {
    error("Sync is not configured. Add TASKMARK_SYNC_TOKEN to the board .config file.")
    return 1
  }
  const request = { ...args }
  if (request.action === "set" && !request.key) {
    const fromEnv = env[AI_KEY_ENV]?.trim()
    if (fromEnv) request.key = fromEnv
    else if (stdinIsTTY) {
      const label = PROVIDER_LABELS[request.provider]
      request.key = (await readSecret(`${label} API key (hidden): `))?.trim() || null
    }
    if (!request.key) {
      error(`No API key given. Pass --key, set ${AI_KEY_ENV}, or run in a terminal to type it.`)
      return 1
    }
  }
  const { url, ...init } = buildAiRequest(request, credentials)
  let res
  try {
    res = await fetchImpl(url, init)
  } catch (cause) {
    error(
      `Cannot reach ${url} (${cause?.message || cause}). Set TASKMARK_CLOUD_URL to your Taskmark Cloud origin.`,
    )
    return 1
  }
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text }
  }
  if (!res.ok) {
    error(errorFor(res.status, data))
    return 1
  }
  if (request.action === "clear") {
    log("AI key removed. The GitHub/Bitbucket App falls back to the server default, if any.")
  } else if (request.action === "set") {
    log(`Saved. ${describeAi(data)}.`)
  } else {
    log(describeAi(data))
  }
  return 0
}
