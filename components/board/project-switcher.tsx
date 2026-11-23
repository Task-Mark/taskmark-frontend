"use client"

import { selectActiveProject, openAddProject } from "@/app/setup/actions"
import { projectOptionLabel } from "@/lib/taskmark/project-label"
import type { DiscoveredProject } from "@/lib/taskmark/types"
import { Button } from "@taskmark/components/ui/button"

/** Project select and "Add project", for the request board sidebar. */
export function ProjectSwitcher({
  projects,
  activeProjectId,
}: {
  projects: DiscoveredProject[]
  activeProjectId: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {projects.length > 1 ? (
        <form action={selectActiveProject}>
          <label htmlFor="sidebarProjectId" className="sr-only">
            Active project
          </label>
          <select
            id="sidebarProjectId"
            name="projectId"
            defaultValue={activeProjectId}
            onChange={(e) => {
              e.currentTarget.form?.requestSubmit()
            }}
            className="min-h-11 w-full border-2 border-black bg-input px-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
      ) : null}
      <form action={openAddProject}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Add project
        </Button>
      </form>
    </div>
  )
}
