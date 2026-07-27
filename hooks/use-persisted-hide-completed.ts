"use client"

import { useCallback, useState } from "react"

import {
  type HideCompletedCookieKey,
  writeHideCompletedCookieClient,
} from "@/lib/taskmark/hide-completed-cookie"

/**
 * Hide completed state backed by a per-list cookie.
 * Pass `initial` from the server cookie so SSR matches the first paint.
 */
export function usePersistedHideCompleted(
  key: HideCompletedCookieKey,
  initial = false
): [boolean, (hide: boolean) => void] {
  const [hideCompleted, setHideCompletedState] = useState(initial)

  const setHideCompleted = useCallback(
    (hide: boolean) => {
      writeHideCompletedCookieClient(key, hide)
      setHideCompletedState(hide)
    },
    [key]
  )

  return [hideCompleted, setHideCompleted]
}
