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
import { ChildProgressBar } from "@/components/board/child-progress-bar"
import {
  IdCreatedTooltip,
  SizeWithPointsTooltip,
  StatusWithSolvedTooltip,
} from "@/components/board/date-tooltip"
import { ListFiltersBar } from "@/components/board/list-filters-bar"
import { ListPagination } from "@/components/board/list-pagination"
import { SortableTableHead } from "@/components/board/sortable-table-head"
import { TypeBadge } from "@/components/board/status-badge"
import { TimeframeFilter } from "@/components/board/timeframe-filter"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import { AttributionAvatarGroup } from "@/components/board/attribution-avatars"
import { usePaginatedRows } from "@/hooks/use-paginated-rows"
import { usePersistedHideCompleted } from "@/hooks/use-persisted-hide-completed"
import { useTableSort } from "@/hooks/use-table-sort"
import { cn } from "@/lib/utils"
import { formatActualDuration, formatDurationMinutes } from "@/lib/format-duration"
import type { EpicWorkItemsList } from "@/lib/taskmark/flat-work-item-types"
import {
  DEFAULT_TIMEFRAME_FILTER,
  filterListRows,
  isTimeframeActive,
  listFilterResetKey,
  type TimeframeFilterState,
} from "@/lib/taskmark/list-filters"
import {
  sortRowsByTableSort,
  tableSortResetKey,
} from "@/lib/taskmark/table-sort"

type OverallWorkItemsListProps = {
  list: EpicWorkItemsList
  selectedStoryId?: string | null
  countableCompletedAts?: readonly string[]
  initialHideCompleted?: boolean
}

export function OverallWorkItemsList({
  list,
  selectedStoryId = null,
  countableCompletedAts = [],
  initialHideCompleted = false,
}: OverallWorkItemsListProps) {
  const { project, epicId, epicTitle, rows, errors } = list
  const heading = epicTitle ? `${epicId}: ${epicTitle}` : epicId
  const [query, setQuery] = useState("")
  const [hideCompleted, setHideCompleted] = usePersistedHideCompleted(
    "overallWorkItems",
    initialHideCompleted
  )
  const [timeframe, setTimeframe] = useState<TimeframeFilterState>(
    DEFAULT_TIMEFRAME_FILTER
  )
  const { sort, onSort } = useTableSort()

  const completedAts = useMemo(
    () => rows.map((row) => row.completedAt),
    [rows]
  )

  const filtered = useMemo(
    () =>
      filterListRows(rows, {
        query,
        hideCompleted,
        selectedTags: [],
        timeframe,
      }),
    [rows, query, hideCompleted, timeframe]
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

  const hasSourceRows = rows.length > 0
  const filtersActive =
    Boolean(query.trim()) || hideCompleted || isTimeframeActive(timeframe)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Work items</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{heading}</span>
          <span className="mt-1 block font-mono text-xs">{project.name}</span>
        </CardDescription>
        {hasSourceRows ? (
          <CardAction>
            <TimeframeFilter
              id={`overall-workitems-timeframe-${epicId}`}
              value={timeframe}
              onChange={setTimeframe}
              completedAts={completedAts}
              countableCompletedAts={countableCompletedAts}
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
              {errors.length} issue{errors.length === 1 ? "" : "s"} loading work
              items
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
            No work items under this epic yet
            {epicTitle?.toLowerCase() === "general"
              ? " — stories and general tasks will appear here."
              : "."}
          </p>
        ) : (
          <>
            <ListFiltersBar
              searchId={`overall-workitems-search-${epicId}`}
              query={query}
              onQueryChange={setQuery}
              hideCompleted={hideCompleted}
              onHideCompletedChange={setHideCompleted}
            />
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filtersActive
                  ? "No work items match the current search or filters."
                  : "No work items under this epic yet."}
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
                        label="Type"
                        sortKey="type"
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
                      <TableHead>Sub tasks</TableHead>
                      <SortableTableHead
                        label="Size"
                        sortKey="size"
                        activeKey={sort?.key ?? null}
                        direction={sort?.direction ?? null}
                        onSort={onSort}
                      />
                      <TableHead>Est</TableHead>
                      <TableHead>Actual</TableHead>
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
                    {pageRows.map((row) => {
                      const isStory = row.kind === "story"
                      const selected = isStory && selectedStoryId === row.id
                      const href = isStory
                        ? `/board?epic=${encodeURIComponent(epicId)}&story=${encodeURIComponent(row.id)}`
                        : null
                      const sheetKind = isStory ? "story" : "item"
                      return (
                        <TableRow
                          key={`${project.id}:${row.kind}:${row.id}:${row.filePath}`}
                          data-state={selected ? "selected" : undefined}
                          className={cn(
                            selected && "bg-muted/60",
                            "hover:bg-muted/40"
                          )}
                        >
                          <TableCell className="w-10 pr-0">
                            <ViewWorkItemButton
                              itemRef={{
                                kind: sheetKind,
                                id: row.id,
                                title: row.title,
                                filePath: row.filePath,
                                itemType:
                                  row.kind === "task" || row.kind === "bug"
                                    ? row.kind
                                    : undefined,
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <IdCreatedTooltip
                              id={row.id}
                              created={row.created}
                            >
                              {href ? (
                                <Link
                                  href={href}
                                  className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                  aria-current={selected ? "true" : undefined}
                                >
                                  {row.id}
                                </Link>
                              ) : (
                                row.id
                              )}
                            </IdCreatedTooltip>
                          </TableCell>
                          <TableCell>
                            <TypeBadge type={row.kind} />
                          </TableCell>
                          <TableCell className="max-w-[18rem] whitespace-normal font-medium">
                            {href ? (
                              <Link
                                href={href}
                                className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                              >
                                {row.title}
                              </Link>
                            ) : (
                              row.title
                            )}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {isStory ? row.workItemCount : "—"}
                          </TableCell>
                          <TableCell>
                            <SizeWithPointsTooltip
                              size={row.size}
                              points={row.points}
                            />
                          </TableCell>
                          <TableCell>
                            {formatDurationMinutes(row.estimateMinutes)}
                          </TableCell>
                          <TableCell>
                            {formatActualDuration(
                              row.actualMs,
                              row.actualMinutes
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <AttributionAvatarGroup
                                reporters={row.reporters}
                                resolvers={row.resolvers}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex w-full justify-center">
                              {isStory && row.workItemCount > 0 ? (
                                <ChildProgressBar
                                  done={row.doneWorkItemCount}
                                  total={row.workItemCount}
                                />
                              ) : (
                                <StatusWithSolvedTooltip
                                  status={row.status}
                                  solvedAt={row.completedAt}
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
