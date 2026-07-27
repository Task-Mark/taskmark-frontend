"use client"

import { selectActiveProject, openAddProject } from "@/app/setup/actions"
import { BrandLogo } from "@/components/brand-logo"
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
        <div className="group flex min-w-0 flex-1 items-center gap-3 transition-[gap] duration-200 group-hover:gap-4">
          <BrandLogo
            alt=""
            width={40}
            height={45}
            className="h-10 w-auto shrink-0 origin-center select-none transition-transform duration-200 group-hover:scale-110"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="w-fit cursor-default font-head text-2xl leading-none tracking-tight">
              <span className="relative inline-block transition-transform duration-200 group-hover:-rotate-2">
                Taskmark
                <svg
                  aria-hidden
                  viewBox="0 0 120 10"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute -bottom-1.5 -left-1 h-2.5 w-[calc(100%+1rem)] origin-left text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                  {/* Linear hand stroke: thin at start, thicker at end */}
                  <path
                    fill="currentColor"
                    d="M1 5.2 L119 3.2 L119 8.8 L1 5.9 Z"
                  />
                </svg>
              </span>
            </p>
            <p className="truncate text-xs text-muted-foreground transition-transform duration-200 group-hover:translate-y-1">
              {projects.length} project{projects.length === 1 ? "" : "s"}
              {masterCount > 0
                ? ` · ${masterCount} workspace${masterCount === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>
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
