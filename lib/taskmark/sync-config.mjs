import fs from "node:fs"
import path from "node:path"

function canonicalBoardPath(boardPath) {
  try {
    return fs.realpathSync(boardPath)
  } catch {
    return path.resolve(boardPath)
  }
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

export function syncTokenHint(token) {
  return isTaskmarkSyncToken(token) ? `••••••${token.slice(-6)}` : null
}

export function resolveBoardSyncCredentials(boardPath, env = process.env) {
  const committed = readBoardDotConfig(boardPath)
  const envToken = env.TASKMARK_SYNC_TOKEN?.trim()
  const envUrl = env.TASKMARK_CLOUD_URL?.trim() || ""
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
  const file = boardDotConfigPath(boardPath)
  try {
    const stat = fs.statSync(file)
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
