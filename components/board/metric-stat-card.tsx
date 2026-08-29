import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type MetricStatCardProps = {
  title: string
  value: ReactNode
  subtitle?: ReactNode
  icon: ReactNode
  /** Tailwind background class for the icon square (e.g. bg-violet-400). */
  accentClassName: string
  className?: string
}

/**
 * Neo-brutalism metric card: title, large value, accent icon with hard black shadow.
 */
export function MetricStatCard({
  title,
  value,
  subtitle,
  icon,
  accentClassName,
  className,
}: MetricStatCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-[7.5rem] flex-col justify-between gap-3 border-2 border-black bg-card p-4 shadow-none",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-card-foreground">{title}</p>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center border-2 border-black text-black shadow-[3px_3px_0_0_var(--shadow-color)]",
            accentClassName
          )}
          aria-hidden
        >
          {icon}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-head text-3xl font-bold leading-none tracking-tight text-card-foreground tabular-nums sm:text-4xl">
          {value}
        </p>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}
