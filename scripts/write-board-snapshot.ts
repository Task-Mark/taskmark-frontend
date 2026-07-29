#!/usr/bin/env node
/**
 * Write public/taskmark-snapshot.json for static export builds.
 * Run with: npx tsx scripts/write-board-snapshot.ts
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { buildBoardSnapshotFromEnv } from "../lib/taskmark/build-snapshot"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outPath = path.join(root, "public", "taskmark-snapshot.json")

const snapshot = buildBoardSnapshotFromEnv()
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(snapshot), "utf8")
console.log(
  `[write-board-snapshot] ${outPath} (${Object.keys(snapshot.refsById).length} items, board ${snapshot.project.boardPath})`
)
