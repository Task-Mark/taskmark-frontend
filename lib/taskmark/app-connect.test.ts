import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  buildAppRequest,
  buildConnectBody,
  describeStatus,
  detectBoardRepo,
  detectCodeRepos,
  parseAppArgs,
  parseBoardRepoSpec,
  parseGitRemote,
  parseRepoSpec,
  runAppCommand,
} from "../../bin/lib/app-connect.mjs"

const TOKEN = "tmk_" + "b".repeat(40)
const CONFIG = `TASKMARK_SYNC_TOKEN=${TOKEN}\nTASKMARK_CLOUD_URL=https://cloud.example.com/\n`
const BASE = "https://cloud.example.com/v1/board-sync/integration"

function git(repo: string, args: string[]) {
  execFileSync("git", ["-C", repo, ...args], { stdio: "ignore" })
}

function tmp(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

/** A local clone whose origin points at `remote` (never contacted). */
function repo(dir: string, remote?: string) {
  fs.mkdirSync(dir, { recursive: true })
  git(dir, ["init", "-q", "-b", "main"])
  if (remote) git(dir, ["remote", "add", "origin", remote])
  return dir
}

/**
 * <root>/shop-taskmark  dedicated board repo (origin on GitHub), with
 * package.json linking ../shop-api (GitHub), ../shop-web (Bitbucket) and
 * ../shop-tools (no remote).
 */
function workspace(options: { config?: string; branches?: object } = {}) {
  const root = tmp("taskmark-app-")
  const board = repo(path.join(root, "shop-taskmark"), "git@github.com:acme/shop-taskmark.git")
  fs.writeFileSync(path.join(board, ".config"), options.config ?? CONFIG)
  fs.writeFileSync(
    path.join(board, "package.json"),
    JSON.stringify({
      taskmark: {
        repos: ["../shop-api", "../shop-web", "../shop-tools"],
        ...(options.branches ? { branches: options.branches } : {}),
      },
    }),
  )
  repo(path.join(root, "shop-api"), "https://github.com/acme/shop-api.git")
  repo(path.join(root, "shop-web"), "git@bitbucket.org:acme-ws/shop-web.git")
  repo(path.join(root, "shop-tools"))
  return { root, board }
}

const env = (values: Record<string, string> = {}) => values as NodeJS.ProcessEnv

type Call = { url: string; init: RequestInit }
type Reply = { status: number; body: unknown }

function fakeFetch(route: (url: string, init: RequestInit) => Reply) {
  const calls: Call[] = []
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const { status, body } = route(url, init)
    return new Response(JSON.stringify(body), { status })
  }
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch }
}

function output() {
  const lines: string[] = []
  const push = (line: string) => lines.push(line)
  return { lines, log: push, error: push, text: () => lines.join("\n") }
}

const VIEW = {
  id: "c1",
  projectId: "p1",
  provider: "github",
  codeRepos: [{ owner: "acme", name: "shop-api", stageBranches: null }],
  boardRepo: { provider: "github", owner: "acme", name: "shop-taskmark", branch: "main", root: "" },
  mode: "shadow",
  enabled: true,
  github: { installed: false, installationId: null },
  bitbucket: { authorized: false, workspace: null, webhooks: 0 },
}

const NO_AI = { provider: null, model: null, keyConfigured: false, keyLast4: null }
const FEATURES = { github: true, githubWebhooks: true, bitbucket: true, bitbucketWebhooks: true }

// ------------------------------------------------------------------ parsing

test("parseAppArgs reads every command and its flags", () => {
  const connect = parseAppArgs([
    "connect",
    "bitbucket",
    "--repo",
    "acme-ws/api",
    "--repo=acme-ws/web",
    "--board-repo",
    "bitbucket:acme-ws/board@develop:taskmark",
    "--mode",
    "write",
    "--board",
    ".",
    "--no-open",
  ])
  assert.deepEqual(connect, {
    action: "connect",
    target: "bitbucket",
    repos: ["acme-ws/api", "acme-ws/web"],
    boardRepo: "bitbucket:acme-ws/board@develop:taskmark",
    mode: "write",
    board: ".",
    open: false,
    help: false,
    error: null,
  })
  assert.equal(parseAppArgs(["status"]).error, null)
  assert.equal(parseAppArgs(["mode", "write"]).target, "write")
  assert.equal(parseAppArgs(["enable"]).error, null)
  assert.equal(parseAppArgs(["disable"]).error, null)
  assert.equal(parseAppArgs(["--help"]).help, true)
})

test("parseAppArgs reports mistakes", () => {
  assert.match(parseAppArgs([]).error ?? "", /Missing app command/)
  assert.match(parseAppArgs(["nope"]).error ?? "", /Unknown app command/)
  assert.match(parseAppArgs(["connect"]).error ?? "", /github or bitbucket/)
  assert.match(parseAppArgs(["connect", "gitlab"]).error ?? "", /Unknown provider/)
  assert.match(parseAppArgs(["connect", "github", "--mode", "loud"]).error ?? "", /Unknown mode/)
  assert.match(parseAppArgs(["connect", "github", "--repo"]).error ?? "", /--repo needs a value/)
  assert.match(parseAppArgs(["mode"]).error ?? "", /shadow or write/)
  assert.match(parseAppArgs(["mode", "fast"]).error ?? "", /Unknown mode/)
  assert.match(parseAppArgs(["status", "--repo", "a/b"]).error ?? "", /only used with app connect/)
  assert.match(parseAppArgs(["status", "extra"]).error ?? "", /Unexpected argument/)
  assert.match(parseAppArgs(["status", "--wat"]).error ?? "", /Unknown argument: --wat/)
})

test("parseRepoSpec and parseBoardRepoSpec", () => {
  assert.deepEqual(parseRepoSpec("acme/api"), { owner: "acme", name: "api" })
  assert.deepEqual(parseRepoSpec("acme/api.git"), { owner: "acme", name: "api" })
  assert.throws(() => parseRepoSpec("api"), /owner>\/<repo/)
  assert.throws(() => parseRepoSpec("a/b/c"), /Invalid repo/)

  assert.deepEqual(parseBoardRepoSpec("github:acme/shop-taskmark"), {
    provider: "github",
    owner: "acme",
    name: "shop-taskmark",
    branch: "main",
    root: "",
  })
  assert.deepEqual(parseBoardRepoSpec("bitbucket:acme-ws/app@develop:docs/taskmark/"), {
    provider: "bitbucket",
    owner: "acme-ws",
    name: "app",
    branch: "develop",
    root: "docs/taskmark",
  })
  assert.deepEqual(parseBoardRepoSpec("github:acme/app:taskmark").root, "taskmark")
  assert.throws(() => parseBoardRepoSpec("acme/app"), /missing the provider/)
  assert.throws(() => parseBoardRepoSpec("gitlab:acme/app"), /unknown provider/)
  assert.throws(() => parseBoardRepoSpec("github:acme"), /owner>\/<repo/)
  assert.throws(() => parseBoardRepoSpec("github:acme/app@"), /bad branch/)
})

test("parseGitRemote understands GitHub and Bitbucket URLs, SSH and HTTPS", () => {
  const gh = { provider: "github", owner: "acme", name: "api" }
  assert.deepEqual(parseGitRemote("git@github.com:acme/api.git"), gh)
  assert.deepEqual(parseGitRemote("https://github.com/acme/api.git"), gh)
  assert.deepEqual(parseGitRemote("https://github.com/acme/api"), gh)
  assert.deepEqual(parseGitRemote("ssh://git@github.com/acme/api.git"), gh)
  assert.deepEqual(parseGitRemote("git@github.com-work:acme/api.git"), gh)
  const bb = { provider: "bitbucket", owner: "acme-ws", name: "web" }
  assert.deepEqual(parseGitRemote("git@bitbucket.org:acme-ws/web.git"), bb)
  assert.deepEqual(parseGitRemote("https://marco@bitbucket.org/acme-ws/web.git"), bb)
  assert.deepEqual(parseGitRemote("ssh://git@bitbucket.org/acme-ws/web.git"), bb)
  assert.equal(parseGitRemote("git@gitlab.com:acme/api.git"), null)
  assert.equal(parseGitRemote("https://bitbucket.example.com/scm/proj/web.git"), null)
  assert.equal(parseGitRemote("/local/path/repo"), null)
  assert.equal(parseGitRemote(""), null)
})

// ------------------------------------------------------------ git detection

test("detectBoardRepo: dedicated board repo, nested board, origin default branch", () => {
  const { board } = workspace()
  assert.deepEqual(detectBoardRepo(board).repo, {
    provider: "github",
    owner: "acme",
    name: "shop-taskmark",
    branch: "main",
    root: "",
  })

  const app = repo(path.join(tmp("taskmark-nested-"), "app"), "git@bitbucket.org:acme-ws/app.git")
  const nested = path.join(app, "docs", "taskmark")
  fs.mkdirSync(nested, { recursive: true })
  git(app, ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/trunk"])
  assert.deepEqual(detectBoardRepo(nested).repo, {
    provider: "bitbucket",
    owner: "acme-ws",
    name: "app",
    branch: "trunk",
    root: "docs/taskmark",
  })

  assert.match(detectBoardRepo(tmp("taskmark-nogit-")).reason ?? "", /not a git repository/)
  const local = repo(tmp("taskmark-noremote-"))
  assert.match(detectBoardRepo(local).reason ?? "", /no origin remote/)
  const gitlab = repo(tmp("taskmark-gitlab-"), "git@gitlab.com:acme/board.git")
  assert.match(detectBoardRepo(gitlab).reason ?? "", /not a GitHub or Bitbucket/)
})

test("detectCodeRepos keeps the linked repos on the chosen provider", () => {
  const { board } = workspace()
  const github = detectCodeRepos(board, "github")
  assert.deepEqual(github.repos, [{ owner: "acme", name: "shop-api" }])
  assert.deepEqual(github.skipped, ["shop-web: on Bitbucket", "shop-tools: no origin remote"])
  assert.deepEqual(detectCodeRepos(board, "bitbucket").repos, [{ owner: "acme-ws", name: "shop-web" }])
})

// ---------------------------------------------------------------- requests

test("buildAppRequest and buildConnectBody", () => {
  const credentials = { token: TOKEN, cloudUrl: "https://cloud.example.com/" }
  const get = buildAppRequest({ kind: "get" }, credentials)
  assert.equal(get.method, "GET")
  assert.equal(get.url, BASE)
  assert.equal(get.headers.authorization, `Bearer ${TOKEN}`)
  assert.equal(buildAppRequest({ kind: "provider-url", provider: "github" }, credentials).url, `${BASE}/github/install-url`)
  assert.equal(
    buildAppRequest({ kind: "provider-url", provider: "bitbucket" }, credentials).url,
    `${BASE}/bitbucket/authorize-url`,
  )
  const put = buildAppRequest({ kind: "put", body: { mode: "write" } }, credentials)
  assert.equal(put.method, "PUT")
  assert.deepEqual(JSON.parse(put.body as string), { mode: "write" })
  assert.equal(
    buildAppRequest({ kind: "get" }, { token: TOKEN, cloudUrl: "" }).url,
    "https://cloud.taskmark.dev/v1/board-sync/integration",
  )

  assert.deepEqual(
    buildConnectBody({
      provider: "github",
      codeRepos: [{ owner: "acme", name: "api" }],
      boardRepo: { provider: "github", owner: "acme", name: "b", branch: "main", root: "" },
      mode: null,
      stageBranches: { testing: ["qa"] },
    }),
    {
      provider: "github",
      codeRepos: [{ owner: "acme", name: "api", stageBranches: { testing: ["qa"] } }],
      boardRepo: { provider: "github", owner: "acme", name: "b", branch: "main", root: "" },
    },
  )
})

// ---------------------------------------------------------------- commands

test("app connect github: defaults from git, PUT, then prints and opens the install URL", async () => {
  const { board } = workspace({ branches: { testing: "qa", production: ["main"] } })
  const installUrl = "https://github.com/apps/taskmark/installations/new?state=abc"
  const { calls, fetchImpl } = fakeFetch((url, init) => {
    if (init.method === "PUT") return { status: 200, body: VIEW }
    if (url.endsWith("/github/install-url")) return { status: 200, body: { url: installUrl } }
    return { status: 404, body: {} }
  })
  const opened: string[] = []
  const out = output()
  const code = await runAppCommand({
    args: parseAppArgs(["connect", "github"]),
    boardPath: board,
    env: env(),
    fetchImpl,
    interactive: true,
    openUrl: (url: string) => opened.push(url),
    ...out,
  })
  assert.equal(code, 0, out.text())
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, BASE)
  assert.equal(calls[0].init.method, "PUT")
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, `Bearer ${TOKEN}`)
  assert.deepEqual(JSON.parse(calls[0].init.body as string), {
    provider: "github",
    codeRepos: [
      { owner: "acme", name: "shop-api", stageBranches: { testing: ["qa"], production: ["main"] } },
    ],
    boardRepo: { provider: "github", owner: "acme", name: "shop-taskmark", branch: "main", root: "" },
  })
  assert.equal(calls[1].url, `${BASE}/github/install-url`)
  assert.deepEqual(opened, [installUrl])
  const text = out.text()
  assert.match(text, /Code repos: acme\/shop-api/)
  assert.match(text, /Board repo: GitHub acme\/shop-taskmark, branch main, folder \(repository root\)/)
  assert.ok(text.indexOf("Code repos") < text.indexOf("Saved."), "prints the plan before sending")
  assert.match(text, new RegExp(installUrl.replace(/[?]/g, "\\?")))
  assert.match(text, /install the Taskmark GitHub App on acme/)
  assert.match(text, /npx taskmark app status/)
  assert.ok(!/[\u2013\u2014]/.test(text), "no en or em dashes")
})

test("app connect bitbucket with flags; no browser when not interactive or --no-open", async () => {
  const { board } = workspace()
  const authorizeUrl = "https://bitbucket.org/site/oauth2/authorize?client_id=x&state=s"
  const route = (url: string, init: RequestInit): Reply => {
    if (init.method === "PUT") return { status: 200, body: { ...VIEW, provider: "bitbucket", mode: "write" } }
    if (url.endsWith("/bitbucket/authorize-url")) return { status: 200, body: { url: authorizeUrl } }
    return { status: 404, body: {} }
  }
  for (const [argv, interactive] of [
    [["--no-open"], true],
    [[], false],
  ] as const) {
    const { calls, fetchImpl } = fakeFetch(route)
    const opened: string[] = []
    const out = output()
    const code = await runAppCommand({
      args: parseAppArgs([
        "connect",
        "bitbucket",
        "--repo",
        "acme-ws/api",
        "--repo",
        "acme-ws/api",
        "--repo",
        "acme-ws/web",
        "--board-repo",
        "bitbucket:acme-ws/api@develop:taskmark",
        "--mode",
        "write",
        ...argv,
      ]),
      boardPath: board,
      env: env(),
      fetchImpl,
      interactive,
      openUrl: (url: string) => opened.push(url),
      ...out,
    })
    assert.equal(code, 0, out.text())
    assert.deepEqual(JSON.parse(calls[0].init.body as string), {
      provider: "bitbucket",
      codeRepos: [
        { owner: "acme-ws", name: "api" },
        { owner: "acme-ws", name: "web" },
      ],
      boardRepo: { provider: "bitbucket", owner: "acme-ws", name: "api", branch: "develop", root: "taskmark" },
      mode: "write",
    })
    assert.equal(calls[1].url, `${BASE}/bitbucket/authorize-url`)
    assert.deepEqual(opened, [])
    assert.match(out.text(), /Authorize Taskmark on Bitbucket/)
    assert.match(out.text(), /grant Taskmark access to acme-ws/)
  }
})

test("app connect asks for access on both providers when the board lives on the other one", async () => {
  const { board } = workspace()
  const { calls, fetchImpl } = fakeFetch((url, init) => {
    if (init.method === "PUT") return { status: 200, body: VIEW }
    return { status: 200, body: { url: `https://auth.example.com/${url.split("/").slice(-2).join("/")}` } }
  })
  const code = await runAppCommand({
    args: parseAppArgs(["connect", "bitbucket"]),
    boardPath: board,
    env: env(),
    fetchImpl,
    interactive: false,
    ...output(),
  })
  assert.equal(code, 0)
  assert.deepEqual(
    calls.map((c) => c.url),
    [BASE, `${BASE}/bitbucket/authorize-url`, `${BASE}/github/install-url`],
  )
})

test("app connect fails clearly without repos, without a board origin, or without the App on the server", async () => {
  const { board } = workspace()
  const never = fakeFetch(() => ({ status: 500, body: {} }))

  const noRepos = output()
  assert.equal(
    await runAppCommand({
      args: parseAppArgs(["connect", "github"]),
      boardPath: board,
      env: env(),
      fetchImpl: never.fetchImpl,
      repoPaths: [],
      ...noRepos,
    }),
    1,
  )
  assert.match(noRepos.text(), /No GitHub code repos found/)
  assert.match(noRepos.text(), /--repo <owner>\/<repo>/)

  const loose = tmp("taskmark-loose-")
  fs.writeFileSync(path.join(loose, ".config"), CONFIG)
  const noOrigin = output()
  assert.equal(
    await runAppCommand({
      args: parseAppArgs(["connect", "github", "--repo", "acme/api"]),
      boardPath: loose,
      env: env(),
      fetchImpl: never.fetchImpl,
      ...noOrigin,
    }),
    1,
  )
  assert.match(noOrigin.text(), /Cannot tell where the board lives: the board folder is not a git repository/)
  assert.match(noOrigin.text(), /--board-repo/)
  assert.equal(never.calls.length, 0)

  const unconfigured = fakeFetch((_url, init) =>
    init.method === "PUT"
      ? { status: 200, body: VIEW }
      : { status: 503, body: { message: "The GitHub integration is not configured." } },
  )
  const out = output()
  assert.equal(
    await runAppCommand({
      args: parseAppArgs(["connect", "github"]),
      boardPath: board,
      env: env(),
      fetchImpl: unconfigured.fetchImpl,
      ...out,
    }),
    1,
  )
  assert.match(out.text(), /no GitHub App configured\. The server admin must configure it/)
})

test("app without a sync token explains taskmark sync and .config", async () => {
  const { board } = workspace({ config: "" })
  const none = fakeFetch(() => ({ status: 200, body: {} }))
  const out = output()
  assert.equal(
    await runAppCommand({ args: parseAppArgs(["status"]), boardPath: board, env: env(), fetchImpl: none.fetchImpl, ...out }),
    1,
  )
  assert.equal(none.calls.length, 0)
  assert.match(out.text(), /TASKMARK_SYNC_TOKEN/)
  assert.match(out.text(), /\.config/)
  assert.match(out.text(), /npx taskmark sync/)
})

test("app mode, enable, disable send one field; not connected yet gives a hint", async () => {
  const { board } = workspace()
  for (const [argv, body, said] of [
    [["mode", "write"], { mode: "write" }, /Mode set to write/],
    [["disable"], { enabled: false }, /Disabled/],
    [["enable"], { enabled: true }, /Enabled/],
  ] as const) {
    const { calls, fetchImpl } = fakeFetch((_url, init) => ({
      status: 200,
      body: { ...VIEW, ...JSON.parse(init.body as string) },
    }))
    const out = output()
    assert.equal(
      await runAppCommand({ args: parseAppArgs([...argv]), boardPath: board, env: env(), fetchImpl, ...out }),
      0,
    )
    assert.equal(calls[0].init.method, "PUT")
    assert.deepEqual(JSON.parse(calls[0].init.body as string), body)
    assert.match(out.text(), said)
  }

  const missing = fakeFetch(() => ({ status: 400, body: { message: "provider and codeRepos are required" } }))
  const out = output()
  assert.equal(
    await runAppCommand({ args: parseAppArgs(["mode", "write"]), boardPath: board, env: env(), fetchImpl: missing.fetchImpl, ...out }),
    1,
  )
  assert.match(out.text(), /not connected yet\. Run: npx taskmark app connect github/)

  const rejected = fakeFetch(() => ({ status: 401, body: {} }))
  const bad = output()
  await runAppCommand({ args: parseAppArgs(["enable"]), boardPath: board, env: env(), fetchImpl: rejected.fetchImpl, ...bad })
  assert.match(bad.text(), /Sync token was rejected/)
})

test("app status describes the connection, AI key and webhooks", async () => {
  const { board } = workspace()
  const { calls, fetchImpl } = fakeFetch(() => ({
    status: 200,
    body: {
      connection: {
        ...VIEW,
        provider: "bitbucket",
        codeRepos: [{ owner: "acme-ws", name: "web", stageBranches: { testing: ["qa"] } }],
        boardRepo: { provider: "bitbucket", owner: "acme-ws", name: "web", branch: "main", root: "taskmark" },
        mode: "write",
        enabled: false,
        bitbucket: { authorized: true, workspace: "acme-ws", webhooks: 1 },
      },
      ai: { provider: "anthropic", model: "claude-opus-5-5", keyConfigured: true, keyLast4: "1234" },
      features: { ...FEATURES, github: false },
    },
  }))
  const out = output()
  assert.equal(await runAppCommand({ args: parseAppArgs(["status"]), boardPath: board, env: env(), fetchImpl, ...out }), 0)
  assert.equal(calls[0].init.method, "GET")
  assert.equal(calls[0].url, BASE)
  const text = out.text()
  assert.match(text, /Provider:   Bitbucket, authorized for workspace acme-ws/)
  assert.match(text, /acme-ws\/web \(testing: qa\)/)
  assert.match(text, /Board repo: Bitbucket acme-ws\/web, branch main, folder taskmark/)
  assert.match(text, /Mode:       write/)
  assert.match(text, /Enabled:    no/)
  assert.match(text, /Webhooks:   1 repo webhook registered/)
  assert.match(text, /AI:         Claude \(claude-opus-5-5\), key ending in …1234/)
  assert.match(text, /Not available on this server: GitHub/)
  assert.ok(!/[\u2013\u2014]/.test(text))
})

test("describeStatus without a connection points to app connect", () => {
  const lines = describeStatus({ connection: null, ai: NO_AI, features: FEATURES })
  assert.match(lines.join("\n"), /not connected/)
  assert.match(lines.join("\n"), /npx taskmark app connect github/)
  const gh = describeStatus({
    connection: { ...VIEW, github: { installed: true, installationId: "77" } },
    ai: NO_AI,
    features: FEATURES,
  }).join("\n")
  assert.match(gh, /GitHub, App installed \(installation 77\)/)
  assert.match(gh, /receives GitHub App webhooks/)
})
