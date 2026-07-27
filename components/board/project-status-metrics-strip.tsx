import {
  CalendarDays,
  CheckSquare,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react"

import { MetricStatCard } from "@/components/board/metric-stat-card"
import { ProjectContributorsPanel } from "@/components/board/project-contributors-panel"
import type { ProjectStatusMetrics } from "@/lib/taskmark/project-metrics"
import { formatSpeedPtsPerWeek } from "@/lib/taskmark/project-metrics"

type ProjectStatusMetricsStripProps = {
  metrics: ProjectStatusMetrics
}

export function ProjectStatusMetricsStrip({
  metrics,
}: ProjectStatusMetricsStripProps) {
  const speedLabel = formatSpeedPtsPerWeek(metrics.currentSpeedPtsPerWeek)

  return (
    <section
      className="flex flex-col gap-4"
      aria-label="Project status metrics"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricStatCard
          title="Total work items"
          value={metrics.totalWorkItems}
          subtitle="Stories, bugs, and tasks"
          accentClassName="bg-violet-400"
          icon={<Layers className="size-4" strokeWidth={2.5} />}
        />
        <MetricStatCard
          title="Complete work items"
          value={metrics.completeWorkItems}
          subtitle="Status done"
          accentClassName="bg-pink-400"
          icon={<CheckSquare className="size-4" strokeWidth={2.5} />}
        />
        <MetricStatCard
          title="Current week"
          value={metrics.currentWeekPointsDone}
          subtitle={
            metrics.currentWeekPointsDone > 0
              ? "pts done this ISO week"
              : "No completed points this week"
          }
          accentClassName="bg-emerald-400"
          icon={<CalendarDays className="size-4" strokeWidth={2.5} />}
        />
        <MetricStatCard
          title="Current speed"
          value={speedLabel}
          subtitle={
            metrics.currentSpeedPtsPerWeek == null
              ? "No completed tasks yet"
              : `pts/week · ${metrics.speedWeekCount} active weeks (90d)`
          }
          accentClassName="bg-sky-400"
          icon={<TrendingUp className="size-4" strokeWidth={2.5} />}
        />
      </div>

      <div className="border-2 border-black bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex size-8 items-center justify-center border-2 border-black bg-amber-300 text-black shadow-[3px_3px_0_0_#000]"
            aria-hidden
          >
            <Users className="size-4" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-800">
              Contributors
            </h2>
            <p className="text-xs text-muted-foreground">
              People who reported or resolved work on this board
            </p>
          </div>
        </div>
        <ProjectContributorsPanel contributors={metrics.contributors} />
      </div>
    </section>
  )
}
