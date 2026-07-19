import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Emoji } from "@/components/ui/emoji"
import { Input } from "@/components/ui/input"
import { MetricRange, formatMetricValue } from "@/components/ui/metric-range"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { slugify, type Goal, type GoalMetric, type MetricAggregation } from "@/data/goals"
import { formatDateRangeLabel, formatFullDate, quarterOptions, startOfDay } from "@/lib/date"
import { useGoals } from "@/lib/goals-store"
import { cn } from "@/lib/utils"
import { CalendarIcon, Check, Plus, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import type { DateRange } from "react-day-picker"
import { useNavigate } from "react-router-dom"

const EMOJI_OPTIONS = ["🎯", "🚀", "📈", "💡", "🏆", "🔥"]

interface DraftMetric {
  id: string
  name: string
  startValue: string
  targetValue: string
  currentValue: number
  aggregation: MetricAggregation
}

const MAX_METRICS = 4

const AGGREGATION_OPTIONS: { value: MetricAggregation; label: string; hint: string }[] = [
  { value: "sum", label: "Adds up", hint: "Every experiment stacks onto the total" },
  { value: "max", label: "Best", hint: "The goal keeps your single best experiment" },
]

function emptyMetric(): DraftMetric {
  return {
    id: crypto.randomUUID(),
    name: "",
    startValue: "0",
    targetValue: "100",
    currentValue: 0,
    aggregation: "sum",
  }
}

function draftFromMetric(metric: GoalMetric): DraftMetric {
  return {
    id: metric.id,
    name: metric.name,
    startValue: String(metric.startValue),
    targetValue: String(metric.targetValue),
    currentValue: metric.currentValue,
    aggregation: metric.aggregation ?? "max",
  }
}

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal
}

export function GoalFormDialog({ open, onOpenChange, goal }: GoalFormDialogProps) {
  const { goals, addGoal, updateGoal } = useGoals()
  const navigate = useNavigate()
  const isEditing = !!goal

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0])
  const [metrics, setMetrics] = useState<DraftMetric[]>([emptyMetric()])
  // Only one metric editor is open at a time; the rest collapse to summaries.
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    if (goal) {
      setDateRange({ from: goal.startDate, to: goal.endDate })
      setTitle(goal.title)
      setEmoji(goal.emoji)
      setMetrics(
        goal.metrics.length > 0
          ? goal.metrics.slice(0, MAX_METRICS).map(draftFromMetric)
          : [emptyMetric()]
      )
      setActiveMetricId(null)
    } else {
      const [currentQuarter] = quarterOptions()
      const today = startOfDay(new Date())
      setDateRange({ from: today, to: currentQuarter.endDate })
      setTitle("")
      setEmoji(EMOJI_OPTIONS[goals.length % EMOJI_OPTIONS.length])
      const first = emptyMetric()
      setMetrics([first])
      setActiveMetricId(first.id)
    }
  }, [open, goal, goals.length])

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
  }

  function updateMetric(id: string, patch: Partial<DraftMetric>) {
    setMetrics((prev) => prev.map((metric) => (metric.id === id ? { ...metric, ...patch } : metric)))
  }

  function removeMetric(id: string) {
    setMetrics((prev) => prev.filter((metric) => metric.id !== id))
    setActiveMetricId((prev) => (prev === id ? null : prev))
  }

  function addMetric() {
    const next = emptyMetric()
    setMetrics((prev) => [...prev, next])
    setActiveMetricId(next.id)
  }

  function uniqueSlug(base: string) {
    let slug = base
    let n = 2
    while (goals.some((g) => g.slug === slug)) {
      slug = `${base}-${n}`
      n += 1
    }
    return slug
  }

  function handleSave() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !dateRange?.from || !dateRange?.to) return

    const startDate = dateRange.from
    const endDate = dateRange.to
    const timePeriodLabel = formatDateRangeLabel(startDate, endDate)
    const resolvedMetrics: GoalMetric[] = metrics
      .filter((metric) => metric.name.trim())
      .map((metric) => {
        const startValue = Number(metric.startValue) || 0
        const targetValue = Number(metric.targetValue) || 0
        return {
          id: metric.id,
          name: metric.name.trim(),
          startValue,
          targetValue,
          currentValue: metric.currentValue,
          aggregation: metric.aggregation,
        }
      })

    if (goal) {
      const updated: Goal = {
        ...goal,
        title: trimmedTitle,
        emoji,
        timePeriodLabel,
        startDate,
        endDate,
        metrics: resolvedMetrics,
      }
      updateGoal(updated)
      handleOpenChange(false)
      return
    }

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      slug: uniqueSlug(slugify(trimmedTitle)),
      title: trimmedTitle,
      emoji,
      timePeriodLabel,
      startDate,
      endDate,
      metrics: resolvedMetrics,
    }

    addGoal(newGoal)
    handleOpenChange(false)
    navigate(`/goal/${newGoal.slug}`)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">
            {isEditing ? "Edit goal" : "Create a new goal"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Goal title <span className="text-destructive">*</span>
              </label>
              {/* Mobile: title + compact icon pick (list opens on the right) */}
              <div className="flex items-center gap-2 sm:block">
                <Input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Grow monthly active users"
                  className="min-w-0 flex-1"
                />
                <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        aria-label="Choose icon"
                        className="flex size-10 shrink-0 items-center justify-center rounded-large bg-field ring-1 ring-primary sm:hidden"
                      />
                    }
                  >
                    <Emoji value={emoji} className="size-5" />
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    className="w-auto min-w-0 rounded-large border-divider bg-content1 p-1 shadow-small sm:hidden"
                  >
                    <div className="flex flex-col gap-0.5">
                      {EMOJI_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setEmoji(option)
                            setEmojiPickerOpen(false)
                          }}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg transition-colors",
                            emoji === option
                              ? "bg-white/10 ring-1 ring-primary"
                              : "hover:bg-white/5",
                          )}
                        >
                          <Emoji value={option} className="size-5" />
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Desktop: separate icon row */}
            <div className="hidden flex-col gap-1.5 sm:flex">
              <label className="text-xs font-medium text-foreground">Icon</label>
              <div className="flex items-center gap-1">
                {EMOJI_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setEmoji(option)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md hover:bg-white/5",
                      emoji === option && "bg-white/10 ring-1 ring-primary",
                    )}
                  >
                    <Emoji value={option} className="size-5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Time period</label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start gap-2 font-normal",
                        !dateRange?.from && "text-muted-foreground"
                      )}
                    />
                  }
                >
                  <CalendarIcon size={14} className="text-muted-foreground" />
                  {dateRange?.from
                    ? dateRange.to
                      ? `${formatFullDate(dateRange.from)} – ${formatFullDate(dateRange.to)}`
                      : formatFullDate(dateRange.from)
                    : "Pick a date range"}
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    defaultMonth={dateRange?.from}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Metrics</label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={metrics.length >= MAX_METRICS}
                onClick={addMetric}
              >
                <Plus size={12} />
                Add metric
              </Button>
            </div>

            {metrics.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No metrics yet. Add one to track progress toward this goal.
              </p>
            )}

            <div className="flex flex-col gap-2.5 sm:max-h-[56vh] sm:overflow-y-auto sm:pr-1">
              <AnimatePresence initial={false}>
                {metrics.map((metric) => {
                  const isActive = metric.id === activeMetricId
                  return (
                    <motion.div
                      key={metric.id}
                      layout
                      initial={{ opacity: 0, height: 0, scale: 0.97 }}
                      animate={{ opacity: 1, height: "auto", scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 480, damping: 42, mass: 0.8 }}
                      className="shrink-0 overflow-hidden"
                    >
                      {isActive ? (
                        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-white/[0.02] p-2.5">
                          <div className="flex items-center gap-1.5">
                            <Input
                              autoFocus={!metric.name}
                              value={metric.name}
                              onChange={(e) => updateMetric(metric.id, { name: e.target.value })}
                              placeholder="New metric"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => removeMetric(metric.id)}
                            >
                              <X size={13} />
                            </Button>
                          </div>
                          <MetricRange
                            value={[
                              Number(metric.startValue) || 0,
                              Number(metric.targetValue) || 0,
                            ]}
                            onValueChange={([start, target]) =>
                              updateMetric(metric.id, {
                                startValue: String(start),
                                targetValue: String(target),
                              })
                            }
                          />
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              Progress mode
                            </span>
                            <div
                              role="group"
                              aria-label="Progress mode"
                              className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-black/20 p-0.5"
                            >
                              {AGGREGATION_OPTIONS.map((option) => {
                                const selected = metric.aggregation === option.value
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      updateMetric(metric.id, { aggregation: option.value })
                                    }
                                    className={cn(
                                      "flex flex-col items-start rounded-md px-2.5 py-1.5 text-left transition-colors",
                                      selected
                                        ? "bg-white/10 text-foreground ring-1 ring-primary"
                                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                    )}
                                  >
                                    <span className="text-xs font-medium">{option.label}</span>
                                    <span className="text-[10px] leading-snug opacity-70">
                                      {option.hint}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            className="self-end"
                            onClick={() => setActiveMetricId(null)}
                          >
                            <Check size={12} />
                            Done
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveMetricId(metric.id)}
                          className="group flex w-full items-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                        >
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-sm",
                              metric.name ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {metric.name || "Untitled metric"}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground/80">
                            {metric.aggregation === "sum" ? "Adds up" : "Best"}
                          </span>
                          <span className="shrink-0 font-logo text-xs text-muted-foreground tabular-nums">
                            {formatMetricValue(Number(metric.startValue) || 0)}
                            <span className="mx-1 text-muted-foreground/60">→</span>
                            {formatMetricValue(Number(metric.targetValue) || 0)}
                          </span>
                          <span
                            role="button"
                            tabIndex={-1}
                            aria-label="Remove metric"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeMetric(metric.id)
                            }}
                            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <X size={13} />
                          </span>
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Drag the lines to set the start and target range, or tap a number to type an exact
              value. Choose whether each metric stacks across experiments or keeps the best single
              result. Up to {MAX_METRICS} metrics per goal.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full px-5"
            onClick={handleSave}
            disabled={!title.trim() || !dateRange?.from || !dateRange?.to}
          >
            {isEditing ? "Save changes" : "Save goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
