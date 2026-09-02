"use client"

import * as React from "react"

import { setBoardDetailLoaders } from "@taskmark/components/board"

export function LiveBoardDetailLoaders() {
  React.useEffect(() => {
    setBoardDetailLoaders({
      loadDetail: async (filePath, hint) => {
        const actions = await import("@/app/board/actions")
        return actions.loadWorkItemDetail(filePath, hint)
      },
      resolveById: async (itemId, options) => {
        const actions = await import("@/app/board/actions")
        return actions.resolveWorkItemById(itemId, options)
      },
    })
    return () => setBoardDetailLoaders(null)
  }, [])
  return null
}
