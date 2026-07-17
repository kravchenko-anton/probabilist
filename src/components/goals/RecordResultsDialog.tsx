import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ResultRange, formatMetricValue } from "@/components/ui/metric-range"
import { useGoals } from "@/lib/goals-store"
import { metricAggregation, type Goal } from "@/data/goals"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  classifyOutcome,
  deadlineMissDays,
  formatMissDays,
  metricDirection,
  type Attempt,
  type AttemptResult,
} from "@/data/attempts"
import { metricColor } from "@/lib/metric-colors"
import { formatShortDate, formatTimeSince } from "@/lib/date"
import { cn } from "@/lib/utils"

interface RecordResultsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
  attempt: Attempt
}

export function RecordResultsDialog({ open, onOpenChange, goal, attempt }: RecordResultsDialogProps) {
  const { completeAttempt } = useGoals()
  const [drafts, setDrafts] = useState<Record<string, number>>({})
  const [happened, setHappened] = useState("")
  const [learned, setLearned] = useState("")
  const [futureNote, setFutureNote] = useState("")
  // Only one metric editor is open at a time; the rest collapse to summaries.
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    // Sum metrics record this attempt's contribution (start at 0).
    // Max metrics record the absolute value achieved (seed at current best).
    setDrafts(
      Object.fromEntries(
        goal.metrics.map((metric) => [
          metric.id,
          metricAggregation(metric) === "sum" ? 0 : metric.currentValue,
        ])
      )
    )
    setHappened("")
    setLearned("")
    setFutureNote("")
    setActiveMetricId(goal.metrics[0]?.id ?? null)
  }, [open, goal])

  const missNow = deadlineMissDays(attempt)

  function handleComplete() {
    const results: AttemptResult[] = goal.metrics.map((metric) => ({
      metricId: metric.id,
      value:
        drafts[metric.id] ??
        (metricAggregation(metric) === "sum" ? 0 : metric.currentValue),
    }))
    completeAttempt(attempt.id, results, { happened, learned, futureNote })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Record results for "{attempt.title}"</DialogTitle>
        </DialogHeader>

        <div className="grid items-start gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2.5">
            <p className="text-sm text-muted-foreground">
              All tasks are done{attempt.startedAt ? ` — started ${formatTimeSince(attempt.startedAt)}` : ""}.
              Enter each metric for this experiment. Stacking metrics add to the goal total; best-mode
              metrics keep the single highest result.
            </p>

            {attempt.deadline && missNow !== null && (
              <p
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs",
                  missNow > 0 ? "bg-red-400/10 text-red-400" : "bg-emerald-400/10 text-emerald-400"
                )}
              >
                Deadline was {formatShortDate(attempt.deadline)} — you are finishing{" "}
                {formatMissDays(missNow)}.
              </p>
            )}

            {goal.metrics.length === 0 && (
              <p className="text-sm text-muted-foreground">
                This goal has no metrics, so there is nothing to record — completing will just
                archive the experiment.
              </p>
            )}

            <AnimatePresence initial={false}>
              {goal.metrics.map((metric, index) => {
                const value = drafts[metric.id]
                if (value === undefined) return null
                const prediction = attempt.predictions.find((p) => p.metricId === metric.id) ?? null
                const dir = metricDirection(metric)
                const outcome = prediction ? classifyOutcome(prediction, value, dir) : null
                const isActive = metric.id === activeMetricId
                const dot = (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: metricColor(index) }}
                  />
                )
                return (
                  <motion.div
                    key={metric.id}
                    layout
                    transition={{ type: "spring", stiffness: 480, damping: 42, mass: 0.8 }}
                    className="shrink-0 overflow-hidden"
                  >
                    {isActive ? (
                      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-white/[0.02] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                            {dot}
                            <span className="truncate">{metric.name}</span>
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {metricAggregation(metric) === "sum"
                              ? `this experiment · total ${formatMetricValue(metric.currentValue)}${metric.unit ?? ""}`
                              : `best so far ${formatMetricValue(metric.currentValue)}${metric.unit ?? ""}`}
                          </span>
                        </div>
                        {prediction && (
                          <span className="text-[11px] text-muted-foreground">
                            Predicted{metricAggregation(metric) === "sum" ? " for this experiment" : ""}:
                            worst {formatMetricValue(prediction.worst)} · acceptable{" "}
                            {formatMetricValue(prediction.acceptable)} · best{" "}
                            {formatMetricValue(prediction.best)}
                          </span>
                        )}
                        <ResultRange
                          value={value}
                          prediction={prediction}
                          worstSide={dir === 1 ? "left" : "right"}
                          outcome={outcome}
                          onValueChange={(next) =>
                            setDrafts((prev) => ({ ...prev, [metric.id]: next }))
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
                        onClick={() => setActiveMetricId(metric.id)}
                        className="group flex w-full items-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                      >
                        {dot}
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {metric.name}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground/80">
                          {metricAggregation(metric) === "sum" ? "Adds up" : "Best"}
                        </span>
                        {outcome && (
                          <span className={cn("shrink-0 text-[11px]", outcome.className)}>
                            {outcome.label}
                          </span>
                        )}
                        <span className="shrink-0 font-logo text-xs tabular-nums text-foreground/90">
                          {formatMetricValue(value)}
                          {metric.unit ?? ""}
                          {metricAggregation(metric) === "sum" && metric.currentValue > 0 && (
                            <span className="ml-1 text-muted-foreground/70">
                              → {formatMetricValue(metric.currentValue + value)}
                              {metric.unit ?? ""}
                            </span>
                          )}
                        </span>
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {goal.metrics.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                For stacking metrics, enter what this experiment contributed. For best-mode metrics,
                enter the absolute result — the goal keeps the higher of that and your current
                best.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">What happened?</label>
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
              <label className="text-xs font-medium text-foreground">One line for future you</label>
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
