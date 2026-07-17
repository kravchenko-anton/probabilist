import { useMemo, useRef, useState } from "react"
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react"
import { motion } from "motion/react"
import { ChevronsLeft, ChevronsRight, Flag } from "lucide-react"
import {
  addDays,
  formatDateRangeLabel,
  formatDuration,
  formatShortDate,
  formatWeekdayShort,
  startOfDay,
} from "@/lib/date"
import type { Goal } from "@/data/goals"
import { goalProgress, metricAggregation, metricProgress } from "@/data/goals"
import { activeTasks, type Attempt } from "@/data/attempts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface GoalProgressChartProps {
  goal: Goal
  attempts: Attempt[]
}

type RangeMode = "2w" | "all"

const MODE_OPTIONS: { value: RangeMode; label: string }[] = [
  { value: "2w", label: "2 weeks" },
  { value: "all", label: "Whole period" },
]

const WINDOW_DAYS: Record<RangeMode, number> = { "2w": 14, all: Infinity }

const DAY_MS = 86_400_000
/** Bar area height in px. */
const PLOT_H = 132
/** Headroom above the tallest bar where the hover tooltip lives. */
const TOP_PAD = 46
const CHART_H = PLOT_H + TOP_PAD
/** Every day keeps at least this fraction of the plot as a bar. */
const BASE_FRAC = 0.24
/** Bars on each side of the window that render small and gray (fade-out). */
const EDGE = 2
const EDGE_SCALE = [0.55, 0.75]
const BAR_EDGE = "rgba(244, 243, 242, 0.12)"

// Same visual language as the MetricRange slider: full-width bars in the
// active range, springs while dragging, dim idle track.
// Past days: green when something got done, red when nothing did.
// Future days: gray until they happen.
const BAR_DONE = "#A3C585"
const BAR_MISSED = "rgba(229, 100, 106, 0.45)"
const BAR_FUTURE = "rgba(244, 243, 242, 0.13)"
const DEADLINE_BG = "#E5646A"
const TODAY_BG = "#3FBFB2"

interface DayStat {
  done: number
  planned: number
  doneMinutes: number
  plannedMinutes: number
}

interface Slot {
  key: number
  start: Date
  /** Inclusive last day of the slot — equals `start` for single-day slots. */
  end: Date
  days: number
  done: number
  planned: number
  doneMinutes: number
  plannedMinutes: number
  isFuture: boolean
  isToday: boolean
  isPeriodEnd: boolean
  deadlines: string[]
}

function diffDays(a: Date, b: Date) {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS)
}

function buildDayStats(attempts: Attempt[]) {
  const stats = new Map<number, DayStat>()
  const at = (key: number) => {
    let entry = stats.get(key)
    if (!entry) {
      entry = { done: 0, planned: 0, doneMinutes: 0, plannedMinutes: 0 }
      stats.set(key, entry)
    }
    return entry
  }

  for (const attempt of attempts) {
    for (const task of activeTasks(attempt)) {
      if (task.done) {
        const when = task.completedAt ?? task.date
        if (!when) continue
        const entry = at(startOfDay(when).getTime())
        entry.done += 1
        entry.doneMinutes += task.actualMinutes ?? task.estimatedMinutes ?? 0
      } else if (task.date) {
        const entry = at(startOfDay(task.date).getTime())
        entry.planned += 1
        entry.plannedMinutes += task.estimatedMinutes ?? 0
      }
    }
  }
  return stats
}

function buildDeadlines(attempts: Attempt[]) {
  const deadlines = new Map<number, string[]>()
  for (const attempt of attempts) {
    if (attempt.status === "completed" || !attempt.deadline) continue
    const key = startOfDay(attempt.deadline).getTime()
    deadlines.set(key, [...(deadlines.get(key) ?? []), attempt.title])
  }
  return deadlines
}

/** Things-style completion pie — same as the Today/Tomorrow page header. */
function ProgressPie({ value }: { value: number }) {
  const r = 4.75
  const c = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, value))
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" className="shrink-0 text-primary">
      <circle cx="10" cy="10" r="8.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={r * 2}
        strokeDasharray={`${clamped * c} ${c}`}
        transform="rotate(-90 10 10)"
      />
    </svg>
  )
}

function formatMetricValue(value: number, unit?: string) {
  const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100
  const text = Math.abs(rounded) >= 10_000 ? rounded.toLocaleString("en-US") : `${rounded}`
  return unit ? `${text}${unit}` : text
}

export function GoalProgressChart({ goal, attempts }: GoalProgressChartProps) {
  const today = startOfDay(new Date())
  const goalStart = startOfDay(goal.startDate)
  const goalEnd = startOfDay(goal.endDate)
  const totalDays = Math.max(diffDays(goalEnd, goalStart) + 1, 1)

  const [mode, setMode] = useState<RangeMode>("2w")
  // Window start in slot index; null = "anchored at today" (the default).
  const [windowStart, setWindowStart] = useState<number | null>(null)
  const [hover, setHover] = useState<{ index: number; x: number } | null>(null)
  const [drag, setDrag] = useState<{ pos: number } | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ startX: 0, startWin: 0, slotPx: 1 })
  const lastTick = useRef<number | null>(null)

  // "Whole period" fits everything, so long goals bucket days together there;
  // the windowed modes always keep day granularity — you drag through days.
  const bucketDays = mode === "all" && totalDays > 60 ? Math.ceil(totalDays / 48) : 1

  const slots = useMemo<Slot[]>(() => {
    const stats = buildDayStats(attempts)
    const deadlines = buildDeadlines(attempts)
    const result: Slot[] = []

    for (let i = 0; i < totalDays; i += bucketDays) {
      const days = Math.min(bucketDays, totalDays - i)
      const start = addDays(goalStart, i)
      const end = addDays(start, days - 1)
      const slot: Slot = {
        key: start.getTime(),
        start,
        end,
        days,
        done: 0,
        planned: 0,
        doneMinutes: 0,
        plannedMinutes: 0,
        isFuture: start.getTime() > today.getTime(),
        isToday: start.getTime() <= today.getTime() && end.getTime() >= today.getTime(),
        isPeriodEnd: end.getTime() >= goalEnd.getTime(),
        deadlines: [],
      }
      for (let d = 0; d < days; d++) {
        const key = addDays(start, d).getTime()
        const stat = stats.get(key)
        if (stat) {
          slot.done += stat.done
          slot.planned += stat.planned
          slot.doneMinutes += stat.doneMinutes
          slot.plannedMinutes += stat.plannedMinutes
        }
        const due = deadlines.get(key)
        if (due) slot.deadlines.push(...due)
      }
      result.push(slot)
    }
    return result
  }, [attempts, totalDays, bucketDays, today.getTime(), goalStart.getTime(), goalEnd.getTime()])

  const slotCount = slots.length
  const windowLen =
    mode === "all"
      ? slotCount
      : Math.min(slotCount, Math.max(1, Math.round(WINDOW_DAYS[mode] / bucketDays)))
  const maxStart = slotCount - windowLen
  const isWindowed = mode !== "all" && windowLen < slotCount

  const todaySlot = Math.min(
    Math.max(Math.floor(diffDays(today, goalStart) / bucketDays), 0),
    slotCount - 1
  )
  // The window may slide EDGE slots past the goal boundaries onto empty
  // placeholder slots, so the first/last real days can sit in the active zone.
  const minStart = isWindowed ? -EDGE : 0
  const maxStartExt = isWindowed ? maxStart + EDGE : maxStart
  const winStart = Math.min(Math.max(windowStart ?? todaySlot - EDGE, minStart), maxStartExt)
  const winEnd = winStart + windowLen - 1
  const visible = Array.from({ length: windowLen }, (_, i) => {
    const idx = winStart + i
    return idx >= 0 && idx < slotCount ? slots[idx] : null
  })

  const slotValue = (slot: Slot) => (slot.isFuture ? slot.planned : slot.done)
  const dataMax = Math.max(...slots.map(slotValue), 0)
  const niceMax = Math.max(3, Math.ceil(dataMax / 3) * 3)
  const yTicks = [niceMax, (niceMax / 3) * 2, niceMax / 3, 0]

  function applyWindowStart(next: number) {
    const clamped = Math.min(Math.max(next, minStart), maxStartExt)
    if (clamped === winStart) return
    if (lastTick.current !== clamped) {
      lastTick.current = clamped
      try {
        navigator.vibrate?.(4)
      } catch {
        /* haptics unsupported */
      }
    }
    setWindowStart(clamped)
  }

  function trackPos(event: ReactPointerEvent) {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isWindowed) return
    if (event.button !== 0 && event.pointerType === "mouse") return
    event.preventDefault()
    const rect = trackRef.current!.getBoundingClientRect()
    dragState.current = {
      startX: event.clientX,
      startWin: winStart,
      slotPx: rect.width / windowLen,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setHover(null)
    setDrag({ pos: trackPos(event) })
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return
    const { startX, startWin, slotPx } = dragState.current
    // Dragging left pulls later days into the window, like scrolling.
    const delta = Math.round((startX - event.clientX) / slotPx)
    setDrag({ pos: trackPos(event) })
    applyWindowStart(startWin + delta)
  }

  function endDrag() {
    setDrag(null)
    lastTick.current = null
  }

  function onTrackKeyDown(event: ReactKeyboardEvent) {
    if (!isWindowed) return
    const dir =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : 0
    if (!dir) return
    event.preventDefault()
    applyWindowStart(winStart + dir)
  }

  function handleModeChange(next: RangeMode) {
    setMode(next)
    setWindowStart(null)
    setHover(null)
  }

  const rangeLabel = formatDateRangeLabel(
    slots[Math.max(winStart, 0)].start,
    slots[Math.min(winEnd, slotCount - 1)].end
  )
  const daysToStart = Math.max(0, winStart + EDGE) * bucketDays
  const daysToEnd = Math.max(0, slotCount - 1 - (winEnd - EDGE)) * bucketDays

  const tiles = useMemo(() => {
    if (goal.metrics.length > 0) {
      return goal.metrics.map((metric) => {
        const progress = Math.round(metricProgress(metric))
        const mode = metricAggregation(metric)
        return {
          key: metric.id,
          value: formatMetricValue(metric.currentValue, metric.unit),
          delta: `${progress}%`,
          positive: progress > 0,
          label: metric.name,
          hint: mode === "sum" ? "Adds up" : "Best",
        }
      })
    }
    const tasks = attempts.flatMap(activeTasks)
    const done = tasks.filter((task) => task.done)
    const minutes = done.reduce((sum, task) => sum + (task.actualMinutes ?? 0), 0)
    const daysLeft = Math.max(0, diffDays(goalEnd, today))
    return [
      { key: "tasks", value: `${done.length}/${tasks.length}`, delta: undefined, positive: false, label: "Tasks done", hint: undefined },
      { key: "time", value: formatDuration(minutes), delta: undefined, positive: false, label: "Time logged", hint: undefined },
      { key: "days", value: `${daysLeft}`, delta: undefined, positive: false, label: "Days left", hint: undefined },
    ]
  }, [goal.metrics, attempts, goalEnd.getTime(), today.getTime()])

  function showTooltip(index: number, target: HTMLElement) {
    const wrap = wrapRef.current
    if (!wrap || drag) return
    const rect = target.getBoundingClientRect()
    const wrapRect = wrap.getBoundingClientRect()
    const x = rect.left + rect.width / 2 - wrapRect.left
    setHover({ index, x: Math.min(Math.max(x, 76), wrapRect.width - 76) })
  }

  const hovered = hover ? visible[hover.index] : undefined
  const labelStep = isWindowed ? 1 : Math.max(1, Math.ceil(slotCount / 14))

  const edgeJump = (side: 0 | 1) => (
    <button
      type="button"
      onClick={() => applyWindowStart(side === 0 ? -EDGE : maxStart + EDGE)}
      disabled={side === 0 ? daysToStart === 0 : daysToEnd === 0}
      title={
        side === 0
          ? `Jump to start · ${formatShortDate(goalStart)}`
          : `Jump to deadline · ${formatShortDate(goalEnd)} (${daysToEnd}d away)`
      }
      className="flex w-7 shrink-0 items-center justify-center self-stretch rounded-lg text-muted-foreground transition-colors enabled:hover:bg-white/5 enabled:hover:text-foreground disabled:opacity-30"
    >
      {side === 0 ? <ChevronsLeft size={14} /> : <ChevronsRight size={14} />}
    </button>
  )

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-foreground">Progress</h2>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{rangeLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className="flex items-center gap-1.5"
            title="Overall goal progress"
          >
            <ProgressPie value={goalProgress(goal) / 100} />
            <span className="text-sm font-medium text-foreground tabular-nums">
              {Math.round(goalProgress(goal))}%
            </span>
          </div>
          <Select
            value={mode}
            onValueChange={(value) => handleModeChange(value as RangeMode)}
            items={MODE_OPTIONS}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false}>
              {MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        {tiles.map((tile) => (
          <div key={tile.key}>
            <div className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
              {tile.value}
            </div>
            <div className="text-xs text-muted-foreground">
              {tile.label}
              {tile.hint && (
                <>
                  {" · "}
                  <span className="text-muted-foreground/70">{tile.hint}</span>
                </>
              )}
              {tile.delta && (
                <>
                  {" · "}
                  <span
                    title="Progress toward target"
                    className={cn("font-medium", tile.positive && "text-emerald-400")}
                  >
                    {tile.delta}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div ref={wrapRef} className="relative mt-4 flex gap-1.5">
        {hovered && !drag && (
          <div
            className="pointer-events-none absolute top-0 z-20 -translate-x-1/2 rounded-lg bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md ring-1 ring-foreground/10"
            style={{ left: hover!.x }}
          >
            <div className="font-medium text-foreground">
              {hovered.isFuture
                ? `${hovered.planned} planned${hovered.plannedMinutes > 0 ? ` · ${formatDuration(hovered.plannedMinutes)}` : ""}`
                : `${hovered.done} done${hovered.doneMinutes > 0 ? ` · ${formatDuration(hovered.doneMinutes)}` : ""}`}
            </div>
            {!hovered.isFuture && hovered.planned > 0 && (
              <div className="text-muted-foreground">{hovered.planned} still planned</div>
            )}
            <div className="text-muted-foreground">
              {hovered.days === 1
                ? `${formatWeekdayShort(hovered.start)}, ${formatShortDate(hovered.start)}`
                : `${formatShortDate(hovered.start)} – ${formatShortDate(hovered.end)}`}
            </div>
            {hovered.isPeriodEnd && <div className="text-[#E58F93]">Goal deadline</div>}
            {hovered.deadlines.map((title) => (
              <div key={title} className="text-[#E58F93]">
                Deadline · {title}
              </div>
            ))}
          </div>
        )}

        <div className="relative w-6 shrink-0 select-none" style={{ height: CHART_H }}>
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 text-[10px] text-muted-foreground tabular-nums"
              style={{ top: TOP_PAD + (1 - tick / niceMax) * PLOT_H - 7 }}
            >
              {tick}
            </span>
          ))}
        </div>

        {isWindowed && edgeJump(0)}

        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: CHART_H }}>
            {yTicks.map((tick) => (
              <div
                key={tick}
                className={cn("absolute inset-x-0 h-px", tick === 0 ? "bg-white/12" : "bg-white/6")}
                style={{ top: TOP_PAD + (1 - tick / niceMax) * PLOT_H }}
              />
            ))}
          </div>

          <div
            ref={trackRef}
            role={isWindowed ? "slider" : undefined}
            tabIndex={isWindowed ? 0 : undefined}
            aria-label="Visible time window"
            aria-valuemin={0}
            aria-valuemax={maxStart}
            aria-valuenow={winStart}
            aria-valuetext={rangeLabel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onKeyDown={onTrackKeyDown}
            className={cn(
              "relative outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isWindowed && "touch-none",
              isWindowed && (drag ? "cursor-grabbing" : "cursor-grab")
            )}
          >
            <div
              className="flex items-end gap-1 sm:gap-1.5"
              style={{ height: CHART_H }}
              onPointerLeave={() => setHover(null)}
            >
              {visible.map((slot, index) => {
                const value = slot ? slotValue(slot) : 0
                // Zero days keep a gently varied floor — the MetricRange track
                // look. It stays below the first gridline so bars with data
                // always read taller. The wave follows the calendar day, so it
                // slides with the data while dragging.
                const dayIndex = winStart + index
                const floor = BASE_FRAC + 0.07 * Math.sin(dayIndex * 2.7 + 1.2)
                const heightFrac =
                  value === 0 ? floor : Math.max(value / niceMax, floor + 0.05)
                const center = (index + 0.5) / windowLen
                const boost = drag
                  ? 1 + 0.16 * Math.exp(-(((center - drag.pos) / 0.1) ** 2))
                  : 1
                // The window's outer bars taper off small and gray, so the
                // center reads as the active range.
                const fromEdge = Math.min(index, windowLen - 1 - index)
                const isEdge = isWindowed && fromEdge < EDGE
                const edgeScale = isEdge ? EDGE_SCALE[fromEdge] : 1
                // Placeholder slots outside the goal period: steady gray bars
                // that divide "before the start / after the deadline" from the
                // period itself.
                if (!slot) {
                  return (
                    <div
                      key={index}
                      className="flex h-full min-w-0 flex-1 items-end justify-center"
                    >
                      <div
                        className="w-full rounded-[4px]"
                        style={{ height: floor * 0.8 * PLOT_H, background: BAR_EDGE }}
                      />
                    </div>
                  )
                }
                const color = isEdge
                  ? BAR_EDGE
                  : slot.isFuture
                    ? BAR_FUTURE
                    : slot.done > 0
                      ? BAR_DONE
                      : slot.isToday
                        ? BAR_FUTURE
                        : BAR_MISSED
                const isStart = dayIndex === 0
                const isEnd = slot.isPeriodEnd
                return (
                  <div
                    key={index}
                    className="flex h-full min-w-0 flex-1 items-end justify-center"
                    onPointerEnter={
                      slot ? (event) => showTooltip(index, event.currentTarget) : undefined
                    }
                  >
                    <motion.div
                      initial={false}
                      animate={{
                        height: Math.min(PLOT_H, heightFrac * boost * edgeScale * PLOT_H),
                        backgroundColor: color,
                        filter:
                          hover?.index === index && !drag
                            ? "brightness(1.25)"
                            : "brightness(1)",
                      }}
                      transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
                      className="relative w-full rounded-[4px]"
                    >
                      {(isStart || isEnd) && (
                        <span
                          title={isStart ? "Goal start" : "Goal deadline"}
                          className="absolute top-1.5 left-1/2 -translate-x-1/2"
                        >
                          <Flag
                            size={9}
                            className={cn("shrink-0", isStart && "text-foreground/70")}
                            style={isStart ? undefined : { color: DEADLINE_BG }}
                          />
                        </span>
                      )}
                    </motion.div>
                  </div>
                )
              })}
            </div>

            <div className="mt-2 flex h-6 gap-1 sm:gap-1.5">
              {visible.map((slot, index) => {
                if (!slot) return <div key={index} className="relative min-w-0 flex-1" />
                const realIndex = winStart + index
                const isLast = realIndex === slotCount - 1
                // Bucketed view keeps a strict even rhythm — forced labels for
                // today/deadlines collide with the stepped ones (dots mark them
                // instead). Day view shows everything.
                const labelVisible =
                  labelStep === 1
                    ? true
                    : isLast ||
                      (realIndex % labelStep === 0 &&
                        slotCount - 1 - realIndex >= labelStep * 0.6)
                const label =
                  slot.days === 1
                    ? String(slot.start.getDate()).padStart(2, "0")
                    : formatShortDate(slot.start)
                const fromEdge = Math.min(index, windowLen - 1 - index)
                const isEdge = isWindowed && fromEdge < EDGE
                return (
                  <div
                    key={index}
                    className="relative flex min-w-0 flex-1 items-center justify-center"
                    onPointerEnter={(event) => showTooltip(index, event.currentTarget)}
                  >
                    {/* Labels sit out of flow so long dates never inflate the
                        track's minimum width and push the page sideways. */}
                    <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap">
                      {slot.isToday && slot.days === 1 ? (
                        <span
                          title="Today"
                          className="flex size-[21px] items-center justify-center rounded-full text-[10px] font-semibold text-[#10312C] tabular-nums"
                          style={{ background: TODAY_BG }}
                        >
                          {label}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "text-[11px] tabular-nums",
                            isEdge ? "text-muted-foreground/50" : "text-foreground/80",
                            slot.isToday && "font-semibold text-foreground",
                            !labelVisible && "invisible"
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </span>
                    {slot.deadlines.length > 0 && (
                      <span
                        title={slot.deadlines.join(", ")}
                        className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full"
                        style={{ background: DEADLINE_BG }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

          </div>
        </div>

        {isWindowed && edgeJump(1)}
      </div>

      <div className="mt-3.5 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: BAR_DONE }} />
          Tasks done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: BAR_MISSED }} />
          Missed day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: BAR_FUTURE }} />
          Upcoming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: DEADLINE_BG }} />
          Deadline
        </span>
        {isWindowed && (
          <span className="ml-auto hidden text-muted-foreground/70 sm:block">
            Drag to move through time
          </span>
        )}
      </div>
    </div>
  )
}
