"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import {
  addMasterFolderCookie,
  clearActiveProjectCookie,
  getMasterFoldersCookie,
  setActiveProjectCookie,
} from "@/lib/taskmark/cookies"
import { pickFolderNative } from "@/lib/taskmark/pick-folder"
import { loadConfiguredWorkspace } from "@/lib/taskmark/workspace"
import { validateMasterFolder } from "@/lib/taskmark/validate"
import type { DiscoveredProject } from "@/lib/taskmark/types"

export type PreviewMasterFolderState = {
  error?: string
  masterPath?: string
  projects?: DiscoveredProject[]
}

export async function previewMasterFolder(
  _prev: PreviewMasterFolderState,
  formData: FormData
): Promise<PreviewMasterFolderState> {
  const raw = String(formData.get("masterPath") ?? "")
  const result = validateMasterFolder(raw)
  if (!result.ok) {
    return { error: result.error }
  }
  return {
    masterPath: result.masterPath,
    projects: result.projects,
  }
}

export type SaveMasterFolderState = {
  error?: string
}

export async function saveMasterFolder(
  _prev: SaveMasterFolderState,
  formData: FormData
): Promise<SaveMasterFolderState> {
  const raw = String(formData.get("masterPath") ?? "")
  const result = validateMasterFolder(raw)
  if (!result.ok) {
    return { error: result.error }
  }

  await addMasterFolderCookie(result.masterPath)

  const masters = await getMasterFoldersCookie()
  const workspace = loadConfiguredWorkspace(masters)

  // Prefer a newly discovered project from this master; else first overall.
  const fromThisMaster = result.projects[0]
  const preferred =
    workspace.projects.find((p) => p.id === fromThisMaster?.id) ??
    workspace.projects[0]

  if (preferred) {
    await setActiveProjectCookie(preferred.id)
  }

  redirect("/")
}

export type PickMasterFolderState = {
  path?: string
  error?: string
}

export async function pickMasterFolder(): Promise<PickMasterFolderState> {
  const result = await pickFolderNative()
  if (result.ok) {
    return { path: result.path }
  }
  if (result.cancelled) {
    return {}
  }
  return { error: result.error }
}

/** Open setup wizard to add another master folder without clearing existing ones. */
export async function openAddProject(): Promise<void> {
  const { resolveAutoconfigWorkspace } = await import(
    "@/lib/taskmark/autoconfig"
  )
  if (resolveAutoconfigWorkspace()?.projects.length) {
    redirect("/")
  }
  redirect("/setup?mode=add")
}

export async function selectActiveProject(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "").trim()
  if (!projectId) {
    return
  }
  await setActiveProjectCookie(projectId)
  revalidatePath("/")
  redirect("/")
}

/** Optional: clear everything and start over (not shown in app bar by default). */
export async function resetWorkspace(): Promise<void> {
  const { clearMasterFoldersCookie } = await import("@/lib/taskmark/cookies")
  await clearMasterFoldersCookie()
  await clearActiveProjectCookie()
  redirect("/setup")
}
