/**
 * Print what the parsers read from one board, so a migration can be compared
 * before and after: `npx tsx scripts/check-board.ts <boardPath>`.
 */
import { buildBoardIndex } from "../lib/taskmark/board-index"
import { parseEpicsForProject } from "../lib/taskmark/parse-epics"
import { parseMeetingsForProject } from "../lib/taskmark/parse-meetings"
import { parseRequestsForProject } from "../lib/taskmark/parse-requests"
import { parseWorkItemsViewForProject } from "../lib/taskmark/parse-flat-lists"

const boardPath = process.argv[2]
if (!boardPath) {
  console.error("Usage: npx tsx scripts/check-board.ts <boardPath>")
  process.exit(1)
}
const project = { id: boardPath, name: "board", projectPath: boardPath, boardPath }
const index = buildBoardIndex(boardPath)
const epics = parseEpicsForProject(project, index)
const view = parseWorkItemsViewForProject(project, index)
const requests = parseRequestsForProject(project, index)
const meetings = parseMeetingsForProject(project, index)

console.log(
  JSON.stringify(
    {
      leaves: index.leaves.length,
      epics: epics.epics.length,
      epicErrors: epics.errors.length,
      epicWorkItems: epics.epics.reduce((n, e) => n + e.workItemCount, 0),
      epicDoneWorkItems: epics.epics.reduce((n, e) => n + e.doneWorkItemCount, 0),
      workItemRows: view.rows.length,
      requests: requests.requests.length,
      requestErrors: requests.errors.length,
      requestsByStatus: requests.requests.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1
        return acc
      }, {}),
      shippedLeaves: requests.requests.reduce((n, r) => n + r.shippedLeafCount, 0),
      meetings: meetings.meetings.length,
    },
    null,
    2
  )
)
