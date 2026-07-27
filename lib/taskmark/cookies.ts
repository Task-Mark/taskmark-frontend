import { cookies } from "next/headers"

import {
  ACTIVE_PROJECT_COOKIE,
  ACTIVE_PROJECT_COOKIE_MAX_AGE,
  HIDE_COMPLETED_COOKIES,
  MASTER_FOLDER_COOKIE,
  MASTER_FOLDERS_COOKIE,
  MASTER_FOLDERS_COOKIE_MAX_AGE,
  MASTER_FOLDER_COOKIE_MAX_AGE,
  type HideCompletedCookieKey,
} from "@/lib/taskmark/constants"
import { parseHideCompletedCookieValue } from "@/lib/taskmark/hide-completed-cookie"

async function readEncodedCookie(name: string): Promise<string | null> {
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
  const store = await cookies()
  store.set(ACTIVE_PROJECT_COOKIE, encodeCookieValue(projectId), {
    path: "/",
    maxAge: ACTIVE_PROJECT_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
  })
}

export async function clearActiveProjectCookie(): Promise<void> {
  const store = await cookies()
  store.delete(ACTIVE_PROJECT_COOKIE)
}

export async function getHideCompletedCookie(
  key: HideCompletedCookieKey
): Promise<boolean> {
  const store = await cookies()
  return parseHideCompletedCookieValue(
    store.get(HIDE_COMPLETED_COOKIES[key])?.value
  )
}

export async function getHideCompletedCookies(): Promise<
  Record<HideCompletedCookieKey, boolean>
> {
  const store = await cookies()
  return {
    epics: parseHideCompletedCookieValue(
      store.get(HIDE_COMPLETED_COOKIES.epics)?.value
    ),
    stories: parseHideCompletedCookieValue(
      store.get(HIDE_COMPLETED_COOKIES.stories)?.value
    ),
    tasks: parseHideCompletedCookieValue(
      store.get(HIDE_COMPLETED_COOKIES.tasks)?.value
    ),
    overallWorkItems: parseHideCompletedCookieValue(
      store.get(HIDE_COMPLETED_COOKIES.overallWorkItems)?.value
    ),
    workItems: parseHideCompletedCookieValue(
      store.get(HIDE_COMPLETED_COOKIES.workItems)?.value
    ),
  }
}
