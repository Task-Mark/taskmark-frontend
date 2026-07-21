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
import type { EpicStoryList } from "@/lib/taskmark/story-types"

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

function formatStatusLabel(status: string): string {
  return status.replaceAll("_", " ")
}

type StoryListProps = {
  list: EpicStoryList
}

export function StoryList({ list }: StoryListProps) {
  const { project, epicId, epicTitle, stories, errors } = list
  const heading = epicTitle ? `${epicId}: ${epicTitle}` : epicId

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

        {stories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No stories under this epic yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Est</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stories.map((story) => (
                <TableRow key={`${project.id}:${story.id}:${story.filePath}`}>
                  <TableCell className="font-mono text-xs">
                    {story.id}
                  </TableCell>
                  <TableCell className="max-w-[18rem] whitespace-normal font-medium">
                    {story.title}
                  </TableCell>
                  <TableCell>{story.size}</TableCell>
                  <TableCell>{formatPoints(story.points)}</TableCell>
                  <TableCell>
                    {formatDurationMinutes(story.estimateMinutes)}
                  </TableCell>
                  <TableCell>
                    {formatDurationMinutes(story.actualMinutes)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(statusBadgeClass(story.status))}
                    >
                      {formatStatusLabel(story.status)}
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
