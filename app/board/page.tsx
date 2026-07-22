import Link from "next/link"
import { redirect } from "next/navigation"

import { AppBar } from "@/components/board/app-bar"
import { EpicList } from "@/components/board/epic-list"
import { StoryList } from "@/components/board/story-list"
import { TaskList } from "@/components/board/task-list"
import { WorkItemSheetProvider } from "@/components/board/work-item-sheet"
import { resolveActiveProject } from "@/lib/taskmark/active-project"
import {
  getActiveProjectCookie,
  getMasterFoldersCookie,
} from "@/lib/taskmark/cookies"
import { parseEpicsForProject } from "@/lib/taskmark/parse-epics"
import { parseItemsForStory } from "@/lib/taskmark/parse-items"
import { parseStoriesForEpic } from "@/lib/taskmark/parse-stories"
import { loadConfiguredWorkspace } from "@/lib/taskmark/workspace"

type BoardPageProps = {
  searchParams: Promise<{
    epic?: string | string[]
    story?: string | string[]
  }>
}

function paramValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
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
  const selectedEpicId = paramValue(params.epic)
  const selectedStoryId = selectedEpicId ? paramValue(params.story) : null

  const list = parseEpicsForProject(activeProject)
  const epicCount = list.epics.length
  const errorCount = list.errors.length

  const selectedEpic = selectedEpicId
    ? list.epics.find((e) => e.id === selectedEpicId) ?? null
    : null

  const storyList =
    selectedEpicId != null
      ? parseStoriesForEpic(activeProject, selectedEpicId)
      : null

  const selectedStory =
    storyList && selectedStoryId
      ? storyList.stories.find((s) => s.id === selectedStoryId) ?? null
      : null

  const itemList =
    selectedEpicId != null && selectedStoryId != null
      ? parseItemsForStory(activeProject, selectedEpicId, selectedStoryId)
      : null

  return (
    <WorkItemSheetProvider>
      <div className="min-h-svh bg-[linear-gradient(180deg,_#fff_0%,_#f7f4ff_100%)]">
        <AppBar
          projects={workspace.projects}
          activeProjectId={activeProject.id}
          masterCount={workspace.masters.length}
        />

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
          <div>
            <h1 className="font-head text-3xl tracking-tight">Epics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeProject.name} · {epicCount} epic
              {epicCount === 1 ? "" : "s"}
              {errorCount > 0
                ? ` · ${errorCount} parse issue${errorCount === 1 ? "" : "s"}`
                : ""}
              {selectedEpic
                ? ` · selected ${selectedEpic.id}`
                : selectedEpicId
                  ? ` · epic ${selectedEpicId} not in list`
                  : " · select an epic to view stories"}
              {selectedStory
                ? ` · story ${selectedStory.id}`
                : selectedStoryId
                  ? ` · story ${selectedStoryId} not in list`
                  : ""}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {activeProject.boardPath}
            </p>
          </div>

          <EpicList lists={[list]} selectedEpicId={selectedEpicId} />

          {storyList ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-head text-2xl tracking-tight">
                  Stories for {storyList.epicTitle ?? storyList.epicId}
                </h2>
                <Link
                  href="/board"
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
                {!selectedStoryId ? " · select a story to view tasks" : ""}
              </p>
              <StoryList list={storyList} selectedStoryId={selectedStoryId} />
            </div>
          ) : null}

          {itemList ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-head text-2xl tracking-tight">
                  Tasks for {itemList.storyTitle ?? itemList.storyId}
                </h2>
                <Link
                  href={`/board?epic=${encodeURIComponent(itemList.epicId)}`}
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
              <TaskList list={itemList} />
            </div>
          ) : null}
        </div>
      </div>
    </WorkItemSheetProvider>
  )
}
