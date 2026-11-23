/**
 * The board's project on Taskmark Cloud, without a Cloud account: `init`
 * generates a secret locally, registers the project with it, and keeps the
 * secret in the board's gitignored `.config` as TASKMARK_SYNC_TOKEN (the same
 * place `taskmark sync`, `ai` and `app` read it from).
 */
import { randomBytes } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import { DEFAULT_CLOUD_URL, api } from "./sync-board.mjs"
import {
  boardDotConfigPath,
  isTaskmarkSyncToken,
  resolveBoardSyncCredentials,
} from "../../lib/taskmark/sync-config.mjs"

export const SYNC_TOKEN_KEY = "TASKMARK_SYNC_TOKEN"

/** `tmk_` + 32 random bytes, base64url. */
export function generateSecret(random = randomBytes) {
  return `tmk_${random(32).toString("base64url")}`
}

/**
 * The cloud origin: TASKMARK_CLOUD_URL (env, then the board .config), else
 * the hosted cloud. The override exists for tests and is not documented.
 */
export function cloudBaseUrl(boardPath, env = process.env) {
  const fromEnv = env.TASKMARK_CLOUD_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, "")
  if (boardPath) {
    const { cloudUrl } = resolveBoardSyncCredentials(boardPath, env)
    if (cloudUrl) return cloudUrl.replace(/\/+$/, "")
  }
  return DEFAULT_CLOUD_URL
}

function messageOf(data) {
  const message = Array.isArray(data?.message) ? data.message.join("; ") : data?.message
  return typeof message === "string" && message ? message : null
}

export class CloudError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/** POST /v1/board-sync/projects `{ name, secret }` → `{ projectId, name }`. */
export async function registerProject({ baseUrl, name, secret, fetchImpl = fetch }) {
  const res = await api(baseUrl, null, "POST", "/board-sync/projects", { name, secret }, fetchImpl)
  if (!res.ok) {
    if (res.status === 429) {
      throw new CloudError(
        "Taskmark Cloud allows 5 new projects per hour from one network, and that limit is reached. Try again in an hour.",
        429,
      )
    }
    if (res.status === 404) {
      throw new CloudError(
        "This Taskmark Cloud cannot register projects from the CLI yet. Update the server.",
        404,
      )
    }
    throw new CloudError(messageOf(res.data) || `Registering the project failed (${res.status})`, res.status)
  }
  const projectId = res.data.projectId ?? res.data.id ?? null
  if (!projectId) throw new CloudError("Taskmark Cloud did not return a project id.", res.status)
  return { projectId: String(projectId), name: res.data.name ?? name }
}

/** POST /v1/board-sync/secret/rotate `{ secret }`, authenticated with the current secret. */
export async function rotateProjectSecret({ baseUrl, token, secret, fetchImpl = fetch }) {
  const res = await api(baseUrl, token, "POST", "/board-sync/secret/rotate", { secret }, fetchImpl)
  if (!res.ok) {
    if (res.status === 401) {
      throw new CloudError("The current secret was rejected, so it cannot be rotated. Run npx taskmark init to register again.", 401)
    }
    throw new CloudError(messageOf(res.data) || `Rotating the secret failed (${res.status})`, res.status)
  }
  return res.data
}

/** GET /v1/board-sync/integration: the connection, AI settings and features of the token's project. */
export async function getIntegration({ baseUrl, token, fetchImpl = fetch }) {
  return api(baseUrl, token, "GET", "/board-sync/integration", undefined, fetchImpl)
}

/**
 * Sets one KEY=value line in the board `.config`, keeping every other line.
 * Creates the file (mode 600) when missing.
 */
export function upsertConfigLine(text, key, value) {
  const lines = text ? text.replace(/\r\n/g, "\n").split("\n") : []
  if (lines.length && lines[lines.length - 1] === "") lines.pop()
  const pattern = new RegExp(`^\\s*${key}\\s*=`)
  let found = false
  const next = lines.map((line) => {
    if (!pattern.test(line)) return line
    if (found) return null
    found = true
    return `${key}=${value}`
  }).filter((line) => line !== null)
  if (!found) next.push(`${key}=${value}`)
  return `${next.join("\n")}\n`
}

export function writeSyncToken(boardPath, secret) {
  if (!isTaskmarkSyncToken(secret)) throw new Error("Refusing to write an invalid sync secret.")
  const file = boardDotConfigPath(boardPath)
  let text = ""
  try {
    text = fs.readFileSync(file, "utf8")
  } catch {
    // new file
  }
  fs.writeFileSync(file, upsertConfigLine(text, SYNC_TOKEN_KEY, secret), { mode: 0o600 })
  return file
}

export function readBoardPackage(boardPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(boardPath, "package.json"), "utf8"))
  } catch {
    return null
  }
}

/** Merges `patch` into the board package.json `taskmark` block, keeping other keys. */
export function updateBoardTaskmark(boardPath, patch) {
  const file = path.join(boardPath, "package.json")
  const pkg = readBoardPackage(boardPath) ?? {}
  const block = pkg.taskmark && typeof pkg.taskmark === "object" ? pkg.taskmark : {}
  pkg.taskmark = { ...block, ...patch }
  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`)
  return pkg
}

// ------------------------------------------------------------ app connection

/** True when the App is installed (GitHub) or authorized (Bitbucket) for the project. */
export function isProviderReady(data, provider) {
  const connection = data?.connection ?? null
  if (!connection) return false
  if (provider === "github") return Boolean(connection.github?.installed)
  if (provider === "bitbucket") return Boolean(connection.bitbucket?.authorized)
  return false
}

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Polls GET /v1/board-sync/integration until every provider in `providers` is
 * installed / authorized. Network blips keep polling; a rejected token stops.
 * Resolves `{ ok: true, data }`, `{ ok: false, reason: "timeout" }` or
 * `{ ok: false, reason: "rejected" }`.
 */
export async function waitForConnection({
  fetchStatus,
  providers,
  intervalMs = 2000,
  timeoutMs = 10 * 60 * 1000,
  sleep = sleepMs,
  now = Date.now,
  onTick = () => {},
}) {
  const started = now()
  for (;;) {
    let res = null
    try {
      res = await fetchStatus()
    } catch {
      res = null
    }
    if (res?.status === 401) return { ok: false, reason: "rejected" }
    if (res?.ok && providers.every((p) => isProviderReady(res.data, p))) {
      return { ok: true, data: res.data }
    }
    if (now() - started + intervalMs > timeoutMs) return { ok: false, reason: "timeout" }
    onTick()
    await sleep(intervalMs)
  }
}
