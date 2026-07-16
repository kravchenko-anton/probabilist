import { useState } from "react"
import { NavLink } from "react-router-dom"
import { Calendar1, CalendarRange, Inbox, Plus, Target } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useAppTasks } from "@/lib/tasks-store"
import { countForView } from "@/lib/task-groups"
import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { cn } from "@/lib/utils"

interface Tab {
  label: string
  to: string
  icon: LucideIcon
  count?: number
}

const rightTabs: Tab[] = [
  { label: "Week", to: "/next-7-days", icon: CalendarRange },
  { label: "Goals", to: "/goals", icon: Target },
]

function NavTab({ label, to, icon: Icon, count }: Tab) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
          isActive ? "text-foreground" : "text-muted-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
              isActive && "bg-primary/40"
            )}
          >
            <Icon size={18} />
            {!!count && count > 0 && (
              <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-none text-primary-foreground">
                {count}
              </span>
            )}
          </span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const [createGoalOpen, setCreateGoalOpen] = useState(false)
  const { tasks } = useAppTasks()

  const leftTabs: Tab[] = [
    { label: "Today", to: "/today", icon: Calendar1, count: countForView(tasks, "today") },
    { label: "Inbox", to: "/inbox", icon: Inbox, count: countForView(tasks, "inbox") },
  ]

  return (
    <nav className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex items-center rounded-2xl border border-border bg-sidebar/90 px-1 shadow-lg shadow-black/40 backdrop-blur-xl">
        {leftTabs.map((tab) => (
          <NavTab key={tab.to} {...tab} />
        ))}

        <div className="flex flex-1 justify-center">
          <button
            onClick={() => setCreateGoalOpen(true)}
            aria-label="New goal"
            className="flex size-12 -translate-y-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/50 ring-4 ring-background transition-transform active:scale-95"
          >
            <Plus size={22} />
          </button>
        </div>

        {rightTabs.map((tab) => (
          <NavTab key={tab.to} {...tab} />
        ))}
      </div>

      <GoalFormDialog open={createGoalOpen} onOpenChange={setCreateGoalOpen} />
    </nav>
  )
}
