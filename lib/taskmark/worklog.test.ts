import assert from "node:assert/strict"
import test from "node:test"

import { flattenWorklogEntries } from "@taskmark/components/board-model/worklog"
import type { WorkItemDetail } from "@/lib/taskmark/detail-types"

function leaf(
  id: string,
  type: "task" | "bug",
  started: string
): WorkItemDetail {
  return {
    id,
    title: `${type} ${id}`,
    type,
    status: "done",
    priority: "medium",
    size: "s",
    points: 1,
    actualMinutes: 1,
    actualMs: 60_000,
    tags: [],
    reporters: [],
    resolvers: [],
    blocked: false,
    cancelled: false,
    parent: "S-1",
    epic: "E-1",
    created: "",
    updated: "",
    startedAt: "",
    completedAt: "",
    filePath: `${id}.md`,
    description: "",
    acceptanceCriteria: [],
    acceptanceCriteriaRaw: "",
    reproSteps: "",
    fixCriteria: "",
    notes: "",
    promptFeedback: [],
    commits: [],
    workLog: [
      {
        session: `session-${id}`,
        actor: "Ada Lovelace",
        started,
        ended: started,
        summary: `Worked on ${id}`,
      },
    ],
  }
}

test("flattens only leaf worklogs and sorts newest first", () => {
  const oldTask = leaf("T-1", "task", "2026-09-01T10:00:00Z")
  const newBug = leaf("B-2", "bug", "2026-09-02T10:00:00Z")
  const parent = {
    ...oldTask,
    id: "S-1",
    title: "Parent",
    type: "story" as const,
    userStory: "",
    acceptanceCriteria: [],
    acceptanceCriteriaRaw: "",
    tasksMarkdown: "",
    children: [],
  }

  const entries = flattenWorklogEntries({
    "old.md": oldTask,
    "new.md": newBug,
    "parent.md": parent,
  })

  assert.deepEqual(
    entries.map((entry) => entry.itemId),
    ["B-2", "T-1"]
  )
})
