#!/usr/bin/env node
import { spawn } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { resolveServeBoard } from "./lib/resolve-board.mjs"
import { startStaticServer } from "./lib/static-preview.mjs"

const DEFAULT_PORT = 8275
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, "..")

function printHelp() {
  console.log(`Usage:
  taskmark serve [options]
  taskmark build [options]
  taskmark preview [options]

Commands:
  serve              Start the prebuilt local UI server (default port ${DEFAULT_PORT})
  build              Production static HTML export for Vercel / static hosting
  preview            Serve an existing static export (default: <board>/out)

Options:
  --port, -p <n>     Listen port (default ${DEFAULT_PORT}; env PORT / TASKMARK_PORT)
  --board <path>     Board or product root (sets TASKMARK_BOARD)
  --out <dir>        Static output directory for build/preview (default: <board>/out)
  --no-open          Do not open a browser (serve / preview)
  --help, -h         Show help

Board resolution (same as the UI):
  1. --board / TASKMARK_BOARD
  2. TASKMARK_MASTER
  3. TASKMARK_CWD → npm INIT_CWD → process.cwd()
     (product root with ./taskmark/, or dedicated *-taskmark root)

Examples:
  npm i @taskmark/ui --save && npx taskmark serve
  npx taskmark build --board .
  npm run preview
  npx taskmark preview --port 9000
  npx -p @taskmark/ui taskmark serve
  TASKMARK_BOARD=/path/to/my-app/taskmark npx taskmark serve
`)
}

function parseArgs(argv) {
  const args = {
    command: null,
    port: null,
    board: null,
    out: null,
    open: true,
    help: false,
  }
  const rest = [...argv]
  if (rest.length === 0 || rest[0] === "--help" || rest[0] === "-h") {
    args.help = true
    return args
  }
  args.command = rest.shift()
  while (rest.length) {
    const token = rest.shift()
    if (token === "--help" || token === "-h") {
      args.help = true
    } else if (token === "--no-open") {
      args.open = false
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

function findStandaloneServer() {
  const candidates = [
    path.join(packageRoot, "dist", "standalone", "server.js"),
    path.join(packageRoot, ".next", "standalone", "server.js"),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
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

async function serve(args) {
  const resolved = resolveServeBoard(args.board)
  if (!resolved) {
    console.error(`No Taskmark board found.

Looked for:
  - --board / TASKMARK_BOARD
  - TASKMARK_MASTER
  - cwd layouts: nested ./taskmark/ or dedicated *-taskmark root

Fix: cd into a product repo (with ./taskmark/) or a board root, or set TASKMARK_BOARD.
Then re-run: npx taskmark serve
(or: npx -p @taskmark/ui taskmark serve)`)
    process.exit(1)
  }

  const serverJs = findStandaloneServer()
  if (!serverJs) {
    console.error(`Prebuilt server not found.

From the taskmark package source, run:
  npm run build

Or install a published build that includes dist/standalone.`)
    process.exit(1)
  }

  const port = resolvePort(args.port)
  const url = `http://localhost:${port}`
  const standaloneDir = path.dirname(serverJs)

  console.log(`Taskmark UI`)
  console.log(`  board:  ${resolved.boardPath} (${resolved.source})`)
  console.log(`  listen: ${url}`)

  const child = spawn(process.execPath, [serverJs], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "0.0.0.0",
      TASKMARK_BOARD: resolved.boardPath,
    },
    stdio: "inherit",
  })

  const shutdown = (signal) => {
    if (!child.killed) child.kill(signal)
  }
  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  child.on("exit", (code, signal) => {
    if (signal) process.exit(1)
    process.exit(code ?? 0)
  })

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

async function preview(args) {
  const callerCwd = process.env.INIT_CWD || process.cwd()

  function resolveCallerPath(p) {
    if (!p) return null
    return path.isAbsolute(p) ? path.resolve(p) : path.resolve(callerCwd, p)
  }

  const boardArg = resolveCallerPath(args.board)
  const resolved = resolveServeBoard(boardArg)
  if (!resolved) {
    console.error(`No Taskmark board found.

Looked for:
  - --board / TASKMARK_BOARD
  - TASKMARK_MASTER
  - cwd layouts: nested ./taskmark/ or dedicated *-taskmark root

Fix: cd into a product repo (with ./taskmark/) or a board root, or set TASKMARK_BOARD.
Then re-run: npx taskmark preview`)
    process.exit(1)
  }

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

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.command) {
    printHelp()
    process.exit(args.help || !args.command ? 0 : 1)
  }
  if (args.command === "serve") {
    try {
      await serve(args)
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
  if (args.command === "build") {
    const buildScript = path.join(packageRoot, "scripts", "build-static.mjs")
    // Resolve relative paths against the caller's cwd (npm/yarn script dir),
    // not packageRoot — the child runs with cwd = @taskmark/ui.
    const callerCwd = process.env.INIT_CWD || process.cwd()
    const childArgs = [buildScript]
    if (args.board) {
      childArgs.push("--board", path.resolve(callerCwd, args.board))
    } else {
      // Prefer the invoke directory as the board when no --board flag.
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
