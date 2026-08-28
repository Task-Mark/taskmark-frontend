"use client"

import type { ReactNode } from "react"

import { formatActualDuration, formatDurationMinutes } from "@/lib/format-duration"
import { formatTaskmarkDate } from "@/lib/format-date"
import type {
  ChecklistItem,
  CommitRow,
  EpicDetail,
  ItemDetail,
  PromptFeedbackRow,
  StoryDetail,
  WorkItemDetail,
  WorkItemMeta,
  WorkLogRow,
} from "@/lib/taskmark/detail-types"
import { StatusBadge, TypeBadge, PriorityBadge } from "@/components/board/status-badge"
import { AttributionPeopleList } from "@/components/board/attribution-avatars"
import { DetailChildrenList } from "@/components/board/detail-children-list"
import { MarkdownContent } from "@/components/board/markdown-content"
import { useWorkItemSheet } from "@/components/board/work-item-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

function RelatedItemButton({ itemId }: { itemId: string }) {
  const { openDetailById } = useWorkItemSheet()
  if (!itemId.trim()) return "—"
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto p-0 font-medium text-foreground underline-offset-2 hover:underline"
      onClick={() => openDetailById(itemId)}
    >
      {itemId}
    </Button>
  )
}

function MetaGrid({ detail }: { detail: WorkItemMeta }) {
  const rows: { label: string; value: ReactNode }[] = [
    { label: "Status", value: <StatusBadge status={detail.status} /> },
    { label: "Priority", value: <PriorityBadge priority={detail.priority} /> },
    {
      label: "Size",
      value: detail.size || "—",
    },
    {
      label: "Points",
      value: detail.points == null ? "—" : String(detail.points),
    },
    {
      label: "Est",
      value: formatDurationMinutes(detail.estimateMinutes),
    },
    {
      label: "Actual",
      value: formatActualDuration(detail.actualMs, detail.actualMinutes),
    },
    {
      label: "Parent",
      value: detail.parent ? <RelatedItemButton itemId={detail.parent} /> : "—",
    },
    {
      label: "Epic",
      value: detail.epic ? <RelatedItemButton itemId={detail.epic} /> : "—",
    },
    { label: "Owner", value: detail.owner || "—" },
    { label: "Created", value: formatTaskmarkDate(detail.created) },
    { label: "Updated", value: formatTaskmarkDate(detail.updated) },
    { label: "Started", value: formatTaskmarkDate(detail.startedAt) },
    { label: "Completed", value: formatTaskmarkDate(detail.completedAt) },
  ]

  return (
    <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="mt-0.5 font-medium break-words">{row.value}</dd>
        </div>
      ))}
      {detail.tags.length > 0 ? (
        <div className="col-span-full">
          <dt className="text-xs text-muted-foreground">Tags</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {detail.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </dd>
        </div>
      ) : null}
      <div className="col-span-full mt-1">
        <AttributionPeopleList
          reporters={detail.reporters}
          resolvers={detail.resolvers}
          empty={null}
        />
      </div>
    </dl>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-2">
      <h3 className="font-head text-sm font-semibold tracking-tight">{title}</h3>
      <div className="w-full min-w-0">{children}</div>
    </section>
  )
}

function ProseBlock({ text }: { text: string }) {
  return <MarkdownContent text={text} />
}

function Checklist({ items, raw }: { items: ChecklistItem[]; raw: string }) {
  if (items.length === 0) {
    if (!raw.trim()) {
      return <p className="text-sm text-muted-foreground">None noted.</p>
    }
    return <ProseBlock text={raw} />
  }
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {items.map((item, i) => (
        <li key={`${i}:${item.text}`} className="flex gap-2">
          <span
            aria-hidden
            className={
              item.checked
                ? "mt-0.5 size-4 shrink-0 rounded border-2 border-black bg-[var(--chart-4)]"
                : "mt-0.5 size-4 shrink-0 rounded border-2 border-black bg-card"
            }
          />
          <span
            className={
              item.checked
                ? "min-w-0 flex-1 text-muted-foreground line-through"
                : "min-w-0 flex-1"
            }
          >
            <MarkdownContent text={item.text} inline />
          </span>
        </li>
      ))}
    </ul>
  )
}

function CommitsTable({ rows }: { rows: CommitRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No commits logged.</p>
  }
  const showLeaf = rows.some((row) => row.leafId)
  return (
    <div className="w-full overflow-x-auto rounded border-2 border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 font-head">
          <tr>
            <th className="px-2 py-1.5">SHA</th>
            <th className="px-2 py-1.5">Repo</th>
            <th className="px-2 py-1.5">Date</th>
            <th className="px-2 py-1.5">Author</th>
            <th className="px-2 py-1.5">Message</th>
            {showLeaf ? <th className="px-2 py-1.5">Leaf</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.sha}:${i}`} className="border-t border-border">
              <td className="px-2 py-1.5 font-mono">{row.sha || "—"}</td>
              <td className="px-2 py-1.5">{row.repo || "—"}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">
                {formatTaskmarkDate(row.date)}
              </td>
              <td className="px-2 py-1.5">{row.author || "—"}</td>
              <td className="px-2 py-1.5">{row.message || "—"}</td>
              {showLeaf ? (
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <RelatedItemButton itemId={row.leafId ?? ""} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WorkLogTable({ rows }: { rows: WorkLogRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No work sessions logged.</p>
  }
  const showLeaf = rows.some((row) => row.leafId)
  return (
    <div className="w-full overflow-x-auto rounded border-2 border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 font-head">
          <tr>
            <th className="px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">Actor</th>
            <th className="px-2 py-1.5">Started</th>
            <th className="px-2 py-1.5">Ended</th>
            <th className="px-2 py-1.5">Summary</th>
            {showLeaf ? <th className="px-2 py-1.5">Leaf</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.session}:${i}`} className="border-t border-border">
              <td className="px-2 py-1.5 font-mono">{row.session || "—"}</td>
              <td className="px-2 py-1.5">{row.actor || "—"}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">
                {formatTaskmarkDate(row.started)}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap">
                {formatTaskmarkDate(row.ended)}
              </td>
              <td className="px-2 py-1.5">{row.summary || "—"}</td>
              {showLeaf ? (
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <RelatedItemButton itemId={row.leafId ?? ""} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PromptTable({ rows }: { rows: PromptFeedbackRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No prompts logged.</p>
  }
  const showLeaf = rows.some((row) => row.leafId)
  return (
    <div className="w-full overflow-x-auto rounded border-2 border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 font-head">
          <tr>
            <th className="px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">When</th>
            <th className="px-2 py-1.5">Kind</th>
            <th className="px-2 py-1.5">Author</th>
            <th className="px-2 py-1.5">Summary</th>
            {showLeaf ? <th className="px-2 py-1.5">Leaf</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.index}:${i}`} className="border-t border-border">
              <td className="px-2 py-1.5 font-mono">{row.index || "—"}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">
                {formatTaskmarkDate(row.when)}
              </td>
              <td className="px-2 py-1.5">{row.kind || "—"}</td>
              <td className="px-2 py-1.5">{row.author || "—"}</td>
              <td className="px-2 py-1.5">{row.summary || "—"}</td>
              {showLeaf ? (
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <RelatedItemButton itemId={row.leafId ?? ""} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EpicDetailBody({ detail }: { detail: EpicDetail }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <MetaGrid detail={detail} />
      <Separator />
      <Section title="Goal">
        <ProseBlock text={detail.goal} />
      </Section>
      <Section title="Scope">
        <ProseBlock text={detail.scope} />
      </Section>
      <Section title="Out of scope">
        <ProseBlock text={detail.outOfScope} />
      </Section>
      <Section title="Success metrics">
        <ProseBlock text={detail.successMetrics} />
      </Section>
      <Section title="Stories & tasks">
        <DetailChildrenList
          childrenItems={detail.children}
          emptyLabel="No stories or epic-direct tasks yet."
        />
      </Section>
      <Section title="Prompt & feedback">
        <PromptTable rows={detail.promptFeedback} />
      </Section>
      <Section title="Commits">
        <CommitsTable rows={detail.commits} />
      </Section>
      <Section title="Work log">
        <WorkLogTable rows={detail.workLog} />
      </Section>
    </div>
  )
}

function StoryDetailBody({ detail }: { detail: StoryDetail }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <MetaGrid detail={detail} />
      <Separator />
      <Section title="User story">
        <ProseBlock text={detail.userStory} />
      </Section>
      <Section title="Acceptance criteria">
        <Checklist
          items={detail.acceptanceCriteria}
          raw={detail.acceptanceCriteriaRaw}
        />
      </Section>
      <Section title="Tasks">
        <DetailChildrenList
          childrenItems={detail.children}
          emptyLabel="No tasks or bugs under this story yet."
        />
      </Section>
      <Section title="Prompt & feedback">
        <PromptTable rows={detail.promptFeedback} />
      </Section>
      <Section title="Commits">
        <CommitsTable rows={detail.commits} />
      </Section>
      <Section title="Work log">
        <WorkLogTable rows={detail.workLog} />
      </Section>
    </div>
  )
}

function ItemDetailBody({ detail }: { detail: ItemDetail }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <MetaGrid detail={detail} />
      <Separator />
      <Section title="Description">
        <ProseBlock text={detail.description} />
      </Section>
      {detail.type === "bug" ? (
        <>
          <Section title="Repro steps">
            <ProseBlock text={detail.reproSteps} />
          </Section>
          <Section title="Fix criteria">
            <Checklist
              items={detail.acceptanceCriteria}
              raw={detail.fixCriteria || detail.acceptanceCriteriaRaw}
            />
          </Section>
        </>
      ) : (
        <Section title="Acceptance criteria">
          <Checklist
            items={detail.acceptanceCriteria}
            raw={detail.acceptanceCriteriaRaw}
          />
        </Section>
      )}
      <Section title="Notes">
        <ProseBlock text={detail.notes} />
      </Section>
      <Section title="Prompt & feedback">
        <PromptTable rows={detail.promptFeedback} />
      </Section>
      <Section title="Commits">
        <CommitsTable rows={detail.commits} />
      </Section>
      <Section title="Work log">
        <WorkLogTable rows={detail.workLog} />
      </Section>
    </div>
  )
}

export function WorkItemDetailBody({ detail }: { detail: WorkItemDetail }) {
  if (detail.type === "epic") return <EpicDetailBody detail={detail} />
  if (detail.type === "story") return <StoryDetailBody detail={detail} />
  return <ItemDetailBody detail={detail} />
}

export function WorkItemDetailHeaderBadges({
  detail,
}: {
  detail: WorkItemDetail
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <TypeBadge type={detail.type} />
      <StatusBadge status={detail.status} />
    </div>
  )
}
