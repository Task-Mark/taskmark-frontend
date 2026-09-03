"use client"

import Link from "next/link"

import { selectActiveProject, openAddProject } from "@/app/setup/actions"
import { projectOptionLabel } from "@/lib/taskmark/project-label"
import type { DiscoveredProject } from "@/lib/taskmark/types"
import { AppBar as AppBarChrome } from "@taskmark/components/board"
import { Button } from "@taskmark/components/ui/button"

type AppBarProps = {
  projects: DiscoveredProject[]
  activeProjectId: string
  /** When true, workspace is env/cwd-bound — hide project switcher and add. */
  autoconfig?: boolean
}

export function AppBar({
  projects,
  activeProjectId,
  autoconfig = false,
}: AppBarProps) {
  return (
    <AppBarChrome>
      {!autoconfig ? (
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
      ) : null}

      {!autoconfig ? (
        <form action={openAddProject}>
          <Button type="submit" variant="outline" size="sm">
            Add project
          </Button>
        </form>
      ) : null}

      {autoconfig ? (
        <Button
          render={<Link href="/settings" />}
          variant="outline"
          size="sm"
        >
          Settings
        </Button>
      ) : null}
    </AppBarChrome>
  )
}
