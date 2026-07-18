import { DurationPopover } from "@/components/tasks/DurationPopover"
import { SchedulePopover } from "@/components/tasks/SchedulePopover"
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Emoji } from "@/components/ui/emoji"
import { formatMetricValue } from "@/components/ui/metric-range"
import {
  activeTasks,
  allTasksDone,
  classifyOutcome,
  isOverdue,
  isTinyAttempt,
  metricDirection,
  tasksDoneCount,
  type Attempt,
  type MetricPrediction,
  type Retrospective,
} from "@/data/attempts"
import type { Goal, GoalMetric } from "@/data/goals"
import { formatDuration, formatShortDate, formatTimeSince } from "@/lib/date"
import { useGoals } from "@/lib/goals-store"
import { metricColor } from "@/lib/metric-colors"
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  FileText,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useRef, useState, type ReactNode } from "react"

interface AttemptDetailPaneProps {
  goal: Goal
  attempt: Attempt
  /** Task drilled into within this pane; controlled by the parent (URL). */
  openTaskId?: string
  onOpenTask: (taskId?: string) => void
  onEdit: () => void
  onStart: () => void
  onRecordResults: () => void
  onDeleted?: () => void
}

const STATUS_LABEL: Record<Attempt["status"], string> = {
  planned: "Ready",
  active: "Running",
  completed: "Learned",
}

const RETRO_FIELDS: {
  key: keyof Retrospective
  label: string
  placeholder: string
}[] = [
  {
    key: "happened",
    label: "What happened",
    placeholder: "How did this experiment actually go?",
  },
  {
    key: "learned",
    label: "What you'll try next",
    placeholder: "Insights from this try, and what you'll change",
  },
  {
    key: "futureNote",
    label: "Note for future you",
    placeholder: "The one thing future you should remember",
  },
]

const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Borderless note field — reads as writing paper, not a form control. */
function NoteField({
  note,
  onSave,
  placeholder,
  className,
}: {
  note?: string
  onSave: (note: string) => void
  placeholder: string
  className?: string
}) {
  const [draft, setDraft] = useState(note ?? "")
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(note ?? "")
  }, [note])

  return (
    <textarea
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onSave(draft.trim())}
      placeholder={placeholder}
      rows={2}
      className={cn(
        "field-sizing-content w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground outline-none",
        "placeholder:text-muted-foreground/55",
        className,
      )}
    />
  )
}

/** Quiet inline input at the end of the task list — Enter adds and keeps focus. */
function AddTaskRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <label className="flex cursor-text items-center gap-3 rounded-lg px-1 py-2 transition-colors duration-150 ease-out focus-within:bg-white/[0.03]">
      <Plus size={15} className="ml-px shrink-0 text-muted-foreground/60" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const title = value.trim()
            if (!title) return
            onAdd(title)
            setValue("")
          }
          if (e.key === "Escape") {
            setValue("")
            e.currentTarget.blur()
          }
        }}
        placeholder="Add step"
        className="h-5 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/55"
      />
    </label>
  )
}

const METER_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.9,
} as const

/**
 * One metric on a worst→best scale: slim track, tick at acceptable,
 * and a marker once the experiment completes.
 */
function OutcomeMeter({
  metric,
  color,
  prediction,
  result,
}: {
  metric: GoalMetric
  color: string
  prediction: MetricPrediction
  result?: number
}) {
  const outcome =
    result !== undefined
      ? classifyOutcome(prediction, result, metricDirection(metric))
      : null
  const span = prediction.best - prediction.worst
  const posOf = (value: number) =>
    span === 0
      ? 0.5
      : Math.min(1, Math.max(0, (value - prediction.worst) / span))
  const acceptablePos = posOf(prediction.acceptable)
  const resultPos = result !== undefined ? posOf(result) : null
  const unit = metric.unit ?? ""

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2.5">
        <span
          className="size-1.5 shrink-0 self-center rounded-full"
          style={{ background: color }}
        />
        <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">
          {metric.name}
        </span>
        {result !== undefined ? (
          <span className="flex items-baseline gap-2">
            {outcome && (
              <span className={cn("text-[11px] tracking-wide", outcome.className)}>
                {outcome.short}
              </span>
            )}
            <span className="text-[17px] font-medium tracking-tight text-foreground tabular-nums">
              {formatMetricValue(result)}
              {unit}
            </span>
          </span>
        ) : (
          <span className="text-[13px] text-muted-foreground/70 tabular-nums">
            {formatMetricValue(prediction.acceptable)}
            {unit}
            <span className="text-muted-foreground/40"> · ok</span>
          </span>
        )}
      </div>
      <div className="ml-[14px]">
        <div className="relative h-[3px] rounded-full bg-white/[0.08]">
          {resultPos !== null && (
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${resultPos * 100}%` }}
              transition={METER_SPRING}
              className="absolute inset-y-0 left-0 rounded-full opacity-35"
              style={{ background: color }}
            />
          )}
          <span
            className="absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30"
            style={{ left: `${acceptablePos * 100}%` }}
          />
          {resultPos !== null && (
            <motion.span
              initial={{ left: 0, scale: 0.6, opacity: 0 }}
              animate={{ left: `${resultPos * 100}%`, scale: 1, opacity: 1 }}
              transition={METER_SPRING}
              className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: color }}
            />
          )}
        </div>
        <div className="relative flex justify-between pt-1.5 text-[10px] tracking-wide text-muted-foreground/55 tabular-nums">
          <span>
            {formatMetricValue(prediction.worst)}
            {unit}
          </span>
          <span
            className="absolute -translate-x-1/2"
            style={{
              left: `${Math.min(88, Math.max(12, acceptablePos * 100))}%`,
            }}
          >
            {formatMetricValue(prediction.acceptable)}
            {unit}
          </span>
          <span>
            {formatMetricValue(prediction.best)}
            {unit}
          </span>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-[0.04em] text-muted-foreground uppercase">
      {children}
    </span>
  )
}

export function AttemptDetailPane({
  goal,
  attempt,
  openTaskId,
  onOpenTask,
  onEdit,
  onStart,
  onRecordResults,
  onDeleted,
}: AttemptDetailPaneProps) {
  const {
    addAttemptTask,
    toggleAttemptTask,
    updateAttemptTask,
    updateAttempt,
    deleteAttempt,
  } = useGoals()

  const locked = attempt.status === "completed"
  const tiny = isTinyAttempt(attempt)
  const doneCount = tasksDoneCount(attempt)
  const readyForResults = tiny || allTasksDone(attempt)
  const overdue = isOverdue(attempt)
  const [stepReward, setStepReward] = useState<string | null>(null)

  function handleToggleTask(taskId: string, wasDone: boolean) {
    toggleAttemptTask(attempt.id, taskId)
    if (wasDone) return
    setStepReward("Nice — that lights up your progress graph.")
    window.setTimeout(() => setStepReward(null), 2400)
  }

  const tasks = activeTasks(attempt)
  const openTask = tasks.find((task) => task.id === openTaskId)

  const saveRetrospective = (key: keyof Retrospective, text: string) => {
    const next = { ...attempt.retrospective, [key]: text || undefined }
    const empty = !next.happened && !next.learned && !next.futureNote
    updateAttempt({ ...attempt, retrospective: empty ? undefined : next })
  }

  if (openTask) {
    return (
      <TaskDetailPane
        key={openTask.id}
        task={openTask}
        footerEmoji={attempt.icon}
        footerLabel={attempt.title}
        onBack={() => onOpenTask(undefined)}
        onToggleDone={() => {
          if (!locked) toggleAttemptTask(attempt.id, openTask.id)
        }}
        onRename={(title) =>
          updateAttemptTask(attempt.id, openTask.id, { title })
        }
        onSchedule={(date) =>
          updateAttemptTask(attempt.id, openTask.id, { date })
        }
        onEstimateChange={(estimatedMinutes) =>
          updateAttemptTask(attempt.id, openTask.id, { estimatedMinutes })
        }
        onActualChange={(actualMinutes) =>
          updateAttemptTask(attempt.id, openTask.id, { actualMinutes })
        }
        onDescriptionChange={(description) =>
          updateAttemptTask(attempt.id, openTask.id, { description })
        }
        onDelete={() => {
          updateAttemptTask(attempt.id, openTask.id, { deletedAt: new Date() })
          onOpenTask(undefined)
        }}
      />
    )
  }

  const dateLabel =
    locked && attempt.completedAt
      ? `Completed ${formatShortDate(attempt.completedAt)}`
      : attempt.status === "active" && attempt.startedAt
        ? `Started ${formatTimeSince(attempt.startedAt)}`
        : `Created ${formatShortDate(attempt.createdAt)}`

  const showBet = tiny || attempt.description || attempt.status !== "completed"
  const hasPredictions = attempt.predictions.length > 0
  const hasResultsOnly = !hasPredictions && locked && attempt.results.length > 0

  return (
    <motion.div
      key={attempt.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
      className="flex h-full flex-col overflow-y-auto"
    >
      {/* Header */}
      <header className="px-6 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2.5 text-[22px] font-semibold tracking-[-0.02em] text-foreground leading-snug">
              {attempt.icon && (
                <Emoji value={attempt.icon} className="size-5 shrink-0" />
              )}
              <span className="truncate">{attempt.title}</span>
            </h3>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              <span
                className={cn(
                  attempt.status === "active" && "text-primary",
                  attempt.status === "completed" && "text-emerald-400/90",
                )}
              >
                {STATUS_LABEL[attempt.status]}
              </span>
              <span className="text-muted-foreground/40"> · </span>
              {dateLabel}
              {attempt.deadline && (
                <>
                  <span className="text-muted-foreground/40"> · </span>
                  <span className={cn(overdue && "text-red-400")}>
                    Due {formatShortDate(attempt.deadline)}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
            {attempt.status === "planned" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onEdit}
                aria-label="Edit experiment"
                className="text-muted-foreground hover:text-foreground active:scale-[0.96]"
              >
                <Pencil size={14} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                deleteAttempt(attempt.id)
                onDeleted?.()
              }}
              aria-label="Delete experiment"
              className="text-muted-foreground hover:text-red-400 active:scale-[0.96]"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-7 px-6 pb-4">
        {/* The bet */}
        {showBet && (
          <section
            className={cn(
              "flex flex-col gap-2",
              tiny && attempt.status !== "completed" && "min-h-28 flex-1",
            )}
          >
            <SectionLabel>The bet</SectionLabel>
            <NoteField
              key={`${attempt.id}-bet`}
              note={attempt.description}
              placeholder="What are you trying, and why?"
              onSave={(text) =>
                updateAttempt({
                  ...attempt,
                  description: text || undefined,
                })
              }
              className={cn(
                tiny && attempt.status !== "completed" && "min-h-24 flex-1",
              )}
            />
          </section>
        )}

        {/* Steps */}
        {!tiny && (
          <section className="flex flex-col gap-1">
            <div className="mb-1 flex items-baseline gap-2">
              <SectionLabel>Steps</SectionLabel>
              <span className="text-[12px] text-muted-foreground/70 tabular-nums">
                {doneCount}/{tasks.length}
              </span>
              {stepReward && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="ml-auto text-[11px] text-emerald-400"
                >
                  {stepReward}
                </motion.span>
              )}
            </div>
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className="group flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 transition-colors duration-150 ease-out hover:bg-white/[0.03] active:scale-[0.995]"
              >
                <span
                  className="flex shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={task.done}
                    disabled={locked}
                    onCheckedChange={() => handleToggleTask(task.id, task.done)}
                  />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[15px] text-foreground",
                    task.done && "text-muted-foreground line-through decoration-white/20",
                  )}
                >
                  {task.title}
                </span>
                {task.description && (
                  <FileText
                    size={12}
                    className="shrink-0 text-muted-foreground/50"
                  />
                )}
                {task.done ? (
                  task.actualMinutes ? (
                    <span className="shrink-0 text-[12px] text-muted-foreground/70">
                      {formatDuration(task.actualMinutes)}
                    </span>
                  ) : null
                ) : locked ? (
                  task.estimatedMinutes ? (
                    <span className="shrink-0 text-[12px] text-muted-foreground/70">
                      ~{formatDuration(task.estimatedMinutes)}
                    </span>
                  ) : null
                ) : (
                  <DurationPopover
                    minutes={task.estimatedMinutes}
                    onChange={(estimatedMinutes) =>
                      updateAttemptTask(attempt.id, task.id, {
                        estimatedMinutes,
                      })
                    }
                    placeholder="Estimate"
                    prefix="~"
                    className={cn(
                      !task.estimatedMinutes &&
                        "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                    )}
                  />
                )}
                <SchedulePopover
                  date={task.date}
                  done={task.done}
                  onSchedule={(date) =>
                    updateAttemptTask(attempt.id, task.id, { date })
                  }
                  className={cn(
                    !task.date &&
                      "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                  )}
                />
                <ChevronRight
                  size={13}
                  className="shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
                />
              </div>
            ))}
            {!locked && (
              <AddTaskRow onAdd={(title) => addAttemptTask(attempt.id, title)} />
            )}
          </section>
        )}

        {/* Predictions / Results */}
        {hasPredictions ? (
          <section className="flex flex-col gap-4">
            <SectionLabel>{locked ? "Results" : "Predictions"}</SectionLabel>
            <div className="flex flex-col gap-5">
              {attempt.predictions.map((prediction) => {
                const metricIndex = goal.metrics.findIndex(
                  (m) => m.id === prediction.metricId,
                )
                const metric = goal.metrics[metricIndex]
                if (!metric) return null
                const result = attempt.results.find(
                  (r) => r.metricId === prediction.metricId,
                )
                return (
                  <OutcomeMeter
                    key={prediction.metricId}
                    metric={metric}
                    color={metricColor(metricIndex)}
                    prediction={prediction}
                    result={locked ? result?.value : undefined}
                  />
                )
              })}
            </div>
          </section>
        ) : hasResultsOnly ? (
          <section className="flex flex-col gap-3">
            <SectionLabel>Results</SectionLabel>
            <div className="flex flex-col gap-3">
              {attempt.results.map((result) => {
                const metricIndex = goal.metrics.findIndex(
                  (m) => m.id === result.metricId,
                )
                const metric = goal.metrics[metricIndex]
                if (!metric) return null
                return (
                  <div
                    key={result.metricId}
                    className="flex items-baseline gap-2.5"
                  >
                    <span
                      className="size-1.5 shrink-0 self-center rounded-full"
                      style={{ background: metricColor(metricIndex) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">
                      {metric.name}
                    </span>
                    <span className="text-[17px] font-medium tracking-tight text-foreground tabular-nums">
                      {formatMetricValue(result.value)}
                      {metric.unit ?? ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Retrospective */}
        {locked && (
          <section className="flex flex-col gap-5">
            <SectionLabel>What you learned</SectionLabel>
            {RETRO_FIELDS.map((field) => (
              <div key={`${attempt.id}-${field.key}`} className="flex flex-col gap-1">
                <span className="text-[13px] text-muted-foreground">
                  {field.label}
                </span>
                <NoteField
                  note={attempt.retrospective?.[field.key]}
                  placeholder={field.placeholder}
                  onSave={(text) => saveRetrospective(field.key, text)}
                />
              </div>
            ))}
          </section>
        )}
      </div>

      {/* Footer — translucent material */}
      <footer className="sticky bottom-0 mt-auto border-t border-white/[0.06] bg-[#1c1c1e]/80 px-6 py-3.5 backdrop-blur-xl backdrop-saturate-150">
        {attempt.status === "planned" && (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[13px] leading-snug text-muted-foreground">
              Predict where metrics will land, then start.
            </p>
            <Button size="sm" onClick={onStart} className="active:scale-[0.97]">
              <Play size={13} />
              Predict &amp; start
            </Button>
          </div>
        )}
        {attempt.status === "active" && (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[13px] leading-snug text-muted-foreground">
              {tiny
                ? "When you're done, record what happened."
                : readyForResults
                  ? "Steps done — record the metrics."
                  : "Finish the steps, then record results."}
            </p>
            <Button
              size="sm"
              onClick={onRecordResults}
              disabled={!readyForResults}
              className="active:scale-[0.97]"
            >
              Record results
            </Button>
          </div>
        )}
        {locked && (
          <p className="text-[13px] leading-snug text-muted-foreground">
            Metrics updated. Capture the lesson while it's fresh.
          </p>
        )}
      </footer>
    </motion.div>
  )
}
