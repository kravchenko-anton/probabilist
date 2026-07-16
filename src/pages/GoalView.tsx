import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { Globe, Lock, Pencil, Plus } from "lucide-react"
import { useGoals } from "@/lib/goals-store"
import { goalProgress } from "@/data/goals"
import type { Attempt } from "@/data/attempts"
import { useIsMobile, useMediaQuery } from "@/hooks/use-mobile"
import { GoalProgressChart } from "@/components/goals/GoalProgressChart"
import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { AttemptFormDialog } from "@/components/goals/AttemptFormDialog"
import { StartAttemptDialog } from "@/components/goals/StartAttemptDialog"
import { RecordResultsDialog } from "@/components/goals/RecordResultsDialog"
import { AttemptRow } from "@/components/goals/AttemptRow"
import { AttemptDetailPane } from "@/components/goals/AttemptDetailPane"
import { TaskSection } from "@/components/tasks/TaskSection"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export function GoalView() {
  const { slug } = useParams<{ slug: string }>()
  const { goals, attempts } = useGoals()
  const goal = goals.find((g) => g.slug === slug)

  const [editOpen, setEditOpen] = useState(false)
  const [attemptFormOpen, setAttemptFormOpen] = useState(false)
  const [editingAttemptId, setEditingAttemptId] = useState<string>()
  const [startAttemptId, setStartAttemptId] = useState<string>()
  const [resultsAttemptId, setResultsAttemptId] = useState<string>()
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>()
  const [detailOpen, setDetailOpen] = useState(false)

  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isMobile = useIsMobile()

  const [searchParams] = useSearchParams()
  const attemptParam = searchParams.get("attempt")

  useEffect(() => {
    if (attemptParam) setSelectedAttemptId(attemptParam)
  }, [attemptParam])

  const goalAttempts = useMemo(
    () => (goal ? attempts.filter((attempt) => attempt.goalId === goal.id) : []),
    [attempts, goal]
  )

  const sections = useMemo(() => {
    const active = goalAttempts
      .filter((a) => a.status === "active")
      .sort((a, b) => (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0))
    const planned = goalAttempts
      .filter((a) => a.status === "planned")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const completed = goalAttempts
      .filter((a) => a.status === "completed")
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    return [
      { kind: "active", title: "In progress", attempts: active },
      { kind: "planned", title: "Planned", attempts: planned },
      { kind: "completed", title: "Completed", attempts: completed },
    ].filter((section) => section.attempts.length > 0)
  }, [goalAttempts])

  if (!goal) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-muted-foreground">
        Goal not found
      </div>
    )
  }

  const orderedAttempts = sections.flatMap((section) => section.attempts)
  const selectedAttempt =
    orderedAttempts.find((attempt) => attempt.id === selectedAttemptId) ?? orderedAttempts[0]

  const editingAttempt = goalAttempts.find((a) => a.id === editingAttemptId)
  const attemptToStart = goalAttempts.find((a) => a.id === startAttemptId)
  const attemptToRecord = goalAttempts.find((a) => a.id === resultsAttemptId)

  const progress = goalProgress(goal)

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
      onEdit={() => openEditAttempt(selectedAttempt)}
      onStart={() => setStartAttemptId(selectedAttempt.id)}
      onRecordResults={() => setResultsAttemptId(selectedAttempt.id)}
      onDeleted={() => setDetailOpen(false)}
    />
  ) : null

  return (
    <div className="flex h-full flex-1">
      <div className="flex w-full flex-col border-border lg:w-[60%] lg:border-r">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">{goal.emoji}</span>
            <h1 className="font-heading text-xl font-medium text-foreground">{goal.title}</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil size={13} />
            </Button>
            <span className="ml-auto text-lg font-medium text-foreground">
              {Math.round(progress)}%
            </span>
          </div>

          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1">
              {goal.privacy === "Public" ? <Globe size={12} /> : <Lock size={12} />}
              {goal.privacy}
            </span>
            <span className="rounded-md bg-white/5 px-2 py-1">{goal.timePeriodLabel}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <GoalProgressChart goal={goal} attempts={goalAttempts} />

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Attempts</h2>
            </div>

            <button
              onClick={openCreateAttempt}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-muted-foreground hover:bg-white/5"
            >
              <Plus size={15} />
              <span>New attempt</span>
            </button>

            <div className="-mx-4 flex flex-col">
              {sections.map((section) => (
                <TaskSection
                  key={section.kind}
                  title={section.title}
                  count={section.attempts.length}
                >
                  {section.attempts.map((attempt) => (
                    <AttemptRow
                      key={attempt.id}
                      attempt={attempt}
                      selected={attempt.id === selectedAttempt?.id}
                      onSelect={() => {
                        setSelectedAttemptId(attempt.id)
                        if (!isDesktop) setDetailOpen(true)
                      }}
                    />
                  ))}
                </TaskSection>
              ))}
            </div>

            {goalAttempts.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No attempts yet. An attempt is a to-do list of actions that should move your
                metrics — create one to start making progress.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="hidden flex-1 lg:block">
        {detailPane ?? (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-muted-foreground">
            Select an attempt to see its steps, predictions and results.
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
          <SheetTitle className="sr-only">Attempt details</SheetTitle>
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
        onCreated={(attempt) => setSelectedAttemptId(attempt.id)}
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
