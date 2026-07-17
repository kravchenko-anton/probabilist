import {
  metricDirection,
  type Attempt,
  type AttemptResult,
  type AttemptTask,
  type MetricPrediction,
  type Retrospective,
} from "@/data/attempts"
import {
  metricAggregation,
  type Goal,
  type GoalMetric,
} from "@/data/goals"
import {
  dbCompleteAttempt,
  dbDeleteAttempt,
  dbDeleteAttemptTask,
  dbDeleteGoal,
  dbInsertAttempt,
  dbInsertAttemptTask,
  dbInsertGoal,
  dbStartAttempt,
  dbUpdateAttempt,
  dbUpdateAttemptTask,
  dbUpdateGoal,
  dbUpdateMetricValues,
  fetchAllAttempts,
  fetchAllGoals,
} from "@/lib/db"
import { requestTimeLog } from "@/lib/time-log-store"
import { create } from "zustand"

type DataStatus = "idle" | "loading" | "ready" | "error"

function normalizeRetrospective(
  retro?: Retrospective | string,
): Retrospective | undefined {
  if (!retro) return undefined
  if (typeof retro === "string")
    return retro.trim() ? { happened: retro.trim() } : undefined
  const happened = retro.happened?.trim() || undefined
  const learned = retro.learned?.trim() || undefined
  const futureNote = retro.futureNote?.trim() || undefined
  if (!happened && !learned && !futureNote) return undefined
  return { happened, learned, futureNote }
}

function applyResult(metric: GoalMetric, value: number) {
  if (metricAggregation(metric) === "sum") return metric.currentValue + value
  return metricDirection(metric) === 1
    ? Math.max(metric.currentValue, value)
    : Math.min(metric.currentValue, value)
}

function metricUpdatesFromResults(
  goal: Goal,
  results: AttemptResult[],
): { id: string; currentValue: number }[] {
  return goal.metrics
    .map((metric) => {
      const result = results.find((r) => r.metricId === metric.id)
      if (!result) return null
      return { id: metric.id, currentValue: applyResult(metric, result.value) }
    })
    .filter((row): row is { id: string; currentValue: number } => row !== null)
}

interface GoalsState {
  goals: Goal[]
  attempts: Attempt[]
  status: DataStatus
  hydrate: () => Promise<void>
  reset: () => void
  addGoal: (goal: Goal) => void
  updateGoal: (goal: Goal) => void
  deleteGoal: (goalId: string) => void
  addAttempt: (attempt: Attempt) => void
  updateAttempt: (attempt: Attempt) => void
  deleteAttempt: (attemptId: string) => void
  addAttemptTask: (attemptId: string, title: string) => void
  toggleAttemptTask: (attemptId: string, taskId: string) => void
  updateAttemptTask: (
    attemptId: string,
    taskId: string,
    patch: Partial<AttemptTask>,
  ) => void
  removeAttemptTask: (attemptId: string, taskId: string) => void
  startAttempt: (attemptId: string, predictions: MetricPrediction[]) => void
  completeAttempt: (
    attemptId: string,
    results: AttemptResult[],
    retrospective?: Retrospective,
  ) => void
  logCompletedExperiment: (input: {
    goalId: string
    title: string
    icon?: string
    finishedAt: Date
    tasks: AttemptTask[]
    results: AttemptResult[]
    retrospective?: Retrospective
  }) => Attempt
}

export const useGoalsStore = create<GoalsState>()((set, get) => {
  const askTimeOnComplete = (attemptId: string, taskId: string) => {
    const task = get()
      .attempts.find((a) => a.id === attemptId)
      ?.tasks.find((t) => t.id === taskId)
    if (!task || task.done) return
    requestTimeLog({
      target: { kind: "attempt", attemptId, taskId },
      title: task.title,
      estimatedMinutes: task.estimatedMinutes,
      actualMinutes: task.actualMinutes,
    })
  }

  return {
    goals: [],
    attempts: [],
    status: "idle",

    hydrate: async () => {
      set({ status: "loading" })
      try {
        const [goals, attempts] = await Promise.all([
          fetchAllGoals(),
          fetchAllAttempts(),
        ])
        set({ goals, attempts, status: "ready" })
      } catch (error) {
        console.error("[supabase] hydrate goals failed:", error)
        set({ goals: [], attempts: [], status: "error" })
      }
    },

    reset: () => set({ goals: [], attempts: [], status: "idle" }),

    addGoal: (goal) => {
      set((state) => ({ goals: [...state.goals, goal] }))
      void dbInsertGoal(goal)
    },

    updateGoal: (goal) => {
      const previous = get().goals.find((g) => g.id === goal.id)
      const previousMetricIds = previous?.metrics.map((m) => m.id) ?? []
      set((state) => ({
        goals: state.goals.map((g) => (g.id === goal.id ? goal : g)),
      }))
      void dbUpdateGoal(goal, previousMetricIds)
    },

    deleteGoal: (goalId) => {
      set((state) => ({
        goals: state.goals.filter((g) => g.id !== goalId),
        attempts: state.attempts.filter((a) => a.goalId !== goalId),
      }))
      void dbDeleteGoal(goalId)
    },

    addAttempt: (attempt) => {
      set((state) => ({ attempts: [...state.attempts, attempt] }))
      void dbInsertAttempt(attempt)
    },

    updateAttempt: (attempt) => {
      const previous = get().attempts.find((a) => a.id === attempt.id)
      const previousTaskIds = previous?.tasks.map((t) => t.id) ?? []
      set((state) => ({
        attempts: state.attempts.map((a) =>
          a.id === attempt.id ? attempt : a,
        ),
      }))
      void dbUpdateAttempt(attempt, previousTaskIds)
    },

    deleteAttempt: (attemptId) => {
      set((state) => ({
        attempts: state.attempts.filter((a) => a.id !== attemptId),
      }))
      void dbDeleteAttempt(attemptId)
    },

    addAttemptTask: (attemptId, title) => {
      const attempt = get().attempts.find((a) => a.id === attemptId)
      if (!attempt) return
      const task: AttemptTask = {
        id: crypto.randomUUID(),
        title,
        done: false,
      }
      const position = attempt.tasks.length
      set((state) => ({
        attempts: state.attempts.map((a) =>
          a.id !== attemptId ? a : { ...a, tasks: [...a.tasks, task] },
        ),
      }))
      void dbInsertAttemptTask(attemptId, task, position)
    },

    toggleAttemptTask: (attemptId, taskId) => {
      askTimeOnComplete(attemptId, taskId)
      const attempt = get().attempts.find((a) => a.id === attemptId)
      const task = attempt?.tasks.find((t) => t.id === taskId)
      if (!task) return
      const patch: Partial<AttemptTask> = {
        done: !task.done,
        completedAt: task.done ? undefined : new Date(),
      }
      set((state) => ({
        attempts: state.attempts.map((a) =>
          a.id !== attemptId
            ? a
            : {
                ...a,
                tasks: a.tasks.map((t) =>
                  t.id === taskId ? { ...t, ...patch } : t,
                ),
              },
        ),
      }))
      void dbUpdateAttemptTask(taskId, patch)
    },

    updateAttemptTask: (attemptId, taskId, patch) => {
      if (patch.done) askTimeOnComplete(attemptId, taskId)
      set((state) => ({
        attempts: state.attempts.map((attempt) =>
          attempt.id !== attemptId
            ? attempt
            : {
                ...attempt,
                tasks: attempt.tasks.map((task) =>
                  task.id === taskId ? { ...task, ...patch } : task,
                ),
              },
        ),
      }))
      void dbUpdateAttemptTask(taskId, patch)
    },

    removeAttemptTask: (attemptId, taskId) => {
      set((state) => ({
        attempts: state.attempts.map((attempt) =>
          attempt.id !== attemptId
            ? attempt
            : {
                ...attempt,
                tasks: attempt.tasks.filter((task) => task.id !== taskId),
              },
        ),
      }))
      void dbDeleteAttemptTask(taskId)
    },

    startAttempt: (attemptId, predictions) => {
      const startedAt = new Date()
      set((state) => ({
        attempts: state.attempts.map((attempt) =>
          attempt.id !== attemptId
            ? attempt
            : {
                ...attempt,
                status: "active",
                startedAt,
                predictions,
              },
        ),
      }))
      void dbStartAttempt(attemptId, predictions, startedAt)
    },

    completeAttempt: (attemptId, results, retrospective) => {
      const attempt = get().attempts.find((a) => a.id === attemptId)
      if (!attempt || attempt.status !== "active") return
      const goal = get().goals.find((g) => g.id === attempt.goalId)
      const completedAt = new Date()
      const normalized = normalizeRetrospective(retrospective)
      const metricUpdates = goal
        ? metricUpdatesFromResults(goal, results)
        : []

      set((state) => ({
        attempts: state.attempts.map((a) =>
          a.id !== attemptId
            ? a
            : {
                ...a,
                status: "completed",
                completedAt,
                results,
                retrospective: normalized,
              },
        ),
        goals: state.goals.map((g) =>
          g.id !== attempt.goalId
            ? g
            : {
                ...g,
                metrics: g.metrics.map((metric) => {
                  const update = metricUpdates.find((u) => u.id === metric.id)
                  return update
                    ? { ...metric, currentValue: update.currentValue }
                    : metric
                }),
              },
        ),
      }))

      void dbCompleteAttempt(
        attemptId,
        results,
        normalized,
        completedAt,
        metricUpdates,
      )
    },

    logCompletedExperiment: ({
      goalId,
      title,
      icon,
      finishedAt,
      tasks,
      results,
      retrospective,
    }) => {
      const attempt: Attempt = {
        id: crypto.randomUUID(),
        goalId,
        title,
        icon,
        kind: tasks.length > 0 ? "standard" : "tiny",
        deadline: finishedAt,
        tasks,
        status: "completed",
        createdAt: new Date(),
        startedAt: finishedAt,
        completedAt: finishedAt,
        predictions: [],
        results,
        retrospective: normalizeRetrospective(retrospective),
      }

      const goal = get().goals.find((g) => g.id === goalId)
      const metricUpdates =
        results.length > 0 && goal
          ? metricUpdatesFromResults(goal, results)
          : []

      set((state) => ({
        attempts: [...state.attempts, attempt],
        goals:
          metricUpdates.length === 0
            ? state.goals
            : state.goals.map((g) =>
                g.id !== goalId
                  ? g
                  : {
                      ...g,
                      metrics: g.metrics.map((metric) => {
                        const update = metricUpdates.find(
                          (u) => u.id === metric.id,
                        )
                        return update
                          ? { ...metric, currentValue: update.currentValue }
                          : metric
                      }),
                    },
              ),
      }))

      void dbInsertAttempt(attempt)
      if (metricUpdates.length > 0) void dbUpdateMetricValues(metricUpdates)
      return attempt
    },
  }
})

/** Same call shape as the old context hook, so existing components keep working. */
export const useGoals = useGoalsStore
