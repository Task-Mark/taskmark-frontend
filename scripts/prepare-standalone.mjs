#!/usr/bin/env node
/**
 * Copy Next standalone output into a packable layout and attach static assets.
 *
 * Layout after prepare:
 *   dist/standalone/   — server.js + traced node_modules + .next/static + public
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const standaloneSrc = path.join(root, ".next", "standalone")
const staticSrc = path.join(root, ".next", "static")
const publicSrc = path.join(root, "public")
const distRoot = path.join(root, "dist", "standalone")

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

function cp(src, dest) {
  fs.cpSync(src, dest, { recursive: true })
}

if (!fs.existsSync(standaloneSrc)) {
  console.error(
    "[prepare-standalone] Missing .next/standalone — run `next build` first."
  )
  process.exit(1)
}

rmrf(distRoot)
fs.mkdirSync(path.dirname(distRoot), { recursive: true })
cp(standaloneSrc, distRoot)

const staticDest = path.join(distRoot, ".next", "static")
if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true })
  cp(staticSrc, staticDest)
} else {
  console.warn("[prepare-standalone] Warning: .next/static not found")
}

const publicDest = path.join(distRoot, "public")
if (fs.existsSync(publicSrc)) {
  cp(publicSrc, publicDest)
}

console.log(`[prepare-standalone] Ready: ${distRoot}`)
