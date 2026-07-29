"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { AppBar } from "@/components/board/app-bar"
import { EpicList } from "@/components/board/epic-list"
import { ListViewSwitcher } from "@/components/board/list-view-switcher"
import { OverallWorkItemsList } from "@/components/board/overall-work-items-list"
import { ProjectStatusMetricsStrip } from "@/components/board/project-status-metrics-strip"
import { TaskList } from "@/components/board/task-list"
import { WorkItemsList } from "@/components/board/work-items-list"
import { WorkItemSheetProvider } from "@/components/board/work-item-sheet"
import {
  LIST_VIEW_LABELS,
  boardHref,
  parseListViewMode,
  type ListViewMode,
} from "@/lib/taskmark/list-view-mode"
import { seedBoardSnapshot } from "@/lib/taskmark/snapshot-client"
import {
  storyKey,
  type BoardSnapshot,
} from "@/lib/taskmark/snapshot-types"

function headingForView(view: ListViewMode): string {
  if (view === "overall") return "Epics"
  return LIST_VIEW_LABELS[view]
}

export function StaticBoardApp({ snapshot }: { snapshot: BoardSnapshot }) {
  React.useMemo(() => {
    seedBoardSnapshot(snapshot)
    return null
  }, [snapshot])

  const searchParams = useSearchParams()
  const activeView = parseListViewMode(searchParams.get("view") ?? undefined)
  const selectedEpicId =
    activeView === "overall" ? searchParams.get("epic")?.trim() || null : null
  const selectedStoryId =
    activeView === "overall" && selectedEpicId
      ? searchParams.get("story")?.trim() || null
      : null
  const selectedItemId = searchParams.get("item")?.trim() || null

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

  const epicWorkItems =
    selectedEpicId != null
      ? snapshot.workItemsByEpic[selectedEpicId] ?? null
      : null

  const selectedStory =
    epicWorkItems && selectedStoryId
      ? (epicWorkItems.rows.find(
          (row) => row.kind === "story" && row.id === selectedStoryId
        ) ?? null)
      : null

  const itemList =
    selectedEpicId && selectedStory
      ? snapshot.itemsByStory[storyKey(selectedEpicId, selectedStory.id)] ??
        null
      : null

  return (
    <WorkItemSheetProvider>
      <div className="min-h-svh bg-[linear-gradient(180deg,_#fff_0%,_#f7f4ff_100%)]">
        <AppBar
          projects={snapshot.projects}
          activeProjectId={activeProject.id}
          masterCount={1}
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
                  ? ` · selected ${selectedEpic.id}`
                  : activeView === "overall" && selectedEpicId
                    ? ` · epic ${selectedEpicId} not in list`
                    : activeView === "overall"
                      ? " · select an epic to view work items"
                      : ""}
                {activeView === "overall" && selectedStory
                  ? ` · story ${selectedStory.id}`
                  : activeView === "overall" && selectedStoryId
                    ? ` · story ${selectedStoryId} not in list`
                    : ""}
              </p>
            </div>
            <ListViewSwitcher
              activeView={activeView}
              selectedEpicId={selectedEpicId}
              selectedStoryId={selectedStory?.id ?? null}
            />
          </div>

          <ProjectStatusMetricsStrip metrics={statusMetrics} />

          {activeView === "overall" ? (
            <>
              <EpicList
                lists={[list]}
                selectedEpicId={selectedEpicId}
                countableCompletions={countableCompletions}
                initialHideCompleted={hideCompletedPrefs.epics}
              />

              {epicWorkItems ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-head text-2xl tracking-tight">
                      Work items for{" "}
                      {epicWorkItems.epicTitle ?? epicWorkItems.epicId}
                    </h2>
                    <Link
                      href={boardHref({
                        view: "overall",
                        item: selectedItemId,
                      })}
                      className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Clear selection
                    </Link>
                  </div>
                  <OverallWorkItemsList
                    list={epicWorkItems}
                    selectedStoryId={selectedStory?.id ?? null}
                    countableCompletions={countableCompletions}
                    initialHideCompleted={hideCompletedPrefs.overallWorkItems}
                  />
                </div>
              ) : null}

              {itemList && selectedStory ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-head text-2xl tracking-tight">
                      Sub Tasks for {itemList.storyTitle ?? itemList.storyId}
                    </h2>
                    <Link
                      href={boardHref({
                        view: "overall",
                        epic: itemList.epicId,
                        item: selectedItemId,
                      })}
                      className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Clear story
                    </Link>
                  </div>
                  <TaskList
                    list={itemList}
                    countableCompletions={countableCompletions}
                    initialHideCompleted={hideCompletedPrefs.tasks}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {activeView === "workitems" ? (
            <WorkItemsList
              list={workItemsList}
              countableCompletions={countableCompletions}
              initialHideCompleted={hideCompletedPrefs.workItems}
            />
          ) : null}
        </div>
      </div>
    </WorkItemSheetProvider>
  )
}
