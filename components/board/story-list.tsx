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
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  IdCreatedTooltip,
  StatusWithSolvedTooltip,
} from "@/components/board/date-tooltip"
import { ChildProgressBar } from "@/components/board/child-progress-bar"
import { ListFiltersBar } from "@/components/board/list-filters-bar"
import { ListPagination } from "@/components/board/list-pagination"
import { SortableTableHead } from "@/components/board/sortable-table-head"
import { statusRowClass } from "@/components/board/status-badge"
import { TimeframeFilter } from "@/components/board/timeframe-filter"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import { AttributionAvatarGroup } from "@/components/board/attribution-avatars"
import { usePaginatedRows } from "@/hooks/use-paginated-rows"
import { usePersistedHideCompleted } from "@/hooks/use-persisted-hide-completed"
import { useTableSort } from "@/hooks/use-table-sort"
import { cn } from "@/lib/utils"
import { displayFileName } from "@/lib/display-path"
import { HIDE_COMPLETED_DEFAULT } from "@/lib/taskmark/constants"
import type { EpicStoryList } from "@/lib/taskmark/story-types"
import {
  DEFAULT_TIMEFRAME_FILTER,
  filterListRows,
  isTimeframeActive,
  listFilterResetKey,
  type TimeframeFilterState,
} from "@/lib/taskmark/list-filters"
import type { SolvedCompletionSample } from "@/lib/taskmark/timeframe-filters"
import {
  sortRowsByTableSort,
  tableSortResetKey,
} from "@/lib/taskmark/table-sort"

function formatPoints(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

type StoryListProps = {
  list: EpicStoryList
  selectedStoryId?: string | null
  countableCompletions?: readonly SolvedCompletionSample[]
  initialHideCompleted?: boolean
}

export function StoryList({
  list,
  selectedStoryId = null,
  countableCompletions = [],
  initialHideCompleted = HIDE_COMPLETED_DEFAULT,
}: StoryListProps) {
  const { project, epicId, epicTitle, stories, errors } = list
  const heading = epicTitle ? `${epicId}: ${epicTitle}` : epicId
  const [query, setQuery] = useState("")
  const [hideCompleted, setHideCompleted] =
    usePersistedHideCompleted(initialHideCompleted)
  const [timeframe, setTimeframe] = useState<TimeframeFilterState>(
    DEFAULT_TIMEFRAME_FILTER
  )
  const { sort, onSort } = useTableSort()

  const completedAts = useMemo(
    () => stories.map((story) => story.completedAt),
    [stories]
  )

  const filtered = useMemo(
    () =>
      filterListRows(stories, {
        query,
        hideCompleted,
        selectedTags: [],
        timeframe,
      }),
    [stories, query, hideCompleted, timeframe]
  )

  const sorted = useMemo(
    () => sortRowsByTableSort(filtered, sort),
    [filtered, sort]
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
    sorted,
    [
      listFilterResetKey(epicId, {
        query,
        hideCompleted,
        parentKey: null,
        selectedTags: [],
        timeframe,
      }),
      tableSortResetKey(sort),
    ].join("|")
  )

  const hasSourceRows = stories.length > 0
  const filtersActive =
    Boolean(query.trim()) || hideCompleted || isTimeframeActive(timeframe)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Stories</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{heading}</span>
          <span className="mt-1 block font-mono text-xs">{project.name}</span>
        </CardDescription>
        {hasSourceRows ? (
          <CardAction>
            <TimeframeFilter
              id={`story-timeframe-${epicId}`}
              value={timeframe}
              onChange={setTimeframe}
              completedAts={completedAts}
              countableCompletions={countableCompletions}
            />
          </CardAction>
        ) : null}
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
                  {displayFileName(err.filePath)}: {err.message}
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
                      <SortableTableHead
                        label="ID"
                        sortKey="id"
                        activeKey={sort?.key ?? null}
                        direction={sort?.direction ?? null}
                        onSort={onSort}
                      />
                      <SortableTableHead
                        label="Title"
                        sortKey="title"
                        activeKey={sort?.key ?? null}
                        direction={sort?.direction ?? null}
                        onSort={onSort}
                      />
                      <TableHead>Work items</TableHead>
                      <SortableTableHead
                        label="Size"
                        sortKey="size"
                        activeKey={sort?.key ?? null}
                        direction={sort?.direction ?? null}
                        onSort={onSort}
                      />
                      <SortableTableHead
                        label="Points"
                        sortKey="points"
                        activeKey={sort?.key ?? null}
                        direction={sort?.direction ?? null}
                        onSort={onSort}
                      />
                      <SortableTableHead
                        label="People"
                        sortKey="people"
                        activeKey={sort?.key ?? null}
                        direction={sort?.direction ?? null}
                        onSort={onSort}
                        className="w-16 text-center"
                      />
                      <SortableTableHead
                        label="Status"
                        sortKey="status"
                        activeKey={sort?.key ?? null}
                        direction={sort?.direction ?? null}
                        onSort={onSort}
                        align="center"
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((story) => {
                      const selected = selectedStoryId === story.id
                      const href = `/?epic=${encodeURIComponent(epicId)}&story=${encodeURIComponent(story.id)}`
                      return (
                        <TableRow
                          key={`${project.id}:${story.id}:${story.filePath}`}
                          data-state={selected ? "selected" : undefined}
                          className={cn(
                            statusRowClass(story.status),
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
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <AttributionAvatarGroup
                                reporters={story.reporters}
                                resolvers={story.resolvers}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex w-full justify-center">
                              {story.workItemCount === 0 ? (
                                <StatusWithSolvedTooltip
                                  status={story.status}
                                  solvedAt={story.completedAt}
                                />
                              ) : (
                                <ChildProgressBar
                                  done={story.doneWorkItemCount}
                                  total={story.workItemCount}
                                />
                              )}
                            </div>
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
