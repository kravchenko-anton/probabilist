export interface GoalMetric {
  id: string
  name: string
  unit?: string
  startValue: number
  targetValue: number
  currentValue: number
}

export interface Goal {
  id: string
  slug: string
  title: string
  emoji: string
  description?: string
  owner: string
  members: string[]
  notifyMembers: boolean
  timePeriodLabel: string
  startDate: Date
  endDate: Date
  privacy: "Public" | "Private"
  metrics: GoalMetric[]
}

export function metricProgress(metric: GoalMetric) {
  const { startValue, targetValue, currentValue } = metric
  if (targetValue === startValue) return currentValue >= targetValue ? 100 : 0
  const ratio = (currentValue - startValue) / (targetValue - startValue)
  return Math.min(100, Math.max(0, ratio * 100))
}

export function goalProgress(goal: Goal) {
  if (goal.metrics.length === 0) return 0
  const total = goal.metrics.reduce((sum, metric) => sum + metricProgress(metric), 0)
  return total / goal.metrics.length
}

export function slugify(title: string) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return base || "goal"
}

export const initialGoals: Goal[] = []
