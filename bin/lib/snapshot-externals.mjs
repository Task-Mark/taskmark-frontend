import fs from "node:fs"
import path from "node:path"

/**
 * npm dependencies stay external so their CJS builds keep working, but
 * `@taskmark/components` ships TypeScript sources that Node refuses to load
 * from node_modules, so it has to be bundled in.
 */
export function snapshotExternals(packageRoot) {
  let dependencies = {}
  try {
    dependencies =
      JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"))
        .dependencies ?? {}
  } catch {
    return []
  }
  return Object.keys(dependencies).filter(
    (name) => name !== "@taskmark/components",
  )
}
