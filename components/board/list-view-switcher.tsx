"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LIST_VIEW_LABELS,
  boardHref,
  listViewModes,
  type ListViewMode,
} from "@/lib/taskmark/list-view-mode"

type ListViewSwitcherProps = {
  activeView: ListViewMode
  selectedEpicId?: string | null
  selectedStoryId?: string | null
  hasChangelog?: boolean
}

function ListViewSwitcherInner({
  activeView,
  selectedEpicId = null,
  selectedStoryId = null,
  hasChangelog = false,
}: ListViewSwitcherProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemId = searchParams.get("item")
  const modes = listViewModes(hasChangelog)

  return (
    <Tabs
      value={activeView}
      onValueChange={(value) => {
        if (typeof value !== "string") return
        const next = value as ListViewMode
        router.push(
          boardHref({
            view: next,
            epic: next === "overall" ? selectedEpicId : null,
            story: next === "overall" ? selectedStoryId : null,
            item: itemId,
          })
        )
      }}
    >
      <TabsList aria-label="Board list view">
        {modes.map((mode) => (
          <TabsTrigger key={mode} value={mode}>
            {LIST_VIEW_LABELS[mode]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export function ListViewSwitcher(props: ListViewSwitcherProps) {
  const modes = listViewModes(props.hasChangelog ?? false)
  return (
    <React.Suspense
      fallback={
        <Tabs value={props.activeView}>
          <TabsList aria-label="Board list view">
            {modes.map((mode) => (
              <TabsTrigger key={mode} value={mode} disabled>
                {LIST_VIEW_LABELS[mode]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      <ListViewSwitcherInner {...props} />
    </React.Suspense>
  )
}
