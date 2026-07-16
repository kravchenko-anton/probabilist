import { useState } from "react"
import { Link } from "react-router-dom"
import { Plus, Target } from "lucide-react"
import { useGoals } from "@/lib/goals-store"
import { goalProgress } from "@/data/goals"
import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { Button } from "@/components/ui/button"

export function GoalsPage() {
  const { goals } = useGoals()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4 sm:px-6">
        <Target size={16} className="text-muted-foreground" />
        <h1 className="font-heading text-[15px] font-medium text-foreground">Goals</h1>
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus size={13} />
          New goal
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {goals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No goals yet. Create one to start tracking metrics through attempts.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal) => {
              const progress = goalProgress(goal)
              return (
                <Link
                  key={goal.id}
                  to={`/goal/${goal.slug}`}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{goal.emoji}</span>
                    <span className="flex-1 truncate text-sm font-medium text-foreground">
                      {goal.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progress)}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
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
