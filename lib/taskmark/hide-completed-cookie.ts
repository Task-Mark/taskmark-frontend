import {
  HIDE_COMPLETED_COOKIE_MAX_AGE,
  HIDE_COMPLETED_COOKIES,
  type HideCompletedCookieKey,
} from "@/lib/taskmark/constants"

export type { HideCompletedCookieKey }

export function hideCompletedCookieName(
  key: HideCompletedCookieKey
): string {
  return HIDE_COMPLETED_COOKIES[key]
}

export function parseHideCompletedCookieValue(
  value: string | null | undefined
): boolean {
  return value === "1" || value === "true"
}

/** Client-only read of a Hide completed cookie. */
export function readHideCompletedCookieClient(
  key: HideCompletedCookieKey
): boolean {
  if (typeof document === "undefined") return false
  const name = hideCompletedCookieName(key)
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return parseHideCompletedCookieValue(match?.[1])
}

/** Persist Hide completed for one list (client-readable cookie). */
export function writeHideCompletedCookieClient(
  key: HideCompletedCookieKey,
  hide: boolean
): void {
  if (typeof document === "undefined") return
  const name = hideCompletedCookieName(key)
  document.cookie = `${name}=${hide ? "1" : "0"}; path=/; max-age=${HIDE_COMPLETED_COOKIE_MAX_AGE}; SameSite=Lax`
}
