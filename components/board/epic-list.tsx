"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  IdCreatedTooltip,
} from "@/components/board/date-tooltip"
import { ChildProgressBar } from "@/components/board/child-progress-bar"
import { ListFiltersBar } from "@/components/board/list-filters-bar"
import { ListPagination } from "@/components/board/list-pagination"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import { usePaginatedRows } from "@/hooks/use-paginated-rows"
import { cn } from "@/lib/utils"
import { formatActualDuration, formatDurationMinutes } from "@/lib/format-duration"
import type { EpicSummary, ProjectEpicList } from "@/lib/taskmark/epic-types"
import { isGeneralEpic } from "@/lib/taskmark/general-epic"
import {
  filterListRows,
  listFilterResetKey,
} from "@/lib/taskmark/list-filters"

function formatPoints(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

type EpicListProps = {
  lists: ProjectEpicList[]
  selectedEpicId?: string | null
}

function ProjectEpicCard({
  project,
  epics,
  errors,
  selectedEpicId,
}: {
  project: ProjectEpicList["project"]
  epics: EpicSummary[]
  errors: ProjectEpicList["errors"]
  selectedEpicId: string | null
}) {
  const [query, setQuery] = useState("")
  const [hideCompleted, setHideCompleted] = useState(false)

  const visibleEpics = useMemo(
    () =>
      epics.filter(
        (epic) => !(isGeneralEpic(epic) && epic.workItemCount === 0)
      ),
    [epics]
  )

  const filtered = useMemo(
    () =>
      filterListRows(visibleEpics, {
        query,
        hideCompleted,
        selectedTags: [],
      }),
    [visibleEpics, query, hideCompleted]
  )

  const {
    pageRows,
    page,
    pageSize,
    totalCount,
    totalPages,
    setPage,
    setPageSize,
  } = usePaginatedRows(
    filtered,
    listFilterResetKey(project.id, {
      query,
      hideCompleted,
      parentKey: null,
      selectedTags: [],
    })
  )

  const hasSourceRows = visibleEpics.length > 0
  const filtersActive = Boolean(query.trim()) || hideCompleted

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">{project.name}</CardTitle>
        <CardDescription className="font-mono text-xs">
          {project.boardPath}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {errors.length > 0 ? (
          <div
            role="status"
            className="rounded border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
          >
            <p className="font-medium text-destructive">
              {errors.length} epic file
              {errors.length === 1 ? "" : "s"} could not be parsed
            </p>
            <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
              {errors.map((err) => (
                <li key={err.filePath}>
                  {err.filePath}: {err.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!hasSourceRows ? (
          <p className="text-sm text-muted-foreground">
            No epics in this board yet. Init should seed a General epic for
            general tasks and user stories.
          </p>
        ) : (
          <>
            <ListFiltersBar
              searchId={`epic-search-${project.id}`}
              query={query}
              onQueryChange={setQuery}
              hideCompleted={hideCompleted}
              onHideCompletedChange={setHideCompleted}
            />
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filtersActive
                  ? "No epics match the current search or filters."
                  : "No epics in this board yet."}
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Work items</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Est</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((epic) => {
                      const selected = selectedEpicId === epic.id
                      const general = isGeneralEpic(epic)
                      return (
                        <TableRow
                          key={`${project.id}:${epic.id}:${epic.filePath}`}
                          data-state={selected ? "selected" : undefined}
                          className={cn(
                            selected && "bg-muted/60",
                            "hover:bg-muted/40"
                          )}
                        >
                          <TableCell className="w-10 pr-0">
                            <ViewWorkItemButton
                              itemRef={{
                                kind: "epic",
                                id: epic.id,
                                title: epic.title,
                                filePath: epic.filePath,
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <IdCreatedTooltip id={epic.id} created={epic.created}>
                              <Link
                                href={`/board?epic=${encodeURIComponent(epic.id)}`}
                                className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                aria-current={selected ? "true" : undefined}
                              >
                                {epic.id}
                              </Link>
                            </IdCreatedTooltip>
                          </TableCell>
                          <TableCell className="max-w-[18rem] whitespace-normal font-medium">
                            <Link
                              href={`/board?epic=${encodeURIComponent(epic.id)}`}
                              className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                              {epic.title}
                              {general ? (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  general tasks and user stories
                                </span>
                              ) : null}
                            </Link>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {epic.workItemCount}
                          </TableCell>
                          <TableCell>{formatPoints(epic.points)}</TableCell>
                          <TableCell>
                            {formatDurationMinutes(epic.estimateMinutes)}
                          </TableCell>
                          <TableCell>
                            {formatActualDuration(
                              epic.actualMs,
                              epic.actualMinutes
                            )}
                          </TableCell>
                          <TableCell>
                            <ChildProgressBar
                              done={epic.doneWorkItemCount}
                              total={epic.workItemCount}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <ListPagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function EpicList({ lists, selectedEpicId = null }: EpicListProps) {
  if (lists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-head text-xl">Epics</CardTitle>
          <CardDescription>
            No Taskmark projects were discovered under this master folder.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {lists.map(({ project, epics, errors }) => (
        <ProjectEpicCard
          key={project.boardPath}
          project={project}
          epics={epics}
          errors={errors}
          selectedEpicId={selectedEpicId}
        />
      ))}
    </div>
  )
}
