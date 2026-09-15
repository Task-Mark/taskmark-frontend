import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { readBoardDotConfig } from "./sync-config.mjs"

async function runWorkspaceBoardSync(options) {
  const moduleRoot =
    process.env.TASKMARK_UI_PACKAGE_ROOT ||
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  const syncModule = pathToFileURL(
    path.join(moduleRoot, "bin", "lib", "sync-board.mjs")
  ).href
  const { runBoardSync } = await import(/* webpackIgnore: true */ syncModule)
  return runBoardSync(options)
}

function canonicalBoardPath(boardPath) {
  try {
    return fs.realpathSync(boardPath)
  } catch {
    return path.resolve(boardPath)
  }
}

export function createWorkspaceSyncManager({
  runSync = runWorkspaceBoardSync,
  readConfig = readBoardDotConfig,
  onError = (error) => {
    console.error(`[taskmark sync] ${error?.message || error}`)
  },
} = {}) {
  const watchers = new Map()

  function stopEntry(boardPath, entry) {
    watchers.delete(boardPath)
    entry.wanted = false
    entry.stop?.()
  }

  function start(boardPath) {
    const entry = { wanted: true, stop: null }
    watchers.set(boardPath, entry)

    Promise.resolve()
      .then(() => runSync({ boardPath, watch: true }))
      .then((stop) => {
        if (entry.wanted && watchers.get(boardPath) === entry) {
          entry.stop = stop
        } else {
          stop()
        }
      })
      .catch((error) => {
        if (watchers.get(boardPath) === entry) {
          watchers.delete(boardPath)
        }
        onError(error)
      })
  }

  return {
    reconcile(projects) {
      const desired = new Set()
      const configured = new Set()
      for (const project of projects) {
        const boardPath = canonicalBoardPath(project.boardPath)
        desired.add(boardPath)
        if (readConfig(boardPath).token) {
          configured.add(boardPath)
        }
      }

      for (const [boardPath, entry] of watchers) {
        if (!desired.has(boardPath)) {
          stopEntry(boardPath, entry)
        }
      }
      for (const boardPath of configured) {
        const current = watchers.get(boardPath)
        if (current) {
          current.wanted = true
        } else {
          start(boardPath)
        }
      }
    },

    stopAll() {
      for (const [boardPath, entry] of watchers) {
        stopEntry(boardPath, entry)
      }
    },
  }
}

const managerKey = Symbol.for("taskmark.workspaceSyncManager")

function sharedManager() {
  if (!globalThis[managerKey]) {
    globalThis[managerKey] = createWorkspaceSyncManager()
  }
  return globalThis[managerKey]
}

export function syncWorkspaceProjects(projects) {
  sharedManager().reconcile(projects)
}

export function stopWorkspaceSync() {
  sharedManager().stopAll()
}
