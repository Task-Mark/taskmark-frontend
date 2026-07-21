import type { DiscoveredProject } from "@/lib/taskmark/types"

export type ItemType = "task" | "bug"

export type ItemSummary = {
  id: string
  type: ItemType
  title: string
  status: string
  priority: string
  size: string
  points: number | null
  estimateMinutes: number | null
  actualMinutes: number | null
  effortMinutes: number | null
  tags: string[]
  parent: string
  epic: string
  /** Absolute path to the item markdown file */
  filePath: string
  project: Pick<DiscoveredProject, "id" | "name" | "projectPath" | "boardPath">
}

export type ItemParseError = {
  filePath: string
  projectId: string
  projectName: string
  storyId: string
  message: string
}

export type StoryItemList = {
  project: DiscoveredProject
  epicId: string
  storyId: string
  storyTitle: string | null
  items: ItemSummary[]
  errors: ItemParseError[]
}
