import * as React from "react"
import { motion } from "motion/react"
import { Check, Moon, Sun, Sunrise, Sunset, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** One handle over a 24h day, snapping to 15-minute stops. */
const STEP = 15
const LAST = (24 * 60) / STEP - 1
const DEFAULT_MINUTES = 9 * 60

const BAR_COUNT = 16
/** Daylight curve — bars stay low at night and peak around midday. */
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / (BAR_COUNT - 1)
  const daylight = 0.24 + 0.68 * Math.pow(Math.sin(Math.PI * t), 1.4)
  const wiggle = 0.05 * Math.sin(i * 2.3 + 0.8)
  return Math.min(1, Math.max(0.18, daylight + wiggle))
})

const BAR_ACTIVE = "rgba(244, 243, 242, 0.52)"
const BAR_IDLE = "rgba(244, 243, 242, 0.09)"

const pad = (n: number) => String(n).padStart(2, "0")

function daypart(minutes: number): { label: string; icon: LucideIcon } {
  const h = minutes / 60
  if (h < 5 || h >= 22) return { label: "Night", icon: Moon }
  if (h < 12) return { label: "Morning", icon: Sunrise }
  if (h < 17) return { label: "Afternoon", icon: Sun }
  return { label: "Evening", icon: Sunset }
}

interface EditableTimeProps {
  minutes: number
  onCommit: (minutes: number) => void
}

function EditableTime({ minutes, onCommit }: EditableTimeProps) {
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState("")

  function commit() {
    const match = text.trim().match(/^(\d{1,2}):?(\d{2})?$/)
    if (match) {
      const hours = Number(match[1])
      const mins = Number(match[2] ?? 0)
      if (hours <= 23 && mins <= 59) onCommit(hours * 60 + mins)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="numeric"
        aria-label="Time"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        className="w-[5ch] border-b-2 border-primary bg-transparent text-center font-[inherit] text-inherit outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={`Time: ${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}. Tap to edit`}
      onClick={() => {
        setText(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`)
        setEditing(true)
      }}
      className="flex items-baseline rounded-lg px-1.5 tabular-nums transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      <span className="py-0.5">{pad(Math.floor(minutes / 60))}</span>
      <span className="px-px text-muted-foreground">:</span>
      <span className="py-0.5">{pad(minutes % 60)}</span>
    </button>
  )
}

interface TimeDialProps {
  /** Minutes since midnight, or null when no time is set yet. */
  minutes: number | null
  onChange: (minutes: number) => void
  onDone: (minutes: number) => void
  onClear?: () => void
  className?: string
}

export function TimeDial({ minutes, onChange, onDone, onClear, className }: TimeDialProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [drag, setDrag] = React.useState<number | null>(null)
  const lastTickRef = React.useRef<number | null>(null)

  const current = minutes ?? DEFAULT_MINUTES
  const pos = drag ?? Math.min(1, current / (LAST * STEP))
  const part = daypart(current)

  function posFromEvent(e: React.PointerEvent) {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  }

  function moveHandle(rawPos: number) {
    const idx = Math.min(LAST, Math.max(0, Math.round(rawPos * LAST)))
    setDrag(rawPos)

    if (lastTickRef.current !== idx) {
      lastTickRef.current = idx
      try {
        navigator.vibrate?.(4)
      } catch {
        /* haptics unsupported */
      }
    }

    const next = idx * STEP
    if (next !== minutes) onChange(next)
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
    const idx = Math.min(LAST, Math.max(0, Math.round(current / STEP) + dir))
    const next = idx * STEP
    if (next !== minutes) onChange(next)
  }

  return (
    <div data-slot="time-dial" className={cn("flex flex-col select-none", className)}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => drag !== null && moveHandle(posFromEvent(e))}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        className={cn(
          "relative h-14 touch-none px-1 py-1.5",
          drag !== null ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="flex h-full items-end gap-1">
          {BAR_HEIGHTS.map((height, i) => {
            const center = (i + 0.5) / BAR_COUNT
            const active = center <= pos
            const boost = drag !== null ? 1 + 0.16 * Math.exp(-(((center - drag) / 0.1) ** 2)) : 1
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

        <motion.div
          role="slider"
          tabIndex={0}
          aria-label="Time of day"
          aria-valuemin={0}
          aria-valuemax={LAST * STEP}
          aria-valuenow={current}
          aria-valuetext={`${pad(Math.floor(current / 60))}:${pad(current % 60)}`}
          onKeyDown={handleKey}
          animate={{ left: `${pos * 100}%` }}
          transition={
            drag !== null
              ? { type: "spring", stiffness: 1100, damping: 60, mass: 0.5 }
              : { type: "spring", stiffness: 420, damping: 34 }
          }
          className="absolute inset-y-0 -ml-4 w-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <motion.div
            animate={{ scaleY: drag !== null ? 1.04 : 1 }}
            className="absolute top-1/2 left-1/2 h-[calc(100%+10px)] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_10px_rgba(0,0,0,0.55)]"
          />
        </motion.div>
      </div>

      <div className="flex items-end justify-between pt-1.5">
        <div className="flex flex-col items-start font-logo text-lg text-foreground">
          <span className="px-1.5 font-sans text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Time
          </span>
          <EditableTime minutes={current} onCommit={onChange} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 px-1.5 py-0.5 font-sans text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            <part.icon size={11} />
            {part.label}
          </span>
          <div className="flex items-center gap-1">
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => onDone(current)}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-white/15"
            >
              <Check size={12} />
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
