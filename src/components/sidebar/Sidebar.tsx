import { AttemptFormDialog } from "@/components/goals/AttemptFormDialog"
import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { Button } from "@/components/ui/button"
import { Emoji } from "@/components/ui/emoji"
import { isTinyAttempt } from "@/data/attempts"
import { goalProgress, isGoalDone } from "@/data/goals"
import { useAuth } from "@/lib/auth"
import { useGoals } from "@/lib/goals-store"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { BrainCog, Check, ChevronRight, LogOut, Plus } from "lucide-react"
import { useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"

function attemptStatusHint(
  status: "planned" | "active" | "completed",
  tiny: boolean,
) {
  if (status === "planned") return "Ready"
  if (status === "active") return tiny ? "Running" : "In progress"
  return "Done"
}

/**
 * Goals nav — clean nested list pattern adapted from
 * screens/Application/sidebars (nested + listbox item classes).
 */
export function Sidebar() {
  const { goals, attempts } = useGoals()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
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
    <div className="hidden h-full w-[240px] shrink-0 flex-col border-r border-divider bg-sidebar md:flex">
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-large px-2 py-1.5 transition-colors duration-200 hover:bg-white/5"
        >
          <BrainCog size={18} className="text-foreground" />
          <h1 className="flex-1 truncate font-logo text-[15px] font-semibold tracking-tight">
            loopy
          </h1>
        </Link>

        <p className="mt-6 px-2 text-tiny font-medium tracking-wide text-default-400 uppercase">
          Goals
        </p>

        <nav aria-label="Goals" className="mt-2 flex flex-col gap-1">
          {goals.length > 0 ? (
            goals.map((goal, index) => {
              const goalPath = `/goal/${goal.slug}`
              const onGoalPage = location.pathname === goalPath
              const goalActive = onGoalPage && !activeAttemptId
              const goalAttempts = attempts.filter(
                (attempt) =>
                  attempt.goalId === goal.id && attempt.status !== "completed",
              )
              const goalOpen = isExpanded(goal.id, onGoalPage)
              const progress = Math.round(goalProgress(goal))
              const done = isGoalDone(goal)

              return (
                <motion.div
                  key={goal.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: reduceMotion ? 0 : index * 0.04,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex flex-col"
                >
                  <div
                    className={cn(
                      "group/row flex min-h-11 items-center gap-2 rounded-large px-2 transition-colors duration-200",
                      goalActive
                        ? "bg-white/10 text-foreground"
                        : "text-default-500 hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <button
                      type="button"
                      aria-label={goalOpen ? "Collapse" : "Expand"}
                      aria-expanded={goalOpen}
                      onClick={() => toggle(goal.id, onGoalPage)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-divider bg-white/[0.03] transition-colors hover:bg-white/10"
                    >
                      <Emoji value={goal.emoji ?? "🎯"} className="size-3.5" />
                    </button>

                    <NavLink
                      to={goalPath}
                      className="min-w-0 flex-1 truncate text-small font-medium"
                    >
                      {goal.title}
                    </NavLink>

                    <motion.span
                      animate={{ rotate: goalOpen ? 90 : 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      className="text-default-400 opacity-0 transition-opacity group-hover/row:opacity-100"
                    >
                      <ChevronRight size={14} />
                    </motion.span>

                    {done ? (
                      <Check
                        size={14}
                        className="shrink-0 text-emerald-400 group-hover/row:hidden"
                      />
                    ) : (
                      <span className="shrink-0 text-tiny tabular-nums text-default-400 group-hover/row:hidden">
                        {progress}%
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setAttemptFormGoalId(goal.id)}
                      aria-label="New experiment"
                      className="hidden size-7 shrink-0 items-center justify-center rounded-large text-default-400 transition-colors hover:bg-white/10 hover:text-foreground group-hover/row:flex"
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {goalOpen && (
                      <motion.div
                        key="nest"
                        initial={
                          reduceMotion
                            ? { opacity: 1 }
                            : { height: 0, opacity: 0 }
                        }
                        animate={{ height: "auto", opacity: 1 }}
                        exit={
                          reduceMotion
                            ? { opacity: 0 }
                            : { height: 0, opacity: 0 }
                        }
                        transition={{
                          duration: 0.22,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="overflow-hidden"
                      >
                        <div className="mt-0.5 ml-4 flex flex-col gap-0.5 border-l border-divider pl-2">
                          {goalAttempts.length > 0 ? (
                            goalAttempts.map((attempt) => {
                              const attemptActive =
                                onGoalPage && activeAttemptId === attempt.id
                              return (
                                <Link
                                  key={attempt.id}
                                  to={`${goalPath}?attempt=${attempt.id}`}
                                  className={cn(
                                    "flex min-h-10 items-center gap-2 rounded-large px-2 text-default-500 transition-colors duration-200 hover:bg-white/5 hover:text-foreground",
                                    attemptActive &&
                                      "bg-white/10 text-foreground",
                                  )}
                                >
                                  <Emoji
                                    value={attempt.icon ?? "🧪"}
                                    className="size-3.5 shrink-0 opacity-80"
                                  />
                                  <span className="min-w-0 flex-1 truncate text-small">
                                    {attempt.title}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-tiny",
                                      attempt.status === "active"
                                        ? "text-primary"
                                        : "text-default-400",
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
                            <p className="px-2 py-2 text-tiny text-default-400">
                              No experiments yet
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          ) : (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-0.5 flex flex-col items-center gap-3 rounded-large border border-dashed border-divider px-3 py-6 text-center"
            >
              <Emoji value="🎯" className="size-7" />
              <div className="flex flex-col gap-1">
                <p className="text-small font-medium text-foreground">
                  Start with a goal
                </p>
                <p className="text-tiny leading-snug text-default-500">
                  Pick something you want to move, then run tiny experiments.
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-full px-4"
                onClick={() => setCreateGoalOpen(true)}
              >
                <Plus size={13} />
                New goal
              </Button>
            </motion.div>
          )}
        </nav>
      </div>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-divider px-3 py-3">
        <Button
          variant="ghost"
          className="h-10 w-full justify-start gap-2 rounded-large text-default-500 hover:text-foreground"
          onClick={() => setCreateGoalOpen(true)}
        >
          <Plus size={18} />
          New Goal
        </Button>
        <Button
          variant="ghost"
          className="h-10 w-full justify-start gap-2 rounded-large text-default-500 hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut size={18} className="rotate-180" />
          Log Out
        </Button>
        {user?.email && (
          <p className="truncate px-2 pt-1 text-tiny text-default-400">
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
