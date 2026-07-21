import { cookies } from "next/headers"

import {
  MASTER_FOLDER_COOKIE,
  MASTER_FOLDER_COOKIE_MAX_AGE,
} from "@/lib/taskmark/constants"

export async function getMasterFolderCookie(): Promise<string | null> {
  const store = await cookies()
  const value = store.get(MASTER_FOLDER_COOKIE)?.value
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function setMasterFolderCookie(masterPath: string): Promise<void> {
  const store = await cookies()
  store.set(MASTER_FOLDER_COOKIE, encodeURIComponent(masterPath), {
    path: "/",
    maxAge: MASTER_FOLDER_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
  })
}

export async function clearMasterFolderCookie(): Promise<void> {
  const store = await cookies()
  store.delete(MASTER_FOLDER_COOKIE)
}
