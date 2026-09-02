import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

import { watchBoardMarkdown } from "./watch-board-markdown.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, "../..")

export function loadBoardEnv(boardPath) {
  const envFile = path.join(boardPath, ".env")
  if (!fs.existsSync(envFile)) return
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
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
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value
    }
  }
}

function isAllowedBoardPath(raw) {
  const rel = raw.replaceAll("\\", "/").replace(/^\/+/, "")
  if (!rel || rel.includes("\0") || rel.split("/").includes("..")) return false
  if (rel === "CHANGELOG.md" || rel === "package.json" || rel === "README.md") {
    return true
  }
  if (/^\.reports\/report-\d{8}\.md$/.test(rel)) return true
  return (
    rel.startsWith("epics/") &&
    rel.endsWith(".md") &&
    rel.split("/").every((part) => part.length > 0 && !part.startsWith("."))
  )
}

function collectBoardFiles(boardPath) {
  const files = []
  const walk = (dir, prefix) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "epics" || entry.name === ".reports" || prefix.startsWith("epics")) {
          walk(full, rel)
        }
      } else if (entry.isFile() && isAllowedBoardPath(rel)) {
        const content = fs.readFileSync(full, "utf8")
        files.push({
          path: rel,
          content,
          hash: createHash("sha256").update(content, "utf8").digest("hex"),
        })
      }
    }
  }
  walk(boardPath, "")
  return files
}

async function buildSnapshot(boardPath) {
  const requireFromPackage = createRequire(path.join(packageRoot, "package.json"))
  let tsxBin
  try {
    tsxBin = requireFromPackage.resolve("tsx/cli")
  } catch {
    tsxBin = path.join(packageRoot, "node_modules/tsx/dist/cli.mjs")
  }
  if (!fs.existsSync(tsxBin) && !tsxBin.endsWith("cli")) {
    throw new Error("tsx is required to build a board snapshot for sync.")
  }
  const script = path.join(packageRoot, "scripts/print-board-snapshot.ts")
  return await new Promise((resolve, reject) => {
    const chunks = []
    const errChunks = []
    const child = spawn(process.execPath, [tsxBin, script], {
      cwd: packageRoot,
      env: { ...process.env, TASKMARK_BOARD: boardPath },
      stdio: ["ignore", "pipe", "pipe"],
    })
    child.stdout.on("data", (chunk) => chunks.push(chunk))
    child.stderr.on("data", (chunk) => errChunks.push(chunk))
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Snapshot build failed: ${Buffer.concat(errChunks).toString("utf8")}`,
          ),
        )
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")))
      } catch (err) {
        reject(err)
      }
    })
  })
}

async function api(baseUrl, token, method, pathname, body) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1${pathname}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }
  return { ok: res.ok, status: res.status, data }
}

export async function syncBoardOnce(boardPath) {
  loadBoardEnv(boardPath)
  const token = process.env.TASKMARK_SYNC_TOKEN?.trim()
  if (!token) {
    throw new Error(
      "TASKMARK_SYNC_TOKEN is not set. Copy it from Taskmark Cloud Settings.",
    )
  }
  const baseUrl =
    process.env.TASKMARK_CLOUD_URL?.trim() || "http://localhost:4000"
  const manifest = await api(baseUrl, token, "GET", "/board-sync/manifest")
  if (manifest.status === 401) {
    const err = new Error(
      "Sync token was rejected. Copy a fresh token from Cloud Settings.",
    )
    err.code = 401
    throw err
  }
  if (!manifest.ok) {
    throw new Error(manifest.data.message || `Manifest failed (${manifest.status})`)
  }
  const remote = new Map(
    (manifest.data.files ?? []).map((file) => [file.path, file.hash]),
  )
  const local = collectBoardFiles(boardPath)
  const localPaths = new Set(local.map((file) => file.path))
  const files = []
  for (const file of local) {
    if (remote.get(file.path) !== file.hash) {
      files.push({
        path: file.path,
        op: "upsert",
        content: file.content,
        hash: file.hash,
      })
    }
  }
  for (const [remotePath] of remote) {
    if (!localPaths.has(remotePath)) {
      files.push({ path: remotePath, op: "delete" })
    }
  }
  const snapshot = await buildSnapshot(boardPath)
  const result = await api(baseUrl, token, "PUT", "/board-sync", {
    files,
    snapshot,
  })
  if (result.status === 401) {
    const err = new Error(
      "Sync token was rejected. Copy a fresh token from Cloud Settings.",
    )
    err.code = 401
    throw err
  }
  if (!result.ok) {
    throw new Error(result.data.message || `Sync failed (${result.status})`)
  }
  return {
    projectName: manifest.data.projectName,
    slug: manifest.data.slug,
    changed: files.length,
    version: result.data.version,
  }
}

export async function runBoardSync({ boardPath, watch }) {
  const first = await syncBoardOnce(boardPath)
  console.log(
    `[taskmark sync] ${first.projectName} (${first.slug}) — ${first.changed} file(s), version ${first.version}`,
  )
  if (!watch) return () => {}

  let debounce = null
  let stopped = false
  const stopWatch = watchBoardMarkdown(boardPath, () => {
    if (stopped) return
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(async () => {
      try {
        const next = await syncBoardOnce(boardPath)
        console.log(
          `[taskmark sync] ${next.projectName} — ${next.changed} file(s), version ${next.version}`,
        )
      } catch (err) {
        console.error(`[taskmark sync] ${err.message || err}`)
        if (err.code === 401) {
          stopped = true
          stopWatch()
        }
      }
    }, 2000)
  })
  return () => {
    stopped = true
    stopWatch()
    if (debounce) clearTimeout(debounce)
  }
}
