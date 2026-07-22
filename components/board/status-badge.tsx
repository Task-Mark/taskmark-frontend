import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function formatStatusLabel(status: string): string {
  return status.replaceAll("_", " ")
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "done":
      return "border-black bg-[var(--chart-4)] text-black"
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
