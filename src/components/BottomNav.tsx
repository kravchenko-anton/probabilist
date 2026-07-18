import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { cn } from "@/lib/utils"
import { Plus, Target } from "lucide-react"
import { useState } from "react"
import { NavLink } from "react-router-dom"

export function BottomNav() {
  const [createGoalOpen, setCreateGoalOpen] = useState(false)

  return (
    <nav className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex items-center rounded-2xl border border-border bg-sidebar/90 px-2 shadow-lg shadow-black/40 backdrop-blur-xl">
        <NavLink
          to="/goals"
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  isActive && "bg-primary/40",
                )}
              >
                <Target size={18} />
              </span>
              <span>Goals</span>
            </>
          )}
        </NavLink>

        <div className="flex flex-1 justify-center">
          <button
            onClick={() => setCreateGoalOpen(true)}
            aria-label="New goal"
            className="flex size-12 -translate-y-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/50 ring-4 ring-background transition-transform active:scale-95"
          >
            <Plus size={22} />
          </button>
        </div>

        <div className="flex-1" aria-hidden />
      </div>

      <GoalFormDialog open={createGoalOpen} onOpenChange={setCreateGoalOpen} />
    </nav>
  )
}
