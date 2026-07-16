import { useState } from "react"
import { CalendarDays, ChevronDown, ChevronRight, Flag, Pencil, Play, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useGoals } from "@/lib/goals-store"
import type { Goal } from "@/data/goals"
import {
  allTodosDone,
  classifyOutcome,
  deadlineMissDays,
  formatMissDays,
  isOverdue,
  metricDirection,
  todosDoneCount,
  type Attempt,
} from "@/data/attempts"
import { metricColor } from "@/lib/metric-colors"
import { formatShortDate, formatTimeSince } from "@/lib/date"
import { cn } from "@/lib/utils"

interface AttemptDetailPaneProps {
  goal: Goal
  attempt: Attempt
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

function TodoNoteEditor({
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
  onEdit,
  onStart,
  onRecordResults,
  onDeleted,
}: AttemptDetailPaneProps) {
  const { toggleAttemptTodo, updateAttemptTodo, updateAttempt, deleteAttempt } = useGoals()
  const [expandedTodoId, setExpandedTodoId] = useState<string>()

  const doneCount = todosDoneCount(attempt)
  const readyForResults = allTodosDone(attempt)
  const miss = attempt.status === "completed" ? deadlineMissDays(attempt) : null
  const overdue = isOverdue(attempt)

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
        <h3 className="flex items-center gap-2 font-heading text-lg font-medium text-foreground">
          {attempt.icon && <span>{attempt.icon}</span>}
          {attempt.title}
        </h3>
        {attempt.description && (
          <p className="text-sm text-muted-foreground">{attempt.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1 px-5 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Steps</span>
          <span>
            {doneCount}/{attempt.todos.length}
          </span>
        </div>
        {attempt.todos.map((todo) => {
          const expanded = expandedTodoId === todo.id
          return (
            <div key={todo.id} className="flex flex-col gap-1.5 rounded-md px-1 py-1 hover:bg-white/5">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={todo.done}
                  disabled={attempt.status === "completed"}
                  onCheckedChange={() => toggleAttemptTodo(attempt.id, todo.id)}
                />
                <button
                  onClick={() => setExpandedTodoId(expanded ? undefined : todo.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                >
                  <span
                    className={cn(
                      "truncate text-foreground",
                      todo.done && "text-muted-foreground line-through"
                    )}
                  >
                    {todo.title}
                  </span>
                  {todo.note && !expanded && (
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  {expanded ? (
                    <ChevronDown size={13} className="ml-auto shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight size={13} className="ml-auto shrink-0 text-muted-foreground" />
                  )}
                </button>
              </div>
              {expanded && (
                <div className="pb-1 pl-6">
                  <TodoNoteEditor
                    note={todo.note}
                    placeholder="Notes for this step — what you found, links, results…"
                    onSave={(note) =>
                      updateAttemptTodo(attempt.id, todo.id, { note: note || undefined })
                    }
                  />
                </div>
              )}
            </div>
          )
        })}
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
          <TodoNoteEditor
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
                ? "All steps done — measure your metrics."
                : "Finish every step to record results."}
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
