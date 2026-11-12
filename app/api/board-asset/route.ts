import fs from "node:fs"
import path from "node:path"

import { boardImageType } from "@taskmark/components/board-model"

import {
  allowedBoardRelative,
  realpathOrNull,
  servableAssetStat,
} from "@/lib/taskmark/board-assets"
import { getMasterFoldersCookie } from "@/lib/taskmark/cookies"
import { loadWorkspace } from "@/lib/taskmark/workspace"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function notFound() {
  return new Response("Not found", { status: 404 })
}

/**
 * Stream an image referenced by a relative markdown path from the active
 * workspace's boards (`taskmark serve` / `taskmark dev`). Static exports copy
 * the same files under `/board-assets/` instead.
 */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("path")?.trim()
  if (!requested || requested.includes("\0") || !path.isAbsolute(requested)) {
    return notFound()
  }
  const contentType = boardImageType(requested.replaceAll("\\", "/"))
  if (!contentType) return notFound()

  const file = realpathOrNull(path.resolve(requested))
  if (!file) return notFound()

  // Resolve symlinks on both sides so a link inside the board cannot reach a
  // file outside it.
  const workspace = loadWorkspace(await getMasterFoldersCookie())
  const owner = workspace.projects.find((project) => {
    const board = realpathOrNull(project.boardPath)
    return board != null && allowedBoardRelative(board, file) != null
  })
  if (!owner) return notFound()

  const stat = servableAssetStat(file)
  if (!stat) return notFound()

  const body = await fs.promises.readFile(file)
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
      // Board files change while `serve`/`dev` run; always revalidate.
      "Cache-Control": "no-cache",
      "Last-Modified": stat.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff",
      // SVGs opened directly must not run scripts on the board origin.
      "Content-Security-Policy":
        "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  })
}
