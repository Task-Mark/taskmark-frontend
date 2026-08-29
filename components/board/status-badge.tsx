import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function formatStatusLabel(status: string): string {
  return status.replaceAll("_", " ")
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "done":
      return "border-black bg-[var(--chart-4)] text-black"
    case "shelved":
      return "border-black border-dashed bg-[var(--chart-2)]/45 text-foreground"
    case "in_progress":
      return "border-black bg-[var(--chart-1)] text-black"
    case "blocked":
      return "border-black bg-destructive text-destructive-foreground"
    case "cancelled":
      return "border-black bg-muted text-muted-foreground line-through"
    case "backlog":
      return "border-black bg-[var(--chart-3)] text-black"
    default:
      return "border-black bg-card text-foreground"
  }
}

export function statusRowClass(status: string): string | undefined {
  return status.trim().toLowerCase() === "shelved"
    ? "bg-[var(--chart-2)]/10 text-muted-foreground"
    : undefined
}

export function typeBadgeClass(type: string): string {
  if (type === "bug") {
    return "border-black bg-destructive/15 text-destructive"
  }
  if (type === "epic") {
    return "border-black bg-[var(--chart-1)]/40 text-black"
  }
  if (type === "story") {
    return "border-black bg-[var(--chart-3)]/50 text-black"
  }
  return "border-black bg-[var(--chart-2)] text-black"
}

export function formatPriorityLabel(priority: string): string {
  return priority.replaceAll("_", " ")
}

export function priorityBadgeClass(priority: string): string {
  switch (priority.toLowerCase()) {
    case "critical":
      return "border-black bg-destructive text-destructive-foreground"
    case "high":
      return "border-black bg-[var(--chart-1)] text-black"
    case "medium":
      return "border-black bg-[var(--chart-3)] text-black"
    case "low":
      return "border-black bg-muted text-muted-foreground"
    default:
      return "border-black bg-card text-foreground"
  }
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn(statusBadgeClass(status))}>
      {formatStatusLabel(status)}
    </Badge>
  )
}

export function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className={cn(typeBadgeClass(type))}>
      {type}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", priorityBadgeClass(priority))}
    >
      {formatPriorityLabel(priority)}
    </Badge>
  )
}
