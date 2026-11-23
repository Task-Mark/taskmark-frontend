/**
 * The 2.0 board scaffold `taskmark init` writes: `requests/`, `meetings/`,
 * `package.json` (with `@taskmark/ui` and the `taskmark` block), `.gitignore`.
 * Planned first, written in one go, and never overwriting a file: existing
 * `package.json` and `.gitignore` are merged (missing keys / lines only).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const BOARD_GITIGNORE = [
  ".config",
  ".env",
  "REPOS.md",
  ".reports/",
  "node_modules/",
  "out/",
  ".taskmark-ui-build/",
  ".taskmark-ui-dev/",
  ".DS_Store",
]

export const BOARD_SCRIPTS = {
  start: "taskmark serve --no-open",
  serve: "taskmark serve",
  dev: "taskmark dev",
  build: "taskmark build --board . --out out",
  preview: "taskmark preview",
}

const ENGINES = { node: ">=22.23.4 <23 || >=24.22.1 <25 || >=26.12.1 <27" }

/** The version of this CLI (`@taskmark/ui`), used as the board dependency. */
export function cliVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8"))
  return pkg.version
}

/** npm package name for the board: lower case, safe characters. */
export function boardPackageName(projectName) {
  const slug = String(projectName || "board")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
  return slug.endsWith("-taskmark") ? slug : `${slug || "board"}-taskmark`
}

/**
 * The board package.json after merging. Existing keys win, except
 * `taskmark.writingLanguage` / `taskmark.repos` when the caller passes them
 * (the user chose them in this run).
 */
export function mergeBoardPackage(existing, { name, uiVersion, taskmark = {} }) {
  const pkg = existing ? structuredClone(existing) : {}
  pkg.name ??= name
  pkg.version ??= "0.1.0"
  pkg.private ??= true
  pkg.type ??= "module"
  pkg.description ??= "Taskmark board. npx taskmark opens it, npm run build writes a static copy to out/."
  pkg.engines ??= ENGINES
  pkg.scripts = { ...BOARD_SCRIPTS, ...(pkg.scripts ?? {}) }
  const deps = { ...(pkg.dependencies ?? {}) }
  const dev = pkg.devDependencies ? { ...pkg.devDependencies } : null
  if (!deps["@taskmark/ui"] && dev?.["@taskmark/ui"]) {
    deps["@taskmark/ui"] = dev["@taskmark/ui"]
    delete dev["@taskmark/ui"]
    if (Object.keys(dev).length) pkg.devDependencies = dev
    else delete pkg.devDependencies
  }
  deps["@taskmark/ui"] ??= `^${uiVersion}`
  pkg.dependencies = deps
  const block = pkg.taskmark && typeof pkg.taskmark === "object" ? { ...pkg.taskmark } : {}
  for (const [key, value] of Object.entries(taskmark)) {
    if (value !== undefined && value !== null) block[key] = value
  }
  pkg.taskmark = block
  return pkg
}

/** Adds the missing ignore lines to an existing `.gitignore` text. */
export function mergeGitignore(text) {
  const current = text ?? ""
  const have = new Set(current.split(/\r?\n/).map((l) => l.trim().replace(/\/$/, "")))
  const missing = BOARD_GITIGNORE.filter((line) => !have.has(line.replace(/\/$/, "")))
  if (!missing.length) return current
  const sep = current && !current.endsWith("\n") ? "\n" : ""
  return `${current}${sep}${missing.join("\n")}\n`
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8")
  } catch {
    return null
  }
}

/**
 * @param {{ boardPath: string, name: string, uiVersion: string, kind: string,
 *           writingLanguage?: string, repos?: string[], projectId?: string }} options
 * @returns {Array<{ path: string, action: "create" | "update" | "keep", content: string }>}
 */
export function planScaffold({ boardPath, name, uiVersion, kind, writingLanguage, repos }) {
  const files = []
  const add = (rel, next) => {
    const file = path.join(boardPath, rel)
    const before = read(file)
    files.push({
      path: rel,
      action: before === null ? "create" : before === next ? "keep" : "update",
      content: next,
    })
  }

  const pkgText = read(path.join(boardPath, "package.json"))
  let existing = null
  if (pkgText !== null) {
    try {
      existing = JSON.parse(pkgText)
    } catch {
      throw new Error(`${path.join(boardPath, "package.json")} is not valid JSON. Fix it, then run npx taskmark init again.`)
    }
  }
  const pkg = mergeBoardPackage(existing, {
    name,
    uiVersion,
    taskmark: { writingLanguage, repos: repos?.length ? repos : undefined },
  })
  add("package.json", `${JSON.stringify(pkg, null, 2)}\n`)
  add(".gitignore", mergeGitignore(read(path.join(boardPath, ".gitignore"))))
  // A legacy board gets requests/ from the migration, not an empty folder.
  if (kind !== "legacy" && !fs.existsSync(path.join(boardPath, "requests"))) {
    add("requests/.gitkeep", "")
  }
  if (!fs.existsSync(path.join(boardPath, "meetings"))) add("meetings/.gitkeep", "")
  return files
}

/** Writes the planned files that change. Returns the relative paths written. */
export function applyScaffold(boardPath, files) {
  const written = []
  for (const file of files) {
    if (file.action === "keep") continue
    const full = path.join(boardPath, file.path)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, file.content)
    written.push(file.path)
  }
  return written
}
