import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGoals } from "@/lib/goals-store"
import type { Goal } from "@/data/goals"
import { metricDirection, type Attempt, type MetricPrediction } from "@/data/attempts"
import { metricColor } from "@/lib/metric-colors"

interface PredictionDraft {
  metricId: string
  worst: string
  acceptable: string
  best: string
}

interface StartAttemptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
  attempt: Attempt
}

export function StartAttemptDialog({ open, onOpenChange, goal, attempt }: StartAttemptDialogProps) {
  const { startAttempt } = useGoals()
  const [drafts, setDrafts] = useState<PredictionDraft[]>([])

  useEffect(() => {
    if (!open) return
    setDrafts(
      goal.metrics.map((metric) => ({
        metricId: metric.id,
        worst: String(metric.currentValue),
        acceptable: String(metric.currentValue),
        best: String(metric.currentValue),
      }))
    )
  }, [open, goal])

  function updateDraft(metricId: string, patch: Partial<PredictionDraft>) {
    setDrafts((prev) =>
      prev.map((draft) => (draft.metricId === metricId ? { ...draft, ...patch } : draft))
    )
  }

  function draftError(draft: PredictionDraft): string | null {
    const metric = goal.metrics.find((m) => m.id === draft.metricId)
    if (!metric) return null
    const worst = Number(draft.worst)
    const acceptable = Number(draft.acceptable)
    const best = Number(draft.best)
    if ([draft.worst, draft.acceptable, draft.best].some((v) => v.trim() === "")) {
      return "Fill in all three predictions."
    }
    if ([worst, acceptable, best].some((v) => Number.isNaN(v))) {
      return "Predictions must be numbers."
    }
    const dir = metricDirection(metric)
    if (worst * dir > acceptable * dir || acceptable * dir > best * dir) {
      return "Order must be worst ≤ acceptable ≤ best (toward the target)."
    }
    return null
  }

  const errors = drafts.map(draftError)
  const isValid = errors.every((error) => error === null)

  function handleStart() {
    if (!isValid) return
    const predictions: MetricPrediction[] = drafts.map((draft) => ({
      metricId: draft.metricId,
      worst: Number(draft.worst),
      acceptable: Number(draft.acceptable),
      best: Number(draft.best),
    }))
    startAttempt(attempt.id, predictions)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start "{attempt.title}"</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Before you start, predict where each metric will land once this attempt is
            finished. You will compare reality against these numbers later.
          </p>

          {goal.metrics.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This goal has no metrics yet — you can still run the attempt, but there will be
              nothing to predict or measure.
            </p>
          )}

          {goal.metrics.map((metric, index) => {
            const draft = drafts.find((d) => d.metricId === metric.id)
            if (!draft) return null
            const error = errors[drafts.indexOf(draft)]
            return (
              <div key={metric.id} className="flex flex-col gap-1.5 rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: metricColor(index) }} />
                    {metric.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    now {metric.currentValue}
                    {metric.unit ?? ""} · target {metric.targetValue}
                    {metric.unit ?? ""}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-muted-foreground">Worst</label>
                    <Input
                      type="number"
                      value={draft.worst}
                      onChange={(e) => updateDraft(metric.id, { worst: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-muted-foreground">Acceptable</label>
                    <Input
                      type="number"
                      value={draft.acceptable}
                      onChange={(e) => updateDraft(metric.id, { acceptable: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-muted-foreground">Best</label>
                    <Input
                      type="number"
                      value={draft.best}
                      onChange={(e) => updateDraft(metric.id, { best: e.target.value })}
                    />
                  </div>
                </div>

                {error && <p className="text-[11px] text-amber-400">{error}</p>}
              </div>
            )
          })}
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={!isValid}>
            Start attempt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
