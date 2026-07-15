import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { initialGoals, type Goal } from "@/data/goals"

const STORAGE_KEY = "probabilist:goals"

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

function persist(goals: Goal[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

interface GoalsContextValue {
  goals: Goal[]
  addGoal: (goal: Goal) => void
  updateMetricValue: (goalSlug: string, metricId: string, currentValue: number) => void
}

const GoalsContext = createContext<GoalsContextValue | null>(null)

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals())

  const value = useMemo<GoalsContextValue>(
    () => ({
      goals,
      addGoal: (goal) => {
        setGoals((prev) => {
          const next = [...prev, goal]
          persist(next)
          return next
        })
      },
      updateMetricValue: (goalSlug, metricId, currentValue) => {
        setGoals((prev) => {
          const next = prev.map((goal) =>
            goal.slug !== goalSlug
              ? goal
              : {
                  ...goal,
                  metrics: goal.metrics.map((metric) =>
                    metric.id === metricId ? { ...metric, currentValue } : metric
                  ),
                }
          )
          persist(next)
          return next
        })
      },
    }),
    [goals]
  )

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
}

export function useGoals() {
  const ctx = useContext(GoalsContext)
  if (!ctx) throw new Error("useGoals must be used within a GoalsProvider")
  return ctx
}
