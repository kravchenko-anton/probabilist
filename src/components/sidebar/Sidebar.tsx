import { useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import {
  BrainCog,
  Calendar1,
  CalendarRange,
  Check,
  ChevronRight,
  Inbox,
  LogOut,
  Plus,
  Sunrise,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { goalProgress, isGoalDone } from "@/data/goals"
import { tasksDoneCount } from "@/data/attempts"
import { useGoals } from "@/lib/goals-store"
import { useAppTasks } from "@/lib/tasks-store"
import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { AttemptFormDialog } from "@/components/goals/AttemptFormDialog"
import { countForView } from "@/lib/task-groups"
import { cn } from "@/lib/utils"

/** Avatar chip next to the logo; hovering it reveals the profile card with logout. */
function UserBadge() {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Avatar
        size="sm"
        className="size-6 cursor-pointer ring-1 ring-transparent transition-shadow hover:ring-foreground/30"
      >
        <AvatarImage src="" alt="Anton Kravchenko" />
        <AvatarFallback className="text-[10px]">AK</AvatarFallback>
      </Avatar>

      {open && (
        <div className="absolute right-0 top-full z-50 w-56 pt-1.5">
          <div className="flex flex-col gap-2 rounded-lg bg-popover p-3 shadow-md ring-1 ring-foreground/10">
            <div className="flex items-center gap-2.5">
              <Avatar size="sm">
                <AvatarImage src="" alt="Anton Kravchenko" />
                <AvatarFallback>AK</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-medium text-foreground">
                  Anton Kravchenko
                </span>
                <span className="truncate text-xs text-muted-foreground">ant...@gmail.com</span>
              </div>
            </div>
            <Separator />
            <button className="flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-white/5 hover:text-foreground">
              <LogOut size={14} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Notion-style expander: shows the item's emoji, flips to a chevron on row hover. */
function ExpandToggle({
  emoji,
  expanded,
  onToggle,
}: {
  emoji?: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-label={expanded ? "Collapse" : "Expand"}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      className="relative flex size-5 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
    >
      <span className="text-[14px] leading-none transition-opacity group-hover/row:opacity-0">
        {emoji ?? "📝"}
      </span>
      <ChevronRight
        size={14}
        className={cn(
          "absolute text-muted-foreground opacity-0 transition-all group-hover/row:opacity-100",
          expanded && "rotate-90"
        )}
      />
    </button>
  )
}

export function Sidebar() {
  const { goals, attempts } = useGoals()
  const { tasks } = useAppTasks()
  const [createGoalOpen, setCreateGoalOpen] = useState(false)
  const [attemptFormGoalId, setAttemptFormGoalId] = useState<string>()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const location = useLocation()

  const activeAttemptId = new URLSearchParams(location.search).get("attempt")

  const isExpanded = (key: string, fallback: boolean) => expanded[key] ?? fallback
  const toggle = (key: string, fallback: boolean) =>
    setExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? fallback) }))

  const topItems = [
    { label: "Today", to: "/today", icon: Calendar1, count: countForView(tasks, "today") },
    { label: "Tomorrow", to: "/tomorrow", icon: Sunrise, count: countForView(tasks, "tomorrow") },
    {
      label: "Next 7 Days",
      to: "/next-7-days",
      icon: CalendarRange,
      count: countForView(tasks, "next7"),
    },
    { label: "Inbox", to: "/inbox", icon: Inbox, count: countForView(tasks, "inbox") },
  ]

  return (
    <div className="hidden h-full w-[240px] shrink-0 flex-col overflow-y-auto bg-sidebar px-2 py-2 text-[13px] md:flex">
     <Link to="/">
       <div
         className="flex cursor-pointer items-center gap-2 px-2 py-1.5">
         <BrainCog size={18} />
         <h1 className="flex-1 truncate font-medium">Probabilist</h1>
         <UserBadge />
       </div>
     </Link>

      <div className="mt-3 flex flex-col gap-px">
        {topItems.map(({ label, to, icon: Icon, count }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex h-7 items-center gap-2 rounded-md px-2 font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground",
                isActive && "bg-white/10 text-foreground"
              )
            }
          >
            <Icon size={15} className="shrink-0" />
            <span className="flex-1 truncate text-left">{label}</span>
            {count > 0 && <span className="text-xs text-muted-foreground/70">{count}</span>}
          </NavLink>
        ))}
      </div>

      <div className="group/section mt-5 flex h-6 items-center justify-between rounded-md px-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground/80">Goals</p>
        <button
          onClick={() => setCreateGoalOpen(true)}
          aria-label="New goal"
          className="flex size-5 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-white/10 hover:text-foreground group-hover/section:opacity-100"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="mt-0.5 flex flex-col gap-px">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const goalPath = `/goal/${goal.slug}`
            const onGoalPage = location.pathname === goalPath
            const goalActive = onGoalPage && !activeAttemptId
            const goalAttempts = attempts.filter(
              (attempt) => attempt.goalId === goal.id && attempt.status !== "completed"
            )
            const goalOpen = isExpanded(goal.id, onGoalPage)

            return (
              <div key={goal.id} className="flex flex-col gap-px">
                <div
                  className={cn(
                    "group/row flex h-7 items-center gap-1.5 rounded-md px-1.5 font-medium text-muted-foreground hover:bg-white/5",
                    goalActive && "bg-white/10 text-foreground"
                  )}
                >
                  <ExpandToggle
                    emoji={goal.emoji}
                    expanded={goalOpen}
                    onToggle={() => toggle(goal.id, onGoalPage)}
                  />
                  <NavLink to={goalPath} className="min-w-0 flex-1 truncate hover:text-foreground">
                    {goal.title}
                  </NavLink>
                  {isGoalDone(goal) ? (
                    <Check size={13} className="text-emerald-400 group-hover/row:hidden" />
                  ) : (
                    <span className="text-[11px] text-muted-foreground/70 group-hover/row:hidden">
                      {Math.round(goalProgress(goal))}%
                    </span>
                  )}
                  <button
                    onClick={() => setAttemptFormGoalId(goal.id)}
                    aria-label="New attempt"
                    className="hidden size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground group-hover/row:flex"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {goalOpen &&
                  (goalAttempts.length > 0 ? (
                    goalAttempts.map((attempt) => {
                      const attemptActive = onGoalPage && activeAttemptId === attempt.id
                      return (
                        <Link
                          key={attempt.id}
                          to={`${goalPath}?attempt=${attempt.id}`}
                          className={cn(
                            "flex h-7 items-center gap-1.5 rounded-md pl-6 pr-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground",
                            attemptActive && "bg-white/10 text-foreground"
                          )}
                        >
                          <span className="flex size-5 shrink-0 items-center justify-center text-[13px] leading-none">
                            {attempt.icon ?? "📝"}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{attempt.title}</span>
                          <span
                            className={cn(
                              "text-[10px] text-muted-foreground/70",
                              attempt.status === "active" && "text-primary-foreground/70"
                            )}
                          >
                            {tasksDoneCount(attempt)}/{attempt.tasks.length}
                          </span>
                        </Link>
                      )
                    })
                  ) : (
                    <p className="py-1 pl-9 pr-2 text-xs text-muted-foreground/60">No attempts</p>
                  ))}
              </div>
            )
          })
        ) : (
          <div className="flex h-32 w-full items-center rounded-md bg-accent">
            <div className="flex flex-col gap-2 text-center">
              <p className="mx-4 text-[10px] text-white">Organize and plan your work with goals</p>
              <Button
                onClick={() => setCreateGoalOpen(true)}
                size="xs"
                className="mx-auto ml-2 mr-2 w-[40%] border-white bg-transparent text-white hover:bg-white hover:text-black"
              >
                New goal
              </Button>
            </div>
          </div>
        )}
      </div>

      <GoalFormDialog open={createGoalOpen} onOpenChange={setCreateGoalOpen} />

      {attemptFormGoalId && (
        <AttemptFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setAttemptFormGoalId(undefined)
          }}
          goalId={attemptFormGoalId}
        />
      )}

    </div>
  )
}
