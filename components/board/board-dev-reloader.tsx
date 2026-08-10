"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

/**
 * In development, poll the board-reload SSE endpoint and soft-refresh RSC
 * trees when markdown on disk changes.
 */
export function BoardDevReloader() {
  const router = useRouter()
  const lastAt = useRef(0)

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return

    let closed = false
    let source: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (closed) return
      source = new EventSource("/api/taskmark-reload")
      source.addEventListener("reload", (event) => {
        const data = String((event as MessageEvent).data || "")
        const at = Number.parseInt(data, 10)
        if (Number.isFinite(at) && at <= lastAt.current) return
        lastAt.current = Number.isFinite(at) ? at : Date.now()
        router.refresh()
      })
      source.onerror = () => {
        source?.close()
        source = null
        if (!closed) {
          retryTimer = setTimeout(connect, 1500)
        }
      }
    }

    connect()
    return () => {
      closed = true
      if (retryTimer) clearTimeout(retryTimer)
      source?.close()
    }
  }, [router])

  return null
}
