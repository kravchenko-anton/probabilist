import { Emoji } from "@/components/ui/emoji"
import { formatMetricValue as formatMetric } from "@/components/ui/metric-range"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  activeTasks,
  classifyOutcome,
  metricDirection,
  type Attempt,
  type OutcomeInfo,
} from "@/data/attempts"
import type { Goal } from "@/data/goals"
import { goalProgress, metricAggregation, metricProgress } from "@/data/goals"
import {
  addDays,
  formatDateRangeLabel,
  formatDuration,
  formatShortDate,
  startOfDay
} from "@/lib/date"
import { useIsMobile } from "@/hooks/use-mobile"
import { metricColor } from "@/lib/metric-colors"
import { cn } from "@/lib/utils"
import { ChevronsLeft, ChevronsRight, Flag } from "lucide-react"
import { animate, motion } from "motion/react"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react"
import { useEffect, useMemo, useRef, useState } from "react"

interface GoalProgressChartProps {
  goal: Goal
  attempts: Attempt[]
  /** When set, the chart scrolls so this experiment’s day is active. */
  selectedAttemptId?: string
  onSelectAttempt?: (attemptId: string) => void
}

type RangeMode = "2w" | "all"

const MODE_OPTIONS: { value: RangeMode; label: string }[] = [
  { value: "2w", label: "2 weeks" },
  { value: "all", label: "Whole period" },
]

const WINDOW_DAYS: Record<RangeMode, number> = { "2w": 14, all: Infinity }

const DAY_MS = 86_400_000
const PLOT_H = 132
const TOP_PAD = 52
const CHART_H = PLOT_H + TOP_PAD
/** Quiet / gray floor — keep low so empty days stay visually light. */
const BASE_FRAC = 0.11
const ACTIVE_FLOOR = 0.2
const EDGE = 2
const EDGE_SCALE = [0.55, 0.75]
const BAR_EDGE = "rgba(245, 245, 247, 0.1)"
const BAR_DONE = "#30D158"
const BAR_MISSED = "rgba(255, 69, 58, 0.4)"
const BAR_FUTURE = "rgba(245, 245, 247, 0.12)"
const DEADLINE_BG = "#FF453A"
const TODAY_BG = "#0A84FF"
const PREDICT_BG = "#64D2FF"

/** Apple-style momentum projection (slots or px — keep units consistent). */
function project(velocity: number, decelerationRate = 0.995) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/** Soft resistance past an edge — feels alive instead of hitting a wall. */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  )
}

function constrainScroll(value: number, min: number, max: number) {
  if (value < min) return min - rubberband(min - value, 2.5)
  if (value > max) return max + rubberband(value - max, 2.5)
  return value
}

type EventKind = "completed" | "started" | "due" | "task-done"

interface DayEvent {
  id: string
  attemptId: string
  title: string
  icon?: string
  kind: EventKind
  taskTitle?: string
  attempt: Attempt
}

interface DayStat {
  done: number
  planned: number
  doneMinutes: number
  plannedMinutes: number
  events: DayEvent[]
}

interface Slot {
  key: number
  start: Date
  end: Date
  days: number
  done: number
  planned: number
  doneMinutes: number
  plannedMinutes: number
  isFuture: boolean
  isToday: boolean
  isPeriodEnd: boolean
  events: DayEvent[]
}

function diffDays(a: Date, b: Date) {
  return Math.round(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS,
  )
}

function buildDayStats(attempts: Attempt[]): Map<number, DayStat> {
  const stats = new Map<number, DayStat>()
  const at = (key: number) => {
    let entry = stats.get(key)
    if (!entry) {
      entry = {
        done: 0,
        planned: 0,
        doneMinutes: 0,
        plannedMinutes: 0,
        events: [],
      }
      stats.set(key, entry)
    }
    return entry
  }

  for (const attempt of attempts) {
    const tasks = activeTasks(attempt)

    if (attempt.startedAt) {
      const entry = at(startOfDay(attempt.startedAt).getTime())
      entry.events.push({
        id: `${attempt.id}-started`,
        attemptId: attempt.id,
        title: attempt.title,
        icon: attempt.icon,
        kind: "started",
        attempt,
      })
    }

    if (attempt.completedAt) {
      const entry = at(startOfDay(attempt.completedAt).getTime())
      // Tiny experiments: the completion itself is the win on the bar.
      // Standard ones are counted via their steps below.
      if (tasks.length === 0) entry.done += 1
      entry.events.push({
        id: `${attempt.id}-completed`,
        attemptId: attempt.id,
        title: attempt.title,
        icon: attempt.icon,
        kind: "completed",
        attempt,
      })
    } else if (attempt.deadline && attempt.status !== "completed") {
      const entry = at(startOfDay(attempt.deadline).getTime())
      entry.planned += 1
      entry.events.push({
        id: `${attempt.id}-due`,
        attemptId: attempt.id,
        title: attempt.title,
        icon: attempt.icon,
        kind: "due",
        attempt,
      })
    }

    for (const task of tasks) {
      if (task.done) {
        const when = task.completedAt ?? task.date
        if (!when) continue
        const entry = at(startOfDay(when).getTime())
        entry.done += 1
        entry.doneMinutes += task.actualMinutes ?? task.estimatedMinutes ?? 0
        entry.events.push({
          id: `${attempt.id}-task-${task.id}`,
          attemptId: attempt.id,
          title: attempt.title,
          icon: attempt.icon,
          kind: "task-done",
          taskTitle: task.title,
          attempt,
        })
      } else if (task.date) {
        const entry = at(startOfDay(task.date).getTime())
        entry.planned += 1
        entry.plannedMinutes += task.estimatedMinutes ?? 0
      }
    }
  }

  return stats
}

function ProgressPie({ value }: { value: number }) {
  const size = 36
  const stroke = 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, value))
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(245,245,247,0.12)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#0A84FF"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${clamped * c} ${c}`}
        className="transition-[stroke-dasharray] duration-500 ease-out"
      />
    </svg>
  )
}

function formatMetricValue(value: number, unit?: string) {
  const rounded = Number.isInteger(value)
    ? value
    : Math.round(value * 100) / 100
  const text =
    Math.abs(rounded) >= 10_000 ? rounded.toLocaleString("en-US") : `${rounded}`
  return unit ? `${text}${unit}` : text
}

function uniqueAttempts(events: DayEvent[]) {
  const seen = new Set<string>()
  const list: Attempt[] = []
  for (const event of events) {
    if (seen.has(event.attemptId)) continue
    seen.add(event.attemptId)
    list.push(event.attempt)
  }
  return list
}

function attemptRingColor(events: DayEvent[], attemptId: string) {
  const kinds = new Set(
    events.filter((e) => e.attemptId === attemptId).map((e) => e.kind),
  )
  if (kinds.has("completed")) return BAR_DONE
  if (kinds.has("started")) return PREDICT_BG
  if (kinds.has("due")) return DEADLINE_BG
  return "rgba(245, 245, 247, 0.35)"
}

function ExperimentChips({
  events,
  attempts,
}: {
  events: DayEvent[]
  attempts: Attempt[]
}) {
  const shown = attempts.slice(0, 3)
  const extra = attempts.length - shown.length
  return (
    <span className="flex items-center drop-shadow-sm">
      {shown.map((attempt, i) => (
        <span
          key={attempt.id}
          className="relative flex size-5 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm"
          style={{
            marginLeft: i === 0 ? 0 : -7,
            zIndex: shown.length - i,
            boxShadow: `0 0 0 1.5px ${attemptRingColor(events, attempt.id)}`,
          }}
        >
          <Emoji value={attempt.icon ?? "🧪"} className="size-2.5" />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="relative flex size-5 items-center justify-center rounded-full bg-black/65 text-[8px] font-semibold text-white"
          style={{ marginLeft: -7, zIndex: 0 }}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}

/** Icons inside the bar — decorative; the active-day panel below is the menu. */
function ExperimentDayStack({ events }: { events: DayEvent[] }) {
  const attempts = uniqueAttempts(events)
  if (attempts.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1 z-10 flex justify-center">
      <ExperimentChips events={events} attempts={attempts} />
    </div>
  )
}

function PredictionOutcomeLine({
  goal,
  attempt,
}: {
  goal: Goal
  attempt: Attempt
}) {
  if (attempt.predictions.length === 0 && attempt.results.length === 0) {
    return (
      <p className="text-tiny text-default-400">No prediction yet</p>
    )
  }

  const rows = goal.metrics
    .map((metric, index) => {
      const prediction = attempt.predictions.find((p) => p.metricId === metric.id)
      const result = attempt.results.find((r) => r.metricId === metric.id)
      if (!prediction && result === undefined) return null
      let outcome: OutcomeInfo | null = null
      if (prediction && result !== undefined) {
        outcome = classifyOutcome(
          prediction,
          result.value,
          metricDirection(metric),
        )
      }
      return (
        <div
          key={metric.id}
          className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-tiny"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: metricColor(index) }}
            />
            <span className="truncate text-default-500">{metric.name}</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 tabular-nums">
            {prediction && (
              <span className="text-default-400">
                {formatMetric(prediction.worst)}–
                {formatMetric(prediction.acceptable)}–
                {formatMetric(prediction.best)}
              </span>
            )}
            {result !== undefined && (
              <>
                <span className="text-default-400">→</span>
                <span className="font-medium text-foreground">
                  {formatMetricValue(result.value, metric.unit)}
                </span>
              </>
            )}
            {outcome && (
              <span className={cn("font-medium", outcome.className)}>
                {outcome.short}
              </span>
            )}
          </span>
        </div>
      )
    })
    .filter(Boolean)

  if (rows.length === 0) {
    return (
      <p className="text-tiny text-default-400">No prediction yet</p>
    )
  }

  return <div className="flex flex-col gap-1.5">{rows}</div>
}

const REWARD_LINES = [
  "Nice — you made real progress.",
  "Great work. That counts.",
  "You showed up. Keep going.",
  "Another win on the board.",
]

/** Best calendar day to show for an experiment on the progress strip. */
function attemptFocusDate(attempt: Attempt): Date {
  if (attempt.completedAt) return attempt.completedAt
  if (attempt.startedAt) return attempt.startedAt
  if (attempt.deadline) return attempt.deadline
  return attempt.createdAt
}

export function GoalProgressChart({
  goal,
  attempts,
  selectedAttemptId,
  onSelectAttempt,
}: GoalProgressChartProps) {
  const isMobile = useIsMobile()
  const today = startOfDay(new Date())
  const goalStart = startOfDay(goal.startDate)
  const goalEnd = startOfDay(goal.endDate)
  const totalDays = Math.max(diffDays(goalEnd, goalStart) + 1, 1)
  const progress = goalProgress(goal)

  const [mode, setMode] = useState<RangeMode>("2w")
  /** Continuous window offset in slot units — fractional while dragging / coasting. */
  const [scroll, setScroll] = useState<number | null>(null)
  const [drag, setDrag] = useState<{ pos: number } | null>(null)
  const [coasting, setCoasting] = useState(false)
  const [reward, setReward] = useState<string | null>(null)
  const prevActivity = useRef<number | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef(0)
  const dragState = useRef({
    startX: 0,
    startScroll: 0,
    slotPx: 1,
    pointerId: -1,
    /** True only after movement crosses the drag threshold. */
    dragging: false,
    /** Visible column under the finger at pointer-down (tap → scroll that day to center). */
    tapIndex: null as number | null,
  })
  const velocitySamples = useRef<{ t: number; x: number }[]>([])
  const lastTick = useRef<number | null>(null)
  const scrollAnim = useRef<ReturnType<typeof animate> | null>(null)
  const prevFocusAttempt = useRef<string | undefined>(undefined)
  const isFirstFocusEffect = useRef(true)
  const DRAG_THRESHOLD_PX = 12

  const bucketDays =
    mode === "all" && totalDays > 60 ? Math.ceil(totalDays / 48) : 1

  const slots = useMemo<Slot[]>(() => {
    const stats = buildDayStats(attempts)
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
        isToday:
          start.getTime() <= today.getTime() && end.getTime() >= today.getTime(),
        isPeriodEnd: end.getTime() >= goalEnd.getTime(),
        events: [],
      }
      for (let d = 0; d < days; d++) {
        const key = addDays(start, d).getTime()
        const stat = stats.get(key)
        if (stat) {
          slot.done += stat.done
          slot.planned += stat.planned
          slot.doneMinutes += stat.doneMinutes
          slot.plannedMinutes += stat.plannedMinutes
          slot.events.push(...stat.events)
        }
      }
      result.push(slot)
    }
    return result
  }, [
    attempts,
    totalDays,
    bucketDays,
    today.getTime(),
    goalStart.getTime(),
    goalEnd.getTime(),
  ])

  const totalWins = useMemo(
    () =>
      attempts.filter((a) => a.status === "completed").length +
      attempts.flatMap(activeTasks).filter((t) => t.done).length,
    [attempts],
  )

  // Celebrate when activity goes up (task done / experiment completed).
  useEffect(() => {
    if (prevActivity.current === null) {
      prevActivity.current = totalWins
      return
    }
    if (totalWins > prevActivity.current) {
      const line =
        REWARD_LINES[Math.floor(Math.random() * REWARD_LINES.length)] ??
        REWARD_LINES[0]
      setReward(line)
      const t = window.setTimeout(() => setReward(null), 3200)
      prevActivity.current = totalWins
      return () => window.clearTimeout(t)
    }
    prevActivity.current = totalWins
  }, [totalWins])

  const slotCount = slots.length
  // Mobile: show fewer days so bars/labels stay readable; still scroll the range.
  const mobileWindowDays = mode === "2w" ? 7 : WINDOW_DAYS[mode]
  const visibleDays =
    isMobile && mode !== "all" ? mobileWindowDays : WINDOW_DAYS[mode]
  const windowLen =
    mode === "all"
      ? slotCount
      : Math.min(
          slotCount,
          Math.max(1, Math.round(visibleDays / bucketDays)),
        )
  const maxStart = slotCount - windowLen
  const isWindowed = mode !== "all" && windowLen < slotCount

  const todaySlot = Math.min(
    Math.max(Math.floor(diffDays(today, goalStart) / bucketDays), 0),
    slotCount - 1,
  )
  // Allow the first and last days to sit in the center (active) position.
  const centerOffset = (windowLen - 1) / 2
  const minStart = isWindowed ? -centerOffset : 0
  const maxStartExt = isWindowed
    ? Math.max(minStart, slotCount - 1 - centerOffset)
    : maxStart
  // Start with today in the center so one day is active immediately.
  const defaultScroll = Math.min(
    Math.max(todaySlot - centerOffset, minStart),
    maxStartExt,
  )
  const scrollValue = scroll ?? defaultScroll
  scrollRef.current = scrollValue

  // Integer base for labels / pinning; fractional part drives the glide.
  const winStart = Math.floor(scrollValue)
  const scrollFrac = scrollValue - winStart

  // One extra column so fractional scroll can peek the next day.
  const stripCount = isWindowed ? windowLen + 1 : windowLen
  const visible = Array.from({ length: stripCount }, (_, i) => {
    const idx = winStart + i
    return idx >= 0 && idx < slotCount ? slots[idx] : null
  })

  const slotValue = (slot: Slot) => (slot.isFuture ? slot.planned : slot.done)
  const dataMax = Math.max(...slots.map(slotValue), 0)
  const niceMax = Math.max(3, Math.ceil(dataMax / 3) * 3)
  const yTicks = [niceMax, (niceMax / 3) * 2, niceMax / 3, 0]

  function tickHaptic(next: number) {
    // Tick when the active (center) day changes, not the window start.
    const tick = Math.round(next + centerOffset)
    if (lastTick.current !== tick) {
      lastTick.current = tick
      try {
        navigator.vibrate?.(5)
      } catch {
        /* haptics unsupported */
      }
    }
  }

  function stopScrollAnim() {
    scrollAnim.current?.stop()
    scrollAnim.current = null
    setCoasting(false)
  }

  function setScrollImmediate(next: number) {
    scrollRef.current = next
    setScroll(next)
    tickHaptic(next)
  }

  function springScrollTo(target: number, velocitySlots = 0) {
    stopScrollAnim()
    const from = scrollRef.current
    const clamped = Math.min(Math.max(target, minStart), maxStartExt)
    if (Math.abs(from - clamped) < 0.001 && Math.abs(velocitySlots) < 0.05) {
      setScrollImmediate(clamped)
      return
    }
    setCoasting(true)
    const flick = Math.abs(velocitySlots) > 1.2
    scrollAnim.current = animate(from, clamped, {
      type: "spring",
      // Emotional settle: a little bounce only when the gesture threw it.
      bounce: flick ? 0.22 : 0.06,
      duration: flick ? 0.65 : 0.45,
      velocity: velocitySlots,
      onUpdate: (v: number) => {
        scrollRef.current = v
        setScroll(v)
        tickHaptic(v)
      },
      onComplete: () => {
        setScrollImmediate(clamped)
        setCoasting(false)
        scrollAnim.current = null
        lastTick.current = null
      },
    })
  }

  function trackPos(event: ReactPointerEvent) {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  }

  function dayIndexFromClientX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return null
    const ratio = (clientX - rect.left) / rect.width
    const index = Math.floor(ratio * windowLen)
    if (index < 0 || index >= windowLen) return null
    return index
  }

  /** Scroll position that puts this slot in the center (active) position. */
  function scrollForActive(slotIndex: number) {
    const clamped = Math.min(Math.max(slotIndex, 0), Math.max(slotCount - 1, 0))
    return Math.min(Math.max(clamped - centerOffset, minStart), maxStartExt)
  }

  /** Scroll so this absolute slot index sits in the center (active) position. */
  function scrollDayToCenter(slotIndex: number, velocity = 0) {
    springScrollTo(scrollForActive(slotIndex), velocity)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isWindowed) return
    if (event.button !== 0 && event.pointerType === "mouse") return
    // Don't preventDefault / capture yet — wait until this is a real drag.
    const rect = trackRef.current!.getBoundingClientRect()
    dragState.current = {
      startX: event.clientX,
      startScroll: scrollRef.current,
      slotPx: rect.width / windowLen,
      pointerId: event.pointerId,
      dragging: false,
      tapIndex: dayIndexFromClientX(event.clientX),
    }
    velocitySamples.current = [{ t: performance.now(), x: event.clientX }]
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragState.current.pointerId !== event.pointerId) return
    const { startX, startScroll, slotPx, dragging } = dragState.current
    const dx = Math.abs(event.clientX - startX)

    if (!dragging) {
      if (dx < DRAG_THRESHOLD_PX) return
      dragState.current.dragging = true
      dragState.current.tapIndex = null
      stopScrollAnim()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        /* already captured */
      }
      setDrag({ pos: trackPos(event) })
    }

    const now = performance.now()
    velocitySamples.current.push({ t: now, x: event.clientX })
    if (velocitySamples.current.length > 6) velocitySamples.current.shift()

    const raw = startScroll + (startX - event.clientX) / slotPx
    const next = constrainScroll(raw, minStart, maxStartExt)
    setDrag({ pos: trackPos(event) })
    setScrollImmediate(next)
  }

  function endDrag(event?: ReactPointerEvent<HTMLDivElement>) {
    const { dragging, tapIndex, slotPx, pointerId } = dragState.current
    if (pointerId < 0) return

    if (!dragging) {
      // Tap a day → bring it to center (active). No pin/pick mode.
      if (tapIndex !== null) {
        const slotIndex = Math.floor(scrollRef.current) + tapIndex
        scrollDayToCenter(slotIndex, 0)
      } else {
        const current = scrollRef.current
        const settled = scrollForActive(
          Math.round(current + centerOffset),
        )
        if (Math.abs(current - settled) > 0.08) {
          springScrollTo(settled, 0)
        }
      }
      dragState.current.pointerId = -1
      dragState.current.tapIndex = null
      velocitySamples.current = []
      lastTick.current = null
      return
    }

    setDrag(null)

    const samples = velocitySamples.current
    let velocityPx = 0
    if (samples.length >= 2) {
      const first = samples[0]
      const last = samples[samples.length - 1]
      const dt = last.t - first.t
      if (dt > 0) velocityPx = ((last.x - first.x) / dt) * 1000
    }
    velocitySamples.current = []
    dragState.current.pointerId = -1
    dragState.current.dragging = false

    const velocitySlots = -velocityPx / Math.max(slotPx, 1)
    const current = scrollRef.current
    const projected = current + project(velocitySlots)
    const targetActive = Math.min(
      Math.max(Math.round(projected + centerOffset), 0),
      Math.max(slotCount - 1, 0),
    )
    springScrollTo(scrollForActive(targetActive), velocitySlots)

    if (event) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        /* not captured */
      }
    }
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
    const active = Math.round(scrollRef.current + centerOffset)
    springScrollTo(scrollForActive(active + dir), dir * 2.5)
  }

  function handleModeChange(next: RangeMode) {
    stopScrollAnim()
    setMode(next)
    setScroll(null)
  }

  const selectedAttempt = selectedAttemptId
    ? attempts.find((a) => a.id === selectedAttemptId)
    : undefined
  const focusSlotIndex = selectedAttempt
    ? Math.min(
        Math.max(
          Math.floor(
            diffDays(startOfDay(attemptFocusDate(selectedAttempt)), goalStart) /
              bucketDays,
          ),
          0,
        ),
        Math.max(slotCount - 1, 0),
      )
    : null

  // Open on today; only jump when the user later picks a different experiment.
  useEffect(() => {
    if (isFirstFocusEffect.current) {
      isFirstFocusEffect.current = false
      prevFocusAttempt.current = selectedAttemptId
      return
    }
    if (!selectedAttemptId || focusSlotIndex === null) {
      prevFocusAttempt.current = selectedAttemptId
      return
    }
    if (prevFocusAttempt.current === selectedAttemptId) return
    prevFocusAttempt.current = selectedAttemptId
    if (isWindowed) {
      scrollDayToCenter(focusSlotIndex, 0)
    }
  }, [selectedAttemptId, focusSlotIndex, isWindowed])

  const labelStart = Math.max(winStart, 0)
  const labelEnd = Math.min(winStart + windowLen - 1, slotCount - 1)
  const rangeLabel = formatDateRangeLabel(
    slots[labelStart]?.start ?? goalStart,
    slots[labelEnd]?.end ?? goalEnd,
  )
  const tiles = useMemo(() => {
    if (goal.metrics.length > 0) {
      return goal.metrics.map((metric) => {
        const pct = Math.round(metricProgress(metric))
        const agg = metricAggregation(metric)
        return {
          key: metric.id,
          value: formatMetricValue(metric.currentValue, metric.unit),
          delta: `${pct}%`,
          positive: pct > 0,
          label: metric.name,
          hint: agg === "sum" ? "Adds up" : "Best",
        }
      })
    }
    const tasks = attempts.flatMap(activeTasks)
    const done = tasks.filter((task) => task.done)
    const minutes = done.reduce(
      (sum, task) => sum + (task.actualMinutes ?? 0),
      0,
    )
    const daysLeft = Math.max(0, diffDays(goalEnd, today))
    return [
      {
        key: "tasks",
        value: `${done.length}/${tasks.length}`,
        delta: undefined,
        positive: false,
        label: "Steps done",
        hint: undefined,
      },
      {
        key: "time",
        value: formatDuration(minutes),
        delta: undefined,
        positive: false,
        label: "Time logged",
        hint: undefined,
      },
      {
        key: "days",
        value: `${daysLeft}`,
        delta: undefined,
        positive: false,
        label: "Days left",
        hint: undefined,
      },
    ]
  }, [goal.metrics, attempts, goalEnd.getTime(), today.getTime()])

  // One day is always active: center of the scroll window; whole-period
  // follows the selected experiment’s day when set, otherwise today.
  const activeSlotIndex = isWindowed
    ? Math.min(
        Math.max(Math.round(scrollValue + centerOffset), 0),
        Math.max(slotCount - 1, 0),
      )
    : (focusSlotIndex ?? todaySlot)
  const activeDay =
    activeSlotIndex >= 0 && activeSlotIndex < slotCount
      ? slots[activeSlotIndex]
      : undefined
  const activeAttempts = activeDay ? uniqueAttempts(activeDay.events) : []
  const labelStep = isWindowed ? 1 : Math.max(1, Math.ceil(slotCount / 14))
  const daysToStart = activeSlotIndex * bucketDays
  const daysToEnd = Math.max(0, slotCount - 1 - activeSlotIndex) * bucketDays

  const runningCount = attempts.filter((a) => a.status === "active").length

  const edgeJump = (side: 0 | 1) => (
    <button
      type="button"
      onClick={() =>
        springScrollTo(
          side === 0 ? minStart : maxStartExt,
          side === 0 ? -4 : 4,
        )
      }
      disabled={side === 0 ? daysToStart === 0 : daysToEnd === 0}
      title={
        side === 0
          ? `Jump to start · ${formatShortDate(goalStart)}`
          : `Jump to deadline · ${formatShortDate(goalEnd)} (${daysToEnd}d away)`
      }
      className="hidden w-7 shrink-0 items-center justify-center self-stretch rounded-large text-default-500 transition-colors duration-200 enabled:hover:bg-white/5 enabled:hover:text-foreground disabled:opacity-30 sm:flex"
    >
      {side === 0 ? <ChevronsLeft size={15} /> : <ChevronsRight size={15} />}
    </button>
  )

  return (
    <div className="w-full min-w-0 rounded-large bg-content1 px-3 py-4 ring-1 ring-foreground/8 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-large font-medium tracking-tight text-foreground">
              Progress
            </h2>
            <motion.div
              className="relative flex size-8 items-center justify-center sm:hidden"
              title="Overall goal progress"
              animate={reward ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            >
              <ProgressPie value={progress / 100} />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground tabular-nums">
                {Math.round(progress)}%
              </span>
            </motion.div>
          </div>
          <p className="mt-0.5 text-tiny text-default-500 tabular-nums">
            <span className="block truncate sm:inline">{rangeLabel}</span>
            {runningCount > 0 && (
              <>
                <span className="hidden sm:inline">{" · "}</span>
                <span className="mt-0.5 block font-medium text-primary sm:mt-0 sm:inline">
                  {runningCount} running
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <motion.div
            className="relative hidden size-9 items-center justify-center sm:flex"
            title="Overall goal progress"
            animate={reward ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          >
            <ProgressPie value={progress / 100} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-foreground tabular-nums">
              {Math.round(progress)}%
            </span>
          </motion.div>
          <Select
            value={mode}
            onValueChange={(value) => handleModeChange(value as RangeMode)}
            items={MODE_OPTIONS}
          >
            <SelectTrigger
              size="sm"
              className="h-8 rounded-full border-divider bg-white/[0.04] px-3 text-tiny hover:bg-white/[0.07]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              className="rounded-large border-divider bg-content1 shadow-small"
            >
              {MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="min-w-0 rounded-large bg-white/[0.04] px-3 py-2.5 sm:px-3.5 sm:py-3"
          >
            <div className="text-xl font-semibold tracking-tight text-foreground tabular-nums sm:text-2xl">
              {tile.value}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-tiny text-default-500">
              <span className="truncate font-medium text-default-600">
                {tile.label}
              </span>
              {tile.hint && (
                <span className="hidden text-default-400 sm:inline">
                  · {tile.hint}
                </span>
              )}
              {tile.delta && (
                <span
                  title="Progress toward target"
                  className={cn(
                    "font-medium",
                    tile.positive ? "text-emerald-400" : "text-default-500",
                  )}
                >
                  · {tile.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div ref={wrapRef} className="relative mt-3 flex gap-1 sm:mt-4 sm:gap-1.5">
        <div
          className="relative w-4 shrink-0 select-none sm:w-6"
          style={{ height: CHART_H }}
        >
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 text-[9px] text-default-400 tabular-nums sm:text-[10px]"
              style={{ top: TOP_PAD + (1 - tick / niceMax) * PLOT_H - 7 }}
            >
              {tick}
            </span>
          ))}
        </div>

        {isWindowed && edgeJump(0)}

        <div className="relative min-w-0 flex-1">
          <div
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{ height: CHART_H }}
          >
            {yTicks.map((tick) => (
              <div
                key={tick}
                className={cn(
                  "absolute inset-x-0 h-px",
                  tick === 0 ? "bg-white/12" : "bg-white/6",
                )}
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
            aria-valuenow={Math.round(scrollValue)}
            aria-valuetext={rangeLabel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e)}
            onPointerCancel={(e) => endDrag(e)}
            onLostPointerCapture={() => endDrag()}
            onKeyDown={onTrackKeyDown}
            className={cn(
              "relative outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isWindowed && "touch-none",
              isWindowed && (drag ? "cursor-grabbing" : "cursor-grab"),
            )}
          >
            {/* Clip horizontal peek only — keep Y open so experiment menus aren't cut off. */}
            <div className="overflow-x-clip overflow-y-visible">
            <div
              className="flex items-end gap-0.5 will-change-transform sm:gap-1.5"
              style={{
                height: CHART_H,
                width: isWindowed
                  ? `${(stripCount / windowLen) * 100}%`
                  : "100%",
                transform: isWindowed
                  ? `translate3d(${(-scrollFrac / stripCount) * 100}%, 0, 0)`
                  : undefined,
              }}
            >
              {visible.map((slot, index) => {
                const value = slot ? slotValue(slot) : 0
                const dayIndex = winStart + index
                const isQuiet =
                  !slot ||
                  slot.isFuture ||
                  (slot.done === 0 && !slot.isToday)
                const floorBase = isQuiet ? BASE_FRAC : ACTIVE_FLOOR
                const floor =
                  floorBase +
                  (isQuiet ? 0.03 : 0.05) * Math.sin(dayIndex * 2.7 + 1.2)
                const heightFrac =
                  value === 0
                    ? floor
                    : Math.max(value / niceMax, ACTIVE_FLOOR + 0.04)
                // Visual index within the viewport (0…windowLen) for edge fade + finger lift.
                const viewPos = index - scrollFrac
                const center = (viewPos + 0.5) / windowLen
                const boost =
                  drag && center >= 0 && center <= 1
                    ? 1 + 0.12 * Math.exp(-(((center - drag.pos) / 0.12) ** 2))
                    : 1
                const fromEdge = Math.min(viewPos, windowLen - 1 - viewPos)
                const isEdge = isWindowed && fromEdge < EDGE && fromEdge >= 0
                const edgeScale =
                  isEdge && fromEdge >= 0 && fromEdge < EDGE
                    ? EDGE_SCALE[Math.floor(fromEdge)] ?? 1
                    : viewPos < 0 || viewPos > windowLen - 1
                      ? 0.55
                      : 1

                if (!slot) {
                  return (
                    <div
                      key={`empty-${dayIndex}-${index}`}
                      className="flex h-full min-w-0 flex-1 items-end justify-center"
                    >
                      <div
                        className="w-full max-w-[70%] rounded-[3px]"
                        style={{
                          height: floor * 0.65 * PLOT_H,
                          background: BAR_EDGE,
                        }}
                      />
                    </div>
                  )
                }

                const dayAttempts = uniqueAttempts(slot.events)
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
                const isActive = dayIndex === activeSlotIndex
                const isGrayBar =
                  isEdge ||
                  slot.isFuture ||
                  (slot.done === 0 && color !== BAR_DONE)

                return (
                  <div
                    key={slot.key}
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                  >
                    <motion.div
                      initial={false}
                      animate={{
                        height: Math.min(
                          PLOT_H,
                          // Keep room for icon chips inside active bars.
                          Math.max(
                            dayAttempts.length > 0 && !isEdge ? 36 : 0,
                            heightFrac * boost * edgeScale * PLOT_H,
                          ),
                        ),
                        backgroundColor: color,
                        opacity: isActive ? 1 : 0.88,
                        scaleY: isActive ? 1 : 0.96,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: drag || coasting ? 380 : 520,
                        damping: drag || coasting ? 36 : 42,
                        mass: 0.7,
                      }}
                      className={cn(
                        "relative origin-bottom overflow-visible rounded-[4px]",
                        isGrayBar ? "w-[70%] rounded-[3px]" : "w-full",
                      )}
                      style={
                        isActive
                          ? { boxShadow: `inset 0 0 0 1.5px ${TODAY_BG}` }
                          : undefined
                      }
                    >
                      {(isStart || isEnd) && dayAttempts.length === 0 && (
                        <span
                          title={isStart ? "Goal start" : "Goal deadline"}
                          className="absolute top-1 left-1/2 -translate-x-1/2"
                        >
                          <Flag
                            size={9}
                            className={cn(
                              "shrink-0",
                              isStart && "text-foreground/70",
                            )}
                            style={isStart ? undefined : { color: DEADLINE_BG }}
                          />
                        </span>
                      )}
                      {!isEdge && dayAttempts.length > 0 && (
                        <ExperimentDayStack events={slot.events} />
                      )}
                    </motion.div>
                  </div>
                )
              })}
            </div>
            </div>
          </div>

          <div           className="mt-2 overflow-x-clip sm:mt-2.5">
            <div
              className="flex h-8 gap-0.5 sm:gap-1.5 will-change-transform"
              style={{
                width: isWindowed
                  ? `${(stripCount / windowLen) * 100}%`
                  : "100%",
                transform: isWindowed
                  ? `translate3d(${(-scrollFrac / stripCount) * 100}%, 0, 0)`
                  : undefined,
              }}
            >
              {visible.map((slot, index) => {
                if (!slot)
                  return (
                    <div
                      key={`label-empty-${index}`}
                      className="relative min-w-0 flex-1"
                    />
                  )
                const realIndex = winStart + index
                const isLast = realIndex === slotCount - 1
                const labelVisible =
                  labelStep === 1
                    ? true
                    : isLast ||
                      (realIndex % labelStep === 0 &&
                        slotCount - 1 - realIndex >= labelStep * 0.6)
                const label =
                  slot.days === 1
                    ? String(slot.start.getDate())
                    : formatShortDate(slot.start)
                const viewPos = index - scrollFrac
                const fromEdge = Math.min(viewPos, windowLen - 1 - viewPos)
                const isEdge = isWindowed && fromEdge < EDGE && fromEdge >= 0
                const isActive = realIndex === activeSlotIndex
                return (
                  <button
                    key={`label-${slot.key}`}
                    type="button"
                    className="relative flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-large outline-none transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (index >= windowLen) return
                      scrollDayToCenter(realIndex, 0)
                    }}
                  >
                    <span className="flex items-center justify-center whitespace-nowrap">
                      {isActive || (slot.isToday && slot.days === 1) ? (
                        <span
                          title={isActive ? "Active day" : "Today"}
                          className="flex size-6 items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-small tabular-nums"
                          style={{ background: TODAY_BG }}
                        >
                          {label}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "text-tiny tabular-nums",
                            isEdge
                              ? "text-default-400/50"
                              : "text-default-500",
                            !labelVisible && "invisible",
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {isWindowed && edgeJump(1)}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-tiny text-default-500">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: BAR_DONE }}
          />
          Wins
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex size-3 items-center justify-center rounded-full bg-background ring-1 ring-white/15">
            <Emoji value="🧪" className="size-2" />
          </span>
          Experiments
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: BAR_MISSED }}
          />
          Quiet
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: DEADLINE_BG }}
          />
          Due
        </span>
        <span className="ml-auto hidden text-default-400 sm:block">
          Scroll to choose a day
        </span>
      </div>

      {activeDay && (
        <div
          key={activeDay.key}
          className="mt-5 flex flex-col gap-3 border-t border-divider pt-5"
        >
          <h3 className="text-small font-medium text-foreground">
            {activeDay.days === 1
              ? formatShortDate(activeDay.start)
              : `${formatShortDate(activeDay.start)} – ${formatShortDate(activeDay.end)}`}
          </h3>

          {activeAttempts.length === 0 ? (
            <p className="rounded-large border border-dashed border-divider bg-white/[0.02] px-3.5 py-4 text-small text-default-500">
              {activeDay.isFuture
                ? "Nothing planned on this day yet."
                : activeDay.done > 0
                  ? "Activity happened here — open an experiment to see details."
                  : "Quiet day. A tiny experiment would light this bar up."}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeAttempts.map((attempt) => {
                const kinds = new Set(
                  activeDay.events
                    .filter((e) => e.attemptId === attempt.id)
                    .map((e) => e.kind),
                )
                const taskEvents = activeDay.events.filter(
                  (e) =>
                    e.attemptId === attempt.id && e.kind === "task-done",
                )
                const statusChip = kinds.has("completed")
                  ? { label: "Completed", className: "bg-emerald-400/15 text-emerald-400" }
                  : kinds.has("started")
                    ? { label: "Predicted", className: "bg-primary/15 text-primary" }
                    : kinds.has("due")
                      ? { label: "Due", className: "bg-red-400/15 text-red-400" }
                      : taskEvents.length > 0
                        ? {
                            label: `${taskEvents.length} step${taskEvents.length === 1 ? "" : "s"}`,
                            className: "bg-white/10 text-default-500",
                          }
                        : null
                return (
                  <button
                    key={attempt.id}
                    type="button"
                    onClick={() => onSelectAttempt?.(attempt.id)}
                    className={cn(
                      "flex flex-col gap-2.5 rounded-large px-3.5 py-3 text-left ring-1 transition-[transform,background-color,box-shadow] duration-200",
                      attempt.id === selectedAttemptId
                        ? "bg-primary/[0.1] ring-primary/40"
                        : "bg-white/[0.03] ring-foreground/8 hover:bg-white/[0.06]",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {attempt.icon && (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-large border border-divider bg-background/50">
                          <Emoji value={attempt.icon} className="size-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-small font-medium text-foreground">
                        {attempt.title}
                      </span>
                      {statusChip && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            statusChip.className,
                          )}
                        >
                          {statusChip.label}
                        </span>
                      )}
                    </div>

                    {(attempt.predictions.length > 0 ||
                      attempt.results.length > 0) && (
                      <div className="rounded-large bg-black/20 px-3 py-2.5">
                        <p className="mb-1.5 text-[10px] font-medium tracking-wide text-default-400 uppercase">
                          Prediction → result
                        </p>
                        <PredictionOutcomeLine
                          goal={goal}
                          attempt={attempt}
                        />
                      </div>
                    )}

                    {attempt.retrospective?.futureNote && (
                      <p className="text-tiny text-foreground/80">
                        “{attempt.retrospective.futureNote}”
                      </p>
                    )}

                    {taskEvents.length > 0 && (
                      <ul className="flex flex-col gap-1 text-tiny text-default-500">
                        {taskEvents.map((event) => (
                          <li key={event.id} className="truncate">
                            ✓ {event.taskTitle}
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
