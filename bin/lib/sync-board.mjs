import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

import { snapshotExternals } from "./snapshot-externals.mjs"
import { watchBoardMarkdown } from "./watch-board-markdown.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, "../..")

/** Hosted Taskmark Cloud. Self-hosted or local setups override with TASKMARK_CLOUD_URL. */
export const DEFAULT_CLOUD_URL = "https://cloud.taskmark.dev"

/** The API rejects batches over 400 files; stay well under to bound body size too. */
const UPLOAD_BATCH_SIZE = 200

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

/**
 * The snapshot sources import through the `@/` alias, which no TypeScript
 * runner resolves once the package sits under node_modules. Bundling with an
 * explicit alias is the same escape hatch the static build uses.
 */
function bundleSnapshotPrinter() {
  const requireFromPackage = createRequire(path.join(packageRoot, "package.json"))
  let esbuild
  try {
    esbuild = requireFromPackage("esbuild")
  } catch {
    throw new Error(
      "esbuild is missing from @taskmark/ui dependencies (needed for the board snapshot).",
    )
  }
  const outFile = path.join(
    packageRoot,
    ".taskmark-build",
    "print-board-snapshot.mjs",
  )
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  const result = esbuild.buildSync({
    entryPoints: [path.join(packageRoot, "scripts/print-board-snapshot.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outFile,
    external: snapshotExternals(packageRoot),
    alias: { "@": packageRoot },
    logLevel: "warning",
  })
  if (result.errors?.length) {
    throw new Error("Failed to bundle the board snapshot builder.")
  }
  return outFile
}

async function buildSnapshot(boardPath) {
  const printer = bundleSnapshotPrinter()
  return await new Promise((resolve, reject) => {
    const chunks = []
    const errChunks = []
    const child = spawn(process.execPath, [printer], {
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
  const url = `${baseUrl.replace(/\/$/, "")}/v1${pathname}`
  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (cause) {
    throw new Error(
      `Cannot reach ${url} (${cause.message || cause}). Set TASKMARK_CLOUD_URL to your Taskmark Cloud origin.`,
      { cause },
    )
  }
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

function log(message) {
  console.log(`[taskmark sync] ${message}`)
}

function rejectedToken() {
  const err = new Error(
    "Sync token was rejected. Copy a fresh token from Cloud Settings.",
  )
  err.code = 401
  return err
}

export async function syncBoardOnce(boardPath) {
  loadBoardEnv(boardPath)
  const token = process.env.TASKMARK_SYNC_TOKEN?.trim()
  if (!token) {
    throw new Error(
      "TASKMARK_SYNC_TOKEN is not set. Copy it from Taskmark Cloud Settings.",
    )
  }
  const baseUrl = process.env.TASKMARK_CLOUD_URL?.trim() || DEFAULT_CLOUD_URL
  log(`cloud ${baseUrl}`)
  const manifest = await api(baseUrl, token, "GET", "/board-sync/manifest")
  if (manifest.status === 401) throw rejectedToken()
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
  const upserts = files.filter((file) => file.op === "upsert").length
  const deletes = files.length - upserts
  log(
    `${manifest.data.projectName} (${manifest.data.slug}) — ${local.length} local file(s), ${upserts} changed, ${deletes} removed`,
  )
  if (!files.length) {
    log("already up to date")
    return {
      projectName: manifest.data.projectName,
      slug: manifest.data.slug,
      changed: 0,
      version: null,
    }
  }
  log("building board snapshot")
  const snapshot = await buildSnapshot(boardPath)
  const batches = []
  for (let i = 0; i < files.length; i += UPLOAD_BATCH_SIZE) {
    batches.push(files.slice(i, i + UPLOAD_BATCH_SIZE))
  }
  let version = null
  for (const [index, batch] of batches.entries()) {
    const last = index === batches.length - 1
    log(
      batches.length > 1
        ? `uploading batch ${index + 1}/${batches.length} (${batch.length} file(s))`
        : `uploading ${batch.length} file(s)`,
    )
    // The snapshot rides the final batch so the cloud never renders a board
    // that is ahead of the files it was built from.
    const result = await api(baseUrl, token, "PUT", "/board-sync", {
      files: batch,
      ...(last ? { snapshot } : {}),
    })
    if (result.status === 401) throw rejectedToken()
    if (!result.ok) {
      throw new Error(result.data.message || `Sync failed (${result.status})`)
    }
    version = result.data.version
  }
  log(`done — board version ${version}`)
  return {
    projectName: manifest.data.projectName,
    slug: manifest.data.slug,
    changed: files.length,
    version,
  }
}

export async function runBoardSync({ boardPath, watch }) {
  if (!watch) {
    await syncBoardOnce(boardPath)
    return () => {}
  }

  // A cloud that is down at startup must not cost the whole dev session its
  // watcher, so only a rejected token is fatal here.
  try {
    await syncBoardOnce(boardPath)
  } catch (err) {
    if (err.code === 401) throw err
    console.error(`[taskmark sync] ${err.message || err}`)
    log("staying in watch mode — will retry on the next markdown change")
  }

  let debounce = null
  let stopped = false
  const stopWatch = watchBoardMarkdown(boardPath, () => {
    if (stopped) return
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(async () => {
      log("markdown changed")
      try {
        await syncBoardOnce(boardPath)
      } catch (err) {
        console.error(`[taskmark sync] ${err.message || err}`)
        if (err.code === 401) {
          stopped = true
          stopWatch()
        }
      }
    }, 2000)
  })
  log("watching board markdown")
  return () => {
    stopped = true
    stopWatch()
    if (debounce) clearTimeout(debounce)
  }
}
