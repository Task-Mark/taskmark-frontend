import assert from "node:assert/strict"
import test from "node:test"

import {
  buildOverallTree,
  compareOverallNodes,
  filterOverallTree,
  searchRevealIds,
  type OverallTreeNode,
} from "./overall-tree"

function node(
  id: string,
  overrides: Partial<OverallTreeNode> = {}
): OverallTreeNode {
  return {
    kind: "task",
    id,
    title: id,
    status: "backlog",
    size: "S",
    points: 3,
    tags: [],
    reporters: [],
    resolvers: [],
    created: "2026-01-01",
    updated: "2026-01-01",
    completedAt: "",
    filePath: `/${id}.md`,
    children: [],
    workItemCount: 0,
    doneWorkItemCount: 0,
    ...overrides,
  }
}

test("sorts incomplete before done, shelved, and cancelled", () => {
  const rows = [
    node("T-4", { status: "done", created: "2026-08-29" }),
    node("T-3", { status: "cancelled", created: "2026-08-30" }),
    node("T-6", { status: "shelved", created: "2026-08-31" }),
    node("T-2", { created: "2026-08-28", updated: "2026-08-29" }),
    node("T-1", { created: "2026-08-28", updated: "2026-08-30" }),
    node("T-0", { created: "2026-08-28", updated: "2026-08-30" }),
    node("T-5", { created: "2026-08-29" }),
  ]

  assert.deepEqual(
    rows.sort(compareOverallNodes).map((row) => row.id),
    ["T-5", "T-0", "T-1", "T-2", "T-6", "T-3", "T-4"]
  )
})

test("hides an empty General epic like the previous Overall list", () => {
  const general = {
    ...node("E-008", {
      kind: "epic",
      title: "General",
      filePath: "/epics/E-008-general/epic.md",
    }),
    priority: "medium",
    actualMinutes: null,
    actualMs: null,
    project: {},
  }
  const list = {
    project: {},
    epics: [{ ...general, workItemCount: 0 }],
    errors: [],
  } as unknown as Parameters<typeof buildOverallTree>[0]

  assert.deepEqual(buildOverallTree(list, {}, {}), [])
})

test("search retains ancestors of matching descendants", () => {
  const tree = [
    node("E-1", {
      kind: "epic",
      title: "Parent",
      children: [
        node("S-1", {
          kind: "story",
          children: [node("T-1", { title: "Needle task" })],
        }),
      ],
    }),
  ]

  const filtered = filterOverallTree(tree, {
    query: "needle",
    hideCompleted: false,
    timeframe: { mode: "none" },
  })

  assert.equal(filtered[0]?.id, "E-1")
  assert.equal(filtered[0]?.children[0]?.id, "S-1")
  assert.equal(filtered[0]?.children[0]?.children[0]?.id, "T-1")
})

test("hide-completed retains completed ancestors with incomplete descendants", () => {
  const tree = [
    node("E-1", {
      kind: "epic",
      status: "done",
      children: [
        node("S-1", {
          kind: "story",
          status: "done",
          children: [node("T-1", { status: "backlog" })],
        }),
      ],
    }),
  ]

  const filtered = filterOverallTree(tree, {
    query: "",
    hideCompleted: true,
    timeframe: { mode: "none" },
  })

  assert.equal(filtered[0]?.children[0]?.children[0]?.id, "T-1")
})

test("hide-completed removes shelved branches", () => {
  const tree = [
    node("E-1", {
      kind: "epic",
      status: "shelved",
      children: [
        node("S-1", {
          kind: "story",
          status: "shelved",
          children: [node("T-1", { status: "shelved" })],
        }),
      ],
    }),
  ]

  assert.deepEqual(
    filterOverallTree(tree, {
      query: "",
      hideCompleted: true,
      timeframe: { mode: "none" },
    }),
    []
  )
})

test("only a search reveals ancestors, so toggles keep the expansion state", () => {
  const tree = [
    node("E-1", {
      kind: "epic",
      children: [
        node("S-1", { kind: "story", children: [node("T-1")] }),
      ],
    }),
  ]

  assert.deepEqual(searchRevealIds(tree, ""), [])
  assert.deepEqual(searchRevealIds(tree, "   "), [])
  assert.deepEqual(searchRevealIds(tree, "needle"), ["E-1", "S-1"])
})

test("timeframe retains ancestor context for matching completed leaves", () => {
  const tree = [
    node("E-1", {
      kind: "epic",
      children: [
        node("S-1", {
          kind: "story",
          children: [
            node("T-old", {
              status: "done",
              completedAt: "2026-01-01",
            }),
            node("T-match", {
              status: "done",
              completedAt: "2026-08-29",
            }),
          ],
        }),
      ],
    }),
  ]

  const filtered = filterOverallTree(tree, {
    query: "",
    hideCompleted: false,
    timeframe: { mode: "range", from: "2026-08-29", to: "2026-08-29" },
  })

  assert.deepEqual(
    filtered[0]?.children[0]?.children.map((child) => child.id),
    ["T-match"]
  )
})
