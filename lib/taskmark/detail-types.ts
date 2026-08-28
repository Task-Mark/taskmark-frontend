import type { TimingFields } from "@/lib/taskmark/timing"
import type { ContributorIdentity } from "@/lib/taskmark/identity"

export type WorkItemKind = "epic" | "story" | "task" | "bug"

export type ChecklistItem = {
  text: string
  checked: boolean
}

export type MarkdownTable = {
  headers: string[]
  rows: string[][]
}

export type PromptFeedbackRow = {
  index: string
  when: string
  kind: string
  author: string
  summary: string
  /** Descendant leaf that contributed this row on a derived parent view. */
  leafId?: string
  leafTitle?: string
}

export type CommitRow = {
  sha: string
  repo: string
  date: string
  author: string
  message: string
  leafId?: string
  leafTitle?: string
}

export type WorkLogRow = {
  session: string
  actor: string
  started: string
  ended: string
  summary: string
  leafId?: string
  leafTitle?: string
}

export type WorkItemMeta = {
  id: string
  title: string
  type: WorkItemKind
  status: string
  priority: string
  size: string
  points: number | null
  estimateMinutes: number | null
  actualMinutes: number | null
  actualMs: number | null
  tags: string[]
  owner: string
  reporters: ContributorIdentity[]
  resolvers: ContributorIdentity[]
  blocked: boolean
  cancelled: boolean
  parent: string
  epic: string
  created: string
  updated: string
  startedAt: string
  completedAt: string
  filePath: string
}

/** Child row shown on epic/story detail (stories, tasks, bugs). */
export type DetailChildItem = {
  id: string
  title: string
  type: "story" | "task" | "bug"
  status: string
  priority: string
  filePath: string
}

export type EpicDetail = WorkItemMeta & {
  type: "epic"
  goal: string
  scope: string
  outOfScope: string
  successMetrics: string
  storiesMarkdown: string
  /** Stories + epic-direct tasks/bugs under this epic. */
  children: DetailChildItem[]
  promptFeedback: PromptFeedbackRow[]
  commits: CommitRow[]
  workLog: WorkLogRow[]
}

export type StoryDetail = WorkItemMeta & {
  type: "story"
  userStory: string
  acceptanceCriteria: ChecklistItem[]
  acceptanceCriteriaRaw: string
  tasksMarkdown: string
  /** Tasks/bugs under this story. */
  children: DetailChildItem[]
  promptFeedback: PromptFeedbackRow[]
  commits: CommitRow[]
  workLog: WorkLogRow[]
}

export type ItemDetail = WorkItemMeta & {
  type: "task" | "bug"
  description: string
  acceptanceCriteria: ChecklistItem[]
  acceptanceCriteriaRaw: string
  reproSteps: string
  fixCriteria: string
  notes: string
  promptFeedback: PromptFeedbackRow[]
  commits: CommitRow[]
  workLog: WorkLogRow[]
}

export type WorkItemDetail = EpicDetail | StoryDetail | ItemDetail

export type WorkItemDetailResult =
  | { ok: true; detail: WorkItemDetail }
  | { ok: false; filePath: string; message: string }

export type WorkItemRef = {
  kind: "epic" | "story" | "item"
  id: string
  title: string
  filePath: string
  /** Present for tasks/bugs */
  itemType?: "task" | "bug"
}

/** Re-export for convenience when building meta */
export type { TimingFields }
