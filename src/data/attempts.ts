import type { GoalMetric } from "@/data/goals"
import { startOfDay } from "@/lib/date"

export interface AttemptTask {
  id: string
  title: string
  done: boolean
  /** Scheduled day — set while planning; surfaces the task in Today/Tomorrow views. */
  date?: Date
  /** Serialized Lexical document; plain text from legacy notes is also accepted. */
  description?: string
  /** Day the task was checked off; keeps it in day views until that day passes. */
  completedAt?: Date
  /** Soft delete — the task lives in Trash until restored or destroyed. */
  deletedAt?: Date
  /** How long the task is expected to take, in minutes. */
  estimatedMinutes?: number
  /** How long the task actually took, in minutes — logged after completion. */
  actualMinutes?: number
}

export interface MetricPrediction {
  metricId: string
  worst: number
  acceptable: number
  best: number
}

export interface AttemptResult {
  metricId: string
  value: number
}

export type AttemptStatus = "planned" | "active" | "completed"

export interface Retrospective {
  happened?: string
  learned?: string
  futureNote?: string
}

export interface Attempt {
  id: string
  goalId: string
  title: string
  icon?: string
  tasks: AttemptTask[]
  status: AttemptStatus
  createdAt: Date
  startedAt?: Date
  deadline?: Date
  completedAt?: Date
  predictions: MetricPrediction[]
  results: AttemptResult[]
  retrospective?: Retrospective
}

/** Tasks that are not soft-deleted — the only ones counted and rendered. */
export function activeTasks(attempt: Attempt) {
  return attempt.tasks.filter((task) => !task.deletedAt)
}

export function tasksDoneCount(attempt: Attempt) {
  return activeTasks(attempt).filter((task) => task.done).length
}

export function allTasksDone(attempt: Attempt) {
  const tasks = activeTasks(attempt)
  return tasks.length > 0 && tasks.every((task) => task.done)
}

/**
 * Days between the deadline and the day the attempt actually finished
 * (against today while still running). Positive = late, negative = early.
 */
export function deadlineMissDays(attempt: Attempt, asOf: Date = new Date()): number | null {
  if (!attempt.deadline) return null
  const finished = attempt.completedAt ?? asOf
  return Math.round(
    (startOfDay(finished).getTime() - startOfDay(attempt.deadline).getTime()) / 86_400_000
  )
}

export function formatMissDays(days: number) {
  if (days === 0) return "on time"
  return days > 0 ? `${days}d late` : `${-days}d early`
}

export function isOverdue(attempt: Attempt) {
  if (attempt.status === "completed" || !attempt.deadline) return false
  const miss = deadlineMissDays(attempt)
  return miss !== null && miss > 0
}

/** 1 when the metric grows toward the target, -1 when it shrinks. */
export function metricDirection(metric: GoalMetric): 1 | -1 {
  return metric.targetValue >= metric.startValue ? 1 : -1
}

export type OutcomeBand = "below-worst" | "risky" | "acceptable" | "best"

export interface OutcomeInfo {
  band: OutcomeBand
  label: string
  /** Compact one-word verdict for dense list rows. */
  short: string
  className: string
}

const OUTCOME_INFO: Record<OutcomeBand, OutcomeInfo> = {
  "below-worst": {
    band: "below-worst",
    label: "Below worst case",
    short: "Below worst",
    className: "text-red-400",
  },
  risky: {
    band: "risky",
    label: "Short of acceptable",
    short: "Below target",
    className: "text-amber-400",
  },
  acceptable: {
    band: "acceptable",
    label: "Acceptable",
    short: "Good",
    className: "text-lime-300",
  },
  best: {
    band: "best",
    label: "Best case or beyond",
    short: "Best",
    className: "text-emerald-400",
  },
}

export function classifyOutcome(
  prediction: MetricPrediction,
  actual: number,
  direction: 1 | -1
): OutcomeInfo {
  const value = actual * direction
  if (value < prediction.worst * direction) return OUTCOME_INFO["below-worst"]
  if (value < prediction.acceptable * direction) return OUTCOME_INFO.risky
  if (value < prediction.best * direction) return OUTCOME_INFO.acceptable
  return OUTCOME_INFO.best
}
