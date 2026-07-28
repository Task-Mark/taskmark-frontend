"use client"

import { useMemo, useState } from "react"

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
import { TypeBadge } from "@/components/board/status-badge"
import {
  IdCreatedTooltip,
  StatusWithSolvedTooltip,
} from "@/components/board/date-tooltip"
import { ListFiltersBar } from "@/components/board/list-filters-bar"
import { ListPagination } from "@/components/board/list-pagination"
import { SortableTableHead } from "@/components/board/sortable-table-head"
import { TimeframeFilter } from "@/components/board/timeframe-filter"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import { AttributionAvatarGroup } from "@/components/board/attribution-avatars"
import { usePaginatedRows } from "@/hooks/use-paginated-rows"
import { usePersistedHideCompleted } from "@/hooks/use-persisted-hide-completed"
import { useTableSort } from "@/hooks/use-table-sort"
import type { StoryItemList } from "@/lib/taskmark/item-types"
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

type TaskListProps = {
  list: StoryItemList
  countableCompletions?: readonly SolvedCompletionSample[]
  initialHideCompleted?: boolean
}

export function TaskList({
  list,
  countableCompletions = [],
  initialHideCompleted = false,
}: TaskListProps) {
  const { project, storyId, storyTitle, items, errors } = list
  const heading = storyTitle ? `${storyId}: ${storyTitle}` : storyId
  const [query, setQuery] = useState("")
  const [hideCompleted, setHideCompleted] = usePersistedHideCompleted(
    "tasks",
    initialHideCompleted
  )
  const [timeframe, setTimeframe] = useState<TimeframeFilterState>(
    DEFAULT_TIMEFRAME_FILTER
  )
  const { sort, onSort } = useTableSort()

  const completedAts = useMemo(
    () => items.map((item) => item.completedAt),
    [items]
  )

  const filtered = useMemo(
    () =>
      filterListRows(items, {
        query,
        hideCompleted,
        selectedTags: [],
        timeframe,
      }),
    [items, query, hideCompleted, timeframe]
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
      listFilterResetKey(storyId, {
        query,
        hideCompleted,
        parentKey: null,
        selectedTags: [],
        timeframe,
      }),
      tableSortResetKey(sort),
    ].join("|")
  )

  const hasSourceRows = items.length > 0
  const filtersActive =
    Boolean(query.trim()) || hideCompleted || isTimeframeActive(timeframe)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Sub Tasks</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{heading}</span>
          <span className="mt-1 block font-mono text-xs">{project.name}</span>
        </CardDescription>
        {hasSourceRows ? (
          <CardAction>
            <TimeframeFilter
              id={`task-timeframe-${storyId}`}
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
            No sub tasks under this story yet.
          </p>
        ) : (
          <>
            <ListFiltersBar
              searchId={`task-search-${storyId}`}
              query={query}
              onQueryChange={setQuery}
              hideCompleted={hideCompleted}
              onHideCompletedChange={setHideCompleted}
            />
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filtersActive
                  ? "No sub tasks match the current search or filters."
                  : "No sub tasks under this story yet."}
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
                    {pageRows.map((item) => (
                      <TableRow
                        key={`${project.id}:${item.id}:${item.filePath}`}
                      >
                        <TableCell className="w-10 pr-0">
                          <ViewWorkItemButton
                            itemRef={{
                              kind: "item",
                              id: item.id,
                              title: item.title,
                              filePath: item.filePath,
                              itemType: item.type,
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <IdCreatedTooltip
                            id={item.id}
                            created={item.created}
                          />
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={item.type} />
                        </TableCell>
                        <TableCell className="max-w-[18rem] whitespace-normal font-medium">
                          {item.title}
                        </TableCell>
                        <TableCell>{item.size}</TableCell>
                        <TableCell>{formatPoints(item.points)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <AttributionAvatarGroup
                              reporters={item.reporters}
                              resolvers={item.resolvers}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex w-full justify-center">
                            <StatusWithSolvedTooltip
                              status={item.status}
                              solvedAt={item.completedAt}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
