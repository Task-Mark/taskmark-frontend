"use client"

import { Gauge } from "@/components/charts/gauge"
import {
  COMPACT_INTEGER_FORMAT_OPTIONS,
  COMPACT_NUMBER_LOCALES,
  formatExactNumber,
} from "@/lib/format-compact-number"
import { cn } from "@/lib/utils"

type VelocityGaugeProps = {
  currentPtsPerWeek: number | null
  peakPtsPerWeek: number | null
  className?: string
}

/**
 * Bklit notch gauge (linear track): fill is current/peak × 100, label is Current Speed.
 * The arc orientation scales on min(width, height), so it cannot stay short in a
 * metrics-strip card. Retro colors live on this wrapper only.
 */
export function VelocityGauge({
  currentPtsPerWeek,
  peakPtsPerWeek,
  className,
}: VelocityGaugeProps) {
  const hasSpeed =
    currentPtsPerWeek != null &&
    peakPtsPerWeek != null &&
    peakPtsPerWeek > 0 &&
    Number.isFinite(currentPtsPerWeek) &&
    Number.isFinite(peakPtsPerWeek)

  const fill = hasSpeed
    ? Math.min(100, Math.max(0, (currentPtsPerWeek / peakPtsPerWeek) * 100))
    : 0

  const displaySpeed =
    hasSpeed && currentPtsPerWeek != null ? Math.round(currentPtsPerWeek) : null

  const exactSpeed =
    displaySpeed != null
      ? `${formatExactNumber(displaySpeed)} pts / week`
      : undefined

  return (
    <div
      aria-label={exactSpeed}
      className={cn(
        "velocity-gauge min-w-0 w-full",
        "[&_.font-bold]:font-head",
        "[&_.text-chart-label]:text-muted-foreground",
        className
      )}
      title={exactSpeed}
    >
      <Gauge
        orientation="linear"
        value={fill}
        centerValue={displaySpeed ?? undefined}
        defaultLabel="pts / week"
        labelPlacement="top"
        labelAlign="start"
        linearHeight={18}
        minWidth={120}
        totalNotches={40}
        spacing={20}
        uniformWidth
        notchCornerRadius={0}
        useGradient
        activeGradient={["#EADFFE", "#C4A1FF"]}
        inactiveFill="#EADFFE"
        inactiveFillOpacity={0.55}
        locales={COMPACT_NUMBER_LOCALES}
        formatOptions={COMPACT_INTEGER_FORMAT_OPTIONS}
      />
    </div>
  )
}
