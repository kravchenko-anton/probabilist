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
  timePeriodLabel: string
  startDate: Date
  endDate: Date
  privacy: "Public" | "Private"
  metrics: GoalMetric[]
}

export function metricProgressAt(metric: GoalMetric, value: number) {
  const { startValue, targetValue } = metric
  if (targetValue === startValue) return value >= targetValue ? 100 : 0
  const ratio = (value - startValue) / (targetValue - startValue)
  return Math.min(100, Math.max(0, ratio * 100))
}

export function metricProgress(metric: GoalMetric) {
  return metricProgressAt(metric, metric.currentValue)
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
