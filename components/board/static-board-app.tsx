"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { AppBar } from "@/components/board/app-bar"
import { ChangelogPanel } from "@/components/board/changelog-panel"
import { ListViewSwitcher } from "@/components/board/list-view-switcher"
import { OverallTreeList } from "@/components/board/overall-tree-list"
import { PointsHeatmap } from "@/components/board/points-heatmap"
import { ProjectStatusMetricsStrip } from "@/components/board/project-status-metrics-strip"
import { WorkItemsList } from "@/components/board/work-items-list"
import { WorkItemSheetProvider } from "@/components/board/work-item-sheet"
import {
  LIST_VIEW_LABELS,
  parseListViewMode,
  type ListViewMode,
} from "@/lib/taskmark/list-view-mode"
import { seedBoardSnapshot } from "@/lib/taskmark/snapshot-client"
import type { BoardSnapshot } from "@/lib/taskmark/snapshot-types"

function headingForView(view: ListViewMode): string {
  if (view === "overall") return "Overall"
  return LIST_VIEW_LABELS[view]
}

export function StaticBoardApp({ snapshot }: { snapshot: BoardSnapshot }) {
  React.useMemo(() => {
    seedBoardSnapshot(snapshot)
    return null
  }, [snapshot])

  const searchParams = useSearchParams()
  const changelogMarkdown = snapshot.changelogMarkdown?.trim()
    ? snapshot.changelogMarkdown
    : null
  const hasChangelog = changelogMarkdown != null
  const activeView = parseListViewMode(searchParams.get("view") ?? undefined, {
    hasChangelog,
  })
  const selectedEpicId =
    activeView === "overall" ? searchParams.get("epic")?.trim() || null : null
  const selectedStoryId =
    activeView === "overall" && selectedEpicId
      ? searchParams.get("story")?.trim() || null
      : null
  const activeProject = snapshot.project
  const list = snapshot.epics
  const epicCount = list.epics.length
  const errorCount = list.errors.length
  const hideCompletedPrefs = snapshot.hideCompletedDefaults
  const countableCompletions = snapshot.countableCompletions
  const statusMetrics = snapshot.statusMetrics
  const workItemsList = snapshot.workItemsView

  const selectedEpic = selectedEpicId
    ? list.epics.find((e) => e.id === selectedEpicId) ?? null
    : null

  return (
    <WorkItemSheetProvider>
      <div className="tm-surface min-h-svh">
        <AppBar
          projects={snapshot.projects}
          activeProjectId={activeProject.id}
          autoconfig={true}
        />

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-head text-3xl tracking-tight">
                {headingForView(activeView)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeProject.name}
                {activeView === "overall"
                  ? ` · ${epicCount} epic${epicCount === 1 ? "" : "s"}`
                  : ""}
                {activeView === "overall" && errorCount > 0
                  ? ` · ${errorCount} parse issue${errorCount === 1 ? "" : "s"}`
                  : ""}
                {activeView === "workitems"
                  ? ` · ${workItemsList.rows.length} item${workItemsList.rows.length === 1 ? "" : "s"}`
                  : ""}
                {activeView === "overall" && selectedEpic
                  ? ` · expanded ${selectedEpic.id}`
                  : activeView === "overall" && selectedEpicId
                    ? ` · epic ${selectedEpicId} not in list`
                    : ""}
                {activeView === "overall" && selectedStoryId
                  ? ` · story ${selectedStoryId}`
                  : ""}
              </p>
            </div>
            <ListViewSwitcher
              activeView={activeView}
              selectedEpicId={selectedEpicId}
              selectedStoryId={selectedStoryId}
              hasChangelog={hasChangelog}
            />
          </div>

          <ProjectStatusMetricsStrip metrics={statusMetrics} />

          {activeView === "overall" ? (
            <>
              <PointsHeatmap samples={countableCompletions} />
              <OverallTreeList
                list={list}
                workItemsByEpic={snapshot.workItemsByEpic}
                itemsByStory={snapshot.itemsByStory}
                selectedEpicId={selectedEpicId}
                selectedStoryId={selectedStoryId}
                countableCompletions={countableCompletions}
                initialHideCompleted={hideCompletedPrefs.epics}
              />
            </>
          ) : null}

          {activeView === "workitems" ? (
            <WorkItemsList
              list={workItemsList}
              countableCompletions={countableCompletions}
              initialHideCompleted={hideCompletedPrefs.workItems}
            />
          ) : null}

          {activeView === "changelog" && changelogMarkdown ? (
            <ChangelogPanel markdown={changelogMarkdown} />
          ) : null}
        </div>
      </div>
    </WorkItemSheetProvider>
  )
}
