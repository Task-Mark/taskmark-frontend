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
import { ParentTagBadge } from "@/components/board/parent-tag-badge"
import {
  PriorityBadge,
  TypeBadge,
} from "@/components/board/status-badge"
import {
  IdCreatedTooltip,
  StatusWithSolvedTooltip,
} from "@/components/board/date-tooltip"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import { formatActualDuration, formatDurationMinutes } from "@/lib/format-duration"
import type { WorkItemsViewList } from "@/lib/taskmark/flat-work-item-types"

function formatPoints(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

type WorkItemsListProps = {
  list: WorkItemsViewList
}

export function WorkItemsList({ list }: WorkItemsListProps) {
  const { project, rows, errors } = list

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Work items</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{project.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Stories and epic-direct tasks/bugs · ordered by status, priority,
            then newest created
          </span>
          <span className="mt-1 block font-mono text-xs">{project.boardPath}</span>
        </CardDescription>
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

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No stories or epic-direct tasks on this board yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Epic</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Est</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const sheetKind = row.kind === "story" ? "story" : "item"
                return (
                  <TableRow key={`${project.id}:${row.kind}:${row.id}:${row.filePath}`}>
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
                      <IdCreatedTooltip id={row.id} created={row.created} />
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={row.kind} />
                    </TableCell>
                    <TableCell className="max-w-[16rem] whitespace-normal font-medium">
                      {row.title}
                    </TableCell>
                    <TableCell>
                      <ParentTagBadge id={row.epicId} title={row.epicTitle} />
                    </TableCell>
                    <TableCell>{row.size}</TableCell>
                    <TableCell>{formatPoints(row.points)}</TableCell>
                    <TableCell>
                      {formatDurationMinutes(row.estimateMinutes)}
                    </TableCell>
                    <TableCell>
                      {formatActualDuration(row.actualMs, row.actualMinutes)}
                    </TableCell>
                    <TableCell>
                      <StatusWithSolvedTooltip
                        status={row.status}
                        solvedAt={row.completedAt}
                      />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={row.priority} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
