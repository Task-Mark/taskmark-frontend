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
import type { ProjectEpicList } from "@/lib/taskmark/epic-types"

function formatMinutes(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

function formatPoints(value: number | null): string {
  if (value === null) return "—"
  return String(value)
}

type EpicListProps = {
  lists: ProjectEpicList[]
}

export function EpicList({ lists }: EpicListProps) {
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
                No epics in this board yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Est (min)</TableHead>
                    <TableHead>Actual (min)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {epics.map((epic) => (
                    <TableRow key={`${project.id}:${epic.id}:${epic.filePath}`}>
                      <TableCell className="font-mono text-xs">
                        {epic.id}
                      </TableCell>
                      <TableCell className="max-w-[18rem] whitespace-normal font-medium">
                        {epic.title}
                      </TableCell>
                      <TableCell>{epic.status}</TableCell>
                      <TableCell>{epic.size}</TableCell>
                      <TableCell>{formatPoints(epic.points)}</TableCell>
                      <TableCell>
                        {formatMinutes(epic.estimateMinutes)}
                      </TableCell>
                      <TableCell>
                        {formatMinutes(epic.actualMinutes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
