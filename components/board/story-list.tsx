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
  StatusWithSolvedTooltip,
} from "@/components/board/date-tooltip"
import { ListFiltersBar } from "@/components/board/list-filters-bar"
import { ListPagination } from "@/components/board/list-pagination"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import { usePaginatedRows } from "@/hooks/use-paginated-rows"
import { cn } from "@/lib/utils"
import { formatActualDuration, formatDurationMinutes } from "@/lib/format-duration"
import type { EpicStoryList } from "@/lib/taskmark/story-types"
import {
  filterListRows,
  listFilterResetKey,
} from "@/lib/taskmark/list-filters"

function formatPoints(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

type StoryListProps = {
  list: EpicStoryList
  selectedStoryId?: string | null
}

export function StoryList({ list, selectedStoryId = null }: StoryListProps) {
  const { project, epicId, epicTitle, stories, errors } = list
  const heading = epicTitle ? `${epicId}: ${epicTitle}` : epicId
  const [query, setQuery] = useState("")
  const [hideCompleted, setHideCompleted] = useState(false)

  const filtered = useMemo(
    () =>
      filterListRows(stories, {
        query,
        hideCompleted,
        selectedTags: [],
      }),
    [stories, query, hideCompleted]
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
    listFilterResetKey(epicId, {
      query,
      hideCompleted,
      parentKey: null,
      selectedTags: [],
    })
  )

  const hasSourceRows = stories.length > 0
  const filtersActive = Boolean(query.trim()) || hideCompleted

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Stories</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{heading}</span>
          <span className="mt-1 block font-mono text-xs">{project.name}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {errors.length > 0 ? (
          <div
            role="status"
            className="rounded border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
          >
            <p className="font-medium text-destructive">
              {errors.length} issue{errors.length === 1 ? "" : "s"} loading
              stories
            </p>
            <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
              {errors.map((err) => (
                <li key={`${err.filePath}:${err.message}`}>
                  {err.filePath}: {err.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!hasSourceRows ? (
          <p className="text-sm text-muted-foreground">
            No stories under this epic yet
            {epicTitle?.toLowerCase() === "general"
              ? " — general user stories will appear here."
              : "."}
          </p>
        ) : (
          <>
            <ListFiltersBar
              searchId={`story-search-${epicId}`}
              query={query}
              onQueryChange={setQuery}
              hideCompleted={hideCompleted}
              onHideCompletedChange={setHideCompleted}
            />
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filtersActive
                  ? "No stories match the current search or filters."
                  : "No stories under this epic yet."}
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
                      <TableHead>Size</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Est</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((story) => {
                      const selected = selectedStoryId === story.id
                      const href = `/board?epic=${encodeURIComponent(epicId)}&story=${encodeURIComponent(story.id)}`
                      return (
                        <TableRow
                          key={`${project.id}:${story.id}:${story.filePath}`}
                          data-state={selected ? "selected" : undefined}
                          className={cn(
                            selected && "bg-muted/60",
                            "hover:bg-muted/40"
                          )}
                        >
                          <TableCell className="w-10 pr-0">
                            <ViewWorkItemButton
                              itemRef={{
                                kind: "story",
                                id: story.id,
                                title: story.title,
                                filePath: story.filePath,
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <IdCreatedTooltip
                              id={story.id}
                              created={story.created}
                            >
                              <Link
                                href={href}
                                className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                aria-current={selected ? "true" : undefined}
                              >
                                {story.id}
                              </Link>
                            </IdCreatedTooltip>
                          </TableCell>
                          <TableCell className="max-w-[18rem] whitespace-normal font-medium">
                            <Link
                              href={href}
                              className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                              {story.title}
                            </Link>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {story.workItemCount}
                          </TableCell>
                          <TableCell>{story.size}</TableCell>
                          <TableCell>{formatPoints(story.points)}</TableCell>
                          <TableCell>
                            {formatDurationMinutes(story.estimateMinutes)}
                          </TableCell>
                          <TableCell>
                            {formatActualDuration(
                              story.actualMs,
                              story.actualMinutes
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusWithSolvedTooltip
                              status={story.status}
                              solvedAt={story.completedAt}
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
