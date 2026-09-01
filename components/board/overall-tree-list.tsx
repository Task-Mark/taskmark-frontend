"use client"

import * as React from "react"
import { ChevronRightIcon } from "lucide-react"

import { AttributionAvatarGroup } from "@/components/board/attribution-avatars"
import {
  ChildProgressBar,
  ChildProgressCount,
} from "@/components/board/child-progress-bar"
import {
  IdCreatedTooltip,
  SizeWithPointsTooltip,
  StatusWithSolvedTooltip,
} from "@/components/board/date-tooltip"
import { ListFiltersBar } from "@/components/board/list-filters-bar"
import { ListPagination } from "@/components/board/list-pagination"
import {
  statusRowClass,
  TypeBadge,
} from "@/components/board/status-badge"
import { TimeframeFilter } from "@/components/board/timeframe-filter"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePaginatedRows } from "@/hooks/use-paginated-rows"
import { usePersistedHideCompleted } from "@/hooks/use-persisted-hide-completed"
import { displayFileName } from "@/lib/display-path"
import { HIDE_COMPLETED_DEFAULT } from "@/lib/taskmark/constants"
import type { ProjectEpicList } from "@/lib/taskmark/epic-types"
import type { EpicWorkItemsList } from "@/lib/taskmark/flat-work-item-types"
import type { StoryItemList } from "@/lib/taskmark/item-types"
import {
  DEFAULT_TIMEFRAME_FILTER,
  type TimeframeFilterState,
} from "@/lib/taskmark/list-filters"
import {
  buildOverallTree,
  filterOverallTree,
  searchRevealIds,
  type OverallTreeNode,
} from "@/lib/taskmark/overall-tree"
import type { SolvedCompletionSample } from "@/lib/taskmark/timeframe-filters"
import { cn } from "@/lib/utils"

type OverallTreeListProps = {
  list: ProjectEpicList
  workItemsByEpic: Record<string, EpicWorkItemsList>
  itemsByStory: Record<string, StoryItemList>
  selectedEpicId?: string | null
  selectedStoryId?: string | null
  countableCompletions?: readonly SolvedCompletionSample[]
  initialHideCompleted?: boolean
}

function allNodes(nodes: readonly OverallTreeNode[]): OverallTreeNode[] {
  return nodes.flatMap((node) => [node, ...allNodes(node.children)])
}

function expansionStorageKey(projectId: string): string {
  return `taskmark:overall-expanded:${projectId}`
}

function readExpanded(projectId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(expansionStorageKey(projectId)) ?? "[]"
    )
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : []
  } catch {
    return []
  }
}

function TreeNodeRow({
  node,
  level,
  expanded,
  selectedEpicId,
  selectedStoryId,
  onToggle,
}: {
  node: OverallTreeNode
  level: number
  expanded: ReadonlySet<string>
  selectedEpicId: string | null
  selectedStoryId: string | null
  onToggle: (id: string) => void
}) {
  const expandable = node.kind === "epic" || node.kind === "story"
  const isExpanded = expandable && expanded.has(node.id)
  const selected =
    (node.kind === "epic" && node.id === selectedEpicId) ||
    (node.kind === "story" && node.id === selectedStoryId)
  const emptyMessage =
    node.kind === "epic"
      ? "No stories, tasks, or bugs under this epic yet."
      : "No tasks or bugs under this story yet."

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!expandable || (event.key !== "Enter" && event.key !== " ")) return
    if ((event.target as HTMLElement).closest("button")) return
    event.preventDefault()
    onToggle(node.id)
  }

  return (
    <div role="none">
      <div
        role="treeitem"
        aria-level={level}
        aria-expanded={expandable ? isExpanded : undefined}
        aria-selected={selected}
        tabIndex={0}
        data-state={selected ? "selected" : undefined}
        onKeyDown={onKeyDown}
        style={
          {
            "--tkmd-indent": `${Math.max(0, level - 1) * 12}px`,
          } as React.CSSProperties
        }
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1.5 gap-y-1.5 border-b px-2 py-2 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-12 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_4rem_5.5rem_3rem] sm:gap-x-3 sm:gap-y-2 sm:py-1.5",
          statusRowClass(node.status),
          selected && "bg-muted/60"
        )}
      >
        <div className="contents sm:flex sm:min-w-0 sm:items-center sm:gap-1.5 sm:ps-[var(--tkmd-indent)]">
          {expandable ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="row-span-2 size-8 shrink-0 ms-[var(--tkmd-indent)] sm:row-span-1 sm:size-9 sm:ms-0"
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.id}`}
              aria-expanded={isExpanded}
              onClick={() => onToggle(node.id)}
            >
              <ChevronRightIcon
                className={cn(
                  "size-4 transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
            </Button>
          ) : (
            <span
              className="row-span-2 w-8 shrink-0 ms-[var(--tkmd-indent)] sm:row-span-1 sm:w-9 sm:ms-0"
              aria-hidden
            />
          )}
          <TypeBadge type={node.kind} className="hidden sm:inline-flex" />
          <div className="min-w-0 sm:flex-1">
            <div className="hidden min-w-0 flex-wrap items-baseline gap-x-2 sm:flex">
              <IdCreatedTooltip id={node.id} created={node.created} />
              <span className="min-w-0 break-words font-medium leading-snug">
                {node.title}
              </span>
            </div>
            <p
              className="min-w-0 truncate font-medium leading-snug sm:hidden"
              title={node.title}
            >
              {node.title}
            </p>
          </div>
          <ViewWorkItemButton
            className="row-span-2 size-8 shrink-0 sm:hidden"
            label={`View details for ${node.id}`}
            itemRef={{
              kind:
                node.kind === "epic"
                  ? "epic"
                  : node.kind === "story"
                    ? "story"
                    : "item",
              id: node.id,
              title: node.title,
              filePath: node.filePath,
              itemType:
                node.kind === "task" || node.kind === "bug"
                  ? node.kind
                  : undefined,
            }}
          />
        </div>
        <div className="col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs sm:hidden">
          <IdCreatedTooltip id={node.id} created={node.created} />
          <TypeBadge type={node.kind} />
          <SizeWithPointsTooltip size={node.size} points={node.points} />
          <AttributionAvatarGroup
            reporters={node.reporters}
            resolvers={node.resolvers}
          />
          {node.children.length > 0 ? (
            <ChildProgressCount
              done={node.doneWorkItemCount}
              total={node.workItemCount}
            />
          ) : (
            <StatusWithSolvedTooltip
              status={node.status}
              solvedAt={node.completedAt}
            />
          )}
        </div>
        <div className="hidden sm:block">
          <SizeWithPointsTooltip size={node.size} points={node.points} />
        </div>
        <div className="hidden justify-center sm:flex">
          <AttributionAvatarGroup
            reporters={node.reporters}
            resolvers={node.resolvers}
          />
        </div>
        <div className="hidden tabular-nums sm:block">
          {node.children.length > 0 ? node.workItemCount : "—"}
        </div>
        <div className="hidden justify-center sm:flex">
          {node.children.length > 0 ? (
            <ChildProgressBar
              done={node.doneWorkItemCount}
              total={node.workItemCount}
            />
          ) : (
            <StatusWithSolvedTooltip
              status={node.status}
              solvedAt={node.completedAt}
            />
          )}
        </div>
        <div className="hidden justify-end sm:flex pl-2">
          <ViewWorkItemButton
            label={`View details for ${node.id}`}
            itemRef={{
              kind:
                node.kind === "epic"
                  ? "epic"
                  : node.kind === "story"
                    ? "story"
                    : "item",
              id: node.id,
              title: node.title,
              filePath: node.filePath,
              itemType:
                node.kind === "task" || node.kind === "bug"
                  ? node.kind
                  : undefined,
            }}
          />
        </div>
      </div>
      {isExpanded ? (
        <div role="group">
          {node.children.length > 0 ? (
            node.children.map((child) => (
              <TreeNodeRow
                key={`${child.kind}:${child.id}:${child.filePath}`}
                node={child}
                level={level + 1}
                expanded={expanded}
                selectedEpicId={selectedEpicId}
                selectedStoryId={selectedStoryId}
                onToggle={onToggle}
              />
            ))
          ) : (
            <p
              className="border-b py-3 pr-3 text-sm text-muted-foreground"
              style={{ paddingInlineStart: `${level * 12 + 32}px` }}
            >
              {emptyMessage}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function OverallTreeList({
  list,
  workItemsByEpic,
  itemsByStory,
  selectedEpicId = null,
  selectedStoryId = null,
  countableCompletions = [],
  initialHideCompleted = HIDE_COMPLETED_DEFAULT,
}: OverallTreeListProps) {
  const { project, errors } = list
  const tree = React.useMemo(
    () => buildOverallTree(list, workItemsByEpic, itemsByStory),
    [list, workItemsByEpic, itemsByStory]
  )
  const [query, setQuery] = React.useState("")
  const [hideCompleted, setHideCompleted] =
    usePersistedHideCompleted(initialHideCompleted)
  const [timeframe, setTimeframe] = React.useState<TimeframeFilterState>(
    DEFAULT_TIMEFRAME_FILTER
  )
  const [expandedIds, setExpandedIds] = React.useState<string[]>(() => [
    ...(selectedEpicId ? [selectedEpicId] : []),
    ...(selectedStoryId ? [selectedStoryId] : []),
  ])

  React.useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setExpandedIds((current) => [
        ...new Set([
          ...current,
          ...readExpanded(project.id),
          ...(selectedEpicId ? [selectedEpicId] : []),
          ...(selectedStoryId ? [selectedStoryId] : []),
        ]),
      ])
    })
    return () => {
      active = false
    }
  }, [project.id, selectedEpicId, selectedStoryId])

  const filtered = React.useMemo(
    () => filterOverallTree(tree, { query, hideCompleted, timeframe }),
    [tree, query, hideCompleted, timeframe]
  )
  const effectiveExpanded = React.useMemo(
    () => new Set([...expandedIds, ...searchRevealIds(filtered, query)]),
    [expandedIds, filtered, query]
  )
  const completedAts = React.useMemo(
    () => allNodes(tree).map((node) => node.completedAt),
    [tree]
  )
  const resetKey = `${project.id}|${query}|${hideCompleted}|${JSON.stringify(timeframe)}`
  const {
    pageRows,
    page,
    pageSize,
    totalCount,
    totalPages,
    setPage,
    setPageSize,
  } = usePaginatedRows(filtered, resetKey)

  React.useEffect(() => {
    if (!selectedEpicId) return
    const index = filtered.findIndex((node) => node.id === selectedEpicId)
    if (index >= 0) setPage(Math.floor(index / pageSize) + 1)
  }, [selectedEpicId, filtered, pageSize, setPage])

  const toggle = React.useCallback(
    (id: string) => {
      setExpandedIds((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        const values = [...next]
        try {
          window.sessionStorage.setItem(
            expansionStorageKey(project.id),
            JSON.stringify(values)
          )
        } catch {
          // Session storage may be unavailable in privacy-restricted contexts.
        }
        return values
      })
    },
    [project.id]
  )

  const nestedErrors = [
    ...Object.values(workItemsByEpic).flatMap((value) => value.errors),
    ...Object.values(itemsByStory).flatMap((value) => value.errors),
  ]
  const allErrors = [
    ...errors.map((error) => ({
      filePath: error.filePath,
      message: error.message,
    })),
    ...nestedErrors,
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">{project.name}</CardTitle>
        {tree.length > 0 ? (
          <CardAction>
            <TimeframeFilter
              id={`overall-tree-timeframe-${project.id}`}
              value={timeframe}
              onChange={setTimeframe}
              completedAts={completedAts}
              countableCompletions={countableCompletions}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {allErrors.length > 0 ? (
          <div
            role="status"
            className="rounded border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
          >
            <p className="font-medium text-destructive">
              {allErrors.length} file{allErrors.length === 1 ? "" : "s"} could
              not be parsed
            </p>
            <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
              {allErrors.map((error, index) => (
                <li key={`${error.filePath}:${error.message}:${index}`}>
                  {displayFileName(error.filePath)}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tree.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No epics in this board yet.
          </p>
        ) : (
          <>
            <ListFiltersBar
              searchId={`overall-tree-search-${project.id}`}
              query={query}
              onQueryChange={setQuery}
              hideCompleted={hideCompleted}
              onHideCompletedChange={setHideCompleted}
            />
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No work matches the current search or filters.
              </p>
            ) : (
              <>
                <div className="overflow-hidden rounded-md border" role="tree">
                  <div className="hidden grid-cols-[minmax(0,1fr)_5rem_5rem_4rem_5.5rem_3rem] gap-x-3 border-b bg-muted/30 px-2 py-2 text-xs font-medium text-muted-foreground sm:grid">
                    <span>Work</span>
                    <span>Size</span>
                    <span className="text-center">People</span>
                    <span>Items</span>
                    <span className="text-center">Status</span>
                    <span className="sr-only pl-2">Actions</span>
                  </div>
                  {pageRows.map((node) => (
                    <TreeNodeRow
                      key={`${node.id}:${node.filePath}`}
                      node={node}
                      level={1}
                      expanded={effectiveExpanded}
                      selectedEpicId={selectedEpicId}
                      selectedStoryId={selectedStoryId}
                      onToggle={toggle}
                    />
                  ))}
                </div>
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
