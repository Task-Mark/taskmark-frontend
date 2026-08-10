#!/usr/bin/env node
/**
 * Prepare a packable production Next build for `taskmark serve`.
 *
 * Layout after prepare:
 *   dist/prod-next/  — slim `.next` (server + static + manifests, no cache)
 *
 * npm always strips directories named `node_modules`, and Next 16's standalone
 * NFT tree is incomplete for packaging — so we ship a normal production build
 * and run `next start` (next is already a dependency of @taskmark/ui).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const nextSrc = path.join(root, ".next")
const distRoot = path.join(root, "dist", "prod-next")
const publicSrc = path.join(root, "public")

const COPY_ENTRIES = [
  "BUILD_ID",
  "build-manifest.json",
  "export-marker.json",
  "images-manifest.json",
  "next-minimal-server.js.nft.json",
  "next-server.js.nft.json",
  "package.json",
  "prerender-manifest.json",
  "react-loadable-manifest.json",
  "required-server-files.json",
  "required-server-files.js",
  "routes-manifest.json",
  "app-path-routes-manifest.json",
  "app-build-manifest.json",
  "server-reference-manifest.js",
  "server-reference-manifest.json",
  "server",
  "static",
]

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

function cp(src, dest) {
  fs.cpSync(src, dest, { recursive: true })
}

if (!fs.existsSync(nextSrc)) {
  console.error("[prepare-standalone] Missing .next — run `next build` first.")
  process.exit(1)
}

rmrf(distRoot)
fs.mkdirSync(distRoot, { recursive: true })

let copied = 0
for (const name of COPY_ENTRIES) {
  const src = path.join(nextSrc, name)
  if (!fs.existsSync(src)) continue
  cp(src, path.join(distRoot, name))
  copied += 1
}

if (!fs.existsSync(path.join(distRoot, "server"))) {
  console.error(
    "[prepare-standalone] Missing .next/server after copy — build looks incomplete."
  )
  process.exit(1)
}

// Keep public assets next to the package root (already published via files[]),
// but also mirror into dist for clarity when inspecting packs.
if (fs.existsSync(publicSrc)) {
  const publicDest = path.join(path.dirname(distRoot), "public")
  rmrf(publicDest)
  cp(publicSrc, publicDest)
}

console.log(
  `[prepare-standalone] Ready: ${distRoot} (${copied} entries from .next)`
)
