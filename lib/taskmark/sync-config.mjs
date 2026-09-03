import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const CONFIG_VERSION = 1

function canonicalBoardPath(boardPath) {
  try {
    return fs.realpathSync(boardPath)
  } catch {
    return path.resolve(boardPath)
  }
}

function configRoot() {
  const override = process.env.TASKMARK_CONFIG_HOME?.trim()
  return override || path.join(os.homedir(), ".taskmark")
}

export function isTaskmarkSyncToken(value) {
  return (
    typeof value === "string" &&
    value.startsWith("tmk_") &&
    value.length >= 16 &&
    value.length <= 512 &&
    !/\s/.test(value)
  )
}

export function boardSyncConfigPath(boardPath) {
  const canonical = canonicalBoardPath(boardPath)
  const key = createHash("sha256").update(canonical).digest("hex")
  return path.join(configRoot(), "sync", `${key}.json`)
}

export function readBoardSyncConfig(boardPath) {
  try {
    const parsed = JSON.parse(
      fs.readFileSync(boardSyncConfigPath(boardPath), "utf8"),
    )
    if (
      parsed?.version !== CONFIG_VERSION ||
      !isTaskmarkSyncToken(parsed.token)
    ) {
      return null
    }
    return {
      token: parsed.token,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    }
  } catch {
    return null
  }
}

export function writeBoardSyncConfig(boardPath, token) {
  if (!isTaskmarkSyncToken(token)) {
    throw new Error("Enter a valid Taskmark sync token beginning with tmk_.")
  }
  const canonical = canonicalBoardPath(boardPath)
  const file = boardSyncConfigPath(canonical)
  const directory = path.dirname(file)
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  try {
    fs.chmodSync(directory, 0o700)
  } catch {
    // Best effort on filesystems that do not support POSIX modes.
  }
  const payload = {
    version: CONFIG_VERSION,
    boardPath: canonical,
    token,
    updatedAt: new Date().toISOString(),
  }
  const temporary = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  fs.renameSync(temporary, file)
  try {
    fs.chmodSync(file, 0o600)
  } catch {
    // Best effort on filesystems that do not support POSIX modes.
  }
  return readBoardSyncConfig(canonical)
}

export function syncTokenHint(token) {
  return isTaskmarkSyncToken(token) ? `••••••${token.slice(-6)}` : null
}

export function resolveBoardSyncCredentials(boardPath, env = process.env) {
  const saved = readBoardSyncConfig(boardPath)
  const envToken = env.TASKMARK_SYNC_TOKEN?.trim()
  return {
    token: saved?.token || (isTaskmarkSyncToken(envToken) ? envToken : ""),
    source: saved ? "settings" : envToken ? "environment" : null,
    cloudUrl: env.TASKMARK_CLOUD_URL?.trim() || "",
  }
}

function configStamp(boardPath) {
  try {
    const stat = fs.statSync(boardSyncConfigPath(boardPath))
    return `${stat.mtimeMs}:${stat.size}`
  } catch {
    return "missing"
  }
}

export function watchBoardSyncConfig(boardPath, onChange) {
  let stopped = false
  let lastStamp = configStamp(boardPath)
  const interval = setInterval(() => {
    if (stopped) return
    const next = configStamp(boardPath)
    if (next !== lastStamp) {
      lastStamp = next
      onChange()
    }
  }, 750)
  return () => {
    stopped = true
    clearInterval(interval)
  }
}
