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

export function parseEnvStyleFile(filePath) {
  const values = {}
  let text
  try {
    text = fs.readFileSync(filePath, "utf8")
  } catch {
    return values
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

export function boardDotConfigPath(boardPath) {
  return path.join(canonicalBoardPath(boardPath), ".config")
}

export function readBoardDotConfig(boardPath) {
  const values = parseEnvStyleFile(boardDotConfigPath(boardPath))
  const token = values.TASKMARK_SYNC_TOKEN?.trim() ?? ""
  const cloudUrl = values.TASKMARK_CLOUD_URL?.trim() ?? ""
  return {
    token: isTaskmarkSyncToken(token) ? token : "",
    cloudUrl,
  }
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
  const committed = readBoardDotConfig(boardPath)
  const envToken = env.TASKMARK_SYNC_TOKEN?.trim()
  const envUrl = env.TASKMARK_CLOUD_URL?.trim() || ""
  if (saved?.token) {
    return {
      token: saved.token,
      source: "settings",
      cloudUrl: envUrl || committed.cloudUrl,
    }
  }
  if (committed.token) {
    return {
      token: committed.token,
      source: "config",
      cloudUrl: envUrl || committed.cloudUrl,
    }
  }
  return {
    token: isTaskmarkSyncToken(envToken) ? envToken : "",
    source: isTaskmarkSyncToken(envToken) ? "environment" : null,
    cloudUrl: envUrl,
  }
}

function configStamp(boardPath) {
  const parts = [boardSyncConfigPath(boardPath), boardDotConfigPath(boardPath)]
  return parts
    .map((file) => {
      try {
        const stat = fs.statSync(file)
        return `${stat.mtimeMs}:${stat.size}`
      } catch {
        return "missing"
      }
    })
    .join("|")
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
