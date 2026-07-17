import { DurationPopover } from "@/components/tasks/DurationPopover"
import { SchedulePopover } from "@/components/tasks/SchedulePopover"
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Emoji } from "@/components/ui/emoji"
import { formatMetricValue } from "@/components/ui/metric-range"
import { Textarea } from "@/components/ui/textarea"
import {
  activeTasks,
  allTasksDone,
  classifyOutcome,
  deadlineMissDays,
  formatMissDays,
  isOverdue,
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
import { ChevronRight, FileText, Pencil, Play, Plus, Trash2 } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"

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
  planned: "Planned",
  active: "In progress",
  completed: "Completed",
}

const RETRO_FIELDS: { key: keyof Retrospective; label: string; placeholder: string }[] = [
  {
    key: "happened",
    label: "What happened?",
    placeholder: "How did this experiment actually go?",
  },
  {
    key: "learned",
    label: "What did you learn & will try next time?",
    placeholder: "Insights from this try, and what you'll change on the next one",
  },
  {
    key: "futureNote",
    label: "One line for future you",
    placeholder: "The one thing future you should remember",
  },
]

function NoteEditor({
  note,
  onSave,
  placeholder,
}: {
  note?: string
  onSave: (note: string) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState(note ?? "")
  return (
    <Textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onSave(draft.trim())}
      placeholder={placeholder}
      className="min-h-16 text-xs"
    />
  )
}

/** Quiet inline input at the end of the task list — Enter adds and keeps focus for rapid entry. */
function AddTaskRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <label className="flex cursor-text items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors focus-within:bg-white/[0.04]">
      <Plus size={15} className="ml-px shrink-0 text-muted-foreground" />
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
        placeholder="Add task"
        className="h-5 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
      />
    </label>
  )
}

const METER_SPRING = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const

/**
 * One metric on a worst→best scale: a slim track with a tick at "acceptable"
 * and, once the experiment completes, a marker showing where the result landed.
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
    result !== undefined ? classifyOutcome(prediction, result, metricDirection(metric)) : null
  const span = prediction.best - prediction.worst
  const posOf = (value: number) =>
    span === 0 ? 0.5 : Math.min(1, Math.max(0, (value - prediction.worst) / span))
  const acceptablePos = posOf(prediction.acceptable)
  const resultPos = result !== undefined ? posOf(result) : null
  const unit = metric.unit ?? ""

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2.5 text-xs">
        <span className="size-2 shrink-0 self-center rounded-full" style={{ background: color }} />
        <span className="min-w-0 flex-1 truncate text-foreground">{metric.name}</span>
        {result !== undefined && (
          <>
            {outcome && (
              <span className={cn("text-[11px]", outcome.className)}>{outcome.short}</span>
            )}
            <span className="text-sm font-medium text-foreground tabular-nums">
              {formatMetricValue(result)}
              {unit}
            </span>
          </>
        )}
      </div>
      <div className="ml-[18px]">
        <div className="relative h-[3px] rounded-full bg-white/[0.08]">
          {resultPos !== null && (
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${resultPos * 100}%` }}
              transition={METER_SPRING}
              className="absolute inset-y-0 left-0 rounded-full opacity-40"
              style={{ background: color }}
            />
          )}
          <span
            className="absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25"
            style={{ left: `${acceptablePos * 100}%` }}
          />
          {resultPos !== null && (
            <motion.span
              initial={{ left: 0, scale: 0.6, opacity: 0 }}
              animate={{ left: `${resultPos * 100}%`, scale: 1, opacity: 1 }}
              transition={METER_SPRING}
              className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: color, boxShadow: `0 0 6px ${color}66` }}
            />
          )}
        </div>
        <div className="relative flex justify-between pt-1 text-[10px] text-muted-foreground/70 tabular-nums">
          <span>
            {formatMetricValue(prediction.worst)}
            {unit}
          </span>
          {/* Clamped away from the edges so it never collides with worst/best. */}
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${Math.min(88, Math.max(12, acceptablePos * 100))}%` }}
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
  const { addAttemptTask, toggleAttemptTask, updateAttemptTask, updateAttempt, deleteAttempt } =
    useGoals()

  const locked = attempt.status === "completed"
  const doneCount = tasksDoneCount(attempt)
  const readyForResults = allTasksDone(attempt)
  const miss = locked ? deadlineMissDays(attempt) : null
  const overdue = isOverdue(attempt)

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
        onRename={(title) => updateAttemptTask(attempt.id, openTask.id, { title })}
        onSchedule={(date) => updateAttemptTask(attempt.id, openTask.id, { date })}
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

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-start gap-2 px-5 pt-4 pb-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
            {attempt.icon && <Emoji value={attempt.icon} className="size-[18px]" />}
            <span className="truncate">{attempt.title}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            <span className={cn(attempt.status === "active" && "text-primary")}>
              {STATUS_LABEL[attempt.status]}
            </span>
            {" · "}
            {dateLabel}
            {attempt.deadline && (
              <>
                {" · "}
                <span className={cn(overdue && "text-red-400")}>
                  Due {formatShortDate(attempt.deadline)}
                </span>
              </>
            )}
            {miss !== null && (
              <>
                {" · "}
                <span className={miss > 0 ? "text-red-400" : "text-emerald-400"}>
                  {formatMissDays(miss)}
                </span>
              </>
            )}
          </p>
        </div>
        {attempt.status === "planned" && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil size={13} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            deleteAttempt(attempt.id)
            onDeleted?.()
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <Trash2 size={13} />
        </Button>
      </div>

      <div className="flex flex-col gap-0.5 px-5 py-3">
        <div className="flex items-center gap-2 pb-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Tasks</span>
          <span>
            {doneCount}/{tasks.length}
          </span>
        </div>
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onOpenTask(task.id)}
            className="group flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-white/5"
          >
            {/* Base UI Checkbox re-dispatches the click from a hidden sibling input,
                so propagation must be stopped on a wrapper, not the checkbox itself. */}
            <span className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={task.done}
                disabled={locked}
                onCheckedChange={() => toggleAttemptTask(attempt.id, task.id)}
              />
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm text-foreground",
                task.done && "text-muted-foreground"
              )}
            >
              {task.title}
            </span>
            {task.description && (
              <FileText size={12} className="shrink-0 text-muted-foreground" />
            )}
            {task.done ? (
              task.actualMinutes ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  took {formatDuration(task.actualMinutes)}
                </span>
              ) : null
            ) : locked ? (
              task.estimatedMinutes ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  ~{formatDuration(task.estimatedMinutes)}
                </span>
              ) : null
            ) : (
              <DurationPopover
                minutes={task.estimatedMinutes}
                onChange={(estimatedMinutes) =>
                  updateAttemptTask(attempt.id, task.id, { estimatedMinutes })
                }
                placeholder="Estimate"
                prefix="~"
                className={cn(
                  !task.estimatedMinutes && "opacity-0 transition-opacity group-hover:opacity-100"
                )}
              />
            )}
            <SchedulePopover
              date={task.date}
              done={task.done}
              onSchedule={(date) => updateAttemptTask(attempt.id, task.id, { date })}
              className={cn(!task.date && "opacity-0 transition-opacity group-hover:opacity-100")}
            />
            <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
          </div>
        ))}
        {!locked && <AddTaskRow onAdd={(title) => addAttemptTask(attempt.id, title)} />}
      </div>

      {attempt.predictions.length > 0 ? (
        <div className="flex flex-col px-5 py-3">
          <div className="flex items-baseline justify-between pb-2.5">
            <span className="text-xs font-medium text-foreground">
              {locked ? "Results" : "Predictions"}
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              worst · acceptable · best
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {attempt.predictions.map((prediction) => {
              const metricIndex = goal.metrics.findIndex((m) => m.id === prediction.metricId)
              const metric = goal.metrics[metricIndex]
              if (!metric) return null
              const result = attempt.results.find((r) => r.metricId === prediction.metricId)
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
        </div>
      ) : locked && attempt.results.length > 0 ? (
        <div className="flex flex-col gap-2 px-5 py-3">
          <span className="text-xs font-medium text-foreground">Results</span>
          {attempt.results.map((result) => {
            const metricIndex = goal.metrics.findIndex((m) => m.id === result.metricId)
            const metric = goal.metrics[metricIndex]
            if (!metric) return null
            return (
              <div key={result.metricId} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: metricColor(metricIndex) }}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{metric.name}</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatMetricValue(result.value)}
                  {metric.unit ?? ""}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      {locked && (
        <div className="flex flex-col gap-2.5 px-5 py-2">
          <span className="text-xs font-medium text-foreground">Retrospective</span>
          {RETRO_FIELDS.map((field) => (
            <div key={`${attempt.id}-${field.key}`} className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">{field.label}</span>
              <NoteEditor
                note={attempt.retrospective?.[field.key]}
                placeholder={field.placeholder}
                onSave={(text) => saveRetrospective(field.key, text)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-border px-5 py-3">
        {attempt.status === "planned" && (
          <>
            <span className="flex-1 text-xs text-muted-foreground">
              Starting asks you to predict metric growth.
            </span>
            <Button size="sm" onClick={onStart}>
              <Play size={13} />
              Start experiment
            </Button>
          </>
        )}
        {attempt.status === "active" && (
          <>
            <span className="flex-1 text-xs text-muted-foreground">
              {readyForResults
                ? "All tasks done — measure your metrics."
                : "Finish every task to record results."}
            </span>
            <Button size="sm" onClick={onRecordResults} disabled={!readyForResults}>
              Record results
            </Button>
          </>
        )}
        {locked && (
          <span className="text-xs text-muted-foreground">
            Metrics were updated from this experiment&apos;s results.
          </span>
        )}
      </div>
    </div>
  )
}
