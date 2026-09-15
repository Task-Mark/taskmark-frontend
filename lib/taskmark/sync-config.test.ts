import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  resolveBoardSyncCredentials,
  watchBoardSyncConfig,
} from "./sync-config.mjs"

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-sync-config-"))
  const board = path.join(root, "board")
  fs.mkdirSync(board)
  return { root, board }
}

test("committed .config beats the environment", () => {
  const { root, board } = fixture()
  try {
    const committed = `tmk_${"d".repeat(48)}`
    const fallback = `tmk_${"e".repeat(48)}`
    fs.writeFileSync(
      path.join(board, ".config"),
      `TASKMARK_SYNC_TOKEN=${committed}\nTASKMARK_CLOUD_URL=https://cloud.example\n`,
    )
    assert.deepEqual(
      resolveBoardSyncCredentials(board, {
        TASKMARK_SYNC_TOKEN: fallback,
      }),
      {
        token: committed,
        source: "config",
        cloudUrl: "https://cloud.example",
      },
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("environment is used when .config has no token", () => {
  const { root, board } = fixture()
  try {
    const fallback = `tmk_${"b".repeat(48)}`
    assert.deepEqual(
      resolveBoardSyncCredentials(board, {
        TASKMARK_SYNC_TOKEN: fallback,
      }),
      {
        token: fallback,
        source: "environment",
        cloudUrl: "",
      },
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("notifies when board .config changes", async () => {
  const { root, board } = fixture()
  let stop = () => {}
  try {
    const changed = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("config watcher timed out")),
        2500,
      )
      stop = watchBoardSyncConfig(board, () => {
        clearTimeout(timeout)
        resolve()
      })
    })
    fs.writeFileSync(
      path.join(board, ".config"),
      `TASKMARK_SYNC_TOKEN=tmk_${"c".repeat(48)}\n`,
    )
    await changed
  } finally {
    stop()
    fs.rmSync(root, { recursive: true, force: true })
  }
})
