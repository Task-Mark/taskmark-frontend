import type { DiscoveredProject } from "@/lib/taskmark/types"

export type StorySummary = {
  id: string
  title: string
  status: string
  priority: string
  size: string
  points: number | null
  estimateMinutes: number | null
  actualMinutes: number | null
  actualMs: number | null
  tags: string[]
  /** Frontmatter created date (YYYY-MM-DD or ISO). */
  created: string
  /** Frontmatter completed_at (ISO) when solved; empty if open. */
  completedAt: string
  parent: string
  epic: string
  /** Tasks + bugs under this story. */
  workItemCount: number
  /** Absolute path to story.md */
  filePath: string
  project: Pick<DiscoveredProject, "id" | "name" | "projectPath" | "boardPath">
}

export type StoryParseError = {
  filePath: string
  projectId: string
  projectName: string
  epicId: string
  message: string
}

export type EpicStoryList = {
  project: DiscoveredProject
  epicId: string
  epicTitle: string | null
  stories: StorySummary[]
  errors: StoryParseError[]
}
