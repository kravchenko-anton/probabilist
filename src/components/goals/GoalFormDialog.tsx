import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { DateRange } from "react-day-picker"
import { CalendarIcon, Plus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Emoji } from "@/components/ui/emoji"
import { useGoals } from "@/lib/goals-store"
import { slugify, type Goal, type GoalMetric } from "@/data/goals"
import { formatDateRangeLabel, quarterOptions, startOfDay } from "@/lib/date"
import { cn } from "@/lib/utils"

const EMOJI_OPTIONS = ["🎯", "🚀", "📈", "💡", "🏆", "🔥"]

interface DraftMetric {
  id: string
  name: string
  startValue: string
  targetValue: string
  currentValue: number
}

const MAX_METRICS = 4

function emptyMetric(): DraftMetric {
  return {
    id: crypto.randomUUID(),
    name: "",
    startValue: "0",
    targetValue: "100",
    currentValue: 0,
  }
}

function draftFromMetric(metric: GoalMetric): DraftMetric {
  return {
    id: metric.id,
    name: metric.name,
    startValue: String(metric.startValue),
    targetValue: String(metric.targetValue),
    currentValue: metric.currentValue,
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
  const [title, setTitle] = useState("")
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0])
  const [metrics, setMetrics] = useState<DraftMetric[]>([emptyMetric()])

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
    } else {
      const [currentQuarter] = quarterOptions()
      const today = startOfDay(new Date())
      setDateRange({ from: today, to: currentQuarter.endDate })
      setTitle("")
      setEmoji(EMOJI_OPTIONS[goals.length % EMOJI_OPTIONS.length])
      setMetrics([emptyMetric()])
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
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit goal" : "Create a new goal"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_1.2fr] gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Goal title <span className="text-destructive">*</span>
              </label>
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Grow monthly active users"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Icon</label>
              <div className="flex items-center gap-1">
                {EMOJI_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setEmoji(option)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md hover:bg-white/5",
                      emoji === option && "bg-white/10 ring-1 ring-primary"
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
                      className="w-full justify-start gap-2 font-normal"
                    />
                  }
                >
                  <CalendarIcon size={14} className="text-muted-foreground" />
                  {dateRange?.from && dateRange?.to
                    ? formatDateRangeLabel(dateRange.from, dateRange.to)
                    : "Pick a date range"}
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    defaultMonth={dateRange?.from}
                    numberOfMonths={1}
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
                onClick={() => setMetrics((prev) => [...prev, emptyMetric()])}
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

            <div className="flex flex-col gap-2">
              {metrics.map((metric) => (
                <div key={metric.id} className="flex items-center gap-1.5">
                  <Input
                    value={metric.name}
                    onChange={(e) => updateMetric(metric.id, { name: e.target.value })}
                    placeholder="Metric name"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={metric.startValue}
                    onChange={(e) => updateMetric(metric.id, { startValue: e.target.value })}
                    placeholder="Start"
                    className="w-20"
                  />
                  <Input
                    type="number"
                    value={metric.targetValue}
                    onChange={(e) => updateMetric(metric.id, { targetValue: e.target.value })}
                    placeholder="Target"
                    className="w-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeMetric(metric.id)}
                  >
                    <X size={13} />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Progress is tracked from each metric's start value up to its target value. Up to{" "}
              {MAX_METRICS} metrics per goal.
            </p>
          </div>
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
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
