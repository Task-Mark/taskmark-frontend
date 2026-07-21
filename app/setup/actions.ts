"use server"

import { redirect } from "next/navigation"

import {
  clearMasterFolderCookie,
  setMasterFolderCookie,
} from "@/lib/taskmark/cookies"
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

  await setMasterFolderCookie(result.masterPath)
  redirect("/board")
}

export async function switchMasterFolder(): Promise<void> {
  await clearMasterFolderCookie()
  redirect("/setup")
}
