import assert from "node:assert/strict"
import test from "node:test"

import { createWorkspaceSyncManager } from "./workspace-sync.mjs"

const configuredToken = "tmk_1234567890123456"

function project(boardPath: string) {
  return { boardPath }
}

async function flushBackgroundStarts() {
  await new Promise<void>((resolve) => setImmediate(resolve))
}

test("starts one background watcher for every configured workspace board", async () => {
  const starts: string[] = []
  const manager = createWorkspaceSyncManager({
    readConfig: (boardPath: string) => ({
      token: boardPath.endsWith("without-config") ? "" : configuredToken,
      cloudUrl: "",
    }),
    runSync: async ({ boardPath, watch }: { boardPath: string; watch: boolean }) => {
      assert.equal(watch, true)
      starts.push(boardPath)
      return () => {}
    },
  })

  manager.reconcile([
    project("/workspace/alpha"),
    project("/workspace/beta"),
    project("/workspace/alpha"),
    project("/workspace/without-config"),
  ])
  await flushBackgroundStarts()

  assert.deepEqual(starts.sort(), [
    "/workspace/alpha",
    "/workspace/beta",
  ])
})

test("does not duplicate watchers and stops boards removed from the workspace", async () => {
  const starts: string[] = []
  const stops: string[] = []
  const manager = createWorkspaceSyncManager({
    readConfig: () => ({ token: configuredToken, cloudUrl: "" }),
    runSync: async ({ boardPath }: { boardPath: string }) => {
      starts.push(boardPath)
      return () => stops.push(boardPath)
    },
  })

  manager.reconcile([
    project("/workspace/alpha"),
    project("/workspace/beta"),
  ])
  await flushBackgroundStarts()

  manager.reconcile([
    project("/workspace/alpha"),
    project("/workspace/beta"),
  ])
  await flushBackgroundStarts()
  assert.equal(starts.length, 2)

  manager.reconcile([project("/workspace/beta")])
  assert.deepEqual(stops, ["/workspace/alpha"])

  manager.stopAll()
  assert.deepEqual(stops.sort(), [
    "/workspace/alpha",
    "/workspace/beta",
  ])
})
