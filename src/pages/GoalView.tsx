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
      <div className="flex w-full flex-col lg:w-[55%] lg:border-r lg:border-divider">
        <div className="flex flex-col gap-3 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-large bg-content1 ring-1 ring-foreground/8">
              <Emoji value={goal.emoji} className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-medium tracking-tight text-foreground">
                {goal.title}
              </h1>
              <p className="text-tiny text-default-500">{goal.timePeriodLabel}</p>
            </div>
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-large text-default-500 hover:text-foreground"
                  />
                }
              >
                <MoreHorizontal size={15} />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-44 rounded-large border-divider bg-content1 p-1.5 shadow-small"
              >
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setEditOpen(true)
                  }}
                  className="flex w-full items-center gap-2 rounded-large px-2.5 py-2 text-small text-foreground transition-colors hover:bg-white/5"
                >
                  <Pencil size={13} />
                  Edit goal
                </button>
                <button
                  onClick={() => {
                    deleteGoal(goal.id)
                    navigate("/goals", { replace: true })
                  }}
                  className="flex w-full items-center gap-2 rounded-large px-2.5 py-2 text-small text-red-400 transition-colors hover:bg-white/5"
                >
                  <Trash2 size={13} />
                  Delete goal
                </button>
              </PopoverContent>
            </Popover>
            {goalDone && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-tiny text-emerald-400">
                <Check size={12} />
                Achieved
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-5 pb-8 sm:px-6">
          <GoalProgressChart
            goal={goal}
            attempts={goalAttempts}
            selectedAttemptId={selectedAttempt?.id}
            onSelectAttempt={(attemptId) => {
              selectAttempt(attemptId)
              if (!isDesktop) setDetailOpen(true)
            }}
          />

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-0.5">
              <div>
                <h2 className="text-small font-medium text-foreground">
                  Experiments
                </h2>
                <p className="text-tiny text-default-500">
                  Small bets that move your metrics
                </p>
              </div>
              {openCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={openCreateAttempt}
                  aria-label="New experiment"
                  className="rounded-large text-default-500 hover:text-foreground"
                >
                  <Plus size={15} />
                </Button>
              )}
            </div>

            {openCount === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-large bg-content1 px-4 py-10 text-center ring-1 ring-foreground/8">
                <p className="max-w-sm text-small text-default-500">
                  Predict, try, then write what you learned.
                </p>
                <Button
                  type="button"
                  onClick={openCreateAttempt}
                  className="rounded-full px-4"
                >
                  <Plus size={15} />
                  Try a tiny experiment
                </Button>
              </div>
            ) : (
              <div className="flex flex-col overflow-hidden rounded-large bg-content1 ring-1 ring-foreground/8">
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
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-0.5">
              <div>
                <h2 className="text-small font-medium text-foreground">
                  What you learned
                </h2>
                <p className="text-tiny text-default-500">
                  Past experiments for future you
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setLogCompletedOpen(true)}
                aria-label="Log a past experiment"
                className="rounded-large text-default-500 hover:text-foreground"
              >
                <Plus size={15} />
              </Button>
            </div>

            {completedExperiments.length === 0 ? (
              <button
                type="button"
                onClick={() => setLogCompletedOpen(true)}
                className="flex flex-col items-start gap-1 rounded-large bg-content1 px-4 py-5 text-left ring-1 ring-foreground/8 transition-colors duration-200 hover:bg-white/[0.04]"
              >
                <span className="text-small font-medium text-foreground">
                  Already tried something?
                </span>
                <span className="text-small text-default-500">
                  Log a past experiment — results and lessons matter most.
                </span>
              </button>
            ) : (
              <div className="flex flex-col overflow-hidden rounded-large bg-content1 ring-1 ring-foreground/8">
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
          </section>
        </div>
      </div>

      <div className="hidden flex-1 lg:block">
        {detailPane ?? (
          <div className="flex h-full items-center justify-center px-8 text-center text-small text-default-500">
            {goalAttempts.length === 0
              ? "Create a tiny experiment to predict, try, and learn."
              : "Select an experiment to see details."}
          </div>
        )}
      </div>

      <Sheet open={detailOpen && !isDesktop} onOpenChange={setDetailOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          showCloseButton={false}
          className={cn("gap-0 border-divider bg-content1 p-0", isMobile && "rounded-t-2xl")}
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
