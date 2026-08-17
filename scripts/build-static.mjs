#!/usr/bin/env node
/**
 * Production static HTML build for a Taskmark board.
 *
 * 1. Resolve board (TASKMARK_BOARD / cwd)
 * 2. Stage @taskmark/ui outside node_modules (Next won't transpile TS there)
 * 3. Write public/taskmark-snapshot.json
 * 4. next build with output: 'export'
 * 5. Copy out/ to --out (default: <board>/out)
 *
 * Usage:
 *   node scripts/build-static.mjs [--board <path>] [--out <dir>]
 *   npx taskmark build
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { resolveServeBoard } from "../bin/lib/resolve-board.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, "..")
const requireFromPackage = createRequire(path.join(packageRoot, "package.json"))

const STAGE_COPY = [
  "app",
  "components",
  "hooks",
  "lib",
  "public",
  "scripts",
  "next.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "tsconfig.snapshot.json",
  "components.json",
  "package.json",
]

function parseArgs(argv) {
  const args = { board: null, out: null }
  const rest = [...argv]
  while (rest.length) {
    const token = rest.shift()
    if (token === "--board") args.board = rest.shift()
    else if (token === "--out") args.out = rest.shift()
    else if (token?.startsWith("--board=")) args.board = token.slice(8)
    else if (token?.startsWith("--out=")) args.out = token.slice(6)
    else if (token === "--help" || token === "-h") args.help = true
    else {
      console.error(`Unknown argument: ${token}`)
      args.help = true
    }
  }
  return args
}

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, {
    cwd: opts.cwd ?? packageRoot,
    stdio: "inherit",
    env: opts.env ?? process.env,
    shell: false,
  })
  if (r.status !== 0) {
    throw new Error(`${cmd} ${cmdArgs.join(" ")} failed with exit ${r.status}`)
  }
}

function resolveNextBin(buildRoot) {
  const candidates = [
    path.join(buildRoot, "node_modules", "next", "dist", "bin", "next"),
    path.join(packageRoot, "node_modules", "next", "dist", "bin", "next"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error("[taskmark build] next binary not found under node_modules")
}

function loadEsbuild(fromRoot) {
  const req = createRequire(path.join(fromRoot, "package.json"))
  try {
    return req("esbuild")
  } catch {
    try {
      return requireFromPackage("esbuild")
    } catch {
      throw new Error(
        "[taskmark build] esbuild is missing from @taskmark/ui dependencies (needed for board snapshot)"
      )
    }
  }
}

function underNodeModules(dir) {
  return dir.split(path.sep).includes("node_modules")
}

/**
 * Next refuses to transpile app sources living under node_modules.
 * Copy the package to a board-local stage and reuse the board's node_modules.
 */
function stagePackageForBuild(board) {
  if (!underNodeModules(packageRoot)) {
    return { root: packageRoot, staged: false }
  }

  const stageDir = path.join(board, ".taskmark-ui-build")
  fs.rmSync(stageDir, { recursive: true, force: true })
  fs.mkdirSync(stageDir, { recursive: true })

  for (const name of STAGE_COPY) {
    const src = path.join(packageRoot, name)
    if (!fs.existsSync(src)) continue
    fs.cpSync(src, path.join(stageDir, name), { recursive: true })
  }

  const boardModules = path.join(board, "node_modules")
  const stageModules = path.join(stageDir, "node_modules")
  if (fs.existsSync(boardModules)) {
    fs.symlinkSync(boardModules, stageModules, "dir")
  } else {
    const pkgModules = path.join(packageRoot, "node_modules")
    if (fs.existsSync(pkgModules)) {
      fs.symlinkSync(pkgModules, stageModules, "dir")
    }
  }

  console.log(`[taskmark build] staged UI at ${stageDir}`)
  return { root: stageDir, staged: true }
}

/** Bundle snapshot writer so `@/` aliases resolve outside Next. */
function writeBoardSnapshot(buildRoot, env) {
  const esbuild = loadEsbuild(buildRoot)
  const entry = path.join(buildRoot, "scripts", "write-board-snapshot.ts")
  const outFile = path.join(buildRoot, ".taskmark-build", "write-board-snapshot.mjs")
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  const result = esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outFile,
    packages: "external",
    alias: { "@": buildRoot },
    logLevel: "warning",
  })
  if (result.errors?.length) {
    throw new Error("[taskmark build] Failed to bundle write-board-snapshot")
  }
  run(process.execPath, [outFile], { cwd: buildRoot, env })
}

function stashServerActions(buildRoot) {
  const stubs = {
    "app/board/actions.ts": `/** Stubbed for static export — server actions unsupported. */
// @ts-nocheck
export async function resolveWorkItemById(_itemId, _options) {
  return { ok: false, itemId: "", message: "Unavailable in static build" }
}
export async function loadWorkItemDetail(filePath = "", _hint) {
  return { ok: false, filePath, message: "Unavailable in static build" }
}
`,
    "app/setup/actions.ts": `/** Stubbed for static export — server actions unsupported. */
// @ts-nocheck
export type PreviewMasterFolderState = { error?: string; masterPath?: string; projects?: unknown[] }
export type SaveMasterFolderState = { error?: string }
export type PickMasterFolderState = { path?: string; error?: string }
export async function previewMasterFolder() {
  return { error: "Unavailable in static build" }
}
export async function saveMasterFolder() {
  return { error: "Unavailable in static build" }
}
export async function pickMasterFolder() {
  return { error: "Unavailable in static build" }
}
export async function selectActiveProject() {}
export async function openAddProject() {}
export async function resetWorkspace() {}
`,
  }
  const stashed = []
  for (const [rel, stub] of Object.entries(stubs)) {
    const full = path.join(buildRoot, rel)
    if (!fs.existsSync(full)) continue
    const bak = full + ".staticbak"
    fs.renameSync(full, bak)
    fs.writeFileSync(full, stub, "utf8")
    stashed.push({ full, bak })
  }
  // Route handlers are incompatible with `output: 'export'`. Park the backup
  // outside `app/` — a `.staticbak` suffix is still a routable segment there.
  const apiDir = path.join(buildRoot, "app", "api")
  if (fs.existsSync(apiDir)) {
    const bak = path.join(buildRoot, ".taskmark-build", "app-api.staticbak")
    fs.mkdirSync(path.dirname(bak), { recursive: true })
    fs.rmSync(bak, { recursive: true, force: true })
    fs.renameSync(apiDir, bak)
    stashed.push({ full: apiDir, bak, isDir: true })
  }
  return stashed
}

/**
 * `output: 'export'` rejects `force-dynamic`, but the local server needs it.
 * Swap the literal for the duration of the static build.
 */
function stashDynamicPages(buildRoot) {
  const pages = ["app/board/page.tsx", "app/setup/page.tsx"]
  const from = `export const dynamic = "force-dynamic"`
  const to = `export const dynamic = "force-static"`
  const stashed = []
  for (const rel of pages) {
    const full = path.join(buildRoot, rel)
    if (!fs.existsSync(full)) continue
    const src = fs.readFileSync(full, "utf8")
    if (!src.includes(from)) continue
    const bak = path.join(
      buildRoot,
      ".taskmark-build",
      rel.replace(/[\\/]/g, "__") + ".staticbak"
    )
    fs.mkdirSync(path.dirname(bak), { recursive: true })
    fs.copyFileSync(full, bak)
    fs.writeFileSync(full, src.replace(from, to), "utf8")
    stashed.push({ full, bak })
  }
  return stashed
}

function restoreServerActions(stashed) {
  for (const { full, bak } of stashed) {
    if (fs.existsSync(full)) {
      fs.rmSync(full, { recursive: true, force: true })
    }
    if (fs.existsSync(bak)) fs.renameSync(bak, full)
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(`Usage: node scripts/build-static.mjs [--board <path>] [--out <dir>]`)
    process.exit(0)
  }

  // When spawned from `taskmark build`, cwd is the UI package root. Relative
  // paths must use the caller's directory (INIT_CWD / TASKMARK_CWD).
  const callerCwd =
    process.env.INIT_CWD?.trim() ||
    process.env.TASKMARK_CWD?.trim() ||
    process.cwd()

  function resolveCallerPath(p) {
    if (!p) return null
    return path.isAbsolute(p) ? path.resolve(p) : path.resolve(callerCwd, p)
  }

  const boardArg = resolveCallerPath(args.board)
  if (boardArg) {
    process.env.TASKMARK_BOARD = boardArg
  }

  const resolved = resolveServeBoard(boardArg)
  if (!resolved) {
    console.error(
      "No Taskmark board found. Pass --board, set TASKMARK_BOARD, or run from a board root."
    )
    process.exit(1)
  }
  const board = resolved.boardPath

  const outDir = args.out
    ? resolveCallerPath(args.out)
    : path.join(board, "out")

  console.log(`[taskmark build] board: ${board}`)
  console.log(`[taskmark build] out:   ${outDir}`)

  const { root: buildRoot, staged } = stagePackageForBuild(board)

  const env = {
    ...process.env,
    TASKMARK_BOARD: board,
    TASKMARK_STATIC: "1",
    NEXT_PUBLIC_TASKMARK_STATIC: "1",
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      "https://taskmark.dev",
  }

  writeBoardSnapshot(buildRoot, env)

  const stashed = [
    ...stashServerActions(buildRoot),
    ...stashDynamicPages(buildRoot),
  ]
  try {
    run(process.execPath, [resolveNextBin(buildRoot), "build", "--webpack"], {
      cwd: buildRoot,
      env,
    })
    const nextOut = path.join(buildRoot, "out")
    if (!fs.existsSync(nextOut)) {
      throw new Error("[taskmark build] Missing Next out/ directory after build")
    }

    fs.rmSync(outDir, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(outDir), { recursive: true })
    fs.cpSync(nextOut, outDir, { recursive: true })
    console.log(`[taskmark build] Static site ready: ${outDir}`)
  } catch (err) {
    console.error(String(err?.message || err))
    process.exitCode = 1
  } finally {
    restoreServerActions(stashed)
    if (staged) {
      // Keep stage on failure for debugging; remove on success.
      if (!process.exitCode) {
        fs.rmSync(buildRoot, { recursive: true, force: true })
      }
    }
  }
}

main()
