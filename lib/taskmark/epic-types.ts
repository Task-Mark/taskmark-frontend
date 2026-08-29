import type { DiscoveredProject } from "@/lib/taskmark/types"
import type { ContributorIdentity } from "@/lib/taskmark/identity"

export type EpicSummary = {
  id: string
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
  /** Stories + tasks + bugs under this epic (story children and epic-direct). */
  workItemCount: number
  /** Done children among workItemCount (stories + tasks/bugs). */
  doneWorkItemCount: number
  /** Absolute path to epic.md */
  filePath: string
  project: Pick<DiscoveredProject, "id" | "name" | "projectPath" | "boardPath">
}

export type EpicParseError = {
  filePath: string
  projectId: string
  projectName: string
  message: string
}

export type ProjectEpicList = {
  project: DiscoveredProject
  epics: EpicSummary[]
  errors: EpicParseError[]
}
