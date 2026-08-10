import path from "node:path"
import { fileURLToPath } from "node:url"

import type { NextConfig } from "next"

const packageDir = path.dirname(fileURLToPath(import.meta.url))
const staticExport = process.env.TASKMARK_STATIC === "1"

const nextConfig: NextConfig = {
  // When installed under a board with its own lockfile, Next would otherwise
  // treat the board as the workspace root and break `@/` resolution.
  outputFileTracingRoot: packageDir,
  // Static hosting uses `export`; local `taskmark serve` uses `next start`
  // against a slim prebuilt `.next` (see scripts/prepare-standalone.mjs).
  output: staticExport ? "export" : undefined,
  images: staticExport ? { unoptimized: true } : undefined,
  // Static build stubs server actions; skip tsc against those temporary stubs.
  typescript: staticExport ? { ignoreBuildErrors: true } : undefined,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": packageDir,
    }
    return config
  },
  // Next 16 defaults to Turbopack; keep alias parity when `--turbopack` is used.
  turbopack: {
    resolveAlias: {
      "@": packageDir,
    },
  },
}

export default nextConfig
