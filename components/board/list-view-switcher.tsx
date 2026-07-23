"use client"

import { useRouter } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LIST_VIEW_LABELS,
  LIST_VIEW_MODES,
  boardHref,
  type ListViewMode,
} from "@/lib/taskmark/list-view-mode"

type ListViewSwitcherProps = {
  activeView: ListViewMode
  selectedEpicId?: string | null
  selectedStoryId?: string | null
}

export function ListViewSwitcher({
  activeView,
  selectedEpicId = null,
  selectedStoryId = null,
}: ListViewSwitcherProps) {
  const router = useRouter()

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
          })
        )
      }}
    >
      <TabsList aria-label="Board list view">
        {LIST_VIEW_MODES.map((mode) => (
          <TabsTrigger key={mode} value={mode}>
            {LIST_VIEW_LABELS[mode]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
