import Link from "next/link"
import { redirect } from "next/navigation"

import { AppBar } from "@/components/board/app-bar"
import { EpicList } from "@/components/board/epic-list"
import { ListViewSwitcher } from "@/components/board/list-view-switcher"
import { OverallWorkItemsList } from "@/components/board/overall-work-items-list"
import { ProjectStatusMetricsStrip } from "@/components/board/project-status-metrics-strip"
import { TaskList } from "@/components/board/task-list"
import { WorkItemsList } from "@/components/board/work-items-list"
import { WorkItemSheetProvider } from "@/components/board/work-item-sheet"
import { resolveActiveProject } from "@/lib/taskmark/active-project"
import {
  getActiveProjectCookie,
  getHideCompletedCookies,
  getMasterFoldersCookie,
} from "@/lib/taskmark/cookies"
import {
  LIST_VIEW_LABELS,
  boardHref,
  parseListViewMode,
  type ListViewMode,
} from "@/lib/taskmark/list-view-mode"
import { parseEpicsForProject } from "@/lib/taskmark/parse-epics"
import {
  parseWorkItemsForEpic,
  parseWorkItemsViewForProject,
} from "@/lib/taskmark/parse-flat-lists"
import { parseItemsForStory } from "@/lib/taskmark/parse-items"
import {
  collectCompletedLeafPointSamples,
  collectMetricLeaves,
  computeProjectStatusMetrics,
} from "@/lib/taskmark/project-metrics"
import { loadConfiguredWorkspace } from "@/lib/taskmark/workspace"

type BoardPageProps = {
  searchParams: Promise<{
    view?: string | string[]
    epic?: string | string[]
    story?: string | string[]
    item?: string | string[]
  }>
}

function paramValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

function headingForView(view: ListViewMode): string {
  if (view === "overall") return "Epics"
  return LIST_VIEW_LABELS[view]
}

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const masters = await getMasterFoldersCookie()
  if (masters.length === 0) {
    redirect("/setup")
  }

  const workspace = loadConfiguredWorkspace(masters)
  if (workspace.projects.length === 0) {
    redirect("/setup")
  }

  const savedActiveId = await getActiveProjectCookie()
  const hideCompletedPrefs = await getHideCompletedCookies()
  const activeProject = resolveActiveProject(
    workspace.projects,
    savedActiveId
  )
  if (!activeProject) {
    redirect("/setup")
  }

  const params = await searchParams
  const activeView = parseListViewMode(params.view)
  const selectedEpicId =
    activeView === "overall" ? paramValue(params.epic) : null
  const selectedStoryId =
    activeView === "overall" && selectedEpicId
      ? paramValue(params.story)
      : null
  const selectedItemId = paramValue(params.item)

  const list = parseEpicsForProject(activeProject)
  const epicCount = list.epics.length
  const errorCount = list.errors.length

  const selectedEpic = selectedEpicId
    ? list.epics.find((e) => e.id === selectedEpicId) ?? null
    : null

  const epicWorkItems =
    activeView === "overall" && selectedEpicId != null
      ? parseWorkItemsForEpic(
          activeProject,
          selectedEpicId,
          selectedEpic?.title ?? null
        )
      : null

  const selectedStory =
    epicWorkItems && selectedStoryId
      ? (epicWorkItems.rows.find(
          (row) => row.kind === "story" && row.id === selectedStoryId
        ) ?? null)
      : null

  const itemList =
    activeView === "overall" &&
    selectedEpicId != null &&
    selectedStory != null
      ? parseItemsForStory(activeProject, selectedEpicId, selectedStory.id)
      : null

  const workItemsList =
    activeView === "overall" || activeView === "workitems"
      ? parseWorkItemsViewForProject(activeProject)
      : null

  /** Match Current Speed exactly: completed task/bug leaf points only. */
  const countableCompletions = collectCompletedLeafPointSamples(
    collectMetricLeaves(activeProject)
  )

  const statusMetrics = computeProjectStatusMetrics(activeProject)

  return (
    <WorkItemSheetProvider>
      <div className="min-h-svh bg-[linear-gradient(180deg,_#fff_0%,_#f7f4ff_100%)]">
        <AppBar
          projects={workspace.projects}
          activeProjectId={activeProject.id}
          masterCount={workspace.masters.length}
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
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {activeProject.boardPath}
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
                  <p className="text-sm text-muted-foreground">
                    {epicWorkItems.rows.length} work item
                    {epicWorkItems.rows.length === 1 ? "" : "s"}
                    {epicWorkItems.errors.length > 0
                      ? ` · ${epicWorkItems.errors.length} issue${epicWorkItems.errors.length === 1 ? "" : "s"}`
                      : ""}
                    {!selectedStory
                      ? " · select a story to view its sub tasks"
                      : ""}
                  </p>
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
                      Sub Tasks for{" "}
                      {itemList.storyTitle ?? itemList.storyId}
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
                  <p className="text-sm text-muted-foreground">
                    {itemList.items.length} sub task
                    {itemList.items.length === 1 ? "" : "s"}
                    {itemList.errors.length > 0
                      ? ` · ${itemList.errors.length} issue${itemList.errors.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <TaskList
                    list={itemList}
                    countableCompletions={countableCompletions}
                    initialHideCompleted={hideCompletedPrefs.tasks}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {activeView === "workitems" && workItemsList ? (
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
