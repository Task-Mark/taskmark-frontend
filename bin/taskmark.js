#!/usr/bin/env node
import { spawn } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import net from "node:net"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

import { resolveServeBoard } from "./lib/resolve-board.mjs"
import { runBoardSync } from "./lib/sync-board.mjs"
import { stageUiForDev } from "./lib/stage-ui.mjs"
import { startStaticServer } from "./lib/static-preview.mjs"
import { watchBoardMarkdown } from "./lib/watch-board-markdown.mjs"

const DEFAULT_PORT = 8275
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, "..")
const requireFromPackage = createRequire(path.join(packageRoot, "package.json"))

function printHelp() {
  console.log(`Usage:
  taskmark [options]              smart default: local board if found, else setup
  taskmark open [options]
  taskmark serve [options]
  taskmark dev [options]
  taskmark build [options]
  taskmark sync [options]
  taskmark preview [options]
  taskmark init [--yes ...]
  taskmark reconcile [--last <n>] [--branch <name>]...
  taskmark secret rotate

Commands:
  init               Set up this project step by step: board, Taskmark Cloud project,
                     GitHub / Bitbucket App, AI key, commit hook, agent instructions,
                     migration and first reconciliation. Re-run it to change answers.
                     For CI: init --yes --provider github|bitbucket --ai anthropic|openai
                     (key in TASKMARK_AI_KEY); init --help lists every option
  reconcile          Read the recent commits of each stage branch, show what is in
                     development, in quality and shipped, and review the proposals:
                     reconcile [--last 30] [--branch <name>]...
  secret rotate      Replace the project secret in the board .config with a new one
  (default)          Bind to a board in/near cwd when one exists; otherwise open
                     the standalone setup / project picker (same as global use)
  open               Always start in workspace mode (setup / project picker)
  serve              Start the prebuilt UI bound to one resolved board (port ${DEFAULT_PORT})
  dev                Next.js development server with board markdown live reload
                     (cloud sync starts from the board .config token)
  build              Production static HTML export for Vercel / static hosting
  sync               Push board markdown to Taskmark Cloud using board .config
  preview            Serve an existing static export (default: <board>/out)
  migrate            Move a legacy epics/ board to requests/ (one request per epic)
  stages             Read develop / quality / main in the code repos and show the
                     stage each task has reached (read only: the GitHub /
                     Bitbucket App writes stages to the board)
  hooks install      Install the git hook that adds the task id to commits made
                     on a task branch (removes the old post-merge hook)
  ai set             Give this board its own AI key for the GitHub / Bitbucket App:
                     ai set --provider anthropic|openai [--model <id>] [--key <key>]
                     (without --key: TASKMARK_AI_KEY, else a hidden prompt)
  ai status          Show the provider, model and last 4 characters of the key
  ai clear           Remove the board's AI key (the App falls back to the server default)
  app status         Show the GitHub / Bitbucket App connection of this board: provider,
                     repos, board repo, mode, enabled, AI key, webhooks
  app connect github|bitbucket
                     Connect the board's project to the App with the sync token, then
                     open the install / authorize page:
                     [--repo <owner>/<repo>]... (default: the board's code repos on
                     that provider) [--board-repo <provider>:<owner>/<repo>[@branch][:root]]
                     (default: the board's own origin) [--mode shadow|write]
  app mode shadow|write
                     shadow: the App only proposes; write: it updates the board
  app disable        Stop reconciling on push (app enable turns it back on)

Options:
  --port, -p <n>     Listen port (default ${DEFAULT_PORT}; env PORT / TASKMARK_PORT)
  --board <path>     Board or product root (sets TASKMARK_BOARD)
  --workspace, -w    Force multi-project / setup mode (skip local board binding)
  --out <dir>        Static output directory for build/preview (default: <board>/out)
  --sync             Kept for compatibility; bound dev/serve always watch .config
  --watch            Keep syncing when markdown changes (sync command)
  --dry-run          Show what migrate would change without writing
  --fetch            Fetch the code repos before reading branches (stages)
  --repo <path>      Code repository to read or hook (repeatable; default: board
                     package.json "taskmark.repos", else REPOS.md)
  --quiet            Print nothing unless something fails (stages)
  --no-open          Do not open a browser (default / open / serve / preview / dev)
  --help, -h         Show help

Modes:
  Bound      One board from --board / env / cwd / sibling *-taskmark; no project picker.
  Workspace  Setup wizard + app-bar project picker (cookies). Used when no local
             board is found, or with open / --workspace.

Board resolution for bound mode (same as the UI):
  1. --board / TASKMARK_BOARD
  2. TASKMARK_MASTER
  3. TASKMARK_CWD → npm INIT_CWD → process.cwd()
     (product root with ./taskmark/, or dedicated *-taskmark root)
  4. Sibling <parent>-taskmark next to a product repo (multi-git)

Examples:
  npx @taskmark/ui                 # global: setup / pick projects
  cd my-app-taskmark && npx taskmark   # local board in this folder
  npm i @taskmark/ui --save && npx taskmark serve
  npx taskmark init                # set up or change this project
  npx taskmark open                # force setup even inside a board folder
  npx taskmark dev --board .
  npx taskmark build --board .
  npx taskmark ai set --provider anthropic   # prompts for the key, never prints it
  npx taskmark app connect bitbucket --repo acme/api --repo acme/web
  npx taskmark app connect github --board-repo github:acme/shop-taskmark@main
  npm run preview
  TASKMARK_BOARD=/path/to/board npx taskmark serve
`)
}

function parseArgs(argv) {
  const args = {
    command: null,
    port: null,
    board: null,
    out: null,
    open: true,
    workspace: false,
    help: false,
    sync: false,
    watch: false,
    dryRun: false,
    fetch: false,
    quiet: false,
    repos: [],
    positional: [],
  }
  const rest = [...argv]
  if (rest.length === 0) {
    args.command = "auto"
    return args
  }
  // Bare `taskmark` with only flags → smart default (local board or setup).
  args.command = rest[0].startsWith("-") ? "auto" : rest.shift()
  while (rest.length) {
    const token = rest.shift()
    if (token === "--help" || token === "-h") {
      args.help = true
    } else if (token === "--no-open") {
      args.open = false
    } else if (token === "--workspace" || token === "-w") {
      args.workspace = true
    } else if (token === "--sync") {
      args.sync = true
    } else if (token === "--watch") {
      args.watch = true
    } else if (token === "--dry-run") {
      args.dryRun = true
    } else if (token === "--fetch") {
      args.fetch = true
    } else if (token === "--quiet") {
      args.quiet = true
    } else if (token === "--repo") {
      args.repos.push(rest.shift())
    } else if (token === "--port" || token === "-p") {
      args.port = rest.shift()
    } else if (token === "--board") {
      args.board = rest.shift()
    } else if (token === "--out") {
      args.out = rest.shift()
    } else if (token.startsWith("--port=")) {
      args.port = token.slice("--port=".length)
    } else if (token.startsWith("--board=")) {
      args.board = token.slice("--board=".length)
    } else if (token.startsWith("--out=")) {
      args.out = token.slice("--out=".length)
    } else if (!token.startsWith("-")) {
      args.positional.push(token)
    } else {
      console.error(`Unknown argument: ${token}`)
      args.help = true
    }
  }
  return args
}

function resolvePort(raw) {
  const fromEnv = process.env.TASKMARK_PORT || process.env.PORT
  const value = raw ?? fromEnv ?? String(DEFAULT_PORT)
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new Error(`Invalid port: ${value}`)
  }
  return n
}

function resolveNextBin() {
  try {
    return requireFromPackage.resolve("next/dist/bin/next")
  } catch {
    const fallback = path.join(
      packageRoot,
      "node_modules",
      "next",
      "dist",
      "bin",
      "next"
    )
    if (fs.existsSync(fallback)) return fallback
    throw new Error(
      "next binary not found. Reinstall @taskmark/ui (next is required for serve/dev)."
    )
  }
}

/**
 * A `taskmark build` writes an `output: export` build. It has a server/ dir but
 * serves prerendered HTML with the static runtime baked in, so `serve` must not
 * reuse it.
 */
function isStaticExportBuild(dir) {
  return fs.existsSync(path.join(dir, "export-detail.json"))
}

function hasServerBuild(dir) {
  return fs.existsSync(path.join(dir, "server")) && !isStaticExportBuild(dir)
}

/**
 * Ensure packageRoot/.next points at a usable production build.
 * Published packages ship dist/prod-next (npm cannot pack nested node_modules
 * used by Next standalone).
 */
function ensureProdNext() {
  const nextDir = path.join(packageRoot, ".next")
  const shipped = path.join(packageRoot, "dist", "prod-next")
  const hasLocalServer = hasServerBuild(nextDir)
  const hasShippedServer = hasServerBuild(shipped)

  if (hasLocalServer) return nextDir
  if (!hasShippedServer) {
    throw new Error(`Prebuilt UI not found.

Expected ${shipped} (or a local .next/server from npm run build).
Reinstall @taskmark/ui or rebuild the package.`)
  }

  if (fs.existsSync(nextDir)) {
    const st = fs.lstatSync(nextDir)
    if (st.isSymbolicLink() || st.isDirectory()) {
      fs.rmSync(nextDir, { recursive: true, force: true })
    }
  }

  try {
    const type = process.platform === "win32" ? "junction" : "dir"
    fs.symlinkSync(shipped, nextDir, type)
  } catch {
    fs.cpSync(shipped, nextDir, { recursive: true })
  }
  return nextDir
}

function touchDevReloadToken(root) {
  const tokenFile = path.join(root, "lib", "taskmark", "dev-reload-token.ts")
  const stamp = String(Date.now())
  fs.writeFileSync(
    tokenFile,
    `/**\n * Touched by \`taskmark dev\` when board markdown changes so Next Fast Refresh\n * re-runs server components that import this module.\n */\nexport const DEV_RELOAD_TOKEN = "${stamp}"\n`,
    "utf8"
  )
}

function openBrowser(url) {
  const platform = process.platform
  let cmd
  let cmdArgs
  if (platform === "darwin") {
    cmd = "open"
    cmdArgs = [url]
  } else if (platform === "win32") {
    cmd = "cmd"
    cmdArgs = ["/c", "start", "", url]
  } else {
    cmd = "xdg-open"
    cmdArgs = [url]
  }
  const child = spawn(cmd, cmdArgs, {
    stdio: "ignore",
    detached: true,
  })
  child.on("error", () => {
    console.log(`Open this URL in your browser: ${url}`)
  })
  child.unref()
}

function waitForServer(port, timeoutMs = 60_000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(
        { host: "127.0.0.1", port, path: "/", timeout: 2000 },
        (res) => {
          res.resume()
          resolve()
        }
      )
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Server did not become ready on port ${port}`))
          return
        }
        setTimeout(tryOnce, 250)
      })
    }
    tryOnce()
  })
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer()
    probe.once("error", () => resolve(false))
    probe.once("listening", () => probe.close(() => resolve(true)))
    probe.listen(port, "0.0.0.0")
  })
}

/**
 * Next reports a busy port as a raw EADDRINUSE stack. Fail earlier with the
 * options that actually unblock the user, and never silently switch ports:
 * two boards on two ports are harder to reason about than one clear error.
 */
async function ensurePortFreeOrExit(port, command) {
  if (await isPortFree(port)) return
  console.error(`Port ${port} is already in use.

Another Taskmark board or a leftover process is listening on it.

Use another port:  npx taskmark ${command} --port ${port + 1}
Find the process:  lsof -i :${port}`)
  process.exit(1)
}

function callerCwd() {
  return process.env.INIT_CWD || process.cwd()
}

async function maybeStartCloudSync(args, boardPath) {
  if (!args.sync) return () => {}
  try {
    return await runBoardSync({ boardPath, watch: true })
  } catch (err) {
    console.error(`[taskmark sync] ${err.message || err}`)
    return () => {}
  }
}

function isWorkspaceRun(args) {
  return args.command === "open" || args.workspace === true
}

/**
 * Decide bound vs workspace for the default (`auto`) command.
 * Returns a serve-compatible args object with workspace forced when unbound.
 */
function resolveAutoArgs(args) {
  if (args.workspace) {
    return { ...args, command: "open", workspace: true }
  }
  if (args.board) {
    return { ...args, command: "serve", workspace: false }
  }
  const resolved = resolveServeBoard(null)
  if (resolved) {
    return { ...args, command: "serve", workspace: false }
  }
  return { ...args, command: "open", workspace: true }
}

/**
 * Workspace mode must out-rank an inherited board bind, so blank those vars for
 * the child (the UI reads empty as unset) instead of only adding the flag.
 */
function workspaceEnv() {
  return {
    TASKMARK_WORKSPACE: "1",
    TASKMARK_WORKSPACE_ROOT: callerCwd(),
    TASKMARK_BOARD: "",
    TASKMARK_MASTER: "",
    TASKMARK_CWD: "",
  }
}

function resolveBoardOrExit(boardArg, command) {
  const resolved = resolveServeBoard(boardArg)
  if (!resolved) {
    console.error(`No Taskmark board found.

Looked for:
  - --board / TASKMARK_BOARD
  - TASKMARK_MASTER
  - cwd layouts: nested ./taskmark/ or dedicated *-taskmark root
  - sibling <parent>-taskmark beside a product repo

Fix: cd into a product repo (with ./taskmark/) or a board root, or set TASKMARK_BOARD.
Then re-run: npx taskmark ${command}
(or: npx -p @taskmark/ui taskmark ${command})

To pick a project in the browser instead: npx taskmark`)
    process.exit(1)
  }
  return resolved
}

function attachChildLifecycle(child, onShutdown) {
  const shutdown = (signal) => {
    onShutdown?.()
    if (!child.killed) child.kill(signal)
  }
  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))
  child.on("exit", (code, signal) => {
    onShutdown?.()
    if (signal) process.exit(1)
    process.exit(code ?? 0)
  })
  return shutdown
}

async function serve(args) {
  const workspace = isWorkspaceRun(args)
  const resolved = workspace ? null : resolveBoardOrExit(args.board, "serve")
  const port = resolvePort(args.port)
  const url = `http://localhost:${port}`
  const nextBin = resolveNextBin()

  try {
    ensureProdNext()
  } catch (err) {
    console.error(String(err?.message || err))
    process.exit(1)
  }

  await ensurePortFreeOrExit(port, workspace ? "open" : "serve")

  console.log(`Taskmark UI`)
  if (workspace) {
    console.log(`  mode:   workspace (choose projects in the browser)`)
    console.log(`  from:   ${callerCwd()}`)
  } else {
    console.log(`  board:  ${resolved.boardPath} (${resolved.source})`)
  }
  console.log(`  listen: ${url}`)

  const child = spawn(
    process.execPath,
    [nextBin, "start", "-H", "0.0.0.0", "-p", String(port)],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: "0.0.0.0",
        TASKMARK_UI_PACKAGE_ROOT: packageRoot,
        ...(workspace
          ? workspaceEnv()
          : { TASKMARK_BOARD: resolved.boardPath }),
        NODE_ENV: "production",
      },
      stdio: "inherit",
    }
  )

  let stopSync = () => {}
  if (!workspace) {
    stopSync = await maybeStartCloudSync(
      { ...args, sync: true },
      resolved.boardPath,
    )
  }
  const shutdown = attachChildLifecycle(child, stopSync)

  const hosted =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.NOW_REGION) ||
    process.env.CI === "true"
  const shouldOpen = args.open && !hosted

  try {
    await waitForServer(port)
    if (shouldOpen) {
      openBrowser(url)
    } else {
      console.log(`Ready: ${url}`)
    }
  } catch (err) {
    console.error(String(err?.message || err))
    shutdown("SIGTERM")
    process.exit(1)
  }
}

async function dev(args) {
  const workspace = isWorkspaceRun(args)
  const resolved = workspace ? null : resolveBoardOrExit(args.board, "dev")
  const port = resolvePort(args.port)
  const url = `http://localhost:${port}`
  const nextBin = resolveNextBin()

  await ensurePortFreeOrExit(port, "dev")

  let stage
  try {
    stage = stageUiForDev({
      packageRoot,
      board: workspace ? null : resolved.boardPath,
    })
  } catch (err) {
    console.error(
      `Failed to stage the UI for development: ${err?.message || err}`
    )
    process.exit(1)
  }
  const devRoot = stage.root

  console.log(`Taskmark UI (dev)`)
  if (workspace) {
    console.log(`  mode:   workspace (choose projects in the browser)`)
    console.log(`  from:   ${callerCwd()}`)
  } else {
    console.log(`  board:  ${resolved.boardPath} (${resolved.source})`)
  }
  console.log(`  listen: ${url}`)
  console.log(
    workspace
      ? `  watch:  off (no single board bound)`
      : `  watch:  **/*.md under board`
  )
  if (stage.staged) {
    console.log(`  stage:  ${devRoot}`)
  }

  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--webpack", "-H", "0.0.0.0", "-p", String(port)],
    {
      cwd: devRoot,
      env: {
        ...process.env,
        PORT: String(port),
        TASKMARK_UI_PACKAGE_ROOT: packageRoot,
        ...(workspace
          ? workspaceEnv()
          : {
              TASKMARK_BOARD: resolved.boardPath,
              TASKMARK_CWD: resolved.boardPath,
            }),
        NODE_ENV: "development",
      },
      stdio: "inherit",
    }
  )

  let debounce = null
  const stopWatch = workspace
    ? () => {}
    : watchBoardMarkdown(resolved.boardPath, () => {
        if (debounce) clearTimeout(debounce)
        debounce = setTimeout(() => {
          try {
            touchDevReloadToken(devRoot)
            console.log(`[taskmark] board markdown changed — refreshing`)
          } catch (err) {
            console.warn(
              `[taskmark] reload touch failed: ${err?.message || err}`
            )
          }
        }, 200)
      })

  let stopSync = () => {}
  if (!workspace) {
    stopSync = await maybeStartCloudSync(
      { ...args, sync: true },
      resolved.boardPath,
    )
  }
  const shutdown = attachChildLifecycle(child, () => {
    stopWatch()
    stopSync()
    if (debounce) clearTimeout(debounce)
  })

  const hosted =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.NOW_REGION) ||
    process.env.CI === "true"
  const shouldOpen = args.open && !hosted

  try {
    await waitForServer(port, 120_000)
    if (shouldOpen) {
      openBrowser(url)
    } else {
      console.log(`Ready: ${url}`)
    }
  } catch (err) {
    console.error(String(err?.message || err))
    shutdown("SIGTERM")
    process.exit(1)
  }
}

async function preview(args) {
  const callerCwd = process.env.INIT_CWD || process.cwd()

  function resolveCallerPath(p) {
    if (!p) return null
    return path.isAbsolute(p) ? path.resolve(p) : path.resolve(callerCwd, p)
  }

  const boardArg = resolveCallerPath(args.board)
  const resolved = resolveBoardOrExit(boardArg, "preview")

  const outDir = args.out
    ? resolveCallerPath(args.out)
    : path.join(resolved.boardPath, "out")

  if (!outDir || !fs.existsSync(outDir) || !fs.statSync(outDir).isDirectory()) {
    console.error(`Static export not found: ${outDir || "(missing)"}

Run a production build first:
  npx taskmark build --board .
  # or: npm run build

Then: npm run preview`)
    process.exit(1)
  }

  const port = resolvePort(args.port)
  const url = `http://localhost:${port}`

  console.log(`Taskmark static preview`)
  console.log(`  board:  ${resolved.boardPath} (${resolved.source})`)
  console.log(`  out:    ${outDir}`)
  console.log(`  listen: ${url}`)

  await startStaticServer({ root: outDir, port })

  const hosted =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.NOW_REGION) ||
    process.env.CI === "true"
  const shouldOpen = args.open && !hosted

  if (shouldOpen) {
    openBrowser(url)
  } else {
    console.log(`Ready: ${url}`)
  }
}

async function runAi(argv) {
  const { AI_USAGE, parseAiArgs, runAiCommand } = await import("./lib/ai-key.mjs")
  const args = parseAiArgs(argv)
  if (args.help) {
    console.log(AI_USAGE)
    return
  }
  if (args.error) {
    console.error(`${args.error}\n\n${AI_USAGE}`)
    process.exit(1)
  }
  try {
    const resolved = resolveBoardOrExit(args.board, `ai ${args.action}`)
    const code = await runAiCommand({ args, boardPath: resolved.boardPath })
    if (code !== 0) process.exit(code)
  } catch (err) {
    console.error(String(err?.message || err))
    process.exit(1)
  }
}

async function runApp(argv) {
  const { APP_USAGE, parseAppArgs, runAppCommand } = await import("./lib/app-connect.mjs")
  const args = parseAppArgs(argv)
  if (args.help) {
    console.log(APP_USAGE)
    return
  }
  if (args.error) {
    console.error(`${args.error}\n\n${APP_USAGE}`)
    process.exit(1)
  }
  try {
    const resolved = resolveBoardOrExit(args.board, `app ${args.action}`)
    const code = await runAppCommand({
      args,
      boardPath: resolved.boardPath,
      openUrl: openBrowser,
    })
    if (code !== 0) process.exit(code)
  } catch (err) {
    console.error(String(err?.message || err))
    process.exit(1)
  }
}

async function promptUi() {
  const { createClackUi, createDefaultsUi } = await import("./lib/prompts.mjs")
  return process.stdin.isTTY && process.stdout.isTTY ? createClackUi() : createDefaultsUi()
}

async function runInitCli(argv) {
  const { INIT_USAGE, parseInitArgs } = await import("./lib/init-args.mjs")
  const args = parseInitArgs(argv)
  if (args.help) {
    console.log(INIT_USAGE)
    return
  }
  if (args.error) {
    console.error(`${args.error}\n\n${INIT_USAGE}`)
    process.exit(1)
  }
  const { createDefaultsUi } = await import("./lib/prompts.mjs")
  const { runInit } = await import("./lib/init.mjs")
  const ui = args.yes ? createDefaultsUi() : await promptUi()
  const code = await runInit({ args, cwd: callerCwd(), ui, openUrl: openBrowser })
  process.exit(code)
}

async function runReconcileCli(argv) {
  const { RECONCILE_USAGE, parseReconcileArgs } = await import("./lib/init-args.mjs")
  const args = parseReconcileArgs(argv)
  if (args.help) {
    console.log(RECONCILE_USAGE)
    return
  }
  if (args.error) {
    console.error(`${args.error}\n\n${RECONCILE_USAGE}`)
    process.exit(1)
  }
  const resolved = resolveBoardOrExit(args.board, "reconcile")
  const { runReconcileCommand } = await import("./lib/init.mjs")
  const code = await runReconcileCommand({ args, boardPath: resolved.boardPath, ui: await promptUi() })
  process.exit(code)
}

async function runSecretCli(argv) {
  const { SECRET_USAGE, parseSecretArgs } = await import("./lib/init-args.mjs")
  const args = parseSecretArgs(argv)
  if (args.help) {
    console.log(SECRET_USAGE)
    return
  }
  if (args.error) {
    console.error(`${args.error}\n\n${SECRET_USAGE}`)
    process.exit(1)
  }
  const resolved = resolveBoardOrExit(args.board, "secret rotate")
  const { runSecretRotate } = await import("./lib/init.mjs")
  const code = await runSecretRotate({ args, boardPath: resolved.boardPath })
  process.exit(code)
}

async function main() {
  // `init`, `reconcile`, `secret`, `ai` and `app` have their own flags.
  const own = { init: runInitCli, reconcile: runReconcileCli, secret: runSecretCli }
  if (own[process.argv[2]]) {
    await own[process.argv[2]](process.argv.slice(3))
    return
  }
  if (process.argv[2] === "ai") {
    await runAi(process.argv.slice(3))
    return
  }
  if (process.argv[2] === "app") {
    await runApp(process.argv.slice(3))
    return
  }
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.command) {
    printHelp()
    process.exit(args.help || !args.command ? 0 : 1)
  }
  const workspaceCommands = new Set(["auto", "open", "serve", "dev"])
  if (args.workspace && !workspaceCommands.has(args.command)) {
    console.error(`--workspace applies to the default command, open, serve, and dev.

Use: npx taskmark  (or: npx taskmark open)`)
    process.exit(1)
  }
  if ((isWorkspaceRun(args) || (args.command === "auto" && args.workspace)) && args.board) {
    console.error(`--board and workspace mode are mutually exclusive.

Bind one board:      npx taskmark serve --board ${args.board}
Pick projects in UI: npx taskmark open`)
    process.exit(1)
  }
  if (args.command === "auto") {
    try {
      await serve(resolveAutoArgs(args))
    } catch (err) {
      console.error(String(err?.message || err))
      process.exit(1)
    }
    return
  }
  if (args.command === "open" || args.command === "serve") {
    try {
      await serve(args)
    } catch (err) {
      console.error(String(err?.message || err))
      process.exit(1)
    }
    return
  }
  if (args.command === "dev") {
    try {
      await dev(args)
    } catch (err) {
      console.error(String(err?.message || err))
      process.exit(1)
    }
    return
  }
  if (args.command === "preview") {
    try {
      await preview(args)
    } catch (err) {
      console.error(String(err?.message || err))
      process.exit(1)
    }
    return
  }
  if (args.command === "sync") {
    try {
      const resolved = resolveBoardOrExit(args.board, "sync")
      const stop = await runBoardSync({
        boardPath: resolved.boardPath,
        watch: Boolean(args.watch),
      })
      if (!args.watch) return
      const halt = () => {
        stop()
        process.exit(0)
      }
      process.on("SIGINT", halt)
      process.on("SIGTERM", halt)
      await new Promise(() => {})
    } catch (err) {
      console.error(String(err?.message || err))
      process.exit(1)
    }
    return
  }
  if (args.command === "migrate") {
    try {
      const resolved = resolveBoardOrExit(args.board, "migrate")
      const { migrateBoard } = await import("./lib/migrate-board.mjs")
      const result = migrateBoard({ boardPath: resolved.boardPath, dryRun: args.dryRun })
      if (result.requests.length === 0) {
        console.log("Nothing to migrate: this board has no legacy epics/ folder.")
        return
      }
      console.log(args.dryRun ? "Dry run, nothing written:\n" : "Migrated:\n")
      for (const r of result.requests) {
        console.log(`  ${r.epicId}  →  requests/${r.slug}/  (${r.status}, ${r.stagedLeaves} tasks marked as in production)`)
      }
      console.log(`\n${result.requests.length} requests, ${result.stagedLeaves} done tasks marked as in production.`)
      if (!args.dryRun) {
        console.log("Review the briefs, merge requests that belong together, then commit.")
      }
    } catch (err) {
      console.error(String(err?.message || err))
      process.exit(1)
    }
    return
  }
  if (args.command === "stages") {
    try {
      const resolved = resolveBoardOrExit(args.board, "stages")
      const { syncStages } = await import("./lib/stages.mjs")
      // Read only: reconciliation belongs to the GitHub / Bitbucket App.
      const options = { boardPath: resolved.boardPath, fetch: args.fetch, dryRun: true }
      if (args.repos.length) options.repos = args.repos.map((r) => path.resolve(r))
      const result = syncStages(options)
      if (args.quiet) return
      if (result.repos.length === 0) {
        console.log('No code repositories found. Add them to the board package.json: "taskmark": { "repos": ["../my-api"] }')
        return
      }
      for (const repo of result.repos) {
        const refs = Object.entries(repo.refs)
          .map(([stage, ref]) => `${stage}=${ref ?? "none"}`)
          .join(", ")
        console.log(`  ${repo.repo} (${repo.provider}): ${refs}`)
      }
      const c = result.stageCounts
      console.log(
        `\nThe App would update ${result.changes.length} tasks ` +
          `(${c.development} in development, ${c.testing} in testing, ${c.production} in production) ` +
          `and ${result.logFiles.length} log entries.`
      )
    } catch (err) {
      console.error(String(err?.message || err))
      process.exit(1)
    }
    return
  }
  if (args.command === "hooks") {
    try {
      if (args.positional[0] !== "install") {
        console.error("Usage: npx taskmark hooks install [--repo <path>] [--board <path>]")
        process.exit(1)
      }
      const resolved = resolveBoardOrExit(args.board, "hooks install")
      const { installHooks } = await import("./lib/hooks.mjs")
      const { resolveRepos } = await import("./lib/stages.mjs")
      const repos = args.repos.length
        ? args.repos.map((r) => path.resolve(r))
        : resolveRepos(resolved.boardPath)
      if (repos.length === 0) {
        console.log("No code repositories found. Pass --repo <path> or list them in the board package.json.")
        return
      }
      for (const repo of repos) {
        const result = installHooks({ repo })
        const skipped = result.skipped.length
          ? ` (left your own ${result.skipped.join(", ")} alone)`
          : ""
        const removed = result.removed.length ? ` (removed ${result.removed.join(", ")})` : ""
        console.log(`  ${path.basename(repo)}: ${result.written.join(", ") || "nothing written"}${removed}${skipped}`)
      }
    } catch (err) {
      console.error(String(err?.message || err))
      process.exit(1)
    }
    return
  }
  if (args.command === "build") {
    const buildScript = path.join(packageRoot, "scripts", "build-static.mjs")
    const callerCwd = process.env.INIT_CWD || process.cwd()
    const childArgs = [buildScript]
    if (args.board) {
      childArgs.push("--board", path.resolve(callerCwd, args.board))
    } else {
      childArgs.push("--board", callerCwd)
    }
    if (args.out) {
      childArgs.push("--out", path.resolve(callerCwd, args.out))
    }
    const child = spawn(process.execPath, childArgs, {
      cwd: packageRoot,
      env: {
        ...process.env,
        INIT_CWD: callerCwd,
        TASKMARK_CWD: process.env.TASKMARK_CWD || callerCwd,
      },
      stdio: "inherit",
    })
    child.on("exit", (code) => process.exit(code ?? 1))
    return
  }
  console.error(`Unknown command: ${args.command}`)
  printHelp()
  process.exit(1)
}

main()
