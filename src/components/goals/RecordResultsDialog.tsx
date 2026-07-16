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
import { Textarea } from "@/components/ui/textarea"
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
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [retrospective, setRetrospective] = useState("")

  useEffect(() => {
    if (!open) return
    setDrafts(
      Object.fromEntries(goal.metrics.map((metric) => [metric.id, String(metric.currentValue)]))
    )
    setRetrospective("")
  }, [open, goal])

  const missNow = deadlineMissDays(attempt)

  const isValid = goal.metrics.every((metric) => {
    const raw = drafts[metric.id]
    return raw !== undefined && raw.trim() !== "" && !Number.isNaN(Number(raw))
  })

  function handleComplete() {
    if (!isValid) return
    const results: AttemptResult[] = goal.metrics.map((metric) => ({
      metricId: metric.id,
      value: Number(drafts[metric.id]),
    }))
    completeAttempt(attempt.id, results, retrospective)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record results for "{attempt.title}"</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            All steps are done{attempt.startedAt ? ` — started ${formatTimeSince(attempt.startedAt)}` : ""}.
            Measure each metric and enter where it actually landed. This updates the goal.
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
              archive the attempt.
            </p>
          )}

          {goal.metrics.map((metric, index) => {
            const prediction = attempt.predictions.find((p) => p.metricId === metric.id)
            const raw = drafts[metric.id] ?? ""
            const parsed = Number(raw)
            const outcome =
              prediction && raw.trim() !== "" && !Number.isNaN(parsed)
                ? classifyOutcome(prediction, parsed, metricDirection(metric))
                : null

            return (
              <div key={metric.id} className="flex flex-col gap-1.5 rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: metricColor(index) }} />
                    {metric.name}
                  </span>
                  {prediction && (
                    <span className="text-xs text-muted-foreground">
                      worst {prediction.worst} · acceptable {prediction.acceptable} · best{" "}
                      {prediction.best}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={raw}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [metric.id]: e.target.value }))
                    }
                    className="w-28"
                  />
                  {metric.unit && (
                    <span className="text-xs text-muted-foreground">{metric.unit}</span>
                  )}
                  {outcome && (
                    <span className={cn("ml-auto text-xs", outcome.className)}>
                      {outcome.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Retrospective</label>
            <Textarea
              value={retrospective}
              onChange={(e) => setRetrospective(e.target.value)}
              placeholder="What was your experience? What did you learn, what would you update or do better next time?"
              className="min-h-20"
            />
          </div>
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={!isValid}>
            Complete attempt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
