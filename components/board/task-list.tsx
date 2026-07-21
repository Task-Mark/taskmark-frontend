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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDurationMinutes } from "@/lib/format-duration"
import { hasEffortData } from "@/lib/taskmark/timing"
import type { StoryItemList } from "@/lib/taskmark/item-types"

function formatPoints(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "done":
      return "border-black bg-[var(--chart-4)] text-black"
    case "in_progress":
      return "border-black bg-[var(--chart-1)] text-black"
    case "blocked":
      return "border-black bg-destructive text-destructive-foreground"
    case "cancelled":
      return "border-black bg-muted text-muted-foreground line-through"
    case "backlog":
      return "border-black bg-[var(--chart-3)] text-black"
    default:
      return "border-black bg-card text-foreground"
  }
}

function typeBadgeClass(type: string): string {
  if (type === "bug") {
    return "border-black bg-destructive/15 text-destructive"
  }
  return "border-black bg-[var(--chart-2)] text-black"
}

function formatStatusLabel(status: string): string {
  return status.replaceAll("_", " ")
}

type TaskListProps = {
  list: StoryItemList
}

export function TaskList({ list }: TaskListProps) {
  const { project, storyId, storyTitle, items, errors } = list
  const heading = storyTitle ? `${storyId}: ${storyTitle}` : storyId
  const showEffort = hasEffortData(items)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Tasks</CardTitle>
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

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks or bugs under this story yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Est</TableHead>
                {showEffort ? <TableHead>Effort</TableHead> : null}
                <TableHead>Actual</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={`${project.id}:${item.id}:${item.filePath}`}>
                  <TableCell className="font-mono text-xs">
                    {item.id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(typeBadgeClass(item.type))}
                    >
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[18rem] whitespace-normal font-medium">
                    {item.title}
                  </TableCell>
                  <TableCell>{item.size}</TableCell>
                  <TableCell>{formatPoints(item.points)}</TableCell>
                  <TableCell>
                    {formatDurationMinutes(item.estimateMinutes)}
                  </TableCell>
                  {showEffort ? (
                    <TableCell>
                      {formatDurationMinutes(item.effortMinutes)}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    {formatDurationMinutes(item.actualMinutes)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(statusBadgeClass(item.status))}
                    >
                      {formatStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
