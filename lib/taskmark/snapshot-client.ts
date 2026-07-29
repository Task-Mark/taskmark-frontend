"use client"

import * as React from "react"

import type { WorkItemDetail, WorkItemDetailResult, WorkItemRef } from "@/lib/taskmark/detail-types"
import {
  SNAPSHOT_PATH,
  type BoardSnapshot,
} from "@/lib/taskmark/snapshot-types"

let cached: BoardSnapshot | null = null
let inflight: Promise<BoardSnapshot> | null = null

export async function getBoardSnapshot(): Promise<BoardSnapshot> {
  if (cached) return cached
  if (!inflight) {
    inflight = fetch(SNAPSHOT_PATH)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${SNAPSHOT_PATH}`)
        return r.json() as Promise<BoardSnapshot>
      })
      .then((snap) => {
        cached = snap
        return snap
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function seedBoardSnapshot(snapshot: BoardSnapshot): void {
  cached = snapshot
}

export async function loadWorkItemDetailFromSnapshot(
  filePath: string
): Promise<WorkItemDetailResult> {
  const snap = await getBoardSnapshot()
  const detail = snap.detailsByPath[filePath]
  if (!detail) {
    return {
      ok: false,
      filePath,
      message: "Work item detail not found in static snapshot",
    }
  }
  return { ok: true, detail }
}

export async function resolveWorkItemByIdFromSnapshot(
  itemId: string
): Promise<
  | { ok: true; ref: WorkItemRef }
  | { ok: false; itemId: string; message: string }
> {
  const id = itemId.trim()
  const snap = await getBoardSnapshot()
  const ref = snap.refsById[id]
  if (!ref) {
    return { ok: false, itemId: id, message: `Work item ${id} was not found` }
  }
  return { ok: true, ref }
}

export type { WorkItemDetail }
