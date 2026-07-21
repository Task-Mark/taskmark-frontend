"use client"

import { selectActiveProject, openAddProject } from "@/app/setup/actions"
import { Button } from "@/components/ui/button"
import { projectOptionLabel } from "@/lib/taskmark/project-label"
import type { DiscoveredProject } from "@/lib/taskmark/types"

type AppBarProps = {
  projects: DiscoveredProject[]
  activeProjectId: string
  masterCount: number
}

export function AppBar({
  projects,
  activeProjectId,
  masterCount,
}: AppBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-card/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-head text-2xl leading-none tracking-tight">
            Taskmark
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"}
            {masterCount > 0
              ? ` · ${masterCount} workspace${masterCount === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>

        <form
          action={selectActiveProject}
          className="flex min-w-0 flex-wrap items-center gap-2"
        >
          <label htmlFor="projectId" className="sr-only">
            Active project
          </label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={activeProjectId}
            onChange={(e) => {
              e.currentTarget.form?.requestSubmit()
            }}
            className="max-w-[20rem] rounded border-2 border-border bg-input px-3 py-1.5 text-sm shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {projectOptionLabel(project, projects)}
              </option>
            ))}
          </select>
          <noscript>
            <Button type="submit" size="sm" variant="outline">
              Switch project
            </Button>
          </noscript>
        </form>

        <form action={openAddProject}>
          <Button type="submit" variant="outline" size="sm">
            Add project
          </Button>
        </form>
      </div>
    </header>
  )
}
