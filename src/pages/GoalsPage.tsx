import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { Button } from "@/components/ui/button"
import { Emoji } from "@/components/ui/emoji"
import { goalProgress, isGoalDone } from "@/data/goals"
import { useGoals } from "@/lib/goals-store"
import { cn } from "@/lib/utils"
import { Check, Plus, Target } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

export function GoalsPage() {
  const { goals } = useGoals()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4 sm:px-6">
        <Target size={16} className="text-muted-foreground" />
        <h1 className="text-[15px] font-medium text-foreground">Goals</h1>
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus size={13} />
          New goal
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {goals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No goals yet. Create one to start tracking metrics through experiments.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal) => {
              const progress = goalProgress(goal)
              const done = isGoalDone(goal)
              return (
                <Link
                  key={goal.id}
                  to={`/goal/${goal.slug}`}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <Emoji value={goal.emoji} className="size-5" />
                    <span className="flex-1 truncate text-sm font-medium text-foreground">
                      {goal.title}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-sm",
                        done ? "text-emerald-400" : "text-muted-foreground"
                      )}
                    >
                      {done && <Check size={13} />}
                      {Math.round(progress)}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        done ? "bg-emerald-400" : "bg-primary"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <span className="text-xs text-muted-foreground">{goal.timePeriodLabel}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <GoalFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
