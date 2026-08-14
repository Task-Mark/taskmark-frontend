import path from "node:path"

/**
 * Workspace (multi-project) mode — `taskmark` / `taskmark open` / `--workspace`.
 *
 * Board-bound commands (`serve`, `dev`) auto-config a single board from env or
 * cwd. Workspace mode turns that off so the cookie-based master folders and the
 * app bar project picker drive which board is shown.
 */
export function isWorkspaceMode(): boolean {
  const raw = process.env.TASKMARK_WORKSPACE?.trim().toLowerCase()
  return raw === "1" || raw === "true"
}

/** Directory `taskmark` was invoked from; seeds the setup wizard input. */
export function workspaceStartPath(): string {
  for (const raw of [
    process.env.TASKMARK_WORKSPACE_ROOT,
    process.env.INIT_CWD,
  ]) {
    if (raw && raw.trim()) return path.resolve(raw.trim())
  }
  return ""
}
