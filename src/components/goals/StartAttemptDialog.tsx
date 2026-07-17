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
import { PredictionRange, formatMetricValue } from "@/components/ui/metric-range"
import { useGoals } from "@/lib/goals-store"
import { metricAggregation, type Goal, type GoalMetric } from "@/data/goals"
import { metricDirection, type Attempt, type MetricPrediction } from "@/data/attempts"
import { metricColor } from "@/lib/metric-colors"

interface PredictionDraft {
  worst: number
  acceptable: number
  best: number
}

function defaultDraft(metric: GoalMetric): PredictionDraft {
  const dir = metricDirection(metric)
  // Sum metrics: predict this attempt's contribution (from 0).
  // Max metrics: predict absolute outcome relative to current best.
  if (metricAggregation(metric) === "sum") {
    const target = Math.max(metric.targetValue - metric.currentValue, 0)
    const best = target > 0 ? target : Math.max(metric.targetValue, 1)
    return { worst: 0, acceptable: Math.round(best / 2), best }
  }
  const worst = metric.currentValue
  const best = worst * dir > metric.targetValue * dir ? worst : metric.targetValue
  return { worst, acceptable: Math.round((worst + best) / 2), best }
}

interface StartAttemptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
  attempt: Attempt
}

export function StartAttemptDialog({ open, onOpenChange, goal, attempt }: StartAttemptDialogProps) {
  const { startAttempt } = useGoals()
  const [drafts, setDrafts] = useState<Record<string, PredictionDraft>>({})
  // Only one metric editor is open at a time; the rest collapse to summaries.
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDrafts(Object.fromEntries(goal.metrics.map((metric) => [metric.id, defaultDraft(metric)])))
    setActiveMetricId(goal.metrics[0]?.id ?? null)
  }, [open, goal])

  function updateDraft(metricId: string, draft: PredictionDraft) {
    setDrafts((prev) => ({ ...prev, [metricId]: draft }))
  }

  function handleStart() {
    const predictions: MetricPrediction[] = goal.metrics
      .filter((metric) => drafts[metric.id])
      .map((metric) => ({ metricId: metric.id, ...drafts[metric.id] }))
    startAttempt(attempt.id, predictions)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start "{attempt.title}"</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2.5">
          <p className="text-sm text-muted-foreground">
            Before you start, predict where each metric will land once this experiment is finished.
            For stacking metrics, predict this experiment&apos;s contribution; for best-mode metrics,
            predict the absolute result.
          </p>

          {goal.metrics.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This goal has no metrics yet — you can still run the experiment, but there will be
              nothing to predict or measure.
            </p>
          )}

          <AnimatePresence initial={false}>
            {goal.metrics.map((metric, index) => {
              const draft = drafts[metric.id]
              if (!draft) return null
              const dir = metricDirection(metric)
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
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {dot}
                          {metric.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {metricAggregation(metric) === "sum"
                            ? `total ${formatMetricValue(metric.currentValue)}${metric.unit ?? ""} · need ${formatMetricValue(Math.max(metric.targetValue - metric.currentValue, 0))}${metric.unit ?? ""}`
                            : `now ${formatMetricValue(metric.currentValue)}${metric.unit ?? ""} · target ${formatMetricValue(metric.targetValue)}${metric.unit ?? ""}`}
                        </span>
                      </div>
                      <PredictionRange
                        value={
                          dir === 1
                            ? [draft.worst, draft.acceptable, draft.best]
                            : [draft.best, draft.acceptable, draft.worst]
                        }
                        labels={
                          dir === 1
                            ? ["Worst", "Acceptable", "Best"]
                            : ["Best", "Acceptable", "Worst"]
                        }
                        worstSide={dir === 1 ? "left" : "right"}
                        onValueChange={([a, b, c]) =>
                          updateDraft(
                            metric.id,
                            dir === 1
                              ? { worst: a, acceptable: b, best: c }
                              : { worst: c, acceptable: b, best: a }
                          )
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
                      <span className="shrink-0 font-logo text-xs tabular-nums">
                        <span className="text-red-300/90">{formatMetricValue(draft.worst)}</span>
                        <span className="mx-1 text-muted-foreground/60">→</span>
                        <span className="text-foreground/80">
                          {formatMetricValue(draft.acceptable)}
                        </span>
                        <span className="mx-1 text-muted-foreground/60">→</span>
                        <span className="text-emerald-300/90">{formatMetricValue(draft.best)}</span>
                      </span>
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>

          {goal.metrics.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Drag the lines to set worst, acceptable and best outcomes, or tap a number to type
              an exact value.
            </p>
          )}
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart}>Start experiment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
