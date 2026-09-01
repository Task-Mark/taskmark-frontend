import {
  HIDE_COMPLETED_COOKIE,
  HIDE_COMPLETED_COOKIE_MAX_AGE,
  HIDE_COMPLETED_DEFAULT,
} from "@/lib/taskmark/constants"

/**
 * Only an explicit opt-out turns the filter off; anything else (missing or
 * unrecognized cookie) keeps the default so completed work stays hidden.
 */
export function parseHideCompletedCookieValue(
  value: string | null | undefined
): boolean {
  if (value === "1" || value === "true") return true
  if (value === "0" || value === "false") return false
  return HIDE_COMPLETED_DEFAULT
}

/** Client-only read of the shared Hide completed cookie. */
export function readHideCompletedCookieClient(): boolean {
  if (typeof document === "undefined") return HIDE_COMPLETED_DEFAULT
  const escaped = HIDE_COMPLETED_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return parseHideCompletedCookieValue(match?.[1])
}

/** Persist Hide completed for every list (client-readable cookie). */
export function writeHideCompletedCookieClient(hide: boolean): void {
  if (typeof document === "undefined") return
  document.cookie = `${HIDE_COMPLETED_COOKIE}=${hide ? "1" : "0"}; path=/; max-age=${HIDE_COMPLETED_COOKIE_MAX_AGE}; SameSite=Lax`
}
