import { AttemptFormDialog } from "@/components/goals/AttemptFormDialog"
import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { Emoji } from "@/components/ui/emoji"
import { isTinyAttempt } from "@/data/attempts"
import { goalProgress, isGoalDone } from "@/data/goals"
import { useAuth } from "@/lib/auth"
import { useGoals } from "@/lib/goals-store"
import { cn } from "@/lib/utils"
import { BrainCog, Check, ChevronRight, LogOut, Plus } from "lucide-react"
import { useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"

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
        value={emoji ?? "🎯"}
        className="size-3.5 transition-opacity group-hover/row:opacity-0"
      />
      <ChevronRight
        size={14}
        className={cn(
          "absolute text-muted-foreground opacity-0 transition-all group-hover/row:opacity-100",
          expanded && "rotate-90",
        )}
      />
    </button>
  )
}

function attemptStatusHint(status: "planned" | "active" | "completed", tiny: boolean) {
  if (status === "planned") return "Ready"
  if (status === "active") return tiny ? "Running" : "In progress"
  return "Done"
}

export function Sidebar() {
  const { goals, attempts } = useGoals()
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

  const isExpanded = (key: string, fallback: boolean) =>
    expanded[key] ?? fallback
  const toggle = (key: string, fallback: boolean) =>
    setExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? fallback) }))

  return (
    <div className="hidden h-full w-[240px] shrink-0 flex-col bg-sidebar text-[13px] md:flex">
      <div className="flex flex-1 flex-col overflow-y-auto px-2 py-2">
        <Link to="/">
          <div className="flex cursor-pointer items-center gap-2 px-2 py-1.5">
            <BrainCog size={18} />
            <h1 className="flex-1 truncate font-logo text-[15px] font-semibold tracking-tight">
              loopy
            </h1>
          </div>
        </Link>

        <div className="mt-4 px-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Goals
          </p>
        </div>

        <div className="mt-2 flex flex-col gap-px">
          {goals.length > 0 ? (
            goals.map((goal) => {
              const goalPath = `/goal/${goal.slug}`
              const onGoalPage = location.pathname === goalPath
              const goalActive = onGoalPage && !activeAttemptId
              const goalAttempts = attempts.filter(
                (attempt) =>
                  attempt.goalId === goal.id && attempt.status !== "completed",
              )
              const goalOpen = isExpanded(goal.id, onGoalPage)

              return (
                <div key={goal.id} className="flex flex-col gap-px">
                  <div
                    className={cn(
                      "group/row flex h-7 items-center gap-1.5 rounded-md px-1.5 font-medium text-muted-foreground hover:bg-white/5",
                      goalActive && "bg-white/10 text-foreground",
                    )}
                  >
                    <ExpandToggle
                      emoji={goal.emoji}
                      expanded={goalOpen}
                      onToggle={() => toggle(goal.id, onGoalPage)}
                    />
                    <NavLink
                      to={goalPath}
                      className="min-w-0 flex-1 truncate hover:text-foreground"
                    >
                      {goal.title}
                    </NavLink>
                    {isGoalDone(goal) ? (
                      <Check
                        size={13}
                        className="text-emerald-400 group-hover/row:hidden"
                      />
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
                        const attemptActive =
                          onGoalPage && activeAttemptId === attempt.id
                        return (
                          <Link
                            key={attempt.id}
                            to={`${goalPath}?attempt=${attempt.id}`}
                            className={cn(
                              "flex h-7 items-center gap-1.5 rounded-md pl-6 pr-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground",
                              attemptActive && "bg-white/10 text-foreground",
                            )}
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center">
                              <Emoji
                                value={attempt.icon ?? "🧪"}
                                className="size-[13px]"
                              />
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {attempt.title}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] text-muted-foreground/70",
                                attempt.status === "active" &&
                                  "text-primary-foreground/70",
                              )}
                            >
                              {attemptStatusHint(
                                attempt.status,
                                isTinyAttempt(attempt),
                              )}
                            </span>
                          </Link>
                        )
                      })
                    ) : (
                      <p className="py-1 pl-9 pr-2 text-xs text-muted-foreground/60">
                        No experiments yet
                      </p>
                    ))}
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-3 py-5 text-center">
              <Emoji value="🎯" className="size-7" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-foreground">
                  Start with a goal
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Pick something you want to move, then run tiny experiments
                  against it.
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
