import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export type PickFolderResult =
  | { ok: true; path: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string }

function trimTrailingSlash(p: string): string {
  if (p.length > 1 && (p.endsWith("/") || p.endsWith("\\"))) {
    return p.slice(0, -1)
  }
  return p
}

async function pickFolderDarwin(): Promise<PickFolderResult> {
  try {
    const { stdout } = await execFileAsync(
      "osascript",
      [
        "-e",
        'POSIX path of (choose folder with prompt "Select Taskmark master folder")',
      ],
      { timeout: 120_000 }
    )
    const path = trimTrailingSlash(stdout.trim())
    if (!path) {
      return { ok: false, cancelled: true }
    }
    return { ok: true, path }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // User cancelled the dialog (AppleScript error -128)
    if (
      message.includes("User canceled") ||
      message.includes("User cancelled") ||
      message.includes("-128")
    ) {
      return { ok: false, cancelled: true }
    }
    if (
      err &&
      typeof err === "object" &&
      "stderr" in err &&
      String((err as { stderr?: unknown }).stderr).includes("-128")
    ) {
      return { ok: false, cancelled: true }
    }
    return {
      ok: false,
      cancelled: false,
      error: `Folder picker failed: ${message}`,
    }
  }
}

async function pickFolderLinux(): Promise<PickFolderResult> {
  try {
    const { stdout } = await execFileAsync(
      "zenity",
      ["--file-selection", "--directory", "--title=Select Taskmark master folder"],
      { timeout: 120_000 }
    )
    const path = trimTrailingSlash(stdout.trim())
    if (!path) return { ok: false, cancelled: true }
    return { ok: true, path }
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: number | string }).code
        : undefined
    if (code === 1) return { ok: false, cancelled: true }
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("ENOENT")) {
      return {
        ok: false,
        cancelled: false,
        error:
          "Folder picker needs zenity on Linux, or paste a path instead.",
      }
    }
    return {
      ok: false,
      cancelled: false,
      error: `Folder picker failed: ${message}`,
    }
  }
}

async function pickFolderWindows(): Promise<PickFolderResult> {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select Taskmark master folder'
$dialog.ShowNewFolderButton = $false
if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit 1 }
Write-Output $dialog.SelectedPath
`
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-Command", script],
      { timeout: 120_000 }
    )
    const path = trimTrailingSlash(stdout.trim())
    if (!path) return { ok: false, cancelled: true }
    return { ok: true, path }
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: number | string }).code
        : undefined
    if (code === 1) return { ok: false, cancelled: true }
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      cancelled: false,
      error: `Folder picker failed: ${message}`,
    }
  }
}

/** Open a native OS folder dialog and return an absolute path (local server only). */
export async function pickFolderNative(): Promise<PickFolderResult> {
  switch (process.platform) {
    case "darwin":
      return pickFolderDarwin()
    case "win32":
      return pickFolderWindows()
    case "linux":
      return pickFolderLinux()
    default:
      return {
        ok: false,
        cancelled: false,
        error: `Folder picker is not supported on ${process.platform}. Paste a path instead.`,
      }
  }
}
