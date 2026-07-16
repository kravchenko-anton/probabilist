import { useState } from "react"
import { CalendarDays, ChevronRight, FileText, Flag, Pencil, Play, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Emoji } from "@/components/ui/emoji"
import { Textarea } from "@/components/ui/textarea"
import { useGoals } from "@/lib/goals-store"
import type { Goal } from "@/data/goals"
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
} from "@/data/attempts"
import { metricColor } from "@/lib/metric-colors"
import { formatShortDate, formatTimeSince } from "@/lib/date"
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane"
import { SchedulePopover } from "@/components/tasks/SchedulePopover"
import { cn } from "@/lib/utils"

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
  const { toggleAttemptTask, updateAttemptTask, updateAttempt, deleteAttempt } = useGoals()

  const locked = attempt.status === "completed"
  const doneCount = tasksDoneCount(attempt)
  const readyForResults = allTasksDone(attempt)
  const miss = attempt.status === "completed" ? deadlineMissDays(attempt) : null
  const overdue = isOverdue(attempt)

  const tasks = activeTasks(attempt)
  const openTask = tasks.find((task) => task.id === openTaskId)
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
    attempt.status === "completed" && attempt.completedAt
      ? `Completed ${formatShortDate(attempt.completedAt)}`
      : attempt.status === "active" && attempt.startedAt
        ? `Started ${formatTimeSince(attempt.startedAt)}`
        : `Created ${formatShortDate(attempt.createdAt)}`

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        <span
          className={cn(
            "rounded-md px-2 py-1 text-xs",
            attempt.status === "active"
              ? "bg-primary/20 text-primary-foreground"
              : "bg-white/5 text-muted-foreground"
          )}
        >
          {STATUS_LABEL[attempt.status]}
        </span>
        <span className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
          <CalendarDays size={13} />
          {dateLabel}
        </span>
        {attempt.deadline && (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs",
              overdue ? "text-red-400" : "text-muted-foreground"
            )}
          >
            <Flag size={12} />
            Due {formatShortDate(attempt.deadline)}
          </span>
        )}
        {miss !== null && (
          <span
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              miss > 0 ? "bg-red-400/10 text-red-400" : "bg-emerald-400/10 text-emerald-400"
            )}
          >
            {formatMissDays(miss)}
          </span>
        )}
        <div className="flex-1" />
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

      <div className="flex flex-col gap-2 px-5 py-2">
        <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
          {attempt.icon && <Emoji value={attempt.icon} className="size-[18px]" />}
          {attempt.title}
        </h3>
      </div>

      <div className="flex flex-col gap-0.5 px-5 py-2">
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
            <Checkbox
              checked={task.done}
              disabled={locked}
              onCheckedChange={() => toggleAttemptTask(attempt.id, task.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm text-foreground",
                task.done && "text-muted-foreground line-through"
              )}
            >
              {task.title}
            </span>
            {task.description && (
              <FileText size={12} className="shrink-0 text-muted-foreground" />
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
      </div>

      {attempt.predictions.length > 0 && (
        <div className="flex flex-col gap-1.5 px-5 py-2">
          <span className="text-xs font-medium text-foreground">Predictions</span>
          {attempt.predictions.map((prediction) => {
            const metricIndex = goal.metrics.findIndex((m) => m.id === prediction.metricId)
            const metric = goal.metrics[metricIndex]
            if (!metric) return null
            return (
              <div
                key={prediction.metricId}
                className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1.5 text-xs"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: metricColor(metricIndex) }}
                />
                <span className="flex-1 truncate text-foreground">{metric.name}</span>
                <span className="text-muted-foreground">
                  worst {prediction.worst} · acceptable {prediction.acceptable} · best{" "}
                  {prediction.best}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {attempt.status === "completed" && attempt.results.length > 0 && (
        <div className="flex flex-col gap-1.5 px-5 py-2">
          <span className="text-xs font-medium text-foreground">Results</span>
          {attempt.results.map((result) => {
            const metricIndex = goal.metrics.findIndex((m) => m.id === result.metricId)
            const metric = goal.metrics[metricIndex]
            if (!metric) return null
            const prediction = attempt.predictions.find((p) => p.metricId === result.metricId)
            const outcome = prediction
              ? classifyOutcome(prediction, result.value, metricDirection(metric))
              : null
            return (
              <div
                key={result.metricId}
                className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1.5 text-xs"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: metricColor(metricIndex) }}
                />
                <span className="flex-1 truncate text-foreground">{metric.name}</span>
                <span className="text-foreground">
                  {result.value}
                  {metric.unit ?? ""}
                </span>
                {outcome && <span className={outcome.className}>{outcome.label}</span>}
              </div>
            )
          })}
        </div>
      )}

      {attempt.status === "completed" && (
        <div className="flex flex-col gap-1.5 px-5 py-2">
          <span className="text-xs font-medium text-foreground">Retrospective</span>
          <NoteEditor
            key={attempt.id}
            note={attempt.retrospective}
            placeholder="What did you learn? What would you update or do better next time?"
            onSave={(text) =>
              updateAttempt({ ...attempt, retrospective: text || undefined })
            }
          />
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
              Start attempt
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
        {attempt.status === "completed" && (
          <span className="text-xs text-muted-foreground">
            Metrics were updated from this attempt's results.
          </span>
        )}
      </div>
    </div>
  )
}
