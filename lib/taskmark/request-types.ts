/**
 * Request, meeting and request-tree types live in `@taskmark/components` so
 * the snapshot, the live board and the UI share one shape. See
 * `board-model/request-types.ts` there.
 */
export {
  MEETING_RELATIONS,
  REQUEST_LOG_KINDS,
  REQUEST_STATUSES,
} from "@taskmark/components/board-model"
export type {
  MeetingDecision,
  MeetingRequestLink,
  MeetingSummary,
  MeetingTask,
  MeetingTaskStatus,
  ProjectMeetingList,
  ProjectRequestList,
  RequestBoardData,
  RequestDetail,
  RequestEpic,
  RequestLeaf,
  RequestLink,
  RequestLogEntry,
  RequestLogKind,
  RequestParseError,
  RequestStatus,
  RequestStory,
  RequestSummary,
} from "@taskmark/components/board-model"
