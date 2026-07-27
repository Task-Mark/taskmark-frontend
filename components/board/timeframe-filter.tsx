"use client"

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react"
import {
  endOfISOWeek,
  format,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
} from "date-fns"
import type { DateRange, DayButton } from "react-day-picker"
import { CalendarIcon, CalendarRangeIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { parseTaskmarkDate } from "@/lib/format-date"
import {
  DEFAULT_TIMEFRAME_FILTER,
  deriveYearWeekBounds,
  isTimeframeActive,
  isWeekRangeSelection,
  isoWeekCountKey,
  isoWeekParts,
  recentWeekRange,
  shiftIsoWeek,
  sumPointsByDate,
  sumPointsByIsoWeek,
  toDateOnlyString,
  weeksInIsoYear,
  type SolvedCompletionSample,
  type TimeframeFilterState,
} from "@/lib/taskmark/timeframe-filters"
import { cn } from "@/lib/utils"

type TimeframeFilterProps = {
  value: TimeframeFilterState
  onChange: (next: TimeframeFilterState) => void
  /** `completed_at` values for filter year/week bounds (list rows). */
  completedAts: readonly (string | null | undefined)[]
  /**
   * Solved items for story-point badges (stories + epic-direct tasks/bugs).
   * Defaults to `completedAts` with 0 points when omitted.
   */
  countableCompletions?: readonly SolvedCompletionSample[]
  id?: string
  className?: string
}

function formatWeekLabel(from: number, to: number): string {
  const a = Math.min(from, to)
  const b = Math.max(from, to)
  return a === b ? `W${a}` : `W${a}–W${b}`
}

function isoWeekDateSpan(
  year: number,
  week: number
): { start: Date; end: Date } {
  let date = new Date(year, 0, 4)
  date = setISOWeekYear(date, year)
  date = setISOWeek(date, week)
  return { start: startOfISOWeek(date), end: endOfISOWeek(date) }
}

const compactPointsFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
})

function formatCompactPoints(points: number): string {
  return compactPointsFormatter.format(points)
}

function PointsBadge({
  points,
  className,
}: {
  points: number
  className?: string
}) {
  if (points <= 0) {
    return <span className={cn("tabular-nums text-muted-foreground/40", className)}>—</span>
  }
  return (
    <span className={cn("tabular-nums text-muted-foreground", className)}>
      {formatCompactPoints(points)}
    </span>
  )
}

export function TimeframeFilter({
  value,
  onChange,
  completedAts,
  countableCompletions,
  id = "timeframe-filter",
  className,
}: TimeframeFilterProps) {
  const pointSamples = useMemo((): SolvedCompletionSample[] => {
    if (countableCompletions) return [...countableCompletions]
    return completedAts.map((completedAt) => ({ completedAt, points: 0 }))
  }, [countableCompletions, completedAts])
  const bounds = useMemo(
    () => deriveYearWeekBounds(completedAts),
    [completedAts]
  )
  const weekPoints = useMemo(
    () => sumPointsByIsoWeek(pointSamples),
    [pointSamples]
  )
  const dayPoints = useMemo(
    () => sumPointsByDate(pointSamples),
    [pointSamples]
  )

  const years = bounds.years
  const showYearSelect = years.length > 1
  const showWeekRange = isWeekRangeSelection(value)

  const todayParts = useMemo(() => recentWeekRange(), [])
  const currentWeek = useMemo(() => isoWeekParts(new Date()), [])
  const previousWeek = useMemo(
    () => shiftIsoWeek(currentWeek.year, currentWeek.week, -1),
    [currentWeek.year, currentWeek.week]
  )
  const nextWeek = useMemo(
    () => shiftIsoWeek(currentWeek.year, currentWeek.week, 1),
    [currentWeek.year, currentWeek.week]
  )
  const pickerDefaultYear =
    years.length > 0 ? years[years.length - 1]! : todayParts.year

  const [pickerYear, setPickerYear] = useState(pickerDefaultYear)
  const [weekPopoverOpen, setWeekPopoverOpen] = useState(false)
  const currentWeekButtonRef = useRef<HTMLButtonElement>(null)

  const yearOptions = years.length > 0 ? years : [todayParts.year]
  const weekYear = value.mode === "weeks" ? value.year : pickerYear
  const showSliderYear = yearOptions.length > 1

  useEffect(() => {
    if (!weekPopoverOpen) return
    if (pickerYear !== currentWeek.year) return
    const frame = requestAnimationFrame(() => {
      const el = currentWeekButtonRef.current
      if (!el) return
      el.scrollIntoView({ block: "center", inline: "nearest" })
      el.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [weekPopoverOpen, pickerYear, currentWeek.year])

  const weekSpan = useMemo(() => {
    const max = weeksInIsoYear(weekYear)
    return { min: 1, max }
  }, [weekYear])

  const weekFrom =
    value.mode === "weeks"
      ? Math.min(value.weekFrom, value.weekTo)
      : todayParts.weekFrom
  const weekTo =
    value.mode === "weeks"
      ? Math.max(value.weekFrom, value.weekTo)
      : todayParts.weekTo

  const weeksInPickerYear = weeksInIsoYear(pickerYear)

  const rangeSelected: DateRange | undefined =
    value.mode === "range"
      ? {
          from: parseTaskmarkDate(value.from) ?? undefined,
          to: parseTaskmarkDate(value.to) ?? undefined,
        }
      : undefined

  const [rangeDraft, setRangeDraft] = useState<DateRange | undefined>()
  const calendarSelected =
    value.mode === "range" ? rangeSelected : rangeDraft

  const active = isTimeframeActive(value)
  const singleWeekActive =
    value.mode === "weeks" && value.weekFrom === value.weekTo

  function activateWeeks(year: number, from: number, to: number) {
    onChange({
      mode: "weeks",
      year,
      weekFrom: Math.min(from, to),
      weekTo: Math.max(from, to),
    })
  }

  function handlePickWeek(week: number) {
    activateWeeks(pickerYear, week, week)
    setWeekPopoverOpen(false)
  }

  function handlePickCurrentWeek() {
    activateWeeks(currentWeek.year, currentWeek.week, currentWeek.week)
    setPickerYear(currentWeek.year)
    setWeekPopoverOpen(false)
  }

  function handleEnableWeekRange() {
    const recent = recentWeekRange()
    const year = yearOptions.includes(recent.year)
      ? recent.year
      : pickerYear
    const max = weeksInIsoYear(year)
    let weekTo = Math.min(recent.weekTo, max)
    let weekFrom = Math.max(1, Math.min(recent.weekFrom, weekTo))
    if (weekFrom === weekTo) {
      weekFrom = weekTo > 1 ? weekTo - 1 : weekTo
      weekTo = weekFrom === weekTo && weekTo < max ? weekTo + 1 : weekTo
    }
    activateWeeks(year, weekFrom, weekTo)
    setPickerYear(year)
    setWeekPopoverOpen(false)
  }

  function handleWeekFromChange(next: string | null) {
    if (next == null) return
    const from = Number(next)
    if (!Number.isFinite(from)) return
    const to = Math.max(from, weekTo)
    activateWeeks(weekYear, from, to)
  }

  function handleWeekToChange(next: string | null) {
    if (next == null) return
    const to = Number(next)
    if (!Number.isFinite(to)) return
    const from = Math.min(weekFrom, to)
    activateWeeks(weekYear, from, to)
  }

  function handleRangeYearChange(next: string | null) {
    if (next == null) return
    const year = Number(next)
    if (!Number.isFinite(year)) return
    const max = weeksInIsoYear(year)
    const from = Math.min(weekFrom, max)
    const to = Math.min(weekTo, max)
    if (from === to && to > 1) {
      activateWeeks(year, to - 1, to)
    } else if (from === to && to < max) {
      activateWeeks(year, to, to + 1)
    } else {
      activateWeeks(year, from, to)
    }
  }

  function handleRangeSelect(range: DateRange | undefined) {
    setRangeDraft(range)
    if (!range?.from || !range.to) return
    onChange({
      mode: "range",
      from: toDateOnlyString(range.from),
      to: toDateOnlyString(range.to),
    })
  }

  function handleClear() {
    setRangeDraft(undefined)
    onChange(DEFAULT_TIMEFRAME_FILTER)
  }

  const weekAriaLabel = singleWeekActive
    ? `ISO week ${formatWeekLabel(weekFrom, weekTo)} ${weekYear}`
    : "Filter by solved ISO week"

  const dateAriaLabel =
    value.mode === "range" && rangeSelected?.from && rangeSelected?.to
      ? `Date range ${format(rangeSelected.from, "MMM d")} – ${format(rangeSelected.to, "MMM d, yyyy")}`
      : "Filter by solved date range"

  function DayButtonWithCount(props: ComponentProps<typeof DayButton>) {
    const key = toDateOnlyString(props.day.date)
    const points = dayPoints.get(key) ?? 0
    return (
      <CalendarDayButton
        {...props}
        className={cn(
          props.className,
          "h-auto min-h-(--cell-size) gap-0.5 py-1"
        )}
      >
        {props.children}
        {points > 0 ? (
          <span
            className="text-[9px] leading-none tabular-nums text-muted-foreground opacity-80"
            title={`${points} story point${points === 1 ? "" : "s"}`}
          >
            {formatCompactPoints(points)}
          </span>
        ) : (
          <span className="text-[9px] leading-none opacity-0">0</span>
        )}
      </CalendarDayButton>
    )
  }

  return (
    <div
      className={cn("flex flex-nowrap items-center gap-2", className)}
      role="group"
      aria-label="Solved timeframe"
    >
      {showWeekRange ? (
        <>
          {showSliderYear ? (
            <Select
              value={String(weekYear)}
              onValueChange={handleRangeYearChange}
            >
              <SelectTrigger
                id={`${id}-year`}
                size="sm"
                className="h-8 min-w-[4.75rem]"
                aria-label="ISO week year"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <div
            className="inline-flex h-8 shrink-0 items-center overflow-hidden rounded border-2 border-black bg-input shadow-sm"
            role="group"
            aria-label="ISO week range"
          >
            <Select
              value={String(weekFrom)}
              onValueChange={handleWeekFromChange}
            >
              <SelectTrigger
                id={`${id}-week-from`}
                size="sm"
                className="h-full min-w-[4.25rem] rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                aria-label="From ISO week"
              >
                <SelectValue>
                  {(value: string | null) =>
                    value != null ? `W${value}` : "From"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: weekSpan.max }, (_, i) => {
                  const week = i + 1
                  return (
                    <SelectItem
                      key={week}
                      value={String(week)}
                      disabled={week > weekTo}
                    >
                      W{week}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <span
              className="shrink-0 px-0.5 font-mono text-xs text-muted-foreground"
              aria-hidden
            >
              –
            </span>
            <Select value={String(weekTo)} onValueChange={handleWeekToChange}>
              <SelectTrigger
                id={`${id}-week-to`}
                size="sm"
                className="h-full min-w-[4.25rem] rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                aria-label="To ISO week"
              >
                <SelectValue>
                  {(value: string | null) =>
                    value != null ? `W${value}` : "To"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: weekSpan.max }, (_, i) => {
                  const week = i + 1
                  return (
                    <SelectItem
                      key={week}
                      value={String(week)}
                      disabled={week < weekFrom}
                    >
                      W{week}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <Popover
          open={weekPopoverOpen}
          onOpenChange={(open) => {
            setWeekPopoverOpen(open)
            if (open) setPickerYear(currentWeek.year)
          }}
        >
          <PopoverTrigger
            render={
              <Button
                id={`${id}-weeks-picker`}
                type="button"
                variant="outline"
                size="icon-sm"
                className={cn(
                  "shrink-0",
                  singleWeekActive && "border-primary"
                )}
                aria-label={weekAriaLabel}
                title={weekAriaLabel}
              />
            }
          >
            <CalendarRangeIcon className="size-3.5 opacity-70" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 gap-0 p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Week
              </span>
              {showYearSelect ? (
                <Select
                  value={String(pickerYear)}
                  onValueChange={(next) => {
                    if (next == null) return
                    const year = Number(next)
                    if (Number.isFinite(year)) setPickerYear(year)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-7 min-w-[4.5rem]"
                    aria-label="ISO week year"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {pickerYear}
                </span>
              )}
            </div>

            <div
              className="max-h-56 overflow-y-auto p-1"
              role="listbox"
              aria-label={`ISO weeks in ${pickerYear}`}
            >
              {Array.from({ length: weeksInPickerYear }, (_, i) => {
                const week = i + 1
                const { start, end } = isoWeekDateSpan(pickerYear, week)
                const selected =
                  value.mode === "weeks" &&
                  value.year === pickerYear &&
                  value.weekFrom === week &&
                  value.weekTo === week
                const isCurrent =
                  pickerYear === currentWeek.year && week === currentWeek.week
                const isPrevious =
                  pickerYear === previousWeek.year &&
                  week === previousWeek.week
                const isNext =
                  pickerYear === nextWeek.year && week === nextWeek.week
                const nearbyLabel = isCurrent
                  ? "Now"
                  : isPrevious
                    ? "Prev"
                    : isNext
                      ? "Next"
                      : null
                const count =
                  weekPoints.get(isoWeekCountKey(pickerYear, week)) ?? 0
                const observed = bounds.weeksByYear[pickerYear]
                const hasData = Boolean(
                  observed && week >= observed.min && week <= observed.max
                )
                return (
                  <button
                    key={week}
                    ref={isCurrent ? currentWeekButtonRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-current={isCurrent ? "date" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                      selected && "bg-accent text-accent-foreground",
                      !hasData &&
                        !isPrevious &&
                        !isCurrent &&
                        !isNext &&
                        "text-muted-foreground"
                    )}
                    onClick={() => handlePickWeek(week)}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="font-mono text-xs tabular-nums">
                        W{week}
                      </span>
                      {nearbyLabel ? (
                        <span className="rounded bg-primary/15 px-1 py-px text-[10px] font-medium tracking-wide text-primary uppercase">
                          {nearbyLabel}
                        </span>
                      ) : null}
                      <span className="truncate text-xs text-muted-foreground">
                        {format(start, "MMM d")} – {format(end, "MMM d")}
                      </span>
                    </span>
                    <PointsBadge
                      points={count}
                      className="shrink-0 text-xs"
                    />
                  </button>
                )
              })}
            </div>

            <Separator />
            <div className="flex flex-col gap-0.5 p-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-start font-normal"
                onClick={() => {
                  activateWeeks(
                    previousWeek.year,
                    previousWeek.week,
                    previousWeek.week
                  )
                  setPickerYear(previousWeek.year)
                  setWeekPopoverOpen(false)
                }}
              >
                Previous week
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  W{previousWeek.week}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-start font-normal"
                onClick={handlePickCurrentWeek}
              >
                This week
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  W{currentWeek.week}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-start font-normal"
                onClick={() => {
                  activateWeeks(nextWeek.year, nextWeek.week, nextWeek.week)
                  setPickerYear(nextWeek.year)
                  setWeekPopoverOpen(false)
                }}
              >
                Next week
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  W{nextWeek.week}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-start font-normal"
                onClick={handleEnableWeekRange}
              >
                Select week range…
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Popover
        onOpenChange={(open) => {
          if (open && value.mode !== "range") {
            setRangeDraft(undefined)
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              id={`${id}-dates`}
              type="button"
              variant="outline"
              size="icon-sm"
              className={cn(
                "shrink-0",
                value.mode === "range" && "border-primary"
              )}
              aria-label={dateAriaLabel}
              title={dateAriaLabel}
            />
          }
        >
          <CalendarIcon className="size-3.5 opacity-70" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={calendarSelected}
            onSelect={handleRangeSelect}
            defaultMonth={calendarSelected?.from ?? calendarSelected?.to}
            className="[--cell-size:--spacing(9)]"
            components={{
              DayButton: DayButtonWithCount,
            }}
          />
        </PopoverContent>
      </Popover>

      {active ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground"
          onClick={handleClear}
          aria-label="Clear timeframe filter"
          title="Clear timeframe"
        >
          <XIcon className="size-3.5" />
        </Button>
      ) : null}
    </div>
  )
}
