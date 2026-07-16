import { create } from "zustand"
import { initialGoals, type Goal } from "@/data/goals"
import type { Attempt, AttemptResult, AttemptTask, MetricPrediction } from "@/data/attempts"

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

interface StoredAttempt extends Omit<Attempt, "tasks"> {
  tasks?: StoredAttemptTask[]
  /** Legacy field name — earlier versions stored tasks as `todos` with a plain-text `note`. */
  todos?: StoredAttemptTask[]
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

interface GoalsState {
  goals: Goal[]
  attempts: Attempt[]
  addGoal: (goal: Goal) => void
  updateGoal: (goal: Goal) => void
  addAttempt: (attempt: Attempt) => void
  updateAttempt: (attempt: Attempt) => void
  deleteAttempt: (attemptId: string) => void
  toggleAttemptTask: (attemptId: string, taskId: string) => void
  updateAttemptTask: (attemptId: string, taskId: string, patch: Partial<AttemptTask>) => void
  removeAttemptTask: (attemptId: string, taskId: string) => void
  startAttempt: (attemptId: string, predictions: MetricPrediction[]) => void
  completeAttempt: (attemptId: string, results: AttemptResult[], retrospective?: string) => void
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

  return {
    goals: loadGoals(),
    attempts: loadAttempts(),
    addGoal: (goal) => commitGoals((prev) => [...prev, goal]),
    updateGoal: (goal) => commitGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g))),
    addAttempt: (attempt) => commitAttempts((prev) => [...prev, attempt]),
    updateAttempt: (attempt) =>
      commitAttempts((prev) => prev.map((a) => (a.id === attempt.id ? attempt : a))),
    deleteAttempt: (attemptId) =>
      commitAttempts((prev) => prev.filter((a) => a.id !== attemptId)),
    toggleAttemptTask: (attemptId, taskId) =>
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
      ),
    updateAttemptTask: (attemptId, taskId, patch) =>
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
      ),
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
                retrospective: retrospective?.trim() || undefined,
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
                  return result ? { ...metric, currentValue: result.value } : metric
                }),
              }
        )
      )
    },
  }
})

/** Same call shape as the old context hook, so existing components keep working. */
export const useGoals = useGoalsStore
