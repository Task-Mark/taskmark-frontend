import path from "node:path"
import { fileURLToPath } from "node:url"

import type { NextConfig } from "next"

const packageDir = path.dirname(fileURLToPath(import.meta.url))
const staticExport = process.env.TASKMARK_STATIC === "1"

const nextConfig: NextConfig = {
  // When installed under a board with its own lockfile, Next would otherwise
  // treat the board as the workspace root and break `@/` resolution.
  outputFileTracingRoot: packageDir,
  // `taskmark serve` uses standalone; `taskmark build` (static hosting) uses export.
  output: staticExport ? "export" : "standalone",
  images: staticExport ? { unoptimized: true } : undefined,
  // Static build stubs server actions; skip tsc against those temporary stubs.
  typescript: staticExport ? { ignoreBuildErrors: true } : undefined,
  // Avoid tracing prior dist/standalone into itself (nested copies).
  outputFileTracingExcludes: staticExport
    ? undefined
    : {
        "*": ["./dist/**/*", "./out/**/*"],
      },
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
