import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Plus, Target } from "lucide-react"
import { useState } from "react"
import { NavLink } from "react-router-dom"

export function BottomNav() {
  const [createGoalOpen, setCreateGoalOpen] = useState(false)

  return (
    <nav className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex items-center rounded-2xl border border-divider bg-content1/90 px-1 shadow-small backdrop-blur-xl">
        <NavLink
          to="/goals"
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-tiny font-medium transition-colors duration-200",
              isActive ? "text-foreground" : "text-default-500",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-200",
                  isActive && "bg-primary/25",
                )}
              >
                <Target size={18} />
              </span>
              <span>Goals</span>
            </>
          )}
        </NavLink>

        <div className="flex flex-1 justify-center">
          <Button
            onClick={() => setCreateGoalOpen(true)}
            aria-label="New goal"
            size="icon-lg"
            className="-translate-y-3 size-12 rounded-full shadow-small ring-4 ring-background"
          >
            <Plus size={22} />
          </Button>
        </div>

        <div className="flex-1" aria-hidden />
      </div>

      <GoalFormDialog open={createGoalOpen} onOpenChange={setCreateGoalOpen} />
    </nav>
  )
}
