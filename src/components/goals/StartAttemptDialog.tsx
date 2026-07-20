import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PredictionRange, formatMetricValue } from "@/components/ui/metric-range"
import { metricDirection, type Attempt, type MetricPrediction } from "@/data/attempts"
import { metricAggregation, type Goal, type GoalMetric } from "@/data/goals"
import { useGoals } from "@/lib/goals-store"
import { metricColor } from "@/lib/metric-colors"
import { Plus, X } from "lucide-react"
import { useEffect, useState } from "react"

interface PredictionDraft {
  worst: number
  acceptable: number
  best: number
}

function defaultDraft(metric: GoalMetric): PredictionDraft {
  const dir = metricDirection(metric)
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, PredictionDraft>>({})
  const [addValue, setAddValue] = useState<string>("")

  const available = goal.metrics.filter((m) => !selectedIds.includes(m.id))

  useEffect(() => {
    if (!open) return
    const first = goal.metrics[0]
    if (first) {
      setSelectedIds([first.id])
      setDrafts({ [first.id]: defaultDraft(first) })
    } else {
      setSelectedIds([])
      setDrafts({})
    }
    setAddValue("")
  }, [open, goal])

  function addMetric(metricId: string | null) {
    if (!metricId) return
    const metric = goal.metrics.find((m) => m.id === metricId)
    if (!metric || selectedIds.includes(metricId)) return
    setSelectedIds((prev) => [...prev, metricId])
    setDrafts((prev) => ({ ...prev, [metricId]: defaultDraft(metric) }))
    setAddValue("")
  }

  function removeMetric(metricId: string) {
    setSelectedIds((prev) => prev.filter((id) => id !== metricId))
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[metricId]
      return next
    })
  }

  function handleStart() {
    const predictions: MetricPrediction[] = selectedIds
      .map((id) => {
        const draft = drafts[id]
        if (!draft) return null
        return { metricId: id, ...draft }
      })
      .filter((p): p is MetricPrediction => p !== null)
    startAttempt(attempt.id, predictions)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start "{attempt.title}"</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Choose which metrics this experiment will move (up to{" "}
            {goal.metrics.length || 0}), then predict where each will land.
          </p>

          {goal.metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This goal has no metrics yet — you can still run the experiment, but there will be
              nothing to predict or measure.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {selectedIds.map((id) => {
                  const metric = goal.metrics.find((m) => m.id === id)
                  const draft = drafts[id]
                  if (!metric || !draft) return null
                  const index = goal.metrics.findIndex((m) => m.id === id)
                  const dir = metricDirection(metric)
                  return (
                    <div
                      key={id}
                      className="flex flex-col gap-1.5 rounded-xl border border-border bg-white/[0.02] px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: metricColor(Math.max(index, 0)) }}
                          />
                          <span className="truncate text-sm font-medium text-foreground">
                            {metric.name}
                          </span>
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {metricAggregation(metric) === "sum"
                              ? `total ${formatMetricValue(metric.currentValue)}${metric.unit ?? ""} · need ${formatMetricValue(Math.max(metric.targetValue - metric.currentValue, 0))}${metric.unit ?? ""}`
                              : `now ${formatMetricValue(metric.currentValue)}${metric.unit ?? ""} · target ${formatMetricValue(metric.targetValue)}${metric.unit ?? ""}`}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeMetric(id)}
                            aria-label={`Remove ${metric.name}`}
                          >
                            <X size={12} />
                          </Button>
                        </div>
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
                          setDrafts((prev) => ({
                            ...prev,
                            [id]:
                              dir === 1
                                ? { worst: a, acceptable: b, best: c }
                                : { worst: c, acceptable: b, best: a },
                          }))
                        }
                      />
                    </div>
                  )
                })}
              </div>

              {available.length > 0 && (
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
                    disabled={available.length === 0}
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
                Drag the lines to set worst, acceptable and best outcomes, or tap a number to type
                an exact value.
              </p>
            </>
          )}
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart}>Predict &amp; start</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
