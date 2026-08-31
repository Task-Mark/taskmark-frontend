/**
 * Next does not transpile app sources that live under node_modules, so an
 * installed @taskmark/ui must be copied outside of it before `next dev` or
 * `next build` can compile its TypeScript.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export const STAGE_COPY = [
  "app",
  "components",
  "hooks",
  "lib",
  "public",
  "scripts",
  "next.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "tsconfig.snapshot.json",
  "components.json",
  "package.json",
]

const STAGE_MARKER = ".taskmark-stage.json"

export function underNodeModules(dir) {
  return dir.split(path.sep).includes("node_modules")
}

/** `/tmp` vs `/private/tmp` must not look like a different install. */
function realPath(target) {
  try {
    return fs.realpathSync(target)
  } catch {
    return path.resolve(target)
  }
}

function readPackageVersion(packageRoot) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")
    )
    return String(pkg.version || "")
  } catch {
    return ""
  }
}

function readStageMarker(stageDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(stageDir, STAGE_MARKER), "utf8"))
  } catch {
    return null
  }
}

/** Directory holding the package's resolvable dependencies (next, react, ...). */
function resolveModulesSource(packageRoot, board) {
  const segments = packageRoot.split(path.sep)
  const lastModules = segments.lastIndexOf("node_modules")
  const enclosing =
    lastModules === -1
      ? null
      : segments.slice(0, lastModules + 1).join(path.sep)

  const candidates = [
    board ? path.join(board, "node_modules") : null,
    enclosing,
    path.join(packageRoot, "node_modules"),
  ].filter(Boolean)

  const withNext = candidates.find((dir) =>
    fs.existsSync(path.join(dir, "next"))
  )
  const source = withNext || candidates.find((dir) => fs.existsSync(dir))
  return source ? realPath(source) : null
}

function linkModules(stageDir, modulesSource) {
  if (!modulesSource) return
  const stageModules = path.join(stageDir, "node_modules")
  try {
    const existing = fs.lstatSync(stageModules)
    if (existing.isSymbolicLink()) {
      if (realPath(fs.readlinkSync(stageModules)) === modulesSource) return
    }
    fs.rmSync(stageModules, { recursive: true, force: true })
  } catch {
    // Nothing staged yet.
  }
  fs.symlinkSync(modulesSource, stageModules, "dir")
}

function copySources(packageRoot, stageDir) {
  for (const name of STAGE_COPY) {
    const src = path.join(packageRoot, name)
    if (!fs.existsSync(src)) continue
    const dest = path.join(stageDir, name)
    fs.rmSync(dest, { recursive: true, force: true })
    fs.cpSync(src, dest, { recursive: true })
  }
}

/**
 * Copy the package to `stageDir` and point its node_modules at the real install.
 *
 * `reuse` keeps sibling build artifacts such as `.next` across runs (dev), while
 * a package version change always forces a clean stage.
 */
export function stageUiPackage({ packageRoot, stageDir, board, reuse = false }) {
  const source = realPath(packageRoot)
  const version = readPackageVersion(source)
  const marker = reuse ? readStageMarker(stageDir) : null
  const reusable =
    Boolean(marker) &&
    marker.version === version &&
    marker.packageRoot === source

  if (!reusable) {
    fs.rmSync(stageDir, { recursive: true, force: true })
  }
  fs.mkdirSync(stageDir, { recursive: true })

  copySources(source, stageDir)
  linkModules(stageDir, resolveModulesSource(source, board))

  fs.writeFileSync(
    path.join(stageDir, STAGE_MARKER),
    JSON.stringify({ version, packageRoot: source }, null, 2) + "\n",
    "utf8"
  )

  return stageDir
}

/**
 * Stage for `taskmark dev`. Returns the package root itself when the UI is a
 * checkout rather than an install, so in-repo development stays in place.
 */
export function stageUiForDev({ packageRoot, board }) {
  if (!underNodeModules(realPath(packageRoot))) {
    return { root: packageRoot, staged: false }
  }
  const stageDir = board
    ? path.join(board, ".taskmark-ui-dev")
    : path.join(os.tmpdir(), "taskmark-ui-dev")
  stageUiPackage({ packageRoot, stageDir, board, reuse: true })
  return { root: stageDir, staged: true }
}
