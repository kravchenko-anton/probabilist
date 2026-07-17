import {
  metricDirection,
  type Attempt,
  type AttemptResult,
  type AttemptTask,
  type MetricPrediction,
  type Retrospective,
} from "@/data/attempts"
import { initialGoals, metricAggregation, type Goal, type GoalMetric } from "@/data/goals"
import { requestTimeLog } from "@/lib/time-log-store"
import { create } from "zustand"

const STORAGE_KEY = "probabilist:goals"
const ATTEMPTS_KEY = "probabilist:attempts"

function loadGoals(): Goal[] {
  if (typeof window === "undefined") return initialGoals
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return initialGoals
  try {
    const parsed = JSON.parse(raw) as Goal[]
    return parsed.map((goal) => ({
      ...goal,
      startDate: new Date(goal.startDate),
      endDate: new Date(goal.endDate),
    }))
  } catch {
    return initialGoals
  }
}

function persistGoals(goals: Goal[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

interface StoredAttemptTask extends AttemptTask {
  note?: string
}

interface StoredAttempt extends Omit<Attempt, "tasks" | "retrospective"> {
  tasks?: StoredAttemptTask[]
  /** Legacy field name — earlier versions stored tasks as `todos` with a plain-text `note`. */
  todos?: StoredAttemptTask[]
  /** Earlier versions stored the retrospective as one free-form string. */
  retrospective?: Retrospective | string
}

/** Trims every answer and drops the whole object when nothing was written. */
function normalizeRetrospective(retro?: Retrospective | string): Retrospective | undefined {
  if (!retro) return undefined
  if (typeof retro === "string") return retro.trim() ? { happened: retro.trim() } : undefined
  const happened = retro.happened?.trim() || undefined
  const learned = retro.learned?.trim() || undefined
  const futureNote = retro.futureNote?.trim() || undefined
  if (!happened && !learned && !futureNote) return undefined
  return { happened, learned, futureNote }
}

function reviveTask(task: StoredAttemptTask): AttemptTask {
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    date: task.date ? new Date(task.date) : undefined,
    description: task.description ?? task.note,
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
    deletedAt: task.deletedAt ? new Date(task.deletedAt) : undefined,
    estimatedMinutes: task.estimatedMinutes,
    actualMinutes: task.actualMinutes,
  }
}

function loadAttempts(): Attempt[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(ATTEMPTS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as StoredAttempt[]
    return parsed.map(({ todos, tasks, ...attempt }) => ({
      ...attempt,
      createdAt: new Date(attempt.createdAt),
      startedAt: attempt.startedAt ? new Date(attempt.startedAt) : undefined,
      deadline: attempt.deadline ? new Date(attempt.deadline) : undefined,
      completedAt: attempt.completedAt ? new Date(attempt.completedAt) : undefined,
      retrospective: normalizeRetrospective(attempt.retrospective),
      tasks: (tasks ?? todos ?? []).map(reviveTask),
    }))
  } catch {
    return []
  }
}

function persistAttempts(attempts: Attempt[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
}

/** Folds an attempt result into the goal value according to the metric's aggregation. */
function applyResult(metric: GoalMetric, value: number) {
  if (metricAggregation(metric) === "sum") return metric.currentValue + value
  // "max" keeps the best single attempt, respecting shrink-direction metrics.
  return metricDirection(metric) === 1
    ? Math.max(metric.currentValue, value)
    : Math.min(metric.currentValue, value)
}

interface GoalsState {
  goals: Goal[]
  attempts: Attempt[]
  addGoal: (goal: Goal) => void
  updateGoal: (goal: Goal) => void
  deleteGoal: (goalId: string) => void
  addAttempt: (attempt: Attempt) => void
  updateAttempt: (attempt: Attempt) => void
  deleteAttempt: (attemptId: string) => void
  addAttemptTask: (attemptId: string, title: string) => void
  toggleAttemptTask: (attemptId: string, taskId: string) => void
  updateAttemptTask: (attemptId: string, taskId: string, patch: Partial<AttemptTask>) => void
  removeAttemptTask: (attemptId: string, taskId: string) => void
  startAttempt: (attemptId: string, predictions: MetricPrediction[]) => void
  completeAttempt: (attemptId: string, results: AttemptResult[], retrospective?: Retrospective) => void
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
  const commitGoals = (updater: (prev: Goal[]) => Goal[]) =>
    set((state) => {
      const goals = updater(state.goals)
      persistGoals(goals)
      return { goals }
    })

  const commitAttempts = (updater: (prev: Attempt[]) => Attempt[]) =>
    set((state) => {
      const attempts = updater(state.attempts)
      persistAttempts(attempts)
      return { attempts }
    })

  /** Pops the "time it took" dialog when the task is about to flip to done. */
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
    goals: loadGoals(),
    attempts: loadAttempts(),
    addGoal: (goal) => commitGoals((prev) => [...prev, goal]),
    updateGoal: (goal) => commitGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g))),
    deleteGoal: (goalId) => {
      commitGoals((prev) => prev.filter((g) => g.id !== goalId))
      commitAttempts((prev) => prev.filter((a) => a.goalId !== goalId))
    },
    addAttempt: (attempt) => commitAttempts((prev) => [...prev, attempt]),
    updateAttempt: (attempt) =>
      commitAttempts((prev) => prev.map((a) => (a.id === attempt.id ? attempt : a))),
    deleteAttempt: (attemptId) =>
      commitAttempts((prev) => prev.filter((a) => a.id !== attemptId)),
    addAttemptTask: (attemptId, title) =>
      commitAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id !== attemptId
            ? attempt
            : {
                ...attempt,
                tasks: [...attempt.tasks, { id: crypto.randomUUID(), title, done: false }],
              }
        )
      ),
    toggleAttemptTask: (attemptId, taskId) => {
      askTimeOnComplete(attemptId, taskId)
      commitAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id !== attemptId
            ? attempt
            : {
                ...attempt,
                tasks: attempt.tasks.map((task) =>
                  task.id === taskId
                    ? { ...task, done: !task.done, completedAt: task.done ? undefined : new Date() }
                    : task
                ),
              }
        )
      )
    },
    updateAttemptTask: (attemptId, taskId, patch) => {
      if (patch.done) askTimeOnComplete(attemptId, taskId)
      commitAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id !== attemptId
            ? attempt
            : {
                ...attempt,
                tasks: attempt.tasks.map((task) =>
                  task.id === taskId ? { ...task, ...patch } : task
                ),
              }
        )
      )
    },
    removeAttemptTask: (attemptId, taskId) =>
      commitAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id !== attemptId
            ? attempt
            : { ...attempt, tasks: attempt.tasks.filter((task) => task.id !== taskId) }
        )
      ),
    startAttempt: (attemptId, predictions) =>
      commitAttempts((prev) =>
        prev.map((attempt) =>
          attempt.id !== attemptId
            ? attempt
            : { ...attempt, status: "active", startedAt: new Date(), predictions }
        )
      ),
    completeAttempt: (attemptId, results, retrospective) => {
      const attempt = get().attempts.find((a) => a.id === attemptId)
      if (!attempt || attempt.status !== "active") return
      commitAttempts((prev) =>
        prev.map((a) =>
          a.id !== attemptId
            ? a
            : {
                ...a,
                status: "completed",
                completedAt: new Date(),
                results,
                retrospective: normalizeRetrospective(retrospective),
              }
        )
      )
      commitGoals((prev) =>
        prev.map((goal) =>
          goal.id !== attempt.goalId
            ? goal
            : {
                ...goal,
                metrics: goal.metrics.map((metric) => {
                  const result = results.find((r) => r.metricId === metric.id)
                  if (!result) return metric
                  return { ...metric, currentValue: applyResult(metric, result.value) }
                }),
              }
        )
      )
    },
    logCompletedExperiment: ({ goalId, title, icon, finishedAt, tasks, results, retrospective }) => {
      const attempt: Attempt = {
        id: crypto.randomUUID(),
        goalId,
        title,
        icon,
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
      commitAttempts((prev) => [...prev, attempt])
      if (results.length > 0) {
        commitGoals((prev) =>
          prev.map((goal) =>
            goal.id !== goalId
              ? goal
              : {
                  ...goal,
                  metrics: goal.metrics.map((metric) => {
                    const result = results.find((r) => r.metricId === metric.id)
                    if (!result) return metric
                    return { ...metric, currentValue: applyResult(metric, result.value) }
                  }),
                }
          )
        )
      }
      return attempt
    },
  }
})

/** Same call shape as the old context hook, so existing components keep working. */
export const useGoals = useGoalsStore
