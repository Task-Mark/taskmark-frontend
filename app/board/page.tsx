import { redirect } from "next/navigation"

import { AppBar } from "@/components/board/app-bar"
import { EpicList } from "@/components/board/epic-list"
import { resolveActiveProject } from "@/lib/taskmark/active-project"
import {
  getActiveProjectCookie,
  getMasterFoldersCookie,
} from "@/lib/taskmark/cookies"
import { parseEpicsForProject } from "@/lib/taskmark/parse-epics"
import { loadConfiguredWorkspace } from "@/lib/taskmark/workspace"

export default async function BoardPage() {
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

  const list = parseEpicsForProject(activeProject)
  const epicCount = list.epics.length
  const errorCount = list.errors.length

  return (
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
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {activeProject.boardPath}
          </p>
        </div>

        <EpicList lists={[list]} />
      </div>
    </div>
  )
}
