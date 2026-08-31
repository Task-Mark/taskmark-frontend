import { Suspense } from "react"
import { redirect } from "next/navigation"

import { AppBar } from "@/components/board/app-bar"
import { ChangelogPanel } from "@/components/board/changelog-panel"
import { ListViewSwitcher } from "@/components/board/list-view-switcher"
import { OverallTreeList } from "@/components/board/overall-tree-list"
import { PointsHeatmap } from "@/components/board/points-heatmap"
import { ProjectStatusMetricsStrip } from "@/components/board/project-status-metrics-strip"
import { ReportsPanel } from "@/components/board/reports-panel"
import { StaticBoardApp } from "@/components/board/static-board-app"
import { WorkItemsList } from "@/components/board/work-items-list"
import { WorkItemSheetProvider } from "@/components/board/work-item-sheet"
import { resolveActiveProject } from "@/lib/taskmark/active-project"
import { buildBoardIndex } from "@/lib/taskmark/board-index"
import {
  getActiveProjectCookie,
  getHideCompletedCookies,
  getMasterFoldersCookie,
} from "@/lib/taskmark/cookies"
import {
  LIST_VIEW_LABELS,
  parseListViewMode,
  type ListViewMode,
} from "@/lib/taskmark/list-view-mode"
import { DEV_RELOAD_TOKEN } from "@/lib/taskmark/dev-reload-token"
import { loadSnapshotFromPublic } from "@/lib/taskmark/load-snapshot-server"
import { parseEpicsForProject } from "@/lib/taskmark/parse-epics"
import {
  parseWorkItemsForEpic,
  parseWorkItemsViewForProject,
} from "@/lib/taskmark/parse-flat-lists"
import { loadBoardChangelogMarkdown } from "@/lib/taskmark/load-changelog"
import { loadBoardReports } from "@/lib/taskmark/load-reports"
import { parseItemsForStory } from "@/lib/taskmark/parse-items"
import { storyKey } from "@/lib/taskmark/snapshot-types"
import {
  collectCompletedLeafPointSamples,
  collectMetricLeaves,
  computeProjectStatusMetrics,
} from "@/lib/taskmark/project-metrics"
import { isStaticRuntime } from "@/lib/taskmark/static-mode"
import { loadWorkspace } from "@/lib/taskmark/workspace"

// Keep this import so `taskmark dev` can touch the token module and refresh RSC.
void DEV_RELOAD_TOKEN

export type BoardSearchParams = {
  view?: string | string[]
  epic?: string | string[]
  story?: string | string[]
  item?: string | string[]
}

/**
 * Next only fills the `searchParams` promise it hands to the page component, so
 * pages must await it and pass the resolved query down; awaiting the promise
 * here instead resolves to `{}` and every view falls back to Overall.
 */
type BoardScreenProps = {
  searchParams: BoardSearchParams
}


function paramValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

function headingForView(view: ListViewMode): string {
  if (view === "overall") return "Overall"
  return LIST_VIEW_LABELS[view]
}

export async function BoardScreen({ searchParams }: BoardScreenProps) {
  if (isStaticRuntime()) {
    const snapshot = loadSnapshotFromPublic()
    return (
      <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading board…</div>}>
        <StaticBoardApp snapshot={snapshot} />
      </Suspense>
    )
  }

  const masters = await getMasterFoldersCookie()
  const workspace = loadWorkspace(masters)
  if (workspace.projects.length === 0) {
    redirect("/setup")
  }

  const savedActiveId = await getActiveProjectCookie()
  const hideCompletedPrefs = await getHideCompletedCookies()
  const activeProject = resolveActiveProject(
    workspace.projects,
    // Autoconfig: prefer the bound board; ignore stale active-project cookies.
    workspace.autoconfig ? null : savedActiveId
  )
  if (!activeProject) {
    redirect("/setup")
  }

  const params = searchParams
  const boardIndex = buildBoardIndex(activeProject.boardPath)
  const changelogMarkdown = loadBoardChangelogMarkdown(activeProject.boardPath)
  const hasChangelog = changelogMarkdown != null
  const reports = loadBoardReports(activeProject.boardPath)
  const hasReports = reports.length > 0
  const activeView = parseListViewMode(params.view, {
    hasChangelog,
    hasReports,
  })
  const selectedEpicId =
    activeView === "overall" ? paramValue(params.epic) : null
  const selectedStoryId =
    activeView === "overall" && selectedEpicId
      ? paramValue(params.story)
      : null
  const list = parseEpicsForProject(activeProject, boardIndex)
  const epicCount = list.epics.length
  const errorCount = list.errors.length

  const selectedEpic = selectedEpicId
    ? list.epics.find((e) => e.id === selectedEpicId) ?? null
    : null

  const workItemsByEpic: Record<
    string,
    ReturnType<typeof parseWorkItemsForEpic>
  > = {}
  const itemsByStory: Record<string, ReturnType<typeof parseItemsForStory>> = {}
  if (activeView === "overall") {
    for (const epic of list.epics) {
      const epicItems = parseWorkItemsForEpic(
        activeProject,
        epic.id,
        epic.title,
        boardIndex
      )
      workItemsByEpic[epic.id] = epicItems
      for (const row of epicItems.rows) {
        if (row.kind !== "story") continue
        itemsByStory[storyKey(epic.id, row.id)] = parseItemsForStory(
          activeProject,
          epic.id,
          row.id,
          boardIndex
        )
      }
    }
  }

  const workItemsList =
    activeView === "workitems"
      ? parseWorkItemsViewForProject(activeProject, boardIndex)
      : null

  const metricLeaves = collectMetricLeaves(activeProject, boardIndex)
  /** Match Current Speed exactly: completed task/bug leaf points only. */
  const countableCompletions =
    collectCompletedLeafPointSamples(metricLeaves)
  const statusMetrics = computeProjectStatusMetrics(
    activeProject,
    boardIndex,
    metricLeaves
  )

  return (
    <WorkItemSheetProvider>
      <div className="tm-surface min-h-svh">
        <AppBar
          projects={workspace.projects}
          activeProjectId={activeProject.id}
          autoconfig={workspace.autoconfig}
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
                {activeView === "workitems" && workItemsList
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
              hasReports={hasReports}
            />
          </div>

          <ProjectStatusMetricsStrip metrics={statusMetrics} />

          {activeView === "overall" ? (
            <>
              <PointsHeatmap samples={countableCompletions} />
              <OverallTreeList
                list={list}
                workItemsByEpic={workItemsByEpic}
                itemsByStory={itemsByStory}
                selectedEpicId={selectedEpicId}
                selectedStoryId={selectedStoryId}
                countableCompletions={countableCompletions}
                initialHideCompleted={hideCompletedPrefs.epics}
              />
            </>
          ) : null}

          {activeView === "workitems" && workItemsList ? (
            <WorkItemsList
              list={workItemsList}
              countableCompletions={countableCompletions}
              initialHideCompleted={hideCompletedPrefs.workItems}
            />
          ) : null}

          {activeView === "changelog" && changelogMarkdown ? (
            <ChangelogPanel markdown={changelogMarkdown} />
          ) : null}

          {activeView === "reports" && hasReports ? (
            <ReportsPanel reports={reports} />
          ) : null}
        </div>
      </div>
    </WorkItemSheetProvider>
  )
}
