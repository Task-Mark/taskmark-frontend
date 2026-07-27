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
import { ParentTagBadge } from "@/components/board/parent-tag-badge"
import { ChildProgressBar } from "@/components/board/child-progress-bar"
import {
  PriorityBadge,
  TypeBadge,
} from "@/components/board/status-badge"
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
import { formatActualDuration, formatDurationMinutes } from "@/lib/format-duration"
import type { WorkItemsViewList } from "@/lib/taskmark/flat-work-item-types"
import {
  buildParentFilterOptions,
  collectUniqueTags,
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

function formatPoints(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

type WorkItemsListProps = {
  list: WorkItemsViewList
  countableCompletedAts?: readonly string[]
  initialHideCompleted?: boolean
}

export function WorkItemsList({
  list,
  countableCompletedAts,
  initialHideCompleted = false,
}: WorkItemsListProps) {
  const { project, rows, errors } = list
  const [query, setQuery] = useState("")
  const [hideCompleted, setHideCompleted] = usePersistedHideCompleted(
    "workItems",
    initialHideCompleted
  )
  const [parentKeys, setParentKeys] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [timeframe, setTimeframe] = useState<TimeframeFilterState>(
    DEFAULT_TIMEFRAME_FILTER
  )
  const { sort, onSort } = useTableSort()

  const parentOptions = useMemo(() => buildParentFilterOptions(rows), [rows])
  const tagOptions = useMemo(() => collectUniqueTags(rows), [rows])
  const completedAts = useMemo(
    () => rows.map((row) => row.completedAt),
    [rows]
  )
  const countAts = countableCompletedAts ?? completedAts

  const filtered = useMemo(
    () =>
      filterListRows(rows, {
        query,
        hideCompleted,
        parentKeys,
        selectedTags,
        timeframe,
      }),
    [rows, query, hideCompleted, parentKeys, selectedTags, timeframe]
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
      listFilterResetKey(project.id, {
        query,
        hideCompleted,
        parentKeys,
        selectedTags,
        timeframe,
      }),
      tableSortResetKey(sort),
    ].join("|")
  )

  const hasSourceRows = rows.length > 0
  const filtersActive =
    Boolean(query.trim()) ||
    hideCompleted ||
    parentKeys.length > 0 ||
    selectedTags.length > 0 ||
    isTimeframeActive(timeframe)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Work items</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{project.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Stories and epic-direct tasks/bugs · open by status/priority/created;
            done by newest solved date
          </span>
          <span className="mt-1 block font-mono text-xs">{project.boardPath}</span>
        </CardDescription>
        {hasSourceRows ? (
          <CardAction>
            <TimeframeFilter
              id={`workitems-timeframe-${project.id}`}
              value={timeframe}
              onChange={setTimeframe}
              completedAts={completedAts}
              countableCompletedAts={countAts}
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
            No stories or epic-direct tasks on this board yet.
          </p>
        ) : (
          <>
            <ListFiltersBar
              searchId={`workitems-search-${project.id}`}
              query={query}
              onQueryChange={setQuery}
              hideCompleted={hideCompleted}
              onHideCompletedChange={setHideCompleted}
              parentOptions={parentOptions}
              parentKeys={parentKeys}
              onParentKeysChange={setParentKeys}
              tagOptions={tagOptions}
              selectedTags={selectedTags}
              onSelectedTagsChange={setSelectedTags}
            />
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filtersActive
                  ? "No work items match the current search or filters."
                  : "No stories or epic-direct tasks on this board yet."}
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
                        label="Epic"
                        sortKey="epic"
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
                      />
                      <SortableTableHead
                        label="Priority"
                        sortKey="priority"
                        activeKey={sort?.key ?? null}
                        direction={sort?.direction ?? null}
                        onSort={onSort}
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((row) => {
                      const sheetKind = row.kind === "story" ? "story" : "item"
                      return (
                        <TableRow
                          key={`${project.id}:${row.kind}:${row.id}:${row.filePath}`}
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
                          <TableCell>
                            <IdCreatedTooltip
                              id={row.id}
                              created={row.created}
                            />
                          </TableCell>
                          <TableCell>
                            <TypeBadge type={row.kind} />
                          </TableCell>
                          <TableCell className="max-w-[16rem] whitespace-normal font-medium">
                            {row.title}
                          </TableCell>
                          <TableCell>
                            <ParentTagBadge
                              id={row.epicId}
                              title={row.epicTitle}
                            />
                          </TableCell>
                          <TableCell>{row.size}</TableCell>
                          <TableCell>{formatPoints(row.points)}</TableCell>
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
                          <TableCell>
                            {row.kind === "story" && row.workItemCount > 0 ? (
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
                          </TableCell>
                          <TableCell>
                            <PriorityBadge priority={row.priority} />
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
