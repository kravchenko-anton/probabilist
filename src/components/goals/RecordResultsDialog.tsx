import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ResultRange, formatMetricValue } from "@/components/ui/metric-range"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  classifyOutcome,
  deadlineMissDays,
  formatMissDays,
  isTinyAttempt,
  metricDirection,
  type Attempt,
  type AttemptResult,
} from "@/data/attempts"
import { metricAggregation, type Goal, type GoalMetric } from "@/data/goals"
import { formatShortDate, formatTimeSince } from "@/lib/date"
import { useGoals } from "@/lib/goals-store"
import { metricColor } from "@/lib/metric-colors"
import { cn } from "@/lib/utils"
import { Plus, X, Check } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"

interface RecordResultsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
  attempt: Attempt
}

function defaultValue(metric: GoalMetric) {
  return metricAggregation(metric) === "sum" ? 0 : metric.currentValue
}

export function RecordResultsDialog({
  open,
  onOpenChange,
  goal,
  attempt,
}: RecordResultsDialogProps) {
  const { completeAttempt } = useGoals()
  const predictedIds = attempt.predictions.map((p) => p.metricId)
  const locked = predictedIds.length > 0

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, number>>({})
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null)
  const [addValue, setAddValue] = useState("")
  const [happened, setHappened] = useState("")
  const [learned, setLearned] = useState("")
  const [futureNote, setFutureNote] = useState("")

  const available = goal.metrics.filter((m) => !selectedIds.includes(m.id))

  useEffect(() => {
    if (!open) return
    const initialIds =
      predictedIds.length > 0
        ? predictedIds.filter((id) => goal.metrics.some((m) => m.id === id))
        : goal.metrics[0]
          ? [goal.metrics[0].id]
          : []
    setSelectedIds(initialIds)
    setDrafts(
      Object.fromEntries(
        initialIds.map((id) => {
          const metric = goal.metrics.find((m) => m.id === id)!
          return [id, defaultValue(metric)]
        }),
      ),
    )
    setActiveMetricId(initialIds[0] ?? null)
    setAddValue("")
    setHappened("")
    setLearned("")
    setFutureNote("")
  }, [open, goal, attempt])

  function addMetric(metricId: string | null) {
    if (!metricId || locked) return
    const metric = goal.metrics.find((m) => m.id === metricId)
    if (!metric || selectedIds.includes(metricId)) return
    setSelectedIds((prev) => [...prev, metricId])
    setDrafts((prev) => ({ ...prev, [metricId]: defaultValue(metric) }))
    setActiveMetricId(metricId)
    setAddValue("")
  }

  function removeMetric(metricId: string) {
    if (locked) return
    setSelectedIds((prev) => prev.filter((id) => id !== metricId))
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[metricId]
      return next
    })
    setActiveMetricId((prev) => (prev === metricId ? null : prev))
  }

  const missNow = deadlineMissDays(attempt)

  function handleComplete() {
    const results: AttemptResult[] = selectedIds
      .map((id) => {
        const value = drafts[id]
        if (value === undefined) return null
        return { metricId: id, value }
      })
      .filter((r): r is AttemptResult => r !== null)
    completeAttempt(attempt.id, results, { happened, learned, futureNote })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-5 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Record results for "{attempt.title}"</DialogTitle>
        </DialogHeader>

        <div className="grid items-start gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2.5">
            <p className="text-sm text-muted-foreground">
              {isTinyAttempt(attempt)
                ? "Tiny experiment done"
                : "All tasks are done"}
              {attempt.startedAt
                ? ` — started ${formatTimeSince(attempt.startedAt)}`
                : ""}
              .{" "}
              {locked
                ? "Enter results for the metrics you predicted."
                : `Choose which metrics this experiment moved (up to ${goal.metrics.length}).`}
            </p>

            {attempt.deadline && missNow !== null && (
              <p
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs",
                  missNow > 0
                    ? "bg-red-400/10 text-red-400"
                    : "bg-emerald-400/10 text-emerald-400",
                )}
              >
                Deadline was {formatShortDate(attempt.deadline)} — you are
                finishing {formatMissDays(missNow)}.
              </p>
            )}

            {goal.metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This goal has no metrics, so there is nothing to record —
                completing will just archive the experiment.
              </p>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {selectedIds.map((id) => {
                    const metric = goal.metrics.find((m) => m.id === id)
                    const value = drafts[id]
                    if (!metric || value === undefined) return null
                    const index = goal.metrics.findIndex((m) => m.id === id)
                    const prediction =
                      attempt.predictions.find((p) => p.metricId === id) ?? null
                    const dir = metricDirection(metric)
                    const outcome = prediction
                      ? classifyOutcome(prediction, value, dir)
                      : null
                    const isActive = id === activeMetricId
                    const dot = (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: metricColor(Math.max(index, 0)) }}
                      />
                    )
                    return (
                      <motion.div
                        key={id}
                        layout
                        transition={{
                          type: "spring",
                          stiffness: 480,
                          damping: 42,
                          mass: 0.8,
                        }}
                        className="shrink-0 overflow-hidden"
                      >
                        {isActive ? (
                          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-white/[0.02] px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                                {dot}
                                <span className="truncate">{metric.name}</span>
                              </span>
                              <div className="flex shrink-0 items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {metricAggregation(metric) === "sum"
                                    ? `this experiment · total ${formatMetricValue(metric.currentValue)}${metric.unit ?? ""}`
                                    : `best so far ${formatMetricValue(metric.currentValue)}${metric.unit ?? ""}`}
                                </span>
                                {!locked && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => removeMetric(id)}
                                    aria-label={`Remove ${metric.name}`}
                                  >
                                    <X size={12} />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {prediction && (
                              <span className="text-[11px] text-muted-foreground">
                                Predicted
                                {metricAggregation(metric) === "sum"
                                  ? " for this experiment"
                                  : ""}
                                : worst {formatMetricValue(prediction.worst)} ·
                                acceptable{" "}
                                {formatMetricValue(prediction.acceptable)} ·
                                best {formatMetricValue(prediction.best)}
                              </span>
                            )}
                            <ResultRange
                              value={value}
                              prediction={prediction}
                              worstSide={dir === 1 ? "left" : "right"}
                              outcome={outcome}
                              onValueChange={(next) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [id]: next,
                                }))
                              }
                            />
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
                            onClick={() => setActiveMetricId(id)}
                            className="group flex w-full items-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                          >
                            {dot}
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                              {metric.name}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground/80">
                              {metricAggregation(metric) === "sum"
                                ? "Adds up"
                                : "Best"}
                            </span>
                            {outcome && (
                              <span
                                className={cn(
                                  "shrink-0 text-[11px]",
                                  outcome.className,
                                )}
                              >
                                {outcome.label}
                              </span>
                            )}
                            <span className="shrink-0 font-logo text-xs tabular-nums text-foreground/90">
                              {formatMetricValue(value)}
                              {metric.unit ?? ""}
                            </span>
                          </button>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {!locked && available.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select value={addValue || undefined} onValueChange={addMetric}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Add another metric" />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        if (available[0]) addMetric(available[0].id)
                      }}
                      aria-label="Add metric"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  For stacking metrics, enter what this experiment contributed.
                  For best-mode metrics, enter the absolute result — the goal
                  keeps the higher of that and your current best.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                What happened?
              </label>
              <Textarea
                value={happened}
                onChange={(e) => setHappened(e.target.value)}
                placeholder="How did this experiment actually go?"
                className="min-h-20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                What did you learn & will try next time?
              </label>
              <Textarea
                value={learned}
                onChange={(e) => setLearned(e.target.value)}
                placeholder="Insights from this try, and what you'll change on the next one"
                className="min-h-20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                One line for future you
              </label>
              <Input
                value={futureNote}
                onChange={(e) => setFutureNote(e.target.value)}
                placeholder="The one thing future you should remember"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete}>Complete experiment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
