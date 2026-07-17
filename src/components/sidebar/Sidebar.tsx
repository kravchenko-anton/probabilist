import { AttemptFormDialog } from "@/components/goals/AttemptFormDialog"
import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { Emoji } from "@/components/ui/emoji"
import { activeTasks, tasksDoneCount } from "@/data/attempts"
import { goalProgress, isGoalDone } from "@/data/goals"
import { useAuth } from "@/lib/auth"
import { useGoals } from "@/lib/goals-store"
import { countForView } from "@/lib/task-groups"
import { useAppTasks } from "@/lib/tasks-store"
import { cn } from "@/lib/utils"
import { BrainCog, Check, ChevronRight, LogOut, Plus } from "lucide-react"
import { useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"

/** Avatar chip next to the logo; hovering it reveals the profile card with logout. */

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
      <Emoji
        value={emoji ?? "📝"}
        className="size-3.5 transition-opacity group-hover/row:opacity-0"
      />
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
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [createGoalOpen, setCreateGoalOpen] = useState(false)
  const [attemptFormGoalId, setAttemptFormGoalId] = useState<string>()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  const activeAttemptId = new URLSearchParams(location.search).get("attempt")

  const isExpanded = (key: string, fallback: boolean) => expanded[key] ?? fallback
  const toggle = (key: string, fallback: boolean) =>
    setExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? fallback) }))

  const topItems = [
    { label: "Today", to: "/today", emoji: "📅", count: countForView(tasks, "today") },
    { label: "Tomorrow", to: "/tomorrow", emoji: "🌅", count: countForView(tasks, "tomorrow") },
    {
      label: "Next 7 Days",
      to: "/next-7-days",
      emoji: "🗓️",
      count: countForView(tasks, "next7"),
    },
    { label: "Inbox", to: "/inbox", emoji: "📥", count: countForView(tasks, "inbox") },
  ]

  return (
    <div className="hidden h-full w-[240px] shrink-0 flex-col bg-sidebar text-[13px] md:flex">
     <div className="flex flex-1 flex-col overflow-y-auto px-2 py-2">
     <Link to="/">
       <div
         className="flex cursor-pointer items-center gap-2 px-2 py-1.5">
         <BrainCog size={18} />
         <h1 className="flex-1 truncate font-logo font-medium">loopy</h1>
       </div>
     </Link>

      <div className="mt-3 flex flex-col gap-px">
        {topItems.map(({ label, to, emoji, count }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex h-6 items-center gap-2 rounded-md px-2 font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground",
                isActive && "bg-white/10 text-foreground"
              )
            }
          >
            <Emoji value={emoji} className="size-[15px]" />
            <span className="flex-1 truncate text-left">{label}</span>
            {count > 0 && <span className="text-xs text-muted-foreground/70">{count}</span>}
          </NavLink>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-px pt-2">
        <NavLink
          to="/completed"
          className={({ isActive }) =>
            cn(
              "flex h-6 mt-4 items-center gap-2 rounded-md px-2 font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground",
              isActive && "bg-white/10 text-foreground"
            )
          }
        >
          <Emoji value="✅" className="size-[15px]" />
          <span className="flex-1 truncate text-left">Completed</span>
        </NavLink>
        <NavLink
          to="/trash"
          className={({ isActive }) =>
            cn(
              "flex h-6 items-center gap-2 rounded-md px-2 font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground",
              isActive && "bg-white/10 text-foreground"
            )
          }
        >
          <Emoji value="🗑️" className="size-[15px]" />
          <span className="flex-1 truncate text-left">Trash</span>
        </NavLink>
      </div>

      <div className="mt-10 flex flex-col gap-px">
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
                    "group/row flex h-6 items-center gap-1.5 rounded-md px-1.5 font-medium text-muted-foreground hover:bg-white/5",
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
                    aria-label="New experiment"
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
                          <span className="flex size-5 shrink-0 items-center justify-center">
                            <Emoji value={attempt.icon ?? "📝"} className="size-[13px]" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{attempt.title}</span>
                          <span
                            className={cn(
                              "text-[10px] text-muted-foreground/70",
                              attempt.status === "active" && "text-primary-foreground/70"
                            )}
                          >
                            {tasksDoneCount(attempt)}/{activeTasks(attempt).length}
                          </span>
                        </Link>
                      )
                    })
                  ) : (
                    <p className="py-1 pl-9 pr-2 text-xs text-muted-foreground/60">No experiments</p>
                  ))}
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-3 py-5 text-center">
            <Emoji value="🎯" className="size-7" />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-foreground">Dream big, start small</p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Turn what matters to you into a goal and make it happen
              </p>
            </div>
            <button
              onClick={() => setCreateGoalOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-white/15"
            >
              <Plus size={13} />
              New goal
            </button>
          </div>
        )}
      </div>
     </div>

      <div className="flex shrink-0 flex-col gap-1 border-t border-white/5 px-2 py-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div
            onClick={() => setCreateGoalOpen(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5"
          >
            <Plus size={18} className="shrink-0 text-muted-foreground" />
            <p className="text-[14px] text-muted-foreground">New Goal</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Log out"
            title="Log out"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <LogOut size={15} />
          </button>
        </div>
        {user?.email && (
          <p className="truncate px-2 text-[11px] text-muted-foreground/70">
            {user.email}
          </p>
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
