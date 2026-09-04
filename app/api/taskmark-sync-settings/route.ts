import path from "node:path"
import { NextResponse } from "next/server"

import { resolveBoardAtPath } from "@/lib/taskmark/discover"
import {
  isTaskmarkSyncToken,
  readBoardSyncConfig,
  resolveBoardSyncCredentials,
  syncTokenHint,
  writeBoardSyncConfig,
} from "@/lib/taskmark/sync-config.mjs"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function boundBoardRoot(): string | null {
  const configured = process.env.TASKMARK_BOARD?.trim()
  if (!configured) return null
  return resolveBoardAtPath(path.resolve(configured))
}

function status(boardPath: string) {
  const saved = readBoardSyncConfig(boardPath)
  const resolved = resolveBoardSyncCredentials(boardPath)
  const hintToken =
    saved?.token ||
    (resolved.source === "config" ? resolved.token : "")
  return {
    configured: Boolean(resolved.token),
    source: resolved.source,
    // Never derive browser-visible text from a secret inherited via env.
    tokenHint: syncTokenHint(hintToken),
  }
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    const requestHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      new URL(request.url).host
    return new URL(origin).host === requestHost
  } catch {
    return false
  }
}

export async function GET() {
  const boardPath = boundBoardRoot()
  if (!boardPath) {
    return NextResponse.json(
      { message: "Sync Settings are available on a bound Taskmark project." },
      { status: 404 },
    )
  }
  return NextResponse.json(status(boardPath))
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { message: "Sync Settings can only be changed from the local Taskmark UI." },
      { status: 403 },
    )
  }
  const boardPath = boundBoardRoot()
  if (!boardPath) {
    return NextResponse.json(
      { message: "Sync Settings are available on a bound Taskmark project." },
      { status: 404 },
    )
  }
  let body: { token?: unknown }
  try {
    body = (await request.json()) as { token?: unknown }
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 })
  }
  const token = typeof body.token === "string" ? body.token.trim() : ""
  if (!isTaskmarkSyncToken(token)) {
    return NextResponse.json(
      { message: "Enter a valid Taskmark sync token beginning with tmk_." },
      { status: 400 },
    )
  }
  try {
    writeBoardSyncConfig(boardPath, token)
    return NextResponse.json(status(boardPath))
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not save sync settings.",
      },
      { status: 500 },
    )
  }
}
