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
import { Slider } from "@/components/ui/slider"
import { parseTaskmarkDate } from "@/lib/format-date"
import {
  DEFAULT_TIMEFRAME_FILTER,
  countCompletionsByDate,
  countCompletionsByIsoWeek,
  deriveYearWeekBounds,
  isTimeframeActive,
  isWeekRangeSelection,
  isoWeekCountKey,
  isoWeekParts,
  recentWeekRange,
  shiftIsoWeek,
  toDateOnlyString,
  weeksInIsoYear,
  type TimeframeFilterState,
} from "@/lib/taskmark/timeframe-filters"
import { cn } from "@/lib/utils"

type TimeframeFilterProps = {
  value: TimeframeFilterState
  onChange: (next: TimeframeFilterState) => void
  /** `completed_at` values for filter year/week bounds (list rows). */
  completedAts: readonly (string | null | undefined)[]
  /**
   * Solved dates for completion counts (stories + epic-direct tasks/bugs only).
   * Defaults to `completedAts` when omitted.
   */
  countableCompletedAts?: readonly (string | null | undefined)[]
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

function CompletionCount({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  if (count <= 0) {
    return <span className={cn("tabular-nums text-muted-foreground/40", className)}>—</span>
  }
  return (
    <span className={cn("tabular-nums text-muted-foreground", className)}>
      {count}
    </span>
  )
}

export function TimeframeFilter({
  value,
  onChange,
  completedAts,
  countableCompletedAts,
  id = "timeframe-filter",
  className,
}: TimeframeFilterProps) {
  const countSources = countableCompletedAts ?? completedAts
  const bounds = useMemo(
    () => deriveYearWeekBounds(completedAts),
    [completedAts]
  )
  const weekCounts = useMemo(
    () => countCompletionsByIsoWeek(countSources),
    [countSources]
  )
  const dayCounts = useMemo(
    () => countCompletionsByDate(countSources),
    [countSources]
  )

  const years = bounds.years
  const showYearSelect = years.length > 1
  const showWeekSlider = isWeekRangeSelection(value)

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

  function handleWeekSlider(values: number | readonly number[]) {
    const arr = Array.isArray(values) ? values : [values]
    if (arr.length < 2) return
    const [a, b] = arr
    activateWeeks(weekYear, a!, b!)
  }

  function handleSliderYearChange(next: string | null) {
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
    const count = dayCounts.get(key) ?? 0
    return (
      <CalendarDayButton
        {...props}
        className={cn(
          props.className,
          "h-auto min-h-(--cell-size) gap-0.5 py-1"
        )}
      >
        {props.children}
        {count > 0 ? (
          <span className="text-[9px] leading-none tabular-nums text-muted-foreground opacity-80">
            {count}
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
      {showWeekSlider ? (
        <>
          {showSliderYear ? (
            <Select
              value={String(weekYear)}
              onValueChange={handleSliderYearChange}
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

          <div className="flex w-[18rem] shrink-0 items-center gap-2 sm:w-[22rem]">
            <span
              className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
              aria-live="polite"
            >
              {formatWeekLabel(weekFrom, weekTo)}
            </span>
            <Slider
              id={`${id}-weeks`}
              className="min-w-0 flex-1"
              min={weekSpan.min}
              max={weekSpan.max}
              step={1}
              minStepsBetweenValues={1}
              value={[weekFrom, weekTo]}
              onValueChange={handleWeekSlider}
              aria-label="ISO week range"
            />
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
                  weekCounts.get(isoWeekCountKey(pickerYear, week)) ?? 0
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
                    <CompletionCount
                      count={count}
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
