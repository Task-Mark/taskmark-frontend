import { cookies } from "next/headers"

import {
  ACTIVE_PROJECT_COOKIE,
  ACTIVE_PROJECT_COOKIE_MAX_AGE,
  HIDE_COMPLETED_COOKIE,
  HIDE_COMPLETED_DEFAULT,
  MASTER_FOLDER_COOKIE,
  MASTER_FOLDERS_COOKIE,
  MASTER_FOLDERS_COOKIE_MAX_AGE,
  MASTER_FOLDER_COOKIE_MAX_AGE,
} from "@/lib/taskmark/constants"
import { parseHideCompletedCookieValue } from "@/lib/taskmark/hide-completed-cookie"
import { isStaticRuntime } from "@/lib/taskmark/static-mode"

async function readEncodedCookie(name: string): Promise<string | null> {
  if (isStaticRuntime()) return null
  const store = await cookies()
  const value = store.get(name)?.value
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function encodeCookieValue(value: string): string {
  return encodeURIComponent(value)
}

/** Legacy single master + new multi-master list. */
export async function getMasterFoldersCookie(): Promise<string[]> {
  const rawList = await readEncodedCookie(MASTER_FOLDERS_COOKIE)
  if (rawList) {
    try {
      const parsed = JSON.parse(rawList) as unknown
      if (Array.isArray(parsed)) {
        return [
          ...new Set(
            parsed
              .filter((v): v is string => typeof v === "string")
              .map((v) => v.trim())
              .filter(Boolean)
          ),
        ]
      }
    } catch {
      // fall through to legacy
    }
  }

  const legacy = await readEncodedCookie(MASTER_FOLDER_COOKIE)
  if (legacy?.trim()) {
    return [legacy.trim()]
  }
  return []
}

export async function setMasterFoldersCookie(masters: string[]): Promise<void> {
  if (isStaticRuntime()) return
  const unique = [
    ...new Set(masters.map((m) => m.trim()).filter(Boolean)),
  ]
  const store = await cookies()
  store.set(MASTER_FOLDERS_COOKIE, encodeCookieValue(JSON.stringify(unique)), {
    path: "/",
    maxAge: MASTER_FOLDERS_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
  })
  // Keep legacy cookie aligned with the latest added master for older readers.
  if (unique.length > 0) {
    store.set(MASTER_FOLDER_COOKIE, encodeCookieValue(unique[unique.length - 1]!), {
      path: "/",
      maxAge: MASTER_FOLDER_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
    })
  } else {
    store.delete(MASTER_FOLDER_COOKIE)
  }
}

export async function addMasterFolderCookie(masterPath: string): Promise<string[]> {
  const existing = await getMasterFoldersCookie()
  const next = [...existing]
  if (!next.includes(masterPath)) {
    next.push(masterPath)
  }
  await setMasterFoldersCookie(next)
  return next
}

export async function clearMasterFoldersCookie(): Promise<void> {
  if (isStaticRuntime()) return
  const store = await cookies()
  store.delete(MASTER_FOLDERS_COOKIE)
  store.delete(MASTER_FOLDER_COOKIE)
}

/** @deprecated use getMasterFoldersCookie */
export async function getMasterFolderCookie(): Promise<string | null> {
  const masters = await getMasterFoldersCookie()
  return masters[masters.length - 1] ?? null
}

export async function getActiveProjectCookie(): Promise<string | null> {
  return readEncodedCookie(ACTIVE_PROJECT_COOKIE)
}

export async function setActiveProjectCookie(projectId: string): Promise<void> {
  if (isStaticRuntime()) return
  const store = await cookies()
  store.set(ACTIVE_PROJECT_COOKIE, encodeCookieValue(projectId), {
    path: "/",
    maxAge: ACTIVE_PROJECT_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
  })
}

export async function clearActiveProjectCookie(): Promise<void> {
  if (isStaticRuntime()) return
  const store = await cookies()
  store.delete(ACTIVE_PROJECT_COOKIE)
}

/** Shared across every board list, so one toggle covers the whole board. */
export async function getHideCompletedCookie(): Promise<boolean> {
  if (isStaticRuntime()) return HIDE_COMPLETED_DEFAULT
  const store = await cookies()
  return parseHideCompletedCookieValue(store.get(HIDE_COMPLETED_COOKIE)?.value)
}
