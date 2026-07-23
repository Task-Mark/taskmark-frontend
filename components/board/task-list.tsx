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
import { TypeBadge } from "@/components/board/status-badge"
import {
  IdCreatedTooltip,
  StatusWithSolvedTooltip,
} from "@/components/board/date-tooltip"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import { formatActualDuration, formatDurationMinutes } from "@/lib/format-duration"
import type { StoryItemList } from "@/lib/taskmark/item-types"

function formatPoints(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

type TaskListProps = {
  list: StoryItemList
}

export function TaskList({ list }: TaskListProps) {
  const { project, storyId, storyTitle, items, errors } = list
  const heading = storyTitle ? `${storyId}: ${storyTitle}` : storyId

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
            No tasks or bugs under this story yet
            {list.storyTitle?.toLowerCase() === "epic-direct"
              ? " — general tasks will appear here."
              : "."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Est</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={`${project.id}:${item.id}:${item.filePath}`}>
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
                    <IdCreatedTooltip id={item.id} created={item.created} />
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={item.type} />
                  </TableCell>
                  <TableCell className="max-w-[18rem] whitespace-normal font-medium">
                    {item.title}
                  </TableCell>
                  <TableCell>{item.size}</TableCell>
                  <TableCell>{formatPoints(item.points)}</TableCell>
                  <TableCell>
                    {formatDurationMinutes(item.estimateMinutes)}
                  </TableCell>
                  <TableCell>
                    {formatActualDuration(item.actualMs, item.actualMinutes)}
                  </TableCell>
                  <TableCell>
                    <StatusWithSolvedTooltip
                      status={item.status}
                      solvedAt={item.completedAt}
                    />
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
