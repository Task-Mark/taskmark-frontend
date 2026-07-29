import type { HideCompletedCookieKey } from "@/lib/taskmark/constants"
import type { WorkItemDetail, WorkItemRef } from "@/lib/taskmark/detail-types"
import type { ProjectEpicList } from "@/lib/taskmark/epic-types"
import type {
  EpicWorkItemsList,
  WorkItemsViewList,
} from "@/lib/taskmark/flat-work-item-types"
import type { StoryItemList } from "@/lib/taskmark/item-types"
import type { ProjectStatusMetrics } from "@/lib/taskmark/project-metrics-shared"
import type { SolvedCompletionSample } from "@/lib/taskmark/timeframe-filters"
import type { DiscoveredProject } from "@/lib/taskmark/types"

export const SNAPSHOT_PATH = "/taskmark-snapshot.json"

export type BoardSnapshot = {
  version: 1
  builtAt: string
  project: DiscoveredProject
  projects: DiscoveredProject[]
  epics: ProjectEpicList
  workItemsView: WorkItemsViewList
  /** Epic id → overall work-items list for that epic */
  workItemsByEpic: Record<string, EpicWorkItemsList>
  /** `${epicId}::${storyId}` → sub-task list */
  itemsByStory: Record<string, StoryItemList>
  statusMetrics: ProjectStatusMetrics
  countableCompletions: SolvedCompletionSample[]
  hideCompletedDefaults: Record<HideCompletedCookieKey, boolean>
  /** Absolute file path → detail (children attached) */
  detailsByPath: Record<string, WorkItemDetail>
  /** Work item id → ref for sheet open-by-id */
  refsById: Record<string, WorkItemRef>
}

export function storyKey(epicId: string, storyId: string): string {
  return `${epicId}::${storyId}`
}
