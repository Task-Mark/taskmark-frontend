import type { DiscoveredProject } from "@/lib/taskmark/types"
import type { ItemType } from "@/lib/taskmark/item-types"

export type FlatWorkItemKind = "epic" | "story" | ItemType

export type FlatWorkItemRow = {
  kind: FlatWorkItemKind
  id: string
  title: string
  status: string
  priority: string
  size: string
  points: number | null
  estimateMinutes: number | null
  actualMinutes: number | null
  actualMs: number | null
  epicId: string | null
  epicTitle: string | null
  storyId: string | null
  storyTitle: string | null
  filePath: string
  project: Pick<DiscoveredProject, "id" | "name" | "projectPath" | "boardPath">
}

export type FlatWorkItemList = {
  project: DiscoveredProject
  rows: FlatWorkItemRow[]
  errors: { filePath: string; message: string }[]
}

export type StoryWithEpicRow = {
  id: string
  title: string
  status: string
  priority: string
  size: string
  points: number | null
  estimateMinutes: number | null
  actualMinutes: number | null
  actualMs: number | null
  epicId: string
  epicTitle: string
  workItemCount: number
  filePath: string
  project: Pick<DiscoveredProject, "id" | "name" | "projectPath" | "boardPath">
}

export type ProjectStoriesFlatList = {
  project: DiscoveredProject
  stories: StoryWithEpicRow[]
  errors: { filePath: string; message: string }[]
}

export type TaskWithParentsRow = {
  id: string
  type: ItemType
  title: string
  status: string
  priority: string
  size: string
  points: number | null
  estimateMinutes: number | null
  actualMinutes: number | null
  actualMs: number | null
  epicId: string
  epicTitle: string
  /** Null when epic-direct (no story). */
  storyId: string | null
  storyTitle: string | null
  filePath: string
  project: Pick<DiscoveredProject, "id" | "name" | "projectPath" | "boardPath">
}

export type ProjectTasksFlatList = {
  project: DiscoveredProject
  items: TaskWithParentsRow[]
  errors: { filePath: string; message: string }[]
}

/** Work items tab row: story or epic-direct task/bug (not under a story). */
export type WorkItemsViewRow = {
  kind: "story" | ItemType
  id: string
  title: string
  status: string
  priority: string
  size: string
  points: number | null
  estimateMinutes: number | null
  actualMinutes: number | null
  actualMs: number | null
  epicId: string
  epicTitle: string
  tags: string[]
  created: string
  /** Frontmatter completed_at when solved; empty if open. */
  completedAt: string
  filePath: string
  project: Pick<DiscoveredProject, "id" | "name" | "projectPath" | "boardPath">
}

export type WorkItemsViewList = {
  project: DiscoveredProject
  rows: WorkItemsViewRow[]
  errors: { filePath: string; message: string }[]
}
