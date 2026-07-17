import type {
  Attempt,
  AttemptResult,
  AttemptTask,
  MetricPrediction,
  Retrospective,
} from "@/data/attempts"
import type { Goal, GoalMetric, MetricAggregation } from "@/data/goals"
import type { TodoTask } from "@/data/tasks"
import type { Database, Tables, TablesInsert } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"

type TaskRow = Tables<"tasks">
type GoalRow = Tables<"goals">
type MetricRow = Tables<"goal_metrics">
type AttemptRow = Tables<"attempts">
type AttemptTaskRow = Tables<"attempt_tasks">
type PredictionRow = Tables<"attempt_predictions">
type ResultRow = Tables<"attempt_results">

function toDateOnly(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function fromDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function toTimestamptz(date: Date | undefined | null): string | null {
  return date ? date.toISOString() : null
}

function fromTimestamptz(value: string | null): Date | undefined {
  return value ? new Date(value) : undefined
}

function logDbError(action: string, error: { message: string } | null) {
  if (error) console.error(`[supabase] ${action}:`, error.message)
}

function normalizeRetrospective(
  retro?: Retrospective | null,
): Retrospective | undefined {
  if (!retro) return undefined
  const happened = retro.happened?.trim() || undefined
  const learned = retro.learned?.trim() || undefined
  const futureNote = retro.futureNote?.trim() || undefined
  if (!happened && !learned && !futureNote) return undefined
  return { happened, learned, futureNote }
}

// ---------- mappers: DB -> app ----------

export function taskFromRow(row: TaskRow): TodoTask {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji ?? undefined,
    done: row.done,
    date: fromTimestamptz(row.scheduled_at),
    description: row.description ?? undefined,
    completedAt: fromTimestamptz(row.completed_at),
    deletedAt: fromTimestamptz(row.deleted_at),
    estimatedMinutes: row.estimated_minutes ?? undefined,
    actualMinutes: row.actual_minutes ?? undefined,
  }
}

function metricFromRow(row: MetricRow): GoalMetric {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit ?? undefined,
    startValue: row.start_value,
    targetValue: row.target_value,
    currentValue: row.current_value,
    aggregation: (row.aggregation as MetricAggregation) || "max",
  }
}

export function goalFromRows(goal: GoalRow, metrics: MetricRow[]): Goal {
  return {
    id: goal.id,
    slug: goal.slug,
    title: goal.title,
    emoji: goal.emoji,
    timePeriodLabel: goal.time_period_label,
    startDate: fromDateOnly(goal.start_date),
    endDate: fromDateOnly(goal.end_date),
    metrics: metrics
      .filter((m) => m.goal_id === goal.id)
      .sort((a, b) => a.position - b.position)
      .map(metricFromRow),
  }
}

function attemptTaskFromRow(row: AttemptTaskRow): AttemptTask {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    date: fromTimestamptz(row.scheduled_at),
    description: row.description ?? undefined,
    completedAt: fromTimestamptz(row.completed_at),
    deletedAt: fromTimestamptz(row.deleted_at),
    estimatedMinutes: row.estimated_minutes ?? undefined,
    actualMinutes: row.actual_minutes ?? undefined,
  }
}

export function attemptFromRows(
  row: AttemptRow,
  tasks: AttemptTaskRow[],
  predictions: PredictionRow[],
  results: ResultRow[],
): Attempt {
  const retro = normalizeRetrospective({
    happened: row.retro_happened ?? undefined,
    learned: row.retro_learned ?? undefined,
    futureNote: row.retro_future_note ?? undefined,
  })

  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    icon: row.icon ?? undefined,
    kind: (row.kind as Attempt["kind"]) || "standard",
    description: row.description ?? undefined,
    status: row.status as Attempt["status"],
    createdAt: new Date(row.created_at),
    startedAt: fromTimestamptz(row.started_at),
    deadline: row.deadline ? fromDateOnly(row.deadline) : undefined,
    completedAt: fromTimestamptz(row.completed_at),
    predictions: predictions
      .filter((p) => p.attempt_id === row.id)
      .map((p) => ({
        metricId: p.metric_id,
        worst: p.worst,
        acceptable: p.acceptable,
        best: p.best,
      })),
    results: results
      .filter((r) => r.attempt_id === row.id)
      .map((r) => ({
        metricId: r.metric_id,
        value: r.value,
      })),
    retrospective: retro,
    tasks: tasks
      .filter((t) => t.attempt_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map(attemptTaskFromRow),
  }
}

// ---------- mappers: app -> DB ----------

export function taskToInsert(task: TodoTask): TablesInsert<"tasks"> {
  return {
    id: task.id,
    title: task.title,
    emoji: task.emoji ?? null,
    done: task.done,
    scheduled_at: toTimestamptz(task.date),
    description: task.description ?? null,
    completed_at: toTimestamptz(task.completedAt),
    deleted_at: toTimestamptz(task.deletedAt),
    estimated_minutes: task.estimatedMinutes ?? null,
    actual_minutes: task.actualMinutes ?? null,
  }
}

export function taskPatchToUpdate(
  patch: Partial<TodoTask>,
): Database["public"]["Tables"]["tasks"]["Update"] {
  const update: Database["public"]["Tables"]["tasks"]["Update"] = {}
  if ("title" in patch) update.title = patch.title
  if ("emoji" in patch) update.emoji = patch.emoji ?? null
  if ("done" in patch) update.done = patch.done
  if ("date" in patch) update.scheduled_at = toTimestamptz(patch.date)
  if ("description" in patch) update.description = patch.description ?? null
  if ("completedAt" in patch)
    update.completed_at = toTimestamptz(patch.completedAt)
  if ("deletedAt" in patch) update.deleted_at = toTimestamptz(patch.deletedAt)
  if ("estimatedMinutes" in patch)
    update.estimated_minutes = patch.estimatedMinutes ?? null
  if ("actualMinutes" in patch)
    update.actual_minutes = patch.actualMinutes ?? null
  return update
}

function goalToInsert(goal: Goal): TablesInsert<"goals"> {
  return {
    id: goal.id,
    slug: goal.slug,
    title: goal.title,
    emoji: goal.emoji,
    time_period_label: goal.timePeriodLabel,
    start_date: toDateOnly(goal.startDate),
    end_date: toDateOnly(goal.endDate),
  }
}

function metricToInsert(
  goalId: string,
  metric: GoalMetric,
  position: number,
): TablesInsert<"goal_metrics"> {
  return {
    id: metric.id,
    goal_id: goalId,
    name: metric.name,
    unit: metric.unit ?? null,
    start_value: metric.startValue,
    target_value: metric.targetValue,
    current_value: metric.currentValue,
    aggregation: metric.aggregation ?? "max",
    position,
  }
}

function attemptToInsert(attempt: Attempt): TablesInsert<"attempts"> {
  const retro = normalizeRetrospective(attempt.retrospective)
  return {
    id: attempt.id,
    goal_id: attempt.goalId,
    title: attempt.title,
    icon: attempt.icon ?? null,
    kind: attempt.kind ?? "standard",
    description: attempt.description ?? null,
    status: attempt.status,
    started_at: toTimestamptz(attempt.startedAt),
    deadline: attempt.deadline ? toDateOnly(attempt.deadline) : null,
    completed_at: toTimestamptz(attempt.completedAt),
    retro_happened: retro?.happened ?? null,
    retro_learned: retro?.learned ?? null,
    retro_future_note: retro?.futureNote ?? null,
    created_at: attempt.createdAt.toISOString(),
  }
}

function attemptTaskToInsert(
  attemptId: string,
  task: AttemptTask,
  position: number,
): TablesInsert<"attempt_tasks"> {
  return {
    id: task.id,
    attempt_id: attemptId,
    title: task.title,
    done: task.done,
    scheduled_at: toTimestamptz(task.date),
    description: task.description ?? null,
    completed_at: toTimestamptz(task.completedAt),
    deleted_at: toTimestamptz(task.deletedAt),
    estimated_minutes: task.estimatedMinutes ?? null,
    actual_minutes: task.actualMinutes ?? null,
    position,
  }
}

function attemptTaskPatchToUpdate(
  patch: Partial<AttemptTask>,
): Database["public"]["Tables"]["attempt_tasks"]["Update"] {
  const update: Database["public"]["Tables"]["attempt_tasks"]["Update"] = {}
  if ("title" in patch) update.title = patch.title
  if ("done" in patch) update.done = patch.done
  if ("date" in patch) update.scheduled_at = toTimestamptz(patch.date)
  if ("description" in patch) update.description = patch.description ?? null
  if ("completedAt" in patch)
    update.completed_at = toTimestamptz(patch.completedAt)
  if ("deletedAt" in patch) update.deleted_at = toTimestamptz(patch.deletedAt)
  if ("estimatedMinutes" in patch)
    update.estimated_minutes = patch.estimatedMinutes ?? null
  if ("actualMinutes" in patch)
    update.actual_minutes = patch.actualMinutes ?? null
  return update
}

// ---------- fetch ----------

export async function fetchAllTasks(): Promise<TodoTask[]> {
  const { data, error } = await supabase.from("tasks").select("*")
  logDbError("fetch tasks", error)
  return (data ?? []).map(taskFromRow)
}

export async function fetchAllGoals(): Promise<Goal[]> {
  const [goalsRes, metricsRes] = await Promise.all([
    supabase.from("goals").select("*"),
    supabase.from("goal_metrics").select("*"),
  ])
  logDbError("fetch goals", goalsRes.error)
  logDbError("fetch goal_metrics", metricsRes.error)
  const metrics = metricsRes.data ?? []
  return (goalsRes.data ?? []).map((goal) => goalFromRows(goal, metrics))
}

export async function fetchAllAttempts(): Promise<Attempt[]> {
  const [attemptsRes, tasksRes, predictionsRes, resultsRes] = await Promise.all(
    [
      supabase.from("attempts").select("*"),
      supabase.from("attempt_tasks").select("*"),
      supabase.from("attempt_predictions").select("*"),
      supabase.from("attempt_results").select("*"),
    ],
  )
  logDbError("fetch attempts", attemptsRes.error)
  logDbError("fetch attempt_tasks", tasksRes.error)
  logDbError("fetch attempt_predictions", predictionsRes.error)
  logDbError("fetch attempt_results", resultsRes.error)

  const tasks = tasksRes.data ?? []
  const predictions = predictionsRes.data ?? []
  const results = resultsRes.data ?? []

  return (attemptsRes.data ?? []).map((attempt) =>
    attemptFromRows(attempt, tasks, predictions, results),
  )
}

// ---------- writes ----------

export async function dbInsertTask(task: TodoTask) {
  const { error } = await supabase.from("tasks").insert(taskToInsert(task))
  logDbError("insert task", error)
}

export async function dbUpdateTask(taskId: string, patch: Partial<TodoTask>) {
  const { error } = await supabase
    .from("tasks")
    .update(taskPatchToUpdate(patch))
    .eq("id", taskId)
  logDbError("update task", error)
}

export async function dbDeleteTask(taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId)
  logDbError("delete task", error)
}

export async function dbInsertGoal(goal: Goal) {
  const { error: goalError } = await supabase
    .from("goals")
    .insert(goalToInsert(goal))
  logDbError("insert goal", goalError)
  if (goal.metrics.length === 0) return
  const { error: metricsError } = await supabase
    .from("goal_metrics")
    .insert(
      goal.metrics.map((metric, index) =>
        metricToInsert(goal.id, metric, index),
      ),
    )
  logDbError("insert goal_metrics", metricsError)
}

export async function dbUpdateGoal(goal: Goal, previousMetricIds: string[]) {
  const { error: goalError } = await supabase
    .from("goals")
    .update(goalToInsert(goal))
    .eq("id", goal.id)
  logDbError("update goal", goalError)

  const nextIds = new Set(goal.metrics.map((m) => m.id))
  const removed = previousMetricIds.filter((id) => !nextIds.has(id))
  if (removed.length > 0) {
    const { error } = await supabase
      .from("goal_metrics")
      .delete()
      .in("id", removed)
    logDbError("delete removed goal_metrics", error)
  }

  if (goal.metrics.length === 0) return
  const { error: metricsError } = await supabase.from("goal_metrics").upsert(
    goal.metrics.map((metric, index) => metricToInsert(goal.id, metric, index)),
  )
  logDbError("upsert goal_metrics", metricsError)
}

export async function dbDeleteGoal(goalId: string) {
  const { error } = await supabase.from("goals").delete().eq("id", goalId)
  logDbError("delete goal", error)
}

export async function dbInsertAttempt(attempt: Attempt) {
  const { error: attemptError } = await supabase
    .from("attempts")
    .insert(attemptToInsert(attempt))
  logDbError("insert attempt", attemptError)

  if (attempt.tasks.length > 0) {
    const { error } = await supabase
      .from("attempt_tasks")
      .insert(
        attempt.tasks.map((task, index) =>
          attemptTaskToInsert(attempt.id, task, index),
        ),
      )
    logDbError("insert attempt_tasks", error)
  }

  if (attempt.predictions.length > 0) {
    const { error } = await supabase.from("attempt_predictions").insert(
      attempt.predictions.map((p) => ({
        attempt_id: attempt.id,
        metric_id: p.metricId,
        worst: p.worst,
        acceptable: p.acceptable,
        best: p.best,
      })),
    )
    logDbError("insert attempt_predictions", error)
  }

  if (attempt.results.length > 0) {
    const { error } = await supabase.from("attempt_results").insert(
      attempt.results.map((r) => ({
        attempt_id: attempt.id,
        metric_id: r.metricId,
        value: r.value,
      })),
    )
    logDbError("insert attempt_results", error)
  }
}

export async function dbUpdateAttempt(
  attempt: Attempt,
  previousTaskIds: string[],
) {
  const { error: attemptError } = await supabase
    .from("attempts")
    .update(attemptToInsert(attempt))
    .eq("id", attempt.id)
  logDbError("update attempt", attemptError)

  const nextIds = new Set(attempt.tasks.map((t) => t.id))
  const removed = previousTaskIds.filter((id) => !nextIds.has(id))
  if (removed.length > 0) {
    const { error } = await supabase
      .from("attempt_tasks")
      .delete()
      .in("id", removed)
    logDbError("delete removed attempt_tasks", error)
  }

  if (attempt.tasks.length > 0) {
    const { error } = await supabase.from("attempt_tasks").upsert(
      attempt.tasks.map((task, index) =>
        attemptTaskToInsert(attempt.id, task, index),
      ),
    )
    logDbError("upsert attempt_tasks", error)
  }
}

export async function dbDeleteAttempt(attemptId: string) {
  const { error } = await supabase
    .from("attempts")
    .delete()
    .eq("id", attemptId)
  logDbError("delete attempt", error)
}

export async function dbInsertAttemptTask(
  attemptId: string,
  task: AttemptTask,
  position: number,
) {
  const { error } = await supabase
    .from("attempt_tasks")
    .insert(attemptTaskToInsert(attemptId, task, position))
  logDbError("insert attempt_task", error)
}

export async function dbUpdateAttemptTask(
  taskId: string,
  patch: Partial<AttemptTask>,
) {
  const { error } = await supabase
    .from("attempt_tasks")
    .update(attemptTaskPatchToUpdate(patch))
    .eq("id", taskId)
  logDbError("update attempt_task", error)
}

export async function dbDeleteAttemptTask(taskId: string) {
  const { error } = await supabase
    .from("attempt_tasks")
    .delete()
    .eq("id", taskId)
  logDbError("delete attempt_task", error)
}

export async function dbStartAttempt(
  attemptId: string,
  predictions: MetricPrediction[],
  startedAt: Date,
) {
  const { error: attemptError } = await supabase
    .from("attempts")
    .update({
      status: "active",
      started_at: startedAt.toISOString(),
    })
    .eq("id", attemptId)
  logDbError("start attempt", attemptError)

  const { error: clearError } = await supabase
    .from("attempt_predictions")
    .delete()
    .eq("attempt_id", attemptId)
  logDbError("clear attempt_predictions", clearError)

  if (predictions.length === 0) return
  const { error } = await supabase.from("attempt_predictions").insert(
    predictions.map((p) => ({
      attempt_id: attemptId,
      metric_id: p.metricId,
      worst: p.worst,
      acceptable: p.acceptable,
      best: p.best,
    })),
  )
  logDbError("insert attempt_predictions", error)
}

export async function dbCompleteAttempt(
  attemptId: string,
  results: AttemptResult[],
  retrospective: Retrospective | undefined,
  completedAt: Date,
  metricUpdates: { id: string; currentValue: number }[],
) {
  const retro = normalizeRetrospective(retrospective)
  const { error: attemptError } = await supabase
    .from("attempts")
    .update({
      status: "completed",
      completed_at: completedAt.toISOString(),
      retro_happened: retro?.happened ?? null,
      retro_learned: retro?.learned ?? null,
      retro_future_note: retro?.futureNote ?? null,
    })
    .eq("id", attemptId)
  logDbError("complete attempt", attemptError)

  const { error: clearError } = await supabase
    .from("attempt_results")
    .delete()
    .eq("attempt_id", attemptId)
  logDbError("clear attempt_results", clearError)

  if (results.length > 0) {
    const { error } = await supabase.from("attempt_results").insert(
      results.map((r) => ({
        attempt_id: attemptId,
        metric_id: r.metricId,
        value: r.value,
      })),
    )
    logDbError("insert attempt_results", error)
  }

  await Promise.all(
    metricUpdates.map(async ({ id, currentValue }) => {
      const { error } = await supabase
        .from("goal_metrics")
        .update({ current_value: currentValue })
        .eq("id", id)
      logDbError("update metric current_value", error)
    }),
  )
}

export async function dbUpdateMetricValues(
  metricUpdates: { id: string; currentValue: number }[],
) {
  await Promise.all(
    metricUpdates.map(async ({ id, currentValue }) => {
      const { error } = await supabase
        .from("goal_metrics")
        .update({ current_value: currentValue })
        .eq("id", id)
      logDbError("update metric current_value", error)
    }),
  )
}
