"use client"

import { AttributionAvatarGroup } from "@/components/board/attribution-avatars"
import { ChildProgressCount } from "@/components/board/child-progress-bar"
import {
  IdCreatedTooltip,
  SizeWithPointsTooltip,
  StatusWithSolvedTooltip,
} from "@/components/board/date-tooltip"
import { ParentTagBadge } from "@/components/board/parent-tag-badge"
import {
  PriorityBadge,
  statusRowClass,
  TypeBadge,
} from "@/components/board/status-badge"
import { ViewWorkItemButton } from "@/components/board/work-item-sheet"
import type { WorkItemRef } from "@/lib/taskmark/detail-types"
import type { ContributorIdentity } from "@/lib/taskmark/identity"
import { cn } from "@/lib/utils"

type MobileWorkItemRowProps = {
  id: string
  title: string
  created: string | null | undefined
  kind: string
  status: string
  completedAt?: string | null
  size: string | null | undefined
  points: number | null | undefined
  reporters: ContributorIdentity[]
  resolvers: ContributorIdentity[]
  priority?: string
  epicId?: string
  epicTitle?: string
  workItemCount?: number
  doneWorkItemCount?: number
  itemRef: WorkItemRef
  className?: string
}

export function MobileWorkItemRow({
  id,
  title,
  created,
  kind,
  status,
  completedAt,
  size,
  points,
  reporters,
  resolvers,
  priority,
  epicId,
  epicTitle,
  workItemCount = 0,
  doneWorkItemCount = 0,
  itemRef,
  className,
}: MobileWorkItemRowProps) {
  const showProgress =
    (kind === "story" || kind === "epic") && workItemCount > 0

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b px-2 py-2 last:border-b-0",
        statusRowClass(status),
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-x-2">
          {epicId ? (
            <span className="shrink-0">
              <ParentTagBadge id={epicId} title={epicTitle ?? epicId} />
            </span>
          ) : null}
          <p
            className="min-w-0 flex-1 truncate font-medium leading-snug"
            title={title}
          >
            {title}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
          <IdCreatedTooltip id={id} created={created} />
          <TypeBadge type={kind} />
          <SizeWithPointsTooltip size={size} points={points} />
          <AttributionAvatarGroup reporters={reporters} resolvers={resolvers} />
          {priority ? <PriorityBadge priority={priority} /> : null}
          {showProgress ? (
            <ChildProgressCount
              done={doneWorkItemCount}
              total={workItemCount}
            />
          ) : (
            <StatusWithSolvedTooltip status={status} solvedAt={completedAt} />
          )}
        </div>
      </div>
      <ViewWorkItemButton itemRef={itemRef} className="size-8 shrink-0" />
    </div>
  )
}
