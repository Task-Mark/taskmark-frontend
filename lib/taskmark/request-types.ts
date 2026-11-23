import type { ContributorIdentity } from "@/lib/taskmark/identity"
import type { ChecklistItem } from "@/lib/taskmark/parse-sections"
import type { Stage, StageCounts } from "@/lib/taskmark/stage"
import type { DiscoveredProject } from "@/lib/taskmark/types"

/**
 * A request is what a client asked for. It owns a brief
 * (`requests/<slug>/brief.md`), the epics, stories and tasks that deliver it
 * (`requests/<slug>/epics/...`), and an append-only log (`requests/<slug>/log/`).
 */

export const REQUEST_STATUSES = [
  "proposed",
  "ready",
  "building",
  "shipped",
  "shelved",
  "cancelled",
] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export type RequestLink = {
  /** Id of the other request. */
  request: string
  /** e.g. waits-for, split-from, relates-to */
  relation: string
}

export type RequestSummary = {
  id: string
  slug: string
  title: string
  status: RequestStatus
  goal: string
  why: string
  doneWhen: ChecklistItem[]
  outOfScope: string[]
  openQuestions: ChecklistItem[]
  requestedBy: ContributorIdentity[]
  owners: ContributorIdentity[]
  created: string
  updated: string
  /** Forecast date (YYYY-MM-DD) when one was set. */
  forecast: string
  sourceMeetings: string[]
  links: RequestLink[]
  /** Old ids that still resolve to this request (e.g. the epic it came from). */
  aliases: string[]
  epicIds: string[]
  /** Tasks and bugs under the request. */
  leafCount: number
  /** Leaves with status done. */
  doneLeafCount: number
  /** Leaves whose commits reached main. */
  shippedLeafCount: number
  points: number
  shippedPoints: number
  stage: Stage | null
  stageCounts: StageCounts
  /** Absolute path to brief.md */
  filePath: string
  project: Pick<DiscoveredProject, "id" | "name" | "projectPath" | "boardPath">
}

export const REQUEST_LOG_KINDS = [
  "push",
  "merge",
  "promote",
  "release",
  "decision",
  "meeting",
  "scope",
  "note",
] as const
export type RequestLogKind = (typeof REQUEST_LOG_KINDS)[number]

export type RequestLogEntry = {
  id: string
  requestId: string
  kind: RequestLogKind
  /** ISO timestamp */
  at: string
  title: string
  summary: string
  person: ContributorIdentity | null
  repo: string
  provider: string
  fromBranch: string
  toBranch: string
  shas: string[]
  /** Task, story or meeting ids this entry moved. */
  targets: string[]
  filePath: string
}

export type RequestParseError = {
  filePath: string
  projectId: string
  projectName: string
  message: string
}

export type ProjectRequestList = {
  project: DiscoveredProject
  requests: RequestSummary[]
  logByRequest: Record<string, RequestLogEntry[]>
  errors: RequestParseError[]
}

export const MEETING_RELATIONS = [
  "created",
  "changed",
  "discussed",
  "raised",
  "accepted",
] as const

export type MeetingRequestLink = {
  request: string
  relation: string
}

export type MeetingDecision = {
  text: string
  request: string
}

export type MeetingTaskStatus = "open" | "in_progress" | "done" | "cancelled"

export type MeetingTask = {
  id: string
  title: string
  owner: string
  due: string
  /** Request id when the task belongs to one. */
  request: string
  /** Task id on the board when the task is tracked by code. */
  item: string
  status: MeetingTaskStatus
  /** Stage of the linked board item, when there is one. */
  stage: Stage | null
}

export type MeetingSummary = {
  id: string
  title: string
  date: string
  durationMinutes: number | null
  people: ContributorIdentity[]
  source: string
  reviewState: string
  summary: string
  requests: MeetingRequestLink[]
  decisions: MeetingDecision[]
  tasks: MeetingTask[]
  notes: string
  filePath: string
}

export type ProjectMeetingList = {
  project: DiscoveredProject
  meetings: MeetingSummary[]
  errors: RequestParseError[]
}
