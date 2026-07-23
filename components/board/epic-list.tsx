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
import { StatusBadge } from "@/components/board/status-badge"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import { cn } from "@/lib/utils"
import { formatActualDuration, formatDurationMinutes } from "@/lib/format-duration"
import type { ProjectEpicList } from "@/lib/taskmark/epic-types"
import { isGeneralEpic } from "@/lib/taskmark/general-epic"

function formatPoints(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

type EpicListProps = {
  lists: ProjectEpicList[]
  selectedEpicId?: string | null
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
        <Card key={project.boardPath}>
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

            {epics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No epics in this board yet. Init should seed a General epic for
                general tasks and user stories.
              </p>
            ) : (
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
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {epics.map((epic) => {
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
                          <Link
                            href={`/board?epic=${encodeURIComponent(epic.id)}`}
                            className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            aria-current={selected ? "true" : undefined}
                          >
                            {epic.id}
                          </Link>
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
                          {formatActualDuration(epic.actualMs, epic.actualMinutes)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={epic.status} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
