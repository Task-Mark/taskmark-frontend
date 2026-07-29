import "server-only"
import fs from "node:fs"
import path from "node:path"

import type { BoardSnapshot } from "@/lib/taskmark/snapshot-types"

export function loadSnapshotFromPublic(): BoardSnapshot {
  const file = path.join(process.cwd(), "public", "taskmark-snapshot.json")
  const raw = fs.readFileSync(file, "utf8")
  return JSON.parse(raw) as BoardSnapshot
}
