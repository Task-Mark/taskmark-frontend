import type { DiscoveredProject } from "@/lib/taskmark/types"
import type { ContributorIdentity } from "@/lib/taskmark/identity"

export type ItemType = "task" | "bug"

export type ItemSummary = {
  id: string
  type: ItemType
  title: string
  status: string
  priority: string
  size: string
  points: number | null
  actualMinutes: number | null
  actualMs: number | null
  tags: string[]
  reporters: ContributorIdentity[]
  resolvers: ContributorIdentity[]
  /** Frontmatter created date (YYYY-MM-DD or ISO). */
  created: string
  /** Frontmatter updated date (YYYY-MM-DD or ISO). */
  updated: string
  /** Frontmatter completed_at (ISO) when solved; empty if open. */
  completedAt: string
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
