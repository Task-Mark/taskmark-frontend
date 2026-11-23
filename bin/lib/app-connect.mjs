/**
 * `npx taskmark app`: connect this board's project to the Taskmark GitHub App
 * or Bitbucket app without the Cloud web app. Talks to Taskmark Cloud with the
 * board's sync token, like `taskmark sync` and `taskmark ai`.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import { DEFAULT_CLOUD_URL, loadBoardEnv } from "./sync-board.mjs"
import { describeAi } from "./ai-key.mjs"
import { resolveRepos } from "./stages.mjs"
import { resolveBoardSyncCredentials } from "../../lib/taskmark/sync-config.mjs"

export const APP_PROVIDERS = ["github", "bitbucket"]
export const APP_MODES = ["shadow", "write"]

const PROVIDER_LABELS = { github: "GitHub", bitbucket: "Bitbucket" }
const NAME = /^[A-Za-z0-9_.-]+$/
const ROOT = /^(?:[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)?$/
const BRANCH = /^[^\s~^:?*[\\]+$/
const STAGES = ["development", "testing", "production"]

export const APP_USAGE = `Usage:
  npx taskmark app status
  npx taskmark app connect github|bitbucket [--repo <owner>/<repo>]... [--board-repo <provider>:<owner>/<repo>[@branch][:root]] [--mode shadow|write]
  npx taskmark app mode shadow|write
  npx taskmark app disable
  npx taskmark app enable

connect saves the code repos and the board repo, then opens the GitHub App
install page or the Bitbucket authorization page in your browser.

Defaults for connect:
  --repo        the board's code repos (package.json "taskmark.repos", else
                REPOS.md) whose origin remote is on the chosen provider
  --board-repo  the board's own git origin, branch main (or origin's default
                branch), root "" for a dedicated board repo, else the board
                folder inside the repo
  --mode        shadow (the App proposes changes and writes nothing) on a new
                connection; unchanged on an existing one

Options:
  --board <path>  picks the board (its .config holds the sync token)
  --no-open       print the install URL without opening a browser`

// ------------------------------------------------------------------ parsing

/** Parses the arguments after `app`. Never throws; problems land in `error`. */
export function parseAppArgs(argv) {
  const args = {
    action: null,
    target: null,
    repos: [],
    boardRepo: null,
    mode: null,
    board: null,
    open: true,
    help: false,
    error: null,
  }
  const rest = [...argv]
  const takeValue = (flag) => {
    const value = rest.shift()
    if (value === undefined || value.startsWith("--")) {
      args.error ??= `${flag} needs a value`
      if (value !== undefined) rest.unshift(value)
      return null
    }
    return value
  }
  const positional = []
  while (rest.length) {
    const token = rest.shift()
    if (token === "--help" || token === "-h") {
      args.help = true
      continue
    }
    if (token === "--no-open") {
      args.open = false
      continue
    }
    const eq = token.indexOf("=")
    const flag = token.startsWith("--") && eq > 0 ? token.slice(0, eq) : token
    const inline = token.startsWith("--") && eq > 0 ? token.slice(eq + 1) : undefined
    if (flag === "--repo") {
      const value = inline ?? takeValue(flag)
      if (value) args.repos.push(value)
    } else if (flag === "--board-repo") {
      args.boardRepo = inline ?? takeValue(flag)
    } else if (flag === "--mode") {
      args.mode = inline ?? takeValue(flag)
    } else if (flag === "--board") {
      args.board = inline ?? takeValue(flag)
    } else if (!token.startsWith("-")) {
      positional.push(token)
    } else {
      args.error ??= `Unknown argument: ${token}`
    }
  }
  args.action = positional[0] ?? null
  args.target = positional[1] ?? null
  if (args.help || args.error) return args

  const extra = (count) => {
    if (positional.length > count) args.error = `Unexpected argument: ${positional[count]}`
  }
  switch (args.action) {
    case "status":
    case "enable":
    case "disable":
      extra(1)
      break
    case "mode":
      if (!args.target) args.error = "app mode needs shadow or write"
      else if (!APP_MODES.includes(args.target)) {
        args.error = `Unknown mode: ${args.target} (use shadow or write)`
      } else extra(2)
      break
    case "connect":
      if (!args.target) args.error = "app connect needs github or bitbucket"
      else if (!APP_PROVIDERS.includes(args.target)) {
        args.error = `Unknown provider: ${args.target} (use github or bitbucket)`
      } else if (args.mode && !APP_MODES.includes(args.mode)) {
        args.error = `Unknown mode: ${args.mode} (use shadow or write)`
      } else extra(2)
      break
    case null:
      args.error = "Missing app command"
      break
    default:
      args.error = `Unknown app command: ${args.action}`
  }
  if (!args.error && args.action !== "connect") {
    if (args.repos.length) args.error = "--repo is only used with app connect"
    else if (args.boardRepo) args.error = "--board-repo is only used with app connect"
    else if (args.mode) args.error = "--mode is only used with app connect (or: app mode shadow|write)"
  }
  return args
}

/** `<owner>/<repo>` (a Bitbucket workspace or a GitHub owner). */
export function parseRepoSpec(spec) {
  const match = /^([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(String(spec ?? "").trim())
  if (!match || !NAME.test(match[1]) || !NAME.test(match[2])) {
    throw new Error(`Invalid repo "${spec}": use <owner>/<repo>, for example acme/api`)
  }
  return { owner: match[1], name: match[2] }
}

/** `<provider>:<owner>/<repo>[@branch][:root]`. */
export function parseBoardRepoSpec(spec) {
  const raw = String(spec ?? "").trim()
  const invalid = (why) =>
    new Error(
      `Invalid --board-repo "${spec}": ${why}. Use <provider>:<owner>/<repo>[@branch][:root], for example github:acme/shop-taskmark@main`,
    )
  const colon = raw.indexOf(":")
  if (colon <= 0) throw invalid("missing the provider")
  const provider = raw.slice(0, colon).toLowerCase()
  if (!APP_PROVIDERS.includes(provider)) throw invalid(`unknown provider ${provider}`)
  let rest = raw.slice(colon + 1)
  let root = ""
  const rootAt = rest.indexOf(":")
  if (rootAt >= 0) {
    root = rest.slice(rootAt + 1).replace(/^\/+|\/+$/g, "")
    rest = rest.slice(0, rootAt)
  }
  let branch = "main"
  const branchAt = rest.indexOf("@")
  if (branchAt >= 0) {
    branch = rest.slice(branchAt + 1)
    rest = rest.slice(0, branchAt)
    if (!branch || !BRANCH.test(branch)) throw invalid("bad branch name")
  }
  let repo
  try {
    repo = parseRepoSpec(rest)
  } catch {
    throw invalid("expected <owner>/<repo>")
  }
  if (!ROOT.test(root)) throw invalid("bad root folder")
  return { provider, ...repo, branch, root }
}

/**
 * Owner, repo and provider from a GitHub or Bitbucket remote URL, SSH or
 * HTTPS. Null for other hosts or shapes.
 */
export function parseGitRemote(url) {
  const value = String(url ?? "").trim()
  if (!value) return null
  let host
  let repoPath
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/)(.+)$/.exec(value)
  if (scp && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    host = scp[1]
    repoPath = scp[2]
  } else {
    let parsed
    try {
      parsed = new URL(value)
    } catch {
      return null
    }
    host = parsed.hostname
    repoPath = decodeURIComponent(parsed.pathname)
  }
  host = host.toLowerCase()
  const provider = host.includes("github") ? "github" : host.includes("bitbucket") ? "bitbucket" : null
  if (!provider) return null
  const parts = repoPath.replace(/^\/+|\/+$/g, "").replace(/\.git$/, "").split("/")
  // Bitbucket Server style "scm/<project>/<repo>" is not Bitbucket Cloud.
  if (parts.length !== 2 || !NAME.test(parts[0]) || !NAME.test(parts[1])) return null
  return { provider, owner: parts[0], name: parts[1] }
}

// --------------------------------------------------------------------- git

function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()
}

function tryGit(repo, args) {
  try {
    return git(repo, args)
  } catch {
    return null
  }
}

function realpath(p) {
  try {
    return fs.realpathSync(p)
  } catch {
    return path.resolve(p)
  }
}

/** The repo holding the board, from its origin remote. */
export function detectBoardRepo(boardPath) {
  const top = tryGit(boardPath, ["rev-parse", "--show-toplevel"])
  if (!top) return { repo: null, reason: "the board folder is not a git repository" }
  const url = tryGit(top, ["remote", "get-url", "origin"])
  if (!url) return { repo: null, reason: "the board repository has no origin remote" }
  const remote = parseGitRemote(url)
  if (!remote) return { repo: null, reason: `origin (${url}) is not a GitHub or Bitbucket repository` }
  const head = tryGit(top, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"])
  const branch = head?.startsWith("origin/") && head.length > "origin/".length ? head.slice("origin/".length) : "main"
  const relative = path.relative(realpath(top), realpath(boardPath)).split(path.sep).join("/")
  const root = relative.startsWith("..") ? "" : relative
  return { repo: { ...remote, branch, root }, reason: null }
}

/** Stage branches set in the board package.json (`taskmark.branches`), else null. */
function configuredStageBranches(boardPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(boardPath, "package.json"), "utf8"))
    const branches = pkg?.taskmark?.branches
    if (!branches || typeof branches !== "object") return null
    const result = {}
    for (const stage of STAGES) {
      const value = branches[stage]
      const list = (Array.isArray(value) ? value : value ? [value] : []).filter(
        (b) => typeof b === "string" && BRANCH.test(b),
      )
      if (list.length) result[stage] = list
    }
    return Object.keys(result).length ? result : null
  } catch {
    return null
  }
}

/**
 * Code repos from the board's linked local clones, kept when their origin
 * is on `provider`. `skipped` explains the others.
 */
export function detectCodeRepos(boardPath, provider, { repoPaths = resolveRepos(boardPath) } = {}) {
  const repos = []
  const skipped = []
  for (const repoPath of repoPaths) {
    const label = path.basename(repoPath)
    const url = tryGit(repoPath, ["remote", "get-url", "origin"])
    if (!url) {
      skipped.push(`${label}: no origin remote`)
      continue
    }
    const remote = parseGitRemote(url)
    if (!remote) {
      skipped.push(`${label}: origin is not on GitHub or Bitbucket`)
      continue
    }
    if (remote.provider !== provider) {
      skipped.push(`${label}: on ${PROVIDER_LABELS[remote.provider]}`)
      continue
    }
    if (!repos.some((r) => `${r.owner}/${r.name}`.toLowerCase() === `${remote.owner}/${remote.name}`.toLowerCase())) {
      repos.push({ owner: remote.owner, name: remote.name })
    }
  }
  return { repos, skipped }
}

// ---------------------------------------------------------------- requests

function baseUrl(credentials) {
  return `${(credentials.cloudUrl || DEFAULT_CLOUD_URL).replace(/\/+$/, "")}/v1/board-sync/integration`
}

/** The HTTP request for one call against the board's cloud. */
export function buildAppRequest(call, credentials) {
  const url = baseUrl(credentials)
  const headers = { authorization: `Bearer ${credentials.token}` }
  if (call.kind === "put") {
    return {
      method: "PUT",
      url,
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(call.body),
    }
  }
  if (call.kind === "provider-url") {
    const suffix = call.provider === "github" ? "github/install-url" : "bitbucket/authorize-url"
    return { method: "GET", url: `${url}/${suffix}`, headers }
  }
  return { method: "GET", url, headers }
}

/** The PUT body for `app connect`. */
export function buildConnectBody({ provider, codeRepos, boardRepo, mode, stageBranches }) {
  const body = {
    provider,
    codeRepos: codeRepos.map((repo) => ({
      owner: repo.owner,
      name: repo.name,
      ...(stageBranches ? { stageBranches } : {}),
    })),
    boardRepo: {
      provider: boardRepo.provider,
      owner: boardRepo.owner,
      name: boardRepo.name,
      branch: boardRepo.branch,
      root: boardRepo.root,
    },
  }
  if (mode) body.mode = mode
  return body
}

// ---------------------------------------------------------------- printing

function repoLabel(repo) {
  return `${repo.owner}/${repo.name}`
}

function boardRepoLabel(board) {
  const root = board.root ? board.root : "(repository root)"
  return `${PROVIDER_LABELS[board.provider] ?? board.provider} ${board.owner}/${board.name}, branch ${board.branch}, folder ${root}`
}

function modeLabel(mode) {
  return mode === "write"
    ? "write (the App updates the board)"
    : "shadow (the App proposes changes and writes nothing)"
}

function stagesLabel(stageBranches) {
  if (!stageBranches) return ""
  const parts = STAGES.filter((s) => stageBranches[s]?.length).map((s) => `${s}: ${stageBranches[s].join(", ")}`)
  return parts.length ? ` (${parts.join("; ")})` : ""
}

/** Lines for `app status`. */
export function describeStatus(data) {
  const lines = []
  const connection = data?.connection
  const features = data?.features ?? {}
  if (!connection) {
    lines.push("This board is not connected to the GitHub App or the Bitbucket app yet.")
    lines.push("Connect it with: npx taskmark app connect github  (or: app connect bitbucket)")
  } else {
    const provider = connection.provider
    const label = PROVIDER_LABELS[provider] ?? provider
    let access
    if (provider === "github") {
      access = connection.github?.installed
        ? `App installed (installation ${connection.github.installationId})`
        : "App not installed yet: run npx taskmark app connect github"
    } else {
      access = connection.bitbucket?.authorized
        ? `authorized${connection.bitbucket.workspace ? ` for workspace ${connection.bitbucket.workspace}` : ""}`
        : "not authorized yet: run npx taskmark app connect bitbucket"
    }
    lines.push(`Provider:   ${label}, ${access}`)
    const repos = connection.codeRepos ?? []
    lines.push(`Code repos: ${repos.length ? "" : "none"}`)
    for (const repo of repos) lines.push(`  ${repoLabel(repo)}${stagesLabel(repo.stageBranches)}`)
    lines.push(`Board repo: ${connection.boardRepo ? boardRepoLabel(connection.boardRepo) : "not set"}`)
    lines.push(`Mode:       ${modeLabel(connection.mode)}`)
    lines.push(`Enabled:    ${connection.enabled ? "yes" : "no (run npx taskmark app enable)"}`)
    let webhooks
    if (provider === "github") {
      webhooks = features.githubWebhooks
        ? "the server receives GitHub App webhooks"
        : "the server has no GitHub webhook secret, pushes are not received"
    } else {
      const count = connection.bitbucket?.webhooks ?? 0
      webhooks = !features.bitbucketWebhooks
        ? "the server has no Bitbucket webhook secret, pushes are not received"
        : count > 0
          ? `${count} repo webhook${count === 1 ? "" : "s"} registered`
          : "no repo webhooks registered yet (authorize Bitbucket to register them)"
    }
    lines.push(`Webhooks:   ${webhooks}`)
  }
  lines.push(`AI:         ${describeAi(data?.ai)}`)
  const off = APP_PROVIDERS.filter((p) => features[p] === false).map((p) => PROVIDER_LABELS[p])
  if (off.length) {
    lines.push(`Not available on this server: ${off.join(", ")} (the server admin must configure the App).`)
  }
  return lines
}

function nextSteps(provider, codeRepos) {
  const owners = [...new Set(codeRepos.map((r) => r.owner))].join(", ")
  if (provider === "github") {
    return [
      `Next: in the browser, install the Taskmark GitHub App on ${owners || "the owner of your repos"}`,
      "and give it access to the code repos and the board repo above.",
      "GitHub sends you back to Taskmark Cloud when it is done.",
      "Then check it here with: npx taskmark app status",
    ]
  }
  return [
    `Next: in the browser, sign in to Bitbucket and grant Taskmark access to ${owners || "your workspace"}.`,
    "Taskmark registers a webhook on each code repo, then sends you back to Taskmark Cloud.",
    "Then check it here with: npx taskmark app status",
  ]
}

function errorFor(status, data, context) {
  if (status === 401) {
    return "Sync token was rejected. Copy a fresh token from Cloud Settings into the board .config (TASKMARK_SYNC_TOKEN)."
  }
  if (status === 503) {
    const label = context.provider ? PROVIDER_LABELS[context.provider] : "GitHub / Bitbucket"
    return `Taskmark Cloud has no ${label} App configured. The server admin must configure it before boards can connect.`
  }
  if (status === 400 && context.needsConnection) {
    return "This board is not connected yet. Run: npx taskmark app connect github  (or: app connect bitbucket)"
  }
  if (status === 404) {
    return "This Taskmark Cloud does not support connecting the App from the CLI yet. Update the server, or use the Cloud web app."
  }
  const message = Array.isArray(data?.message) ? data.message.join("; ") : data?.message
  return message || `Request failed (${status})`
}

// --------------------------------------------------------------------- run

/**
 * Runs `taskmark app ...` for one board. Returns the exit code. Everything
 * that touches the outside world is injectable for tests.
 */
export async function runAppCommand({
  args,
  boardPath,
  env = process.env,
  fetchImpl = fetch,
  interactive = Boolean(process.stdout.isTTY) && env.CI !== "true",
  openUrl = null,
  repoPaths,
  log = console.log,
  error = console.error,
}) {
  if (env === process.env) loadBoardEnv(boardPath)
  const credentials = resolveBoardSyncCredentials(boardPath, env)
  if (!credentials.token) {
    error(
      [
        "This board has no Taskmark Cloud sync token, so the CLI cannot reach your project.",
        "Copy the token from Cloud Settings into the board .config file:",
        "  TASKMARK_SYNC_TOKEN=tmk_...",
        "then run npx taskmark sync once to check the board reaches Taskmark Cloud.",
      ].join("\n"),
    )
    return 1
  }

  const call = async (request, context = {}) => {
    const { url, ...init } = buildAppRequest(request, credentials)
    let res
    try {
      res = await fetchImpl(url, init)
    } catch (cause) {
      error(
        `Cannot reach ${url} (${cause?.message || cause}). Set TASKMARK_CLOUD_URL to your Taskmark Cloud origin.`,
      )
      return null
    }
    const text = await res.text()
    let data = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { message: text }
    }
    if (!res.ok) {
      error(errorFor(res.status, data, context))
      return null
    }
    return data
  }

  if (args.action === "status") {
    const data = await call({ kind: "get" })
    if (!data) return 1
    for (const line of describeStatus(data)) log(line)
    return 0
  }

  if (args.action === "mode" || args.action === "enable" || args.action === "disable") {
    const body =
      args.action === "mode" ? { mode: args.target } : { enabled: args.action === "enable" }
    const data = await call({ kind: "put", body }, { needsConnection: true })
    if (!data) return 1
    if (args.action === "mode") log(`Mode set to ${modeLabel(data.mode)}.`)
    else if (data.enabled) log("Enabled. The App reconciles this board on every push.")
    else log("Disabled. The App ignores pushes for this board until you run npx taskmark app enable.")
    return 0
  }

  // ------------------------------------------------------------ connect
  const provider = args.target
  const label = PROVIDER_LABELS[provider]
  let codeRepos
  try {
    codeRepos = args.repos.map(parseRepoSpec)
  } catch (cause) {
    error(cause.message)
    return 1
  }
  if (!codeRepos.length) {
    const detected = detectCodeRepos(boardPath, provider, repoPaths ? { repoPaths } : undefined)
    codeRepos = detected.repos
    if (!codeRepos.length) {
      const why = detected.skipped.length ? `\nSkipped: ${detected.skipped.join("; ")}` : ""
      error(
        `No ${label} code repos found for this board.${why}\n` +
          `Pass them with --repo <owner>/<repo> (repeatable), or list the local clones in the board package.json: "taskmark": { "repos": ["../my-api"] }`,
      )
      return 1
    }
  }
  const seen = new Set()
  codeRepos = codeRepos.filter((repo) => {
    const key = repoLabel(repo).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  let boardRepo
  if (args.boardRepo) {
    try {
      boardRepo = parseBoardRepoSpec(args.boardRepo)
    } catch (cause) {
      error(cause.message)
      return 1
    }
  } else {
    const detected = detectBoardRepo(boardPath)
    if (!detected.repo) {
      error(
        `Cannot tell where the board lives: ${detected.reason}.\n` +
          "Pass it with --board-repo <provider>:<owner>/<repo>[@branch][:root], for example github:acme/shop-taskmark@main",
      )
      return 1
    }
    boardRepo = detected.repo
  }

  const stageBranches = configuredStageBranches(boardPath)
  log(`Connecting this board to the ${label} ${provider === "github" ? "App" : "app"}:`)
  log(`  Code repos: ${codeRepos.map(repoLabel).join(", ")}${stagesLabel(stageBranches)}`)
  log(`  Board repo: ${boardRepoLabel(boardRepo)}`)
  if (args.mode) log(`  Mode:       ${modeLabel(args.mode)}`)

  const saved = await call({
    kind: "put",
    body: buildConnectBody({ provider, codeRepos, boardRepo, mode: args.mode, stageBranches }),
  })
  if (!saved) return 1
  log(`Saved. Mode: ${modeLabel(saved.mode)}${saved.enabled ? "" : ", currently disabled (npx taskmark app enable)"}.`)

  // The board repo can live on the other provider: it needs its own access.
  const providers = [provider, ...(boardRepo.provider !== provider ? [boardRepo.provider] : [])]
  for (const target of providers) {
    const result = await call({ kind: "provider-url", provider: target }, { provider: target })
    if (!result?.url) return 1
    const what = target === "github" ? "Install the Taskmark GitHub App" : "Authorize Taskmark on Bitbucket"
    log("")
    log(`${what}:`)
    log(`  ${result.url}`)
    if (args.open && interactive && openUrl) {
      openUrl(result.url)
      log("(opened in your browser)")
    }
    log("")
    for (const line of nextSteps(target, target === provider ? codeRepos : [boardRepo])) log(line)
  }
  return 0
}
