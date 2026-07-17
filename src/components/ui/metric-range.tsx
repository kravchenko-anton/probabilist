import * as React from "react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"

/**
 * Snap stops form a quasi-logarithmic scale (1, 1.5, 2 … 9 × 10^k) so the
 * same slider comfortably covers ranges from 0–10 up to 0–1,000,000.
 */
const MAX_VALUE = 1_000_000

function buildStops() {
  const stops: number[] = [0]
  for (let exp = 0; exp <= 5; exp++) {
    const mantissas =
      exp === 0 ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9]
    for (const m of mantissas) stops.push(m * 10 ** exp)
  }
  stops.push(MAX_VALUE)
  return stops
}

const STOPS = buildStops()
const LAST = STOPS.length - 1

/** Maps a value to a 0..1 track position, interpolating between stops. */
function valueToPos(value: number) {
  if (value <= 0) return 0
  if (value >= MAX_VALUE) return 1
  const i = STOPS.findIndex((stop) => stop >= value)
  const lo = STOPS[i - 1]
  const hi = STOPS[i]
  return (i - 1 + (value - lo) / (hi - lo)) / LAST
}

function posToIndex(pos: number) {
  return Math.min(LAST, Math.max(0, Math.round(pos * LAST)))
}

export function formatMetricValue(value: number) {
  if (Math.abs(value) >= 10_000)
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  return `${Number.isInteger(value) ? value : Math.round(value * 100) / 100}`
}

const BAR_COUNT = 14
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / (BAR_COUNT - 1)
  const rise = 0.32 + 0.52 * Math.pow(t, 0.85)
  const wiggle = 0.09 * Math.sin(i * 2.7 + 1.2)
  return Math.min(1, Math.max(0.2, rise + wiggle))
})

const BAR_ACTIVE = "rgba(244, 243, 242, 0.52)"
const BAR_IDLE = "rgba(244, 243, 242, 0.09)"

function RollingNumber({ text }: { text: string }) {
  return (
    <span className="relative inline-flex overflow-hidden py-0.5">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          initial={{ y: "0.7em", opacity: 0, filter: "blur(3px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-0.7em", opacity: 0, filter: "blur(3px)" }}
          transition={{ type: "spring", stiffness: 640, damping: 42, mass: 0.6 }}
          className="inline-block whitespace-nowrap"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

interface EditableValueProps {
  value: number
  label: string
  onCommit: (value: number) => void
}

function EditableValue({ value, label, onCommit }: EditableValueProps) {
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState("")

  function commit() {
    const parsed = Number(text.replace(",", "."))
    if (Number.isFinite(parsed)) onCommit(Math.max(0, parsed))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="decimal"
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        className="w-[6ch] border-b-2 border-primary bg-transparent text-center font-[inherit] text-inherit outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={`${label}: ${formatMetricValue(value)}. Tap to edit`}
      onClick={() => {
        setText(String(value))
        setEditing(true)
      }}
      className="rounded-lg px-1.5 tabular-nums transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      <RollingNumber text={formatMetricValue(value)} />
    </button>
  )
}

interface MetricRangeProps {
  /** [start, target] — kept sorted; the left handle always edits the smaller value. */
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  className?: string
}

function MetricRange({ value, onValueChange, className }: MetricRangeProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [drag, setDrag] = React.useState<{ handle: 0 | 1; pos: number } | null>(null)
  const lastTickRef = React.useRef<number | null>(null)

  const lo = Math.min(value[0], value[1])
  const hi = Math.max(value[0], value[1])

  const pos: [number, number] = [
    drag?.handle === 0 ? drag.pos : valueToPos(lo),
    drag?.handle === 1 ? drag.pos : valueToPos(hi),
  ]

  function posFromEvent(e: React.PointerEvent) {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  }

  function moveHandle(handle: 0 | 1, rawPos: number) {
    const eps = 0.5 / LAST
    const clamped =
      handle === 0
        ? Math.max(0, Math.min(rawPos, valueToPos(hi) - eps))
        : Math.min(1, Math.max(rawPos, valueToPos(lo) + eps))

    let idx = posToIndex(clamped)
    if (handle === 0) while (idx > 0 && STOPS[idx] >= hi) idx--
    else while (idx < LAST && STOPS[idx] <= lo) idx++

    setDrag({ handle, pos: clamped })

    if (lastTickRef.current !== idx) {
      lastTickRef.current = idx
      try {
        navigator.vibrate?.(4)
      } catch {
        /* haptics unsupported */
      }
    }

    const next = STOPS[idx]
    const current = handle === 0 ? lo : hi
    if (next !== current) onValueChange(handle === 0 ? [next, hi] : [lo, next])
  }

  function endDrag() {
    setDrag(null)
    lastTickRef.current = null
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return
    e.preventDefault()
    const p = posFromEvent(e)
    const handle: 0 | 1 = Math.abs(p - pos[0]) <= Math.abs(p - pos[1]) ? 0 : 1
    e.currentTarget.setPointerCapture(e.pointerId)
    moveHandle(handle, p)
  }

  function handleKey(handle: 0 | 1, e: React.KeyboardEvent) {
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -1
          : 0
    if (!dir) return
    e.preventDefault()
    const current = handle === 0 ? lo : hi
    let idx = Math.min(LAST, Math.max(0, posToIndex(valueToPos(current)) + dir))
    if (handle === 0) while (idx > 0 && STOPS[idx] >= hi) idx--
    else while (idx < LAST && STOPS[idx] <= lo) idx++
    const next = STOPS[idx]
    if (next !== current) onValueChange(handle === 0 ? [next, hi] : [lo, next])
  }

  function commitTyped(handle: 0 | 1, typed: number) {
    if (handle === 0) onValueChange([Math.min(typed, hi), Math.max(typed, hi)])
    else onValueChange([Math.min(lo, typed), Math.max(lo, typed)])
  }

  return (
    <div data-slot="metric-range" className={cn("flex flex-col select-none", className)}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => drag && moveHandle(drag.handle, posFromEvent(e))}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        className={cn(
          "relative h-16 touch-none px-1 py-1.5 sm:h-20",
          drag ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="flex h-full items-end gap-1 sm:gap-1.5">
          {BAR_HEIGHTS.map((height, i) => {
            const center = (i + 0.5) / BAR_COUNT
            const active = center >= pos[0] && center <= pos[1]
            const boost = drag ? 1 + 0.16 * Math.exp(-(((center - drag.pos) / 0.1) ** 2)) : 1
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{
                  height: `${Math.min(100, height * boost * 100)}%`,
                  backgroundColor: active ? BAR_ACTIVE : BAR_IDLE,
                }}
                transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
                className="min-w-0 flex-1 rounded-[4px]"
              />
            )
          })}
        </div>

        {([0, 1] as const).map((handle) => (
          <motion.div
            key={handle}
            role="slider"
            tabIndex={0}
            aria-label={handle === 0 ? "Start value" : "Target value"}
            aria-valuemin={0}
            aria-valuemax={MAX_VALUE}
            aria-valuenow={handle === 0 ? lo : hi}
            aria-valuetext={formatMetricValue(handle === 0 ? lo : hi)}
            onKeyDown={(e) => handleKey(handle, e)}
            animate={{ left: `${pos[handle] * 100}%` }}
            transition={
              drag?.handle === handle
                ? { type: "spring", stiffness: 1100, damping: 60, mass: 0.5 }
                : { type: "spring", stiffness: 420, damping: 34 }
            }
            className="absolute inset-y-0 -ml-4 w-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <motion.div
              animate={{ scaleY: drag?.handle === handle ? 1.04 : 1 }}
              className="absolute top-1/2 left-1/2 h-[calc(100%+10px)] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_10px_rgba(0,0,0,0.55)]"
            />
          </motion.div>
        ))}
      </div>

      <div className="flex items-end justify-between pt-1.5">
        <div className="flex flex-col items-start font-logo text-base text-foreground sm:text-lg">
          <span className="px-1.5 font-sans text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Start
          </span>
          <EditableValue value={lo} label="Start value" onCommit={(v) => commitTyped(0, v)} />
        </div>
        <div className="flex flex-col items-end font-logo text-base text-foreground sm:text-lg">
          <span className="px-1.5 font-sans text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Goal
          </span>
          <EditableValue value={hi} label="Target value" onCommit={(v) => commitTyped(1, v)} />
        </div>
      </div>
    </div>
  )
}

const ZONE_RED = "rgba(248, 113, 113, 0.4)"
const ZONE_GREEN = "rgba(52, 211, 153, 0.42)"

const BAND_RGB = {
  red: "248, 113, 113",
  amber: "251, 191, 36",
  lime: "190, 242, 100",
  emerald: "52, 211, 153",
} as const

type BandColor = keyof typeof BAND_RGB

interface ResultRangeProps {
  /** Actual measured value — the single draggable handle. */
  value: number
  /** Prediction boundaries; null renders a neutral track. */
  prediction: { worst: number; acceptable: number; best: number } | null
  /** Which end of the track represents the worst outcome. */
  worstSide?: "left" | "right"
  /** Outcome verdict shown under the track, styled by the caller. */
  outcome?: { label: string; className: string } | null
  onValueChange: (value: number) => void
  className?: string
}

function ResultRange({
  value,
  prediction,
  worstSide = "left",
  outcome,
  onValueChange,
  className,
}: ResultRangeProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [drag, setDrag] = React.useState<{ pos: number } | null>(null)
  const lastTickRef = React.useRef<number | null>(null)

  const handlePos = drag ? drag.pos : valueToPos(value)

  const bounds = prediction
    ? [prediction.worst, prediction.acceptable, prediction.best]
        .map(valueToPos)
        .sort((a, b) => a - b)
    : []
  const bandOrder: readonly BandColor[] =
    worstSide === "left"
      ? ["red", "amber", "lime", "emerald"]
      : ["emerald", "lime", "amber", "red"]

  function bandAt(pos: number): BandColor {
    let i = 0
    for (const b of bounds) if (pos >= b) i++
    return bandOrder[Math.min(i, bandOrder.length - 1)]
  }

  const accent = prediction ? `rgb(${BAND_RGB[bandAt(handlePos)]})` : "rgba(244, 243, 242, 1)"

  function posFromEvent(e: React.PointerEvent) {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  }

  function moveHandle(rawPos: number) {
    const idx = posToIndex(rawPos)
    setDrag({ pos: rawPos })

    if (lastTickRef.current !== idx) {
      lastTickRef.current = idx
      try {
        navigator.vibrate?.(4)
      } catch {
        /* haptics unsupported */
      }
    }

    if (STOPS[idx] !== value) onValueChange(STOPS[idx])
  }

  function endDrag() {
    setDrag(null)
    lastTickRef.current = null
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    moveHandle(posFromEvent(e))
  }

  function handleKey(e: React.KeyboardEvent) {
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -1
          : 0
    if (!dir) return
    e.preventDefault()
    const idx = Math.min(LAST, Math.max(0, posToIndex(valueToPos(value)) + dir))
    if (STOPS[idx] !== value) onValueChange(STOPS[idx])
  }

  return (
    <div data-slot="result-range" className={cn("flex flex-col select-none", className)}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => drag && moveHandle(posFromEvent(e))}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        className={cn(
          "relative h-16 touch-none px-1 py-1.5 sm:h-20",
          drag ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="flex h-full items-end gap-1 sm:gap-1.5">
          {BAR_HEIGHTS.map((height, i) => {
            const center = (i + 0.5) / BAR_COUNT
            const lit = center <= handlePos
            const color = prediction
              ? `rgba(${BAND_RGB[bandAt(center)]}, ${lit ? 0.6 : 0.14})`
              : lit
                ? BAR_ACTIVE
                : BAR_IDLE
            const boost = drag ? 1 + 0.16 * Math.exp(-(((center - drag.pos) / 0.1) ** 2)) : 1
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{
                  height: `${Math.min(100, height * boost * 100)}%`,
                  backgroundColor: color,
                }}
                transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
                className="min-w-0 flex-1 rounded-[4px]"
              />
            )
          })}
        </div>

        <motion.div
          role="slider"
          tabIndex={0}
          aria-label="Actual value"
          aria-valuemin={0}
          aria-valuemax={MAX_VALUE}
          aria-valuenow={value}
          aria-valuetext={formatMetricValue(value)}
          onKeyDown={handleKey}
          animate={{ left: `${handlePos * 100}%` }}
          transition={
            drag
              ? { type: "spring", stiffness: 1100, damping: 60, mass: 0.5 }
              : { type: "spring", stiffness: 420, damping: 34 }
          }
          className="absolute inset-y-0 -ml-4 w-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <motion.div
            animate={{ scaleY: drag ? 1.04 : 1, backgroundColor: accent }}
            className="absolute top-1/2 left-1/2 h-[calc(100%+10px)] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.55)]"
          />
        </motion.div>
      </div>

      <div className="flex items-end justify-between pt-1.5">
        <div
          className="flex flex-col items-start font-logo text-base sm:text-lg"
          style={{ color: accent }}
        >
          <span className="px-1.5 font-sans text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Actual
          </span>
          <EditableValue value={value} label="Actual value" onCommit={onValueChange} />
        </div>
        {outcome && (
          <span className={cn("pb-1 text-xs", outcome.className)}>
            <RollingNumber text={outcome.label} />
          </span>
        )}
      </div>
    </div>
  )
}

type PredictionHandle = 0 | 1 | 2

interface PredictionRangeProps {
  /** Three handle values in ascending track order. */
  value: [number, number, number]
  /** Handle labels in track order (left to right). */
  labels: [string, string, string]
  /** Which end of the track represents the worst outcome (red zone). */
  worstSide?: "left" | "right"
  onValueChange: (value: [number, number, number]) => void
  className?: string
}

function PredictionRange({
  value,
  labels,
  worstSide = "left",
  onValueChange,
  className,
}: PredictionRangeProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [drag, setDrag] = React.useState<{ handle: PredictionHandle; pos: number } | null>(null)
  const lastTickRef = React.useRef<number | null>(null)

  const vals = [...value].sort((a, b) => a - b) as [number, number, number]

  const pos = [0, 1, 2].map((i) =>
    drag?.handle === i ? drag.pos : valueToPos(vals[i])
  ) as [number, number, number]

  function neighborBounds(handle: PredictionHandle): [number, number] {
    return [handle === 0 ? 0 : vals[handle - 1], handle === 2 ? MAX_VALUE : vals[handle + 1]]
  }

  function setHandleValue(handle: PredictionHandle, next: number) {
    if (next === vals[handle]) return
    const arr = [...vals] as [number, number, number]
    arr[handle] = next
    onValueChange(arr)
  }

  function posFromEvent(e: React.PointerEvent) {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  }

  function moveHandle(handle: PredictionHandle, rawPos: number) {
    const [loVal, hiVal] = neighborBounds(handle)
    const clamped = Math.min(valueToPos(hiVal), Math.max(valueToPos(loVal), rawPos))
    const idx = posToIndex(clamped)

    setDrag({ handle, pos: clamped })

    if (lastTickRef.current !== idx) {
      lastTickRef.current = idx
      try {
        navigator.vibrate?.(4)
      } catch {
        /* haptics unsupported */
      }
    }

    setHandleValue(handle, Math.min(hiVal, Math.max(loVal, STOPS[idx])))
  }

  function endDrag() {
    setDrag(null)
    lastTickRef.current = null
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return
    e.preventDefault()
    const p = posFromEvent(e)
    const dists = pos.map((hp) => Math.abs(p - hp))
    const min = Math.min(...dists)
    const ties = ([0, 1, 2] as const).filter((i) => dists[i] === min)
    // Stacked handles: grab the outermost one on the side the pointer landed.
    const handle = p >= pos[ties[0]] ? ties[ties.length - 1] : ties[0]
    e.currentTarget.setPointerCapture(e.pointerId)
    moveHandle(handle, p)
  }

  function handleKey(handle: PredictionHandle, e: React.KeyboardEvent) {
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -1
          : 0
    if (!dir) return
    e.preventDefault()
    const [loVal, hiVal] = neighborBounds(handle)
    const idx = Math.min(LAST, Math.max(0, posToIndex(valueToPos(vals[handle])) + dir))
    setHandleValue(handle, Math.min(hiVal, Math.max(loVal, STOPS[idx])))
  }

  function commitTyped(handle: PredictionHandle, typed: number) {
    const [loVal, hiVal] = neighborBounds(handle)
    setHandleValue(handle, Math.min(hiVal, Math.max(loVal, typed)))
  }

  const leftZone = worstSide === "left" ? ZONE_RED : ZONE_GREEN
  const rightZone = worstSide === "left" ? ZONE_GREEN : ZONE_RED
  const lineColors =
    worstSide === "left"
      ? ["bg-red-300", "bg-foreground", "bg-emerald-300"]
      : ["bg-emerald-300", "bg-foreground", "bg-red-300"]
  const textColors =
    worstSide === "left"
      ? ["text-red-300", "text-foreground", "text-emerald-300"]
      : ["text-emerald-300", "text-foreground", "text-red-300"]

  return (
    <div data-slot="prediction-range" className={cn("flex flex-col select-none", className)}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => drag && moveHandle(drag.handle, posFromEvent(e))}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        className={cn(
          "relative h-16 touch-none px-1 py-1.5 sm:h-20",
          drag ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="flex h-full items-end gap-1 sm:gap-1.5">
          {BAR_HEIGHTS.map((height, i) => {
            const center = (i + 0.5) / BAR_COUNT
            const color = center < pos[0] ? leftZone : center > pos[2] ? rightZone : BAR_ACTIVE
            const boost = drag ? 1 + 0.16 * Math.exp(-(((center - drag.pos) / 0.1) ** 2)) : 1
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{
                  height: `${Math.min(100, height * boost * 100)}%`,
                  backgroundColor: color,
                }}
                transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
                className="min-w-0 flex-1 rounded-[4px]"
              />
            )
          })}
        </div>

        {([0, 1, 2] as const).map((handle) => (
          <motion.div
            key={handle}
            role="slider"
            tabIndex={0}
            aria-label={labels[handle]}
            aria-valuemin={0}
            aria-valuemax={MAX_VALUE}
            aria-valuenow={vals[handle]}
            aria-valuetext={formatMetricValue(vals[handle])}
            onKeyDown={(e) => handleKey(handle, e)}
            animate={{ left: `${pos[handle] * 100}%` }}
            transition={
              drag?.handle === handle
                ? { type: "spring", stiffness: 1100, damping: 60, mass: 0.5 }
                : { type: "spring", stiffness: 420, damping: 34 }
            }
            className="absolute inset-y-0 -ml-4 w-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <motion.div
              animate={{ scaleY: drag?.handle === handle ? 1.04 : 1 }}
              className={cn(
                "absolute top-1/2 left-1/2 h-[calc(100%+10px)] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.55)]",
                lineColors[handle]
              )}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex items-end justify-between pt-1.5">
        {([0, 1, 2] as const).map((handle) => (
          <div
            key={handle}
            className={cn(
              "flex flex-col font-logo text-base sm:text-lg",
              handle === 0 ? "items-start" : handle === 1 ? "items-center" : "items-end",
              textColors[handle]
            )}
          >
            <span className="px-1.5 font-sans text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {labels[handle]}
            </span>
            <EditableValue
              value={vals[handle]}
              label={labels[handle]}
              onCommit={(v) => commitTyped(handle, v)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export { MetricRange, PredictionRange, ResultRange }
