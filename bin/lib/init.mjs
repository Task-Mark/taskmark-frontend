/**
 * `npx taskmark init`: the setup assistant. The logic lives in the modules it
 * calls (detection, scaffold, project registration, app connect, AI key,
 * hooks, agent instructions, migration, reconciliation, sync); this file asks
 * the questions and writes each step's files at the end of that step.
 *
 * Also `npx taskmark reconcile` and `npx taskmark secret rotate`.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import { AI_KEY_ENV, buildAiRequest, describeAi, errorFor as aiErrorFor } from "./ai-key.mjs"
import {
  applyAgentInstructions,
  planAgentInstructions,
  previewChange,
} from "./agent-instructions.mjs"
import { detectBoardRepo, parseBoardRepoSpec, parseRepoSpec, runAppCommand } from "./app-connect.mjs"
import { applyScaffold, boardPackageName, cliVersion, planScaffold } from "./board-scaffold.mjs"
import {
  cloudBaseUrl,
  generateSecret,
  getIntegration,
  isProviderReady,
  readBoardPackage,
  registerProject,
  rotateProjectSecret,
  updateBoardTaskmark,
  waitForConnection,
  writeSyncToken,
} from "./cloud-project.mjs"
import { installHooks } from "./hooks.mjs"
import { DEFAULT_MODELS, validateNonInteractive } from "./init-args.mjs"
import { boardKind, detectProject, gitTopLevel, isDedicatedBoardPath } from "./init-detect.mjs"
import { migrateBoard } from "./migrate-board.mjs"
import { CancelledError, MissingAnswerError } from "./prompts.mjs"
import { DEFAULT_BACKFILL_COMMITS, runReconcile } from "./reconcile.mjs"
import { syncBoardOnce } from "./sync-board.mjs"
import { resolveBoardSyncCredentials } from "../../lib/taskmark/sync-config.mjs"

const PROVIDER_LABELS = { github: "GitHub", bitbucket: "Bitbucket" }
const AI_LABELS = { anthropic: "Claude", openai: "OpenAI" }

function git(dir, args) {
  return execFileSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

function home(p) {
  const h = process.env.HOME
  return h && p.startsWith(`${h}/`) ? `~${p.slice(h.length)}` : p
}

export function boardRepoSpec(repo) {
  return `${repo.provider}:${repo.owner}/${repo.name}@${repo.branch || "main"}${repo.root ? `:${repo.root}` : ""}`
}

const repoKey = (r) => `${r.owner}/${r.name}`.toLowerCase()

/** The provider most of these repos are on, else github. */
export function preferredProvider(repos) {
  const counts = { github: 0, bitbucket: 0 }
  for (const r of repos) if (r.remote?.provider in counts) counts[r.remote.provider] += 1
  return counts.bitbucket > counts.github ? "bitbucket" : "github"
}

/** Commits only `boardPath` in its repository. Null when there was nothing to commit. */
export function commitBoard(boardPath, message) {
  const top = gitTopLevel(boardPath)
  if (!top) return null
  const rel = path.relative(top, fs.realpathSync(boardPath)) || "."
  git(top, ["add", "-A", "--", rel])
  const staged = git(top, ["diff", "--cached", "--name-only", "--", rel])
  if (!staged) return null
  git(top, ["commit", "-q", "-m", message, "--", rel])
  return git(top, ["rev-parse", "--short", "HEAD"])
}

/** syncBoardOnce prints its own progress lines; the spinner says it instead. */
async function quietSync(boardPath) {
  const original = console.log
  console.log = () => {}
  try {
    return await syncBoardOnce(boardPath)
  } finally {
    console.log = original
  }
}

// ------------------------------------------------------------------ steps

async function chooseBoardLocation({ ui, detected }) {
  if (detected.board?.exists) return detected.board.path
  const options = [{ value: detected.proposedBoardPath, label: home(detected.proposedBoardPath) }]
  if (detected.layout === "multi") {
    options[0].hint = "its own repository, next to the code repos"
    for (const repo of detected.repos) {
      options.push({ value: path.join(repo.path, "taskmark"), label: home(path.join(repo.path, "taskmark")), hint: `inside ${repo.name}` })
    }
  } else {
    options[0].hint = "inside the code repository"
  }
  options.push({ value: "__other", label: "Another folder" })
  const choice = await ui.select({
    message: "Where should the board live?",
    options,
    initialValue: detected.proposedBoardPath,
  })
  if (choice !== "__other") return choice
  const typed = await ui.text({
    message: "Board folder",
    initialValue: detected.proposedBoardPath,
    validate: (v) => (v?.trim() ? undefined : "Enter a folder"),
  })
  return path.resolve(detected.cwd, typed.trim())
}

async function chooseCodeRepos({ ui, detected }) {
  if (detected.candidates.length <= 1) return detected.repos
  const picked = await ui.multiselect({
    message: "Which code repositories belong to this project?",
    options: detected.candidates.map((r) => ({
      value: r.path,
      label: r.name,
      hint: r.remote ? `${PROVIDER_LABELS[r.remote.provider]} ${r.remote.owner}/${r.remote.name}` : "no GitHub / Bitbucket origin",
    })),
    initialValues: detected.repos.map((r) => r.path),
    required: false,
  })
  return detected.candidates.filter((r) => picked.includes(r.path))
}

async function resolveBoardRepo({ ui, args, boardPath, provider }) {
  if (args.boardRepo) return parseBoardRepoSpec(args.boardRepo)
  for (;;) {
    const detected = detectBoardRepo(boardPath)
    if (detected.repo) return detected.repo
    if (!ui.interactive) {
      throw new MissingAnswerError(
        `Cannot tell where the board repository is: ${detected.reason}.\nPush it to ${PROVIDER_LABELS[provider]} first, or pass --board-repo <provider>:<owner>/<repo>[@branch][:root].`,
      )
    }
    const top = gitTopLevel(boardPath) ?? boardPath
    ui.note(
      [
        `The App writes to the board through its git repository, and ${detected.reason}.`,
        `Create an empty repository on ${PROVIDER_LABELS[provider]}, then:`,
        `  cd ${home(top)}`,
        "  git remote add origin <the repository URL>",
        "  git push -u origin main",
      ].join("\n"),
      "Board repository",
    )
    const next = await ui.select({
      message: "Then:",
      options: [
        { value: "again", label: "I pushed it, check again" },
        { value: "type", label: "Type it as owner/repo" },
        { value: "later", label: "Finish later", hint: "run npx taskmark init again" },
      ],
      initialValue: "again",
    })
    if (next === "later") throw new CancelledError()
    if (next === "type") {
      const typed = await ui.text({
        message: `Board repository on ${PROVIDER_LABELS[provider]} (owner/repo)`,
        validate: (v) => {
          try {
            parseRepoSpec(v)
            return undefined
          } catch (err) {
            return err.message
          }
        },
      })
      const { owner, name } = parseRepoSpec(typed)
      const dedicated = gitTopLevel(boardPath) === fs.realpathSync(boardPath)
      return { provider, owner, name, branch: "main", root: dedicated ? "" : path.relative(top, boardPath).split(path.sep).join("/") }
    }
  }
}

async function askAiKey({ ui, provider, env }) {
  const fromEnv = env[AI_KEY_ENV]?.trim()
  if (fromEnv) return fromEnv
  return (await ui.password({
    message: `${AI_LABELS[provider]} API key`,
    missing: `${AI_KEY_ENV} (the AI key, in the environment)`,
    validate: (v) => (v?.trim() ? undefined : "Paste the key"),
  })).trim()
}

async function setupAi({ ui, args, env, credentials, existingAi, fetchImpl }) {
  const provider = await ui.select({
    message: "Which AI should the App use to reconcile the board?",
    options: [
      { value: "anthropic", label: "Claude", hint: "your Anthropic key" },
      { value: "openai", label: "OpenAI", hint: "your OpenAI key" },
    ],
    initialValue: args.ai ?? existingAi?.provider ?? "anthropic",
    missing: "--ai anthropic|openai",
  })
  const sameProvider = existingAi?.keyConfigured && existingAi.provider === provider
  if (sameProvider && !args.ai) {
    const keep = await ui.confirm({ message: `Keep the saved ${describeAi(existingAi).split(",")[0]} key?`, initialValue: true })
    if (keep) return { view: existingAi, kept: true }
  }
  const model = args.model ?? (await ui.text({
    message: "Model",
    initialValue: sameProvider && existingAi.model ? existingAi.model : DEFAULT_MODELS[provider],
    defaultValue: DEFAULT_MODELS[provider],
  }))
  for (;;) {
    const key = await askAiKey({ ui, provider, env })
    const spin = ui.spinner()
    spin.start(`Checking the ${AI_LABELS[provider]} key`)
    const { url, ...init } = buildAiRequest({ action: "set", provider, model, key }, credentials)
    let res
    try {
      res = await fetchImpl(url, init)
    } catch (cause) {
      spin.error("Cannot reach Taskmark Cloud")
      throw new Error(`Cannot reach ${url} (${cause?.message || cause}).`)
    }
    const text = await res.text()
    let data = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { message: text }
    }
    if (res.ok) {
      spin.stop(`Saved: ${describeAi(data)}`)
      return { view: data, kept: false }
    }
    spin.error(aiErrorFor(res.status, data))
    if (res.status !== 422 || !ui.interactive || env[AI_KEY_ENV]?.trim()) {
      throw new Error(aiErrorFor(res.status, data))
    }
  }
}

// -------------------------------------------------------------------- init

/**
 * @returns {Promise<number>} exit code
 */
export async function runInit({
  args,
  cwd,
  ui,
  env = process.env,
  fetchImpl = fetch,
  openUrl = null,
  stdinIsTTY = Boolean(process.stdin.isTTY),
  sleep,
  syncBoard = quietSync,
}) {
  if (args.cloudUrl) env.TASKMARK_CLOUD_URL = args.cloudUrl
  if (!stdinIsTTY && !args.yes) {
    const check = validateNonInteractive(args, { stdinIsTTY, env })
    ui.log.error(check.message)
    return 1
  }
  const summary = []
  try {
    ui.intro("Taskmark setup")

    // 1. Detect ----------------------------------------------------------
    const detected = detectProject({ cwd, board: args.board })
    const hadBoard = Boolean(detected.board?.exists && detected.board.kind !== "none")
    let existingPkg = detected.board?.exists ? readBoardPackage(detected.board.path) : null
    let integration = null
    let tokenState = "none"
    if (detected.board?.exists) {
      const credentials = resolveBoardSyncCredentials(detected.board.path, env)
      if (credentials.token) {
        const res = await getIntegration({ baseUrl: cloudBaseUrl(detected.board.path, env), token: credentials.token, fetchImpl })
        if (res.ok) {
          integration = res.data
          tokenState = "ok"
        } else tokenState = res.status === 401 ? "rejected" : "unknown"
      }
    }
    const check = validateNonInteractive(args, {
      stdinIsTTY,
      env,
      existing: {
        provider: integration?.connection?.provider ?? null,
        aiConfigured: Boolean(integration?.ai?.keyConfigured),
      },
    })
    if (!check.ok) {
      ui.log.error(check.message)
      return 1
    }

    const found = []
    if (detected.board?.exists) {
      const kind = { legacy: "legacy epics/ board", requests: "2.0 board", none: "empty folder" }[detected.board.kind]
      found.push(`Board:  ${home(detected.board.path)} (${kind})`)
    } else found.push("Board:  none yet")
    found.push(
      `Code:   ${detected.repos.length ? detected.repos.map((r) => r.name).join(", ") : "no git repository found"}`,
    )
    ui.note(found.join("\n"), "Found")

    const codeRepos = await chooseCodeRepos({ ui, detected })
    const boardPath = await chooseBoardLocation({ ui, detected: { ...detected, repos: codeRepos.length ? codeRepos : detected.repos } })
    const kind = boardKind(boardPath)
    if (!existingPkg && fs.existsSync(boardPath)) existingPkg = readBoardPackage(boardPath)
    const writingLanguage = args.language ?? (await ui.text({
      message: "Board writing language",
      initialValue: existingPkg?.taskmark?.writingLanguage ?? "English",
      defaultValue: existingPkg?.taskmark?.writingLanguage ?? "English",
    }))

    // 2. Scaffold --------------------------------------------------------
    const plan = planScaffold({
      boardPath,
      name: boardPackageName(detected.projectName),
      uiVersion: cliVersion(),
      kind,
      writingLanguage: writingLanguage.trim() || "English",
      repos: codeRepos.map((r) => path.relative(boardPath, r.path).split(path.sep).join("/") || "."),
    })
    const changing = plan.filter((f) => f.action !== "keep")
    const updates = changing.filter((f) => f.action === "update")
    let writeScaffold = true
    if (updates.length) {
      writeScaffold = await ui.confirm({
        message: `Update ${updates.map((f) => f.path).join(" and ")} (adds missing fields and lines only)?`,
        initialValue: true,
      })
    }
    const newRepo = !gitTopLevel(fs.existsSync(boardPath) ? boardPath : path.dirname(boardPath)) || (
      isDedicatedBoardPath(boardPath) && !fs.existsSync(boardPath)
    )
    const files = writeScaffold ? changing : changing.filter((f) => f.action === "create")
    fs.mkdirSync(boardPath, { recursive: true })
    let createdRepo = false
    if (newRepo && !fs.existsSync(path.join(boardPath, ".git"))) {
      git(boardPath, ["init", "-q", "-b", "main"])
      createdRepo = true
    }
    const written = applyScaffold(boardPath, files)
    if (written.length) ui.log.success(`Board ${hadBoard ? "updated" : "created"} at ${home(boardPath)}: ${written.join(", ")}`)
    summary.push(`Board        ${home(boardPath)} (${writingLanguage})`)

    // 3. Register --------------------------------------------------------
    const baseUrl = cloudBaseUrl(boardPath, env)
    let token = resolveBoardSyncCredentials(boardPath, env).token
    if (token && tokenState === "none") {
      const res = await getIntegration({ baseUrl, token, fetchImpl })
      if (res.ok) {
        integration = res.data
        tokenState = "ok"
      } else if (res.status === 401) tokenState = "rejected"
    }
    let projectId = readBoardPackage(boardPath)?.taskmark?.projectId ?? null
    if (tokenState === "ok") {
      ui.log.info(`Project already registered${projectId ? ` (${projectId})` : ""}, keeping its secret.`)
    } else {
      if (tokenState === "rejected") ui.log.warn("The secret in .config was rejected. Registering the project again.")
      const spin = ui.spinner()
      spin.start("Registering the project on Taskmark Cloud")
      const secret = generateSecret()
      let registered
      try {
        registered = await registerProject({ baseUrl, name: detected.projectName, secret, fetchImpl })
      } catch (err) {
        spin.error("Registration failed")
        throw err
      }
      writeSyncToken(boardPath, secret)
      updateBoardTaskmark(boardPath, { projectId: registered.projectId })
      projectId = registered.projectId
      token = secret
      spin.stop(`Registered ${registered.name} (${registered.projectId}). The secret is in .config, which git ignores.`)
      const res = await getIntegration({ baseUrl, token, fetchImpl })
      integration = res.ok ? res.data : null
    }
    if (createdRepo) {
      try {
        commitBoard(boardPath, "Create the Taskmark board")
      } catch {
        ui.log.warn("Could not commit the new board (check your git name and email). Commit it yourself before pushing.")
      }
    }
    summary.push(`Project      ${projectId ?? "registered"}   change the secret: npx taskmark secret rotate`)
    const credentials = { token, cloudUrl: baseUrl }

    // 4. Connect the App -------------------------------------------------
    const connection = integration?.connection ?? null
    const provider = await ui.select({
      message: "Where is the code?",
      options: [
        { value: "github", label: "GitHub" },
        { value: "bitbucket", label: "Bitbucket" },
      ],
      initialValue: args.provider ?? connection?.provider ?? preferredProvider(codeRepos),
      missing: "--provider github|bitbucket",
    })
    let connectRepos
    if (args.repos.length) {
      connectRepos = args.repos.map(parseRepoSpec)
    } else {
      const onProvider = codeRepos.filter((r) => r.remote?.provider === provider).map((r) => r.remote)
      const known = (connection?.provider === provider ? connection.codeRepos ?? [] : []).map((r) => ({ owner: r.owner, name: r.name }))
      const all = [...onProvider, ...known].filter((r, i, list) => list.findIndex((x) => repoKey(x) === repoKey(r)) === i)
      if (!all.length) {
        if (!ui.interactive) throw new MissingAnswerError(`No ${PROVIDER_LABELS[provider]} code repos found. Pass --repo <owner>/<repo>.`)
        const typed = await ui.text({
          message: `Code repos on ${PROVIDER_LABELS[provider]} (owner/repo, comma separated)`,
          validate: (v) => {
            try {
              const list = String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean)
              if (!list.length) return "Enter at least one repo"
              list.forEach(parseRepoSpec)
              return undefined
            } catch (err) {
              return err.message
            }
          },
        })
        connectRepos = typed.split(",").map((s) => s.trim()).filter(Boolean).map(parseRepoSpec)
      } else {
        const picked = await ui.multiselect({
          message: `Code repos to connect on ${PROVIDER_LABELS[provider]}`,
          options: all.map((r) => ({ value: repoKey(r), label: `${r.owner}/${r.name}` })),
          initialValues: all.map(repoKey),
          required: true,
        })
        connectRepos = all.filter((r) => picked.includes(repoKey(r)))
      }
    }
    const boardRepo = await resolveBoardRepo({ ui, args, boardPath, provider })
    if (ui.interactive && !args.boardRepo) {
      const ok = await ui.confirm({
        message: `Board repository: ${PROVIDER_LABELS[boardRepo.provider]} ${boardRepo.owner}/${boardRepo.name} (branch ${boardRepo.branch}${boardRepo.root ? `, folder ${boardRepo.root}` : ""}). Right?`,
        initialValue: true,
      })
      if (!ok) throw new MissingAnswerError("Set the board's git origin, or pass --board-repo <provider>:<owner>/<repo>[@branch][:root], then run npx taskmark init again.")
    }
    const providers = [...new Set([provider, boardRepo.provider])]
    const unchanged =
      connection?.provider === provider &&
      providers.every((p) => isProviderReady(integration, p)) &&
      connectRepos.length === (connection.codeRepos ?? []).length &&
      connectRepos.every((r) => (connection.codeRepos ?? []).some((c) => repoKey(c) === repoKey(r))) &&
      connection.boardRepo && repoKey(connection.boardRepo) === repoKey(boardRepo)
    if (unchanged) {
      ui.log.info(`${PROVIDER_LABELS[provider]} is already connected.`)
    } else {
      const lines = []
      const code = await runAppCommand({
        args: {
          action: "connect",
          target: provider,
          repos: connectRepos.map((r) => `${r.owner}/${r.name}`),
          boardRepo: boardRepoSpec(boardRepo),
          // New connections start in write mode; a re-run keeps the chosen mode.
          mode: connection ? undefined : "write",
          open: args.open,
        },
        boardPath,
        env,
        fetchImpl,
        interactive: ui.interactive,
        openUrl,
        log: (line) => lines.push(line),
        error: (line) => lines.push(line),
      })
      if (code !== 0) throw new Error(lines.join("\n") || "Connecting the App failed.")
      const urls = lines.filter((l) => /^\s+https?:\/\//.test(l)).map((l) => l.trim())
      ui.note(
        [
          provider === "github"
            ? "Install the Taskmark GitHub App on the owner of these repos and give it access to them:"
            : "Sign in to Bitbucket and grant Taskmark access to the workspace:",
          ...urls,
          ...(lines.includes("(opened in your browser)") ? ["(opened in your browser)"] : []),
        ].join("\n"),
        `Connect ${PROVIDER_LABELS[provider]}`,
      )
      const spin = ui.spinner({
        onCancel: () => {
          ui.cancel("Stopped waiting. Run npx taskmark init again when the App is installed.")
          process.exit(130)
        },
      })
      spin.start(`Waiting for ${providers.map((p) => PROVIDER_LABELS[p]).join(" and ")} (Ctrl+C to stop)`)
      const waited = await waitForConnection({
        fetchStatus: () => getIntegration({ baseUrl, token, fetchImpl }),
        providers,
        sleep,
      })
      if (!waited.ok) {
        spin.error(waited.reason === "timeout" ? "Still not connected after 10 minutes" : "The secret was rejected")
        ui.log.info("Finish the step in the browser, then run npx taskmark init again. Your answers are kept.")
        return 1
      }
      integration = waited.data
      spin.stop(`${PROVIDER_LABELS[provider]} connected`)
    }
    summary.push(
      `App          ${PROVIDER_LABELS[provider]}, ${integration?.connection?.mode ?? "write"} mode: ${connectRepos.map((r) => `${r.owner}/${r.name}`).join(", ")}   change: npx taskmark app connect ${provider}, npx taskmark app mode shadow`,
    )
    summary.push(`Board repo   ${boardRepo.owner}/${boardRepo.name}@${boardRepo.branch}${boardRepo.root ? `:${boardRepo.root}` : ""}`)

    // 5. AI key ----------------------------------------------------------
    const ai = await setupAi({ ui, args, env, credentials, existingAi: integration?.ai, fetchImpl })
    summary.push(`AI           ${describeAi(ai.view).split(",").slice(0, 2).join(",")}   change: npx taskmark ai set --provider anthropic|openai`)

    // 6. Hooks and agent instructions -------------------------------------
    const connectedKeys = new Set(connectRepos.map(repoKey))
    const localRepos = codeRepos.filter((r) => r.remote && connectedKeys.has(repoKey(r.remote)))
    const hooked = []
    for (const repo of localRepos) {
      try {
        const result = installHooks({ repo: repo.path })
        if (result.written.length) hooked.push(repo.name)
        if (result.skipped.length) ui.log.warn(`${repo.name}: left your own ${result.skipped.join(", ")} hook alone`)
      } catch (err) {
        ui.log.warn(`${repo.name}: could not install the hook (${err.message})`)
      }
    }
    if (hooked.length) ui.log.success(`Commit hook installed in ${hooked.join(", ")}`)
    const changes = localRepos.flatMap((repo) =>
      planAgentInstructions({ repoPath: repo.path, boardPath }).map((c) => ({ ...c, repo: repo.name })),
    )
    const pending = changes.filter((c) => c.changed)
    let agentFiles = []
    if (pending.length) {
      ui.note(pending.map((c) => previewChange({ ...c, file: `${c.repo}/${c.file}` })).join("\n\n"), "Agent instructions")
      const ok = await ui.confirm({
        message: `Write the Taskmark section to ${pending.map((c) => `${c.repo}/${c.file}`).join(", ")}? (left uncommitted)`,
        initialValue: true,
      })
      if (ok) agentFiles = applyAgentInstructions(pending)
    }
    summary.push(
      `Code repos   ${hooked.length || localRepos.length ? "commit hook" : "no local clones"}${agentFiles.length ? `, agent instructions in ${agentFiles.length} file(s) (uncommitted)` : ""}   redo: npx taskmark hooks install`,
    )

    // 7. Existing project: migrate, reconcile ------------------------------
    if (boardKind(boardPath) === "legacy") {
      const dry = migrateBoard({ boardPath, dryRun: true })
      if (dry.requests.length) {
        ui.note(
          [
            ...dry.requests.map((r) => `${r.epicId}  ->  requests/${r.slug}/  (${r.status})`),
            "",
            `${dry.requests.length} epic(s) become requests, ${dry.stagedLeaves} done task(s) marked as in production.`,
          ].join("\n"),
          "Move the legacy epics/ board to requests/",
        )
        const ok = await ui.confirm({ message: "Migrate and commit it in the board repository?", initialValue: true })
        if (ok) {
          const result = migrateBoard({ boardPath })
          let sha = null
          try {
            sha = commitBoard(boardPath, "Migrate the Taskmark board from epics to requests")
          } catch {
            ui.log.warn("Migrated, but the commit failed. Commit the board yourself.")
          }
          ui.log.success(`Migrated ${result.requests.length} epic(s) to requests${sha ? ` (commit ${sha})` : ""}`)
          summary.push(`Migration    ${result.requests.length} request(s)${sha ? `, commit ${sha}` : ""}`)
        }
      }
    }
    if (hadBoard) {
      ui.log.info("Regrouping related requests is not available yet, so this step is skipped.")
    }
    if (hadBoard && !args.skipBackfill) {
      const run = await ui.confirm({
        message: `Run the first reconciliation (last ${args.last ?? DEFAULT_BACKFILL_COMMITS} commits per stage branch)?`,
        initialValue: true,
      })
      if (run) {
        try {
          const result = await runReconcile({
            ui,
            baseUrl,
            token,
            commits: args.last ?? DEFAULT_BACKFILL_COMMITS,
            fetchImpl,
            sleep,
          })
          summary.push(
            `Reconcile    ${result.development} in development, ${result.testing} in quality, ${result.production} shipped, ${result.accepted} accepted, ${result.leftForLater} for later   again: npx taskmark reconcile`,
          )
        } catch (err) {
          if (err instanceof CancelledError) throw err
          ui.log.warn(`${err.message} You can run it later with npx taskmark reconcile.`)
        }
      }
    }

    // 8. Sync and summary ---------------------------------------------------
    const spin = ui.spinner()
    spin.start("Syncing the board to Taskmark Cloud")
    try {
      const synced = await syncBoard(boardPath)
      spin.stop(`Board synced${synced?.version ? ` (version ${synced.version})` : ""}`)
    } catch (err) {
      spin.error(`Sync failed: ${err.message || err}. Run npx taskmark sync later.`)
    }
    if (!fs.existsSync(path.join(boardPath, "node_modules"))) {
      summary.push(`Next         cd ${home(boardPath)} && npm install, then npx taskmark to open the board`)
    }
    ui.note(summary.join("\n"), "Configured")
    ui.outro("Done. Run npx taskmark init again to change any answer.")
    return 0
  } catch (err) {
    if (err instanceof CancelledError) {
      ui.cancel("Setup stopped. Files from finished steps are kept. Run npx taskmark init again to continue.")
      return 130
    }
    ui.log.error(err.message || String(err))
    if (err instanceof MissingAnswerError) return 1
    return 1
  }
}

// ----------------------------------------------------- reconcile, secret

function boardCredentials(boardPath, env) {
  const { token } = resolveBoardSyncCredentials(boardPath, env)
  if (!token) {
    throw new Error("This board has no project secret in .config. Run npx taskmark init first.")
  }
  return { token, baseUrl: cloudBaseUrl(boardPath, env) }
}

export async function runReconcileCommand({ args, boardPath, ui, env = process.env, fetchImpl = fetch, sleep }) {
  if (args.cloudUrl) env.TASKMARK_CLOUD_URL = args.cloudUrl
  try {
    const { token, baseUrl } = boardCredentials(boardPath, env)
    ui.intro("Taskmark reconcile")
    const result = await runReconcile({
      ui,
      baseUrl,
      token,
      commits: args.last ?? DEFAULT_BACKFILL_COMMITS,
      branches: args.branches,
      fetchImpl,
      sleep,
    })
    ui.outro(`${result.accepted} accepted, ${result.leftForLater} left in the review inbox.`)
    return 0
  } catch (err) {
    if (err instanceof CancelledError) {
      ui.cancel("Stopped. Nothing was applied.")
      return 130
    }
    ui.log.error(err.message || String(err))
    return 1
  }
}

export async function runSecretRotate({ args, boardPath, env = process.env, fetchImpl = fetch, log = console.log, error = console.error }) {
  if (args.cloudUrl) env.TASKMARK_CLOUD_URL = args.cloudUrl
  let credentials
  try {
    credentials = boardCredentials(boardPath, env)
  } catch (err) {
    error(err.message)
    return 1
  }
  const secret = generateSecret()
  try {
    await rotateProjectSecret({ baseUrl: credentials.baseUrl, token: credentials.token, secret, fetchImpl })
  } catch (err) {
    error(err.message)
    return 1
  }
  try {
    writeSyncToken(boardPath, secret)
  } catch (err) {
    error(
      `The secret was rotated, but .config could not be written (${err.message}).\n` +
        `Put this line in ${path.join(boardPath, ".config")} now, the old secret no longer works:\n` +
        `TASKMARK_SYNC_TOKEN=${secret}`,
    )
    return 1
  }
  log("New secret saved in .config. The old one no longer works; share the new .config with your team privately.")
  return 0
}
