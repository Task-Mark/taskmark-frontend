import type { DiscoveredProject } from "@/lib/taskmark/types"
import type {
  FlatWorkItemList,
  FlatWorkItemRow,
  ProjectStoriesFlatList,
  ProjectTasksFlatList,
  StoryWithEpicRow,
  TaskWithParentsRow,
  WorkItemsViewList,
  WorkItemsViewRow,
} from "@/lib/taskmark/flat-work-item-types"
import { compareByStatusThenPriority } from "@/lib/taskmark/list-view-mode"
import { parseEpicsForProject } from "@/lib/taskmark/parse-epics"
import { parseItemsForEpic, parseItemsForStory } from "@/lib/taskmark/parse-items"
import { parseStoriesForEpic } from "@/lib/taskmark/parse-stories"

/**
 * Flat table of every epic, story, and task/bug on the active board.
 */
export function parseAllWorkItemsForProject(
  project: DiscoveredProject
): FlatWorkItemList {
  const epicList = parseEpicsForProject(project)
  const rows: FlatWorkItemRow[] = []
  const errors: FlatWorkItemList["errors"] = epicList.errors.map((e) => ({
    filePath: e.filePath,
    message: e.message,
  }))

  for (const epic of epicList.epics) {
    rows.push({
      kind: "epic",
      id: epic.id,
      title: epic.title,
      status: epic.status,
      priority: epic.priority,
      size: epic.size,
      points: epic.points,
      estimateMinutes: epic.estimateMinutes,
      actualMinutes: epic.actualMinutes,
      actualMs: epic.actualMs,
      epicId: epic.id,
      epicTitle: epic.title,
      storyId: null,
      storyTitle: null,
      filePath: epic.filePath,
      project: epic.project,
    })

    const storyList = parseStoriesForEpic(project, epic.id)
    for (const err of storyList.errors) {
      errors.push({ filePath: err.filePath, message: err.message })
    }

    for (const story of storyList.stories) {
      rows.push({
        kind: "story",
        id: story.id,
        title: story.title,
        status: story.status,
        priority: story.priority,
        size: story.size,
        points: story.points,
        estimateMinutes: story.estimateMinutes,
        actualMinutes: story.actualMinutes,
        actualMs: story.actualMs,
        epicId: epic.id,
        epicTitle: epic.title,
        storyId: story.id,
        storyTitle: story.title,
        filePath: story.filePath,
        project: story.project,
      })

      const items = parseItemsForStory(project, epic.id, story.id)
      for (const err of items.errors) {
        errors.push({ filePath: err.filePath, message: err.message })
      }
      for (const item of items.items) {
        rows.push({
          kind: item.type,
          id: item.id,
          title: item.title,
          status: item.status,
          priority: item.priority,
          size: item.size,
          points: item.points,
          estimateMinutes: item.estimateMinutes,
          actualMinutes: item.actualMinutes,
          actualMs: item.actualMs,
          epicId: epic.id,
          epicTitle: epic.title,
          storyId: story.id,
          storyTitle: story.title,
          filePath: item.filePath,
          project: item.project,
        })
      }
    }

    const epicItems = parseItemsForEpic(project, epic.id)
    for (const err of epicItems.errors) {
      errors.push({ filePath: err.filePath, message: err.message })
    }
    for (const item of epicItems.items) {
      rows.push({
        kind: item.type,
        id: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        size: item.size,
        points: item.points,
        estimateMinutes: item.estimateMinutes,
        actualMinutes: item.actualMinutes,
        actualMs: item.actualMs,
        epicId: epic.id,
        epicTitle: epic.title,
        storyId: null,
        storyTitle: null,
        filePath: item.filePath,
        project: item.project,
      })
    }
  }

  return { project, rows, errors }
}

/** All stories across every epic, with epic id/title for UI tags. */
export function parseAllStoriesForProject(
  project: DiscoveredProject
): ProjectStoriesFlatList {
  const epicList = parseEpicsForProject(project)
  const stories: StoryWithEpicRow[] = []
  const errors: ProjectStoriesFlatList["errors"] = epicList.errors.map((e) => ({
    filePath: e.filePath,
    message: e.message,
  }))

  for (const epic of epicList.epics) {
    const storyList = parseStoriesForEpic(project, epic.id)
    for (const err of storyList.errors) {
      errors.push({ filePath: err.filePath, message: err.message })
    }
    for (const story of storyList.stories) {
      stories.push({
        id: story.id,
        title: story.title,
        status: story.status,
        priority: story.priority,
        size: story.size,
        points: story.points,
        estimateMinutes: story.estimateMinutes,
        actualMinutes: story.actualMinutes,
        actualMs: story.actualMs,
        epicId: epic.id,
        epicTitle: epic.title,
        workItemCount: story.workItemCount,
        filePath: story.filePath,
        project: story.project,
      })
    }
  }

  stories.sort((a, b) => a.id.localeCompare(b.id))
  return { project, stories, errors }
}

/** All tasks/bugs across the board, with epic and story UI tags. */
export function parseAllTasksForProject(
  project: DiscoveredProject
): ProjectTasksFlatList {
  const epicList = parseEpicsForProject(project)
  const items: TaskWithParentsRow[] = []
  const errors: ProjectTasksFlatList["errors"] = epicList.errors.map((e) => ({
    filePath: e.filePath,
    message: e.message,
  }))

  for (const epic of epicList.epics) {
    const storyList = parseStoriesForEpic(project, epic.id)
    for (const err of storyList.errors) {
      errors.push({ filePath: err.filePath, message: err.message })
    }

    for (const story of storyList.stories) {
      const storyItems = parseItemsForStory(project, epic.id, story.id)
      for (const err of storyItems.errors) {
        errors.push({ filePath: err.filePath, message: err.message })
      }
      for (const item of storyItems.items) {
        items.push({
          id: item.id,
          type: item.type,
          title: item.title,
          status: item.status,
          priority: item.priority,
          size: item.size,
          points: item.points,
          estimateMinutes: item.estimateMinutes,
          actualMinutes: item.actualMinutes,
          actualMs: item.actualMs,
          epicId: epic.id,
          epicTitle: epic.title,
          storyId: story.id,
          storyTitle: story.title,
          filePath: item.filePath,
          project: item.project,
        })
      }
    }

    const epicItems = parseItemsForEpic(project, epic.id)
    for (const err of epicItems.errors) {
      errors.push({ filePath: err.filePath, message: err.message })
    }
    for (const item of epicItems.items) {
      items.push({
        id: item.id,
        type: item.type,
        title: item.title,
        status: item.status,
        priority: item.priority,
        size: item.size,
        points: item.points,
        estimateMinutes: item.estimateMinutes,
        actualMinutes: item.actualMinutes,
        actualMs: item.actualMs,
        epicId: epic.id,
        epicTitle: epic.title,
        storyId: null,
        storyTitle: null,
        filePath: item.filePath,
        project: item.project,
      })
    }
  }

  items.sort((a, b) => a.id.localeCompare(b.id))
  return { project, items, errors }
}

/**
 * Work items tab: all stories + epic-direct tasks/bugs only
 * (excludes tasks/bugs that live under a story). Sorted by status then priority.
 */
export function parseWorkItemsViewForProject(
  project: DiscoveredProject
): WorkItemsViewList {
  const epicList = parseEpicsForProject(project)
  const rows: WorkItemsViewRow[] = []
  const errors: WorkItemsViewList["errors"] = epicList.errors.map((e) => ({
    filePath: e.filePath,
    message: e.message,
  }))

  for (const epic of epicList.epics) {
    const storyList = parseStoriesForEpic(project, epic.id)
    for (const err of storyList.errors) {
      errors.push({ filePath: err.filePath, message: err.message })
    }
    for (const story of storyList.stories) {
      rows.push({
        kind: "story",
        id: story.id,
        title: story.title,
        status: story.status,
        priority: story.priority,
        size: story.size,
        points: story.points,
        estimateMinutes: story.estimateMinutes,
        actualMinutes: story.actualMinutes,
        actualMs: story.actualMs,
        epicId: epic.id,
        epicTitle: epic.title,
        created: story.created,
        filePath: story.filePath,
        project: story.project,
      })
    }

    const epicItems = parseItemsForEpic(project, epic.id)
    for (const err of epicItems.errors) {
      errors.push({ filePath: err.filePath, message: err.message })
    }
    for (const item of epicItems.items) {
      rows.push({
        kind: item.type,
        id: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        size: item.size,
        points: item.points,
        estimateMinutes: item.estimateMinutes,
        actualMinutes: item.actualMinutes,
        actualMs: item.actualMs,
        epicId: epic.id,
        epicTitle: epic.title,
        created: item.created,
        filePath: item.filePath,
        project: item.project,
      })
    }
  }

  rows.sort(compareByStatusThenPriority)
  return { project, rows, errors }
}
