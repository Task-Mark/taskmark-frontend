/**
 * Arguments for `taskmark init`, `taskmark reconcile` and `taskmark secret`.
 * Parsers never throw; problems land in `error`.
 */
import { AI_KEY_ENV, AI_PROVIDERS } from "./ai-key.mjs"
import { APP_PROVIDERS } from "./app-connect.mjs"
import { DEFAULT_BACKFILL_COMMITS, MAX_BACKFILL_COMMITS } from "./reconcile.mjs"

export const DEFAULT_MODELS = { anthropic: "claude-opus-5-5", openai: "gpt-4o-mini" }

export const INIT_USAGE = `Usage:
  npx taskmark init                 interactive setup (or re-run to change any answer)
  npx taskmark init --yes --provider github|bitbucket --ai anthropic|openai [options]

Sets up the board, registers the project on Taskmark Cloud, connects the
GitHub / Bitbucket App, saves the AI key, installs the commit hook, writes the
agent instructions, migrates a legacy board and runs the first reconciliation.

Options for --yes (no questions; required when there is no terminal):
  --provider github|bitbucket   git provider of the code repos
  --repo <owner>/<repo>         code repo to connect (repeatable; default: the
                                detected repos on that provider)
  --board-repo <provider>:<owner>/<repo>[@branch][:root]
                                where the board lives (default: its origin)
  --ai anthropic|openai         AI provider; the key is read from ${AI_KEY_ENV}
  --model <id>                  AI model (default: ${DEFAULT_MODELS.anthropic} / ${DEFAULT_MODELS.openai})
  --language <name>             board writing language (default: English)
  --skip-backfill               skip the first reconciliation
  --last <n>                    commits to read per stage branch (default ${DEFAULT_BACKFILL_COMMITS})
  --board <path>                board folder (default: detected)
  --no-open                     do not open the browser`

export const RECONCILE_USAGE = `Usage:
  npx taskmark reconcile [--last <n>] [--branch <name>]... [--board <path>]

Reads the last commits of each stage branch (default ${DEFAULT_BACKFILL_COMMITS}), shows the tasks in
development, in quality and shipped, and lets you review the proposed closes
and new tasks.`

export const SECRET_USAGE = `Usage:
  npx taskmark secret rotate [--board <path>]

Generates a new project secret, registers it on Taskmark Cloud and saves it in
the board .config. The old secret stops working.`

function makeParser(argv, args, spec) {
  const rest = [...argv]
  const positional = []
  const takeValue = (flag, inline) => {
    if (inline !== undefined) return inline
    const value = rest.shift()
    if (value === undefined || value.startsWith("--")) {
      args.error ??= `${flag} needs a value`
      if (value !== undefined) rest.unshift(value)
      return null
    }
    return value
  }
  while (rest.length) {
    const token = rest.shift()
    if (token === "--help" || token === "-h") {
      args.help = true
      continue
    }
    if (spec.flags[token]) {
      spec.flags[token]()
      continue
    }
    const eq = token.indexOf("=")
    const flag = token.startsWith("--") && eq > 0 ? token.slice(0, eq) : token
    const inline = token.startsWith("--") && eq > 0 ? token.slice(eq + 1) : undefined
    if (spec.values[flag]) {
      const value = takeValue(flag, inline)
      if (value !== null) spec.values[flag](value)
    } else if (!token.startsWith("-")) {
      positional.push(token)
    } else {
      args.error ??= `Unknown argument: ${token}`
    }
  }
  return positional
}

function parseCount(value, args, flag) {
  const n = Number.parseInt(value, 10)
  if (!/^\d+$/.test(value) || n < 1 || n > MAX_BACKFILL_COMMITS) {
    args.error ??= `${flag} needs a number between 1 and ${MAX_BACKFILL_COMMITS}`
    return null
  }
  return n
}

export function parseInitArgs(argv) {
  const args = {
    yes: false,
    provider: null,
    repos: [],
    boardRepo: null,
    ai: null,
    model: null,
    language: null,
    skipBackfill: false,
    last: null,
    board: null,
    cloudUrl: null,
    open: true,
    help: false,
    error: null,
  }
  const positional = makeParser(argv, args, {
    flags: {
      "--yes": () => (args.yes = true),
      "-y": () => (args.yes = true),
      "--skip-backfill": () => (args.skipBackfill = true),
      "--no-open": () => (args.open = false),
    },
    values: {
      "--provider": (v) => (args.provider = v.toLowerCase()),
      "--repo": (v) => args.repos.push(v),
      "--board-repo": (v) => (args.boardRepo = v),
      "--ai": (v) => (args.ai = v.toLowerCase()),
      "--model": (v) => (args.model = v),
      "--language": (v) => (args.language = v),
      "--last": (v) => (args.last = parseCount(v, args, "--last")),
      "--board": (v) => (args.board = v),
      "--cloud-url": (v) => (args.cloudUrl = v),
    },
  })
  if (positional.length) args.error ??= `Unexpected argument: ${positional[0]}`
  if (args.provider && !APP_PROVIDERS.includes(args.provider)) {
    args.error ??= `Unknown provider: ${args.provider} (use github or bitbucket)`
  }
  if (args.ai && !AI_PROVIDERS.includes(args.ai)) {
    args.error ??= `Unknown AI provider: ${args.ai} (use anthropic or openai)`
  }
  if (args.model && !args.ai) args.error ??= "--model needs --ai anthropic|openai"
  return args
}

/**
 * What a run without questions still needs. `existing` is what the project
 * already has (a connected provider, a saved AI key), which counts as an answer.
 * @returns {{ ok: boolean, missing: string[], message: string | null }}
 */
export function validateNonInteractive(args, { stdinIsTTY, env = process.env, existing = {} }) {
  if (stdinIsTTY && !args.yes) return { ok: true, missing: [], message: null }
  const missing = []
  if (!args.provider && !existing.provider) missing.push("--provider github|bitbucket")
  if (!args.ai && !existing.aiConfigured) missing.push("--ai anthropic|openai")
  if (args.ai && !env[AI_KEY_ENV]?.trim()) missing.push(`${AI_KEY_ENV} (the AI key, in the environment)`)
  if (!args.yes) {
    return {
      ok: false,
      missing,
      message: [
        "npx taskmark init asks questions, and there is no terminal to ask them in.",
        "Run it with --yes and the answers as flags:",
        ...(missing.length ? missing : ["(nothing else is missing)"]).map((m) => `  ${m}`),
        "Run npx taskmark init --help for every option.",
      ].join("\n"),
    }
  }
  if (!missing.length) return { ok: true, missing, message: null }
  return {
    ok: false,
    missing,
    message: ["npx taskmark init --yes is missing:", ...missing.map((m) => `  ${m}`)].join("\n"),
  }
}

export function parseReconcileArgs(argv) {
  const args = { last: null, branches: [], board: null, cloudUrl: null, help: false, error: null }
  const positional = makeParser(argv, args, {
    flags: {},
    values: {
      "--last": (v) => (args.last = parseCount(v, args, "--last")),
      "--branch": (v) => args.branches.push(v),
      "--board": (v) => (args.board = v),
      "--cloud-url": (v) => (args.cloudUrl = v),
    },
  })
  if (positional.length) args.error ??= `Unexpected argument: ${positional[0]}`
  return args
}

export function parseSecretArgs(argv) {
  const args = { action: null, board: null, cloudUrl: null, help: false, error: null }
  const positional = makeParser(argv, args, {
    flags: {},
    values: {
      "--board": (v) => (args.board = v),
      "--cloud-url": (v) => (args.cloudUrl = v),
    },
  })
  args.action = positional[0] ?? null
  if (!args.help && !args.error) {
    if (args.action !== "rotate") {
      args.error = args.action ? `Unknown secret command: ${args.action}` : "Missing secret command (use: secret rotate)"
    } else if (positional.length > 1) args.error = `Unexpected argument: ${positional[1]}`
  }
  return args
}
