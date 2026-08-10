import fs from "node:fs"
import path from "node:path"

import { cwdCandidates } from "@/lib/taskmark/autoconfig"
import { resolveBoardAtPath } from "@/lib/taskmark/discover"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function resolveBoardRoot(): string | null {
  const env = process.env.TASKMARK_BOARD?.trim()
  if (env) {
    const board = resolveBoardAtPath(path.resolve(env))
    if (board) return board
  }
  for (const candidate of cwdCandidates()) {
    const board = resolveBoardAtPath(candidate)
    if (board) return board
  }
  return null
}

function walkMarkdownFiles(root: string, out: string[] = []): string[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "out") {
      continue
    }
    const full = path.join(root, entry.name)
    if (entry.isDirectory()) {
      walkMarkdownFiles(full, out)
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full)
    }
  }
  return out
}

function latestMarkdownMtime(boardRoot: string): number {
  let latest = 0
  for (const file of walkMarkdownFiles(boardRoot)) {
    try {
      const mtime = fs.statSync(file).mtimeMs
      if (mtime > latest) latest = mtime
    } catch {
      // ignore transient deletes
    }
  }
  return latest
}

/**
 * SSE stream that emits `reload` when any board `.md` mtime changes.
 * Used only by `taskmark dev` / Next development mode.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not available", { status: 404 })
  }

  const boardRoot = resolveBoardRoot()
  if (!boardRoot) {
    return new Response("No board", { status: 404 })
  }

  const encoder = new TextEncoder()
  let last = latestMarkdownMtime(boardRoot)
  let interval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }
      send("hello", String(Date.now()))
      interval = setInterval(() => {
        const next = latestMarkdownMtime(boardRoot)
        if (next > last) {
          last = next
          send("reload", String(Date.now()))
        } else {
          send("ping", String(Date.now()))
        }
      }, 750)
    },
    cancel() {
      if (interval) clearInterval(interval)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
