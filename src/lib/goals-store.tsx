import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { initialGoals, type Goal } from "@/data/goals"
import type { Attempt, AttemptResult, AttemptTodo, MetricPrediction } from "@/data/attempts"

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

function loadAttempts(): Attempt[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(ATTEMPTS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Attempt[]
    return parsed.map((attempt) => ({
      ...attempt,
      createdAt: new Date(attempt.createdAt),
      startedAt: attempt.startedAt ? new Date(attempt.startedAt) : undefined,
      deadline: attempt.deadline ? new Date(attempt.deadline) : undefined,
      completedAt: attempt.completedAt ? new Date(attempt.completedAt) : undefined,
    }))
  } catch {
    return []
  }
}

function persistAttempts(attempts: Attempt[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
}

interface GoalsContextValue {
  goals: Goal[]
  addGoal: (goal: Goal) => void
  updateGoal: (goal: Goal) => void
  attempts: Attempt[]
  addAttempt: (attempt: Attempt) => void
  updateAttempt: (attempt: Attempt) => void
  deleteAttempt: (attemptId: string) => void
  toggleAttemptTodo: (attemptId: string, todoId: string) => void
  updateAttemptTodo: (attemptId: string, todoId: string, patch: Partial<AttemptTodo>) => void
  startAttempt: (attemptId: string, predictions: MetricPrediction[]) => void
  completeAttempt: (attemptId: string, results: AttemptResult[], retrospective?: string) => void
}

const GoalsContext = createContext<GoalsContextValue | null>(null)

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals())
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadAttempts())

  const value = useMemo<GoalsContextValue>(() => {
    const commitGoals = (updater: (prev: Goal[]) => Goal[]) => {
      setGoals((prev) => {
        const next = updater(prev)
        persistGoals(next)
        return next
      })
    }

    const commitAttempts = (updater: (prev: Attempt[]) => Attempt[]) => {
      setAttempts((prev) => {
        const next = updater(prev)
        persistAttempts(next)
        return next
      })
    }

    return {
      goals,
      addGoal: (goal) => commitGoals((prev) => [...prev, goal]),
      updateGoal: (goal) =>
        commitGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g))),
      attempts,
      addAttempt: (attempt) => commitAttempts((prev) => [...prev, attempt]),
      updateAttempt: (attempt) =>
        commitAttempts((prev) => prev.map((a) => (a.id === attempt.id ? attempt : a))),
      deleteAttempt: (attemptId) =>
        commitAttempts((prev) => prev.filter((a) => a.id !== attemptId)),
      toggleAttemptTodo: (attemptId, todoId) =>
        commitAttempts((prev) =>
          prev.map((attempt) =>
            attempt.id !== attemptId
              ? attempt
              : {
                  ...attempt,
                  todos: attempt.todos.map((todo) =>
                    todo.id === todoId ? { ...todo, done: !todo.done } : todo
                  ),
                }
          )
        ),
      updateAttemptTodo: (attemptId, todoId, patch) =>
        commitAttempts((prev) =>
          prev.map((attempt) =>
            attempt.id !== attemptId
              ? attempt
              : {
                  ...attempt,
                  todos: attempt.todos.map((todo) =>
                    todo.id === todoId ? { ...todo, ...patch } : todo
                  ),
                }
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
        const attempt = attempts.find((a) => a.id === attemptId)
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
  }, [goals, attempts])

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
}

export function useGoals() {
  const ctx = useContext(GoalsContext)
  if (!ctx) throw new Error("useGoals must be used within a GoalsProvider")
  return ctx
}
