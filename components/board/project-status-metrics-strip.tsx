import {
  CalendarDays,
  CheckSquare,
  Gauge as GaugeIcon,
  Users,
} from "lucide-react"

import { MetricStatCard } from "@/components/board/metric-stat-card"
import { ProjectContributorsPanel } from "@/components/board/project-contributors-panel"
import { VelocityGauge } from "@/components/board/velocity-gauge"
import {
  formatCompactNumber,
  formatExactNumber,
} from "@/lib/format-compact-number"
import {
  formatSpeedPtsPerWeek,
  type ProjectStatusMetrics,
} from "@/lib/taskmark/project-metrics-shared"

type ProjectStatusMetricsStripProps = {
  metrics: ProjectStatusMetrics
}

function completeWorkItemsValue(metrics: ProjectStatusMetrics): string {
  return `${formatCompactNumber(metrics.totalWorkItems)}/${formatCompactNumber(metrics.completeWorkItems)}`
}

function completeWorkItemsExact(metrics: ProjectStatusMetrics): string {
  return `${formatExactNumber(metrics.totalWorkItems)}/${formatExactNumber(metrics.completeWorkItems)}`
}

function velocitySubtitle(metrics: ProjectStatusMetrics): string {
  if (
    metrics.currentSpeedPtsPerWeek == null ||
    metrics.peakSpeedPtsPerWeek == null ||
    metrics.peakSpeedWeekLabel == null
  ) {
    return "No completed points yet"
  }
  return `Peak ${formatSpeedPtsPerWeek(metrics.peakSpeedPtsPerWeek)} pts/week in ${metrics.peakSpeedWeekLabel}`
}

function velocitySubtitleExact(metrics: ProjectStatusMetrics): string | undefined {
  if (
    metrics.currentSpeedPtsPerWeek == null ||
    metrics.peakSpeedPtsPerWeek == null ||
    metrics.peakSpeedWeekLabel == null
  ) {
    return undefined
  }
  return `Peak ${formatExactNumber(Math.round(metrics.peakSpeedPtsPerWeek))} pts/week in ${metrics.peakSpeedWeekLabel}`
}

export function ProjectStatusMetricsStrip({
  metrics,
}: ProjectStatusMetricsStripProps) {
  return (
    <section
      className="flex flex-col gap-4"
      aria-label="Project status metrics"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricStatCard
          title="Complete work items"
          value={
            <span
              aria-label={completeWorkItemsExact(metrics)}
              title={completeWorkItemsExact(metrics)}
            >
              {completeWorkItemsValue(metrics)}
            </span>
          }
          subtitle="Stories, bugs, and tasks"
          accentClassName="bg-pink-400"
          icon={<CheckSquare className="size-4" strokeWidth={2.5} />}
        />
        <MetricStatCard
          title="Current week"
          value={
            <span
              aria-label={formatExactNumber(metrics.currentWeekPointsDone)}
              title={formatExactNumber(metrics.currentWeekPointsDone)}
            >
              {formatCompactNumber(metrics.currentWeekPointsDone)}
            </span>
          }
          subtitle={
            metrics.currentWeekPointsDone > 0
              ? "pts done this ISO week"
              : "No completed points this week"
          }
          accentClassName="bg-emerald-400"
          icon={<CalendarDays className="size-4" strokeWidth={2.5} />}
        />
        <div className="flex min-h-[7.5rem] flex-col justify-between gap-2 border-2 border-black bg-card p-4 shadow-none sm:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-card-foreground">Velocity</p>
            <div
              className="flex size-9 shrink-0 items-center justify-center border-2 border-black bg-[#C4A1FF] text-black shadow-[3px_3px_0_0_var(--shadow-color)]"
              aria-hidden
            >
              <GaugeIcon className="size-4" strokeWidth={2.5} />
            </div>
          </div>
          <VelocityGauge
            currentPtsPerWeek={metrics.currentSpeedPtsPerWeek}
            peakPtsPerWeek={metrics.peakSpeedPtsPerWeek}
          />
          <p
            className="text-xs text-muted-foreground"
            title={velocitySubtitleExact(metrics)}
          >
            {velocitySubtitle(metrics)}
          </p>
        </div>
      </div>

      <div className="border-2 border-black bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex size-8 items-center justify-center border-2 border-black bg-amber-300 text-black shadow-[3px_3px_0_0_var(--shadow-color)]"
            aria-hidden
          >
            <Users className="size-4" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-card-foreground">
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
