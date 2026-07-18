import { AttemptDetailPane } from "@/components/goals/AttemptDetailPane"
import { AttemptFormDialog } from "@/components/goals/AttemptFormDialog"
import { AttemptRow } from "@/components/goals/AttemptRow"
import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { GoalProgressChart } from "@/components/goals/GoalProgressChart"
import { LogCompletedExperimentDialog } from "@/components/goals/LogCompletedExperimentDialog"
import { RecordResultsDialog } from "@/components/goals/RecordResultsDialog"
import { StartAttemptDialog } from "@/components/goals/StartAttemptDialog"
import { TaskSection } from "@/components/tasks/TaskSection"
import { Button } from "@/components/ui/button"
import { Emoji } from "@/components/ui/emoji"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import type { Attempt } from "@/data/attempts"
import { isGoalDone } from "@/data/goals"
import { useIsMobile, useMediaQuery } from "@/hooks/use-mobile"
import { useGoals } from "@/lib/goals-store"
import { cn } from "@/lib/utils"
import { Check, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"

export function GoalView() {
  const { slug } = useParams<{ slug: string }>()
  const { goals, attempts, deleteGoal } = useGoals()
  const goal = goals.find((g) => g.slug === slug)
  const navigate = useNavigate()

  const [editOpen, setEditOpen] = useState(false)
  const [attemptFormOpen, setAttemptFormOpen] = useState(false)
  const [logCompletedOpen, setLogCompletedOpen] = useState(false)
  const [editingAttemptId, setEditingAttemptId] = useState<string>()
  const [startAttemptId, setStartAttemptId] = useState<string>()
  const [resultsAttemptId, setResultsAttemptId] = useState<string>()
  const [detailOpen, setDetailOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isMobile = useIsMobile()

  const [searchParams, setSearchParams] = useSearchParams()
  const attemptParam = searchParams.get("attempt")
  const taskParam = searchParams.get("task")

  const selectAttempt = (attemptId: string) =>
    setSearchParams({ attempt: attemptId }, { replace: true })

  const openTask = (taskId?: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (taskId) next.set("task", taskId)
        else next.delete("task")
        return next
      },
      { replace: true },
    )
  }

  const goalAttempts = useMemo(
    () =>
      goal ? attempts.filter((attempt) => attempt.goalId === goal.id) : [],
    [attempts, goal],
  )

  const openExperiments = useMemo(() => {
    const active = goalAttempts
      .filter((a) => a.status === "active")
      .sort(
        (a, b) => (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0),
      )
    const planned = goalAttempts
      .filter((a) => a.status === "planned")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    return [
      { kind: "active", title: "Running", attempts: active },
      { kind: "planned", title: "Ready", attempts: planned },
    ].filter((section) => section.attempts.length > 0)
  }, [goalAttempts])

  const completedExperiments = useMemo(
    () =>
      goalAttempts
        .filter((a) => a.status === "completed")
        .sort(
          (a, b) =>
            (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
        ),
    [goalAttempts],
  )

  if (!goal) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-muted-foreground">
        Goal not found
      </div>
    )
  }

  const orderedAttempts = [
    ...openExperiments.flatMap((section) => section.attempts),
    ...completedExperiments,
  ]
  const selectedAttempt =
    orderedAttempts.find((attempt) => attempt.id === attemptParam) ??
    orderedAttempts[0]

  const editingAttempt = goalAttempts.find((a) => a.id === editingAttemptId)
  const attemptToStart = goalAttempts.find((a) => a.id === startAttemptId)
  const attemptToRecord = goalAttempts.find((a) => a.id === resultsAttemptId)

  const goalDone = isGoalDone(goal)
  const openCount = openExperiments.reduce(
    (sum, section) => sum + section.attempts.length,
    0,
  )

  function openCreateAttempt() {
    setEditingAttemptId(undefined)
    setAttemptFormOpen(true)
  }

  function openEditAttempt(attempt: Attempt) {
    setEditingAttemptId(attempt.id)
    setAttemptFormOpen(true)
  }

  const detailPane = selectedAttempt ? (
    <AttemptDetailPane
      goal={goal}
      attempt={selectedAttempt}
      openTaskId={taskParam ?? undefined}
      onOpenTask={openTask}
      onEdit={() => openEditAttempt(selectedAttempt)}
      onStart={() => setStartAttemptId(selectedAttempt.id)}
      onRecordResults={() => setResultsAttemptId(selectedAttempt.id)}
      onDeleted={() => setDetailOpen(false)}
    />
  ) : null

  return (
    <div className="flex h-full flex-1">
      <div className="flex w-full flex-col border-border lg:w-[55%] lg:border-r">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <Emoji value={goal.emoji} className="size-6" />
            <h1 className="text-xl font-medium tracking-tight text-foreground">
              {goal.title}
            </h1>
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <MoreHorizontal size={15} />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-40 p-1">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setEditOpen(true)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-white/5"
                >
                  <Pencil size={13} />
                  Edit goal
                </button>
                <button
                  onClick={() => {
                    deleteGoal(goal.id)
                    navigate("/goals", { replace: true })
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-400 hover:bg-white/5"
                >
                  <Trash2 size={13} />
                  Delete goal
                </button>
              </PopoverContent>
            </Popover>
            {goalDone && (
              <span className="ml-auto flex items-center gap-1.5 rounded-md bg-emerald-400/10 px-2 py-1 text-xs text-emerald-400">
                <Check size={12} />
                Achieved
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-5 sm:px-6">
          <GoalProgressChart
            goal={goal}
            attempts={goalAttempts}
            selectedAttemptId={selectedAttempt?.id}
            onSelectAttempt={(attemptId) => {
              selectAttempt(attemptId)
              if (!isDesktop) setDetailOpen(true)
            }}
          />

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-sm font-medium text-foreground">
                  Experiments
                </h2>
                <p className="text-xs text-muted-foreground">
                  Small bets that should move your metrics
                </p>
              </div>
              {openCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={openCreateAttempt}
                  aria-label="New experiment"
                  className="text-muted-foreground hover:text-foreground active:scale-[0.97]"
                >
                  <Plus size={15} />
                </Button>
              )}
            </div>

            {openCount === 0 ? (
              <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  Run a tiny experiment: predict what will happen, try it, then
                  write what you learned.
                </p>
                <Button
                  type="button"
                  onClick={openCreateAttempt}
                  className="active:scale-[0.97]"
                >
                  <Plus size={15} />
                  Try a tiny experiment
                </Button>
              </div>
            ) : (
              <div className="-mx-4 mt-2 flex flex-col sm:-mx-6">
                {openExperiments.map((section) => (
                  <TaskSection
                    key={section.kind}
                    title={section.title}
                    count={section.attempts.length}
                  >
                    {section.attempts.map((attempt) => (
                      <AttemptRow
                        key={attempt.id}
                        attempt={attempt}
                        goal={goal}
                        selected={attempt.id === selectedAttempt?.id}
                        onSelect={() => {
                          selectAttempt(attempt.id)
                          if (!isDesktop) setDetailOpen(true)
                        }}
                      />
                    ))}
                  </TaskSection>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-sm font-medium text-foreground">
                  What you learned
                </h2>
                <p className="text-xs text-muted-foreground">
                  Past experiments and notes for future you
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setLogCompletedOpen(true)}
                aria-label="Log a past experiment"
                className="text-muted-foreground hover:text-foreground active:scale-[0.97]"
              >
                <Plus size={15} />
              </Button>
            </div>

            {completedExperiments.length === 0 ? (
              <button
                type="button"
                onClick={() => setLogCompletedOpen(true)}
                className="mt-3 flex flex-col items-start gap-1 rounded-2xl border border-dashed border-border px-4 py-5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="text-sm font-medium text-foreground">
                  Already tried something?
                </span>
                <span className="text-sm text-muted-foreground">
                  Log a past experiment — results and what you learned matter
                  more than the exact steps.
                </span>
              </button>
            ) : (
              <div className="-mx-4 mt-2 flex flex-col sm:-mx-6">
                {completedExperiments.map((attempt) => (
                  <AttemptRow
                    key={attempt.id}
                    attempt={attempt}
                    goal={goal}
                    selected={attempt.id === selectedAttempt?.id}
                    onSelect={() => {
                      selectAttempt(attempt.id)
                      if (!isDesktop) setDetailOpen(true)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden flex-1 lg:block">
        {detailPane ?? (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-muted-foreground">
            {goalAttempts.length === 0
              ? "Create a tiny experiment to predict, try, and learn."
              : "Select an experiment to see predictions, results, and notes."}
          </div>
        )}
      </div>

      <Sheet open={detailOpen && !isDesktop} onOpenChange={setDetailOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          showCloseButton={false}
          className={cn("gap-0 p-0", isMobile && "rounded-t-2xl")}
          style={isMobile ? { height: "78dvh" } : undefined}
        >
          {isMobile && (
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15" />
          )}
          <SheetTitle className="sr-only">Experiment details</SheetTitle>
          <div className="min-h-0 flex-1">{detailPane}</div>
        </SheetContent>
      </Sheet>

      <GoalFormDialog open={editOpen} onOpenChange={setEditOpen} goal={goal} />

      <AttemptFormDialog
        open={attemptFormOpen}
        onOpenChange={(open) => {
          setAttemptFormOpen(open)
          if (!open) setEditingAttemptId(undefined)
        }}
        goalId={goal.id}
        attempt={editingAttempt}
        onCreated={(attempt) => selectAttempt(attempt.id)}
      />

      <LogCompletedExperimentDialog
        open={logCompletedOpen}
        onOpenChange={setLogCompletedOpen}
        goal={goal}
        onCreated={(attempt) => selectAttempt(attempt.id)}
      />

      {attemptToStart && (
        <StartAttemptDialog
          open
          onOpenChange={(open) => {
            if (!open) setStartAttemptId(undefined)
          }}
          goal={goal}
          attempt={attemptToStart}
        />
      )}

      {attemptToRecord && (
        <RecordResultsDialog
          open
          onOpenChange={(open) => {
            if (!open) setResultsAttemptId(undefined)
          }}
          goal={goal}
          attempt={attemptToRecord}
        />
      )}
    </div>
  )
}
