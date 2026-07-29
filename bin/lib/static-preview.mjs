/**
 * Minimal static file server for Next `output: 'export'` sites (board/out).
 */
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0].split("#")[0])
  const rel = decoded.replace(/^\/+/, "")
  const full = path.resolve(root, rel)
  const rootReal = path.resolve(root)
  if (full !== rootReal && !full.startsWith(rootReal + path.sep)) {
    return null
  }
  return full
}

function existingFile(...candidates) {
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate
    } catch {
      /* try next */
    }
  }
  return null
}

function pickFile(root, urlPath) {
  const base = safeJoin(root, urlPath)
  if (!base) return { file: null, status: 403 }

  let file = null
  if (urlPath === "/" || urlPath === "" || urlPath?.startsWith("/?")) {
    file = existingFile(path.join(root, "index.html"))
  } else {
    const candidates = [base]
    if (!path.extname(base)) {
      candidates.push(`${base}.html`, path.join(base, "index.html"))
    }
    file = existingFile(...candidates)
  }

  if (file) return { file, status: 200 }

  const notFound = existingFile(path.join(root, "404.html"))
  if (notFound) return { file: notFound, status: 404 }
  return { file: null, status: 404 }
}

/**
 * @param {{ root: string, port: number, host?: string }} opts
 * @returns {Promise<import('node:http').Server>}
 */
export function startStaticServer({ root, port, host = "0.0.0.0" }) {
  const server = http.createServer((req, res) => {
    const { file, status } = pickFile(root, req.url || "/")
    if (!file) {
      res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" })
      res.end("Not found")
      return
    }
    const ext = path.extname(file).toLowerCase()
    const type = MIME[ext] || "application/octet-stream"
    res.writeHead(status, {
      "Content-Type": type,
      "Cache-Control":
        ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    })
    fs.createReadStream(file).pipe(res)
  })

  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, host, () => resolve(server))
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2]
  const port = Number(process.argv[3] || 8275)
  if (!root) {
    console.error("Usage: static-preview.mjs <root> [port]")
    process.exit(1)
  }
  startStaticServer({ root, port }).then(() => {
    console.log(`Static preview: http://localhost:${port} → ${root}`)
  })
}
