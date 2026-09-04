import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  boardSyncConfigPath,
  readBoardSyncConfig,
  resolveBoardSyncCredentials,
  syncTokenHint,
  watchBoardSyncConfig,
  writeBoardSyncConfig,
} from "./sync-config.mjs"

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-sync-config-"))
  const board = path.join(root, "board")
  const config = path.join(root, "config")
  fs.mkdirSync(board)
  return { root, board, config }
}

test("stores a per-board token outside the repository with a safe hint", () => {
  const { root, board, config } = fixture()
  const previous = process.env.TASKMARK_CONFIG_HOME
  process.env.TASKMARK_CONFIG_HOME = config
  try {
    const token = `tmk_${"a".repeat(48)}`
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
    writeBoardSyncConfig(board, token)
    const file = boardSyncConfigPath(board)
    assert.equal(file.startsWith(board), false)
    assert.equal(fs.statSync(file).mode & 0o777, 0o600)
    assert.equal(readBoardSyncConfig(board)?.token, token)
    assert.equal(syncTokenHint(token), `••••••${"a".repeat(6)}`)
    assert.deepEqual(
      resolveBoardSyncCredentials(board, {
        TASKMARK_SYNC_TOKEN: fallback,
      }),
      {
        token,
        source: "settings",
        cloudUrl: "",
      },
    )
  } finally {
    if (previous == null) delete process.env.TASKMARK_CONFIG_HOME
    else process.env.TASKMARK_CONFIG_HOME = previous
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("committed .config is used when Settings are empty and beats the environment", () => {
  const { root, board, config } = fixture()
  const previous = process.env.TASKMARK_CONFIG_HOME
  process.env.TASKMARK_CONFIG_HOME = config
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
    const settingsToken = `tmk_${"f".repeat(48)}`
    writeBoardSyncConfig(board, settingsToken)
    assert.deepEqual(
      resolveBoardSyncCredentials(board, {
        TASKMARK_SYNC_TOKEN: fallback,
      }),
      {
        token: settingsToken,
        source: "settings",
        cloudUrl: "https://cloud.example",
      },
    )
  } finally {
    if (previous == null) delete process.env.TASKMARK_CONFIG_HOME
    else process.env.TASKMARK_CONFIG_HOME = previous
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("rejects malformed tokens", () => {
  const { root, board, config } = fixture()
  const previous = process.env.TASKMARK_CONFIG_HOME
  process.env.TASKMARK_CONFIG_HOME = config
  try {
    assert.throws(
      () => writeBoardSyncConfig(board, "not-a-token"),
      /beginning with tmk_/,
    )
  } finally {
    if (previous == null) delete process.env.TASKMARK_CONFIG_HOME
    else process.env.TASKMARK_CONFIG_HOME = previous
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("notifies when sync settings are saved", async () => {
  const { root, board, config } = fixture()
  const previous = process.env.TASKMARK_CONFIG_HOME
  process.env.TASKMARK_CONFIG_HOME = config
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
    writeBoardSyncConfig(board, `tmk_${"c".repeat(48)}`)
    await changed
  } finally {
    stop()
    if (previous == null) delete process.env.TASKMARK_CONFIG_HOME
    else process.env.TASKMARK_CONFIG_HOME = previous
    fs.rmSync(root, { recursive: true, force: true })
  }
})
