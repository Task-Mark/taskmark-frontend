import Link from "next/link"
import { redirect } from "next/navigation"

import { AppBar } from "@/components/board/app-bar"
import { EpicList } from "@/components/board/epic-list"
import { ListViewSwitcher } from "@/components/board/list-view-switcher"
import { StoryList } from "@/components/board/story-list"
import { TaskList } from "@/components/board/task-list"
import { WorkItemsList } from "@/components/board/work-items-list"
import { WorkItemSheetProvider } from "@/components/board/work-item-sheet"
import { resolveActiveProject } from "@/lib/taskmark/active-project"
import {
  getActiveProjectCookie,
  getMasterFoldersCookie,
} from "@/lib/taskmark/cookies"
import {
  LIST_VIEW_LABELS,
  boardHref,
  parseListViewMode,
  type ListViewMode,
} from "@/lib/taskmark/list-view-mode"
import { parseEpicsForProject } from "@/lib/taskmark/parse-epics"
import { parseWorkItemsViewForProject } from "@/lib/taskmark/parse-flat-lists"
import { parseItemsForEpic, parseItemsForStory } from "@/lib/taskmark/parse-items"
import { parseStoriesForEpic } from "@/lib/taskmark/parse-stories"
import { loadConfiguredWorkspace } from "@/lib/taskmark/workspace"

type BoardPageProps = {
  searchParams: Promise<{
    view?: string | string[]
    epic?: string | string[]
    story?: string | string[]
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

  const list = parseEpicsForProject(activeProject)
  const epicCount = list.epics.length
  const errorCount = list.errors.length

  const selectedEpic = selectedEpicId
    ? list.epics.find((e) => e.id === selectedEpicId) ?? null
    : null

  const storyList =
    activeView === "overall" && selectedEpicId != null
      ? parseStoriesForEpic(activeProject, selectedEpicId)
      : null

  const selectedStory =
    storyList && selectedStoryId
      ? storyList.stories.find((s) => s.id === selectedStoryId) ?? null
      : null

  const itemList =
    activeView === "overall" &&
    selectedEpicId != null &&
    selectedStoryId != null
      ? parseItemsForStory(activeProject, selectedEpicId, selectedStoryId)
      : null

  const epicItemList =
    activeView === "overall" &&
    selectedEpicId != null &&
    selectedStoryId == null
      ? parseItemsForEpic(activeProject, selectedEpicId)
      : null

  const workItemsList =
    activeView === "overall" || activeView === "workitems"
      ? parseWorkItemsViewForProject(activeProject)
      : null

  /** Stories + epic-direct tasks/bugs (excludes tasks under a story). */
  const countableCompletedAts =
    workItemsList?.rows
      .map((row) => row.completedAt)
      .filter((value) => Boolean(value?.trim())) ?? []

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
                      ? " · select an epic to view stories"
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
              selectedStoryId={selectedStoryId}
            />
          </div>

          {activeView === "overall" ? (
            <>
              <EpicList
                lists={[list]}
                selectedEpicId={selectedEpicId}
                countableCompletedAts={countableCompletedAts}
              />

              {storyList ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-head text-2xl tracking-tight">
                      Stories for {storyList.epicTitle ?? storyList.epicId}
                    </h2>
                    <Link
                      href={boardHref({ view: "overall" })}
                      className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Clear selection
                    </Link>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {storyList.stories.length} stor
                    {storyList.stories.length === 1 ? "y" : "ies"}
                    {storyList.errors.length > 0
                      ? ` · ${storyList.errors.length} issue${storyList.errors.length === 1 ? "" : "s"}`
                      : ""}
                    {!selectedStoryId
                      ? " · select a story for its tasks, or use general tasks below"
                      : ""}
                  </p>
                  <StoryList
                    list={storyList}
                    selectedStoryId={selectedStoryId}
                    countableCompletedAts={countableCompletedAts}
                  />
                </div>
              ) : null}

              {epicItemList ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-head text-2xl tracking-tight">
                      Tasks for {epicItemList.epicId}
                      {list.epics.find((e) => e.id === epicItemList.epicId)
                        ?.title.toLowerCase() === "general"
                        ? " (general tasks)"
                        : " (no story)"}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {epicItemList.items.length}{" "}
                    {list.epics
                      .find((e) => e.id === epicItemList.epicId)
                      ?.title.toLowerCase() === "general"
                      ? "general task"
                      : "epic-direct item"}
                    {epicItemList.items.length === 1 ? "" : "s"}
                    {epicItemList.errors.length > 0
                      ? ` · ${epicItemList.errors.length} issue${epicItemList.errors.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <TaskList
                    list={epicItemList}
                    countableCompletedAts={countableCompletedAts}
                  />
                </div>
              ) : null}

              {itemList ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-head text-2xl tracking-tight">
                      Tasks for {itemList.storyTitle ?? itemList.storyId}
                    </h2>
                    <Link
                      href={boardHref({
                        view: "overall",
                        epic: itemList.epicId,
                      })}
                      className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Clear story
                    </Link>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {itemList.items.length} item
                    {itemList.items.length === 1 ? "" : "s"}
                    {itemList.errors.length > 0
                      ? ` · ${itemList.errors.length} issue${itemList.errors.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <TaskList
                    list={itemList}
                    countableCompletedAts={countableCompletedAts}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {activeView === "workitems" && workItemsList ? (
            <WorkItemsList
              list={workItemsList}
              countableCompletedAts={countableCompletedAts}
            />
          ) : null}
        </div>
      </div>
    </WorkItemSheetProvider>
  )
}
