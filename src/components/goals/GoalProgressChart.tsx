import { useMemo } from "react"
import { Zap, TriangleAlert, Settings2 } from "lucide-react"
import { formatMonthShort, formatShortDate } from "@/lib/date"
import type { Goal } from "@/data/goals"
import { metricProgress, metricProgressAt } from "@/data/goals"
import { deadlineMissDays, formatMissDays, type Attempt } from "@/data/attempts"
import { metricColor } from "@/lib/metric-colors"

interface GoalProgressChartProps {
  goal: Goal
  attempts: Attempt[]
}

const WIDTH = 760
const HEIGHT = 240
const PAD_LEFT = 36
const PAD_RIGHT = 12
const PAD_TOP = 24
const PAD_BOTTOM = 24

function monthTicks(start: Date, end: Date) {
  const ticks: Date[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= last) {
    ticks.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return ticks
}

interface SeriesPoint {
  x: number
  y: number
  attemptTitle?: string
  value?: number
}

interface PredictionWhisker {
  x: number
  worstY: number
  acceptableY: number
  bestY: number
  attemptTitle: string
}

interface MetricSeries {
  metricId: string
  name: string
  color: string
  path: string
  points: SeriesPoint[]
  whiskers: PredictionWhisker[]
}

export function GoalProgressChart({ goal, attempts }: GoalProgressChartProps) {
  const hasMetrics = goal.metrics.length > 0

  const { series, todayX, ticks, deadlineLines } = useMemo(() => {
    const start = goal.startDate.getTime()
    const end = goal.endDate.getTime()
    const span = Math.max(end - start, 1)
    const now = Math.min(Math.max(Date.now(), start), end)

    const chartW = WIDTH - PAD_LEFT - PAD_RIGHT
    const chartH = HEIGHT - PAD_TOP - PAD_BOTTOM

    const xForTime = (time: number) =>
      PAD_LEFT + Math.min(1, Math.max(0, (time - start) / span)) * chartW
    const yForPercent = (percent: number) => PAD_TOP + chartH * (1 - percent / 100)

    const todayX = xForTime(now)

    const completed = attempts
      .filter((a) => a.status === "completed" && a.completedAt)
      .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime())
    const active = attempts.filter((a) => a.status === "active")

    const series: MetricSeries[] = goal.metrics.map((metric, index) => {
      const points: SeriesPoint[] = [{ x: xForTime(start), y: yForPercent(0) }]

      for (const attempt of completed) {
        const result = attempt.results.find((r) => r.metricId === metric.id)
        if (!result) continue
        const miss = deadlineMissDays(attempt)
        points.push({
          x: xForTime(attempt.completedAt!.getTime()),
          y: yForPercent(metricProgressAt(metric, result.value)),
          attemptTitle:
            miss === null ? attempt.title : `${attempt.title} (${formatMissDays(miss)})`,
          value: result.value,
        })
      }

      points.push({ x: todayX, y: yForPercent(metricProgress(metric)) })

      const path = points
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
        .join(" ")

      // Predictions sit at the attempt's deadline; spread overlapping metric whiskers apart.
      const offset = (index - (goal.metrics.length - 1) / 2) * 7
      const whiskers: PredictionWhisker[] = active
        .map((attempt) => {
          const prediction = attempt.predictions.find((p) => p.metricId === metric.id)
          if (!prediction) return null
          const baseX = attempt.deadline ? xForTime(attempt.deadline.getTime()) : todayX
          return {
            x: Math.min(WIDTH - PAD_RIGHT, Math.max(PAD_LEFT, baseX + offset)),
            worstY: yForPercent(metricProgressAt(metric, prediction.worst)),
            acceptableY: yForPercent(metricProgressAt(metric, prediction.acceptable)),
            bestY: yForPercent(metricProgressAt(metric, prediction.best)),
            attemptTitle: attempt.title,
          }
        })
        .filter((w): w is PredictionWhisker => w !== null)

      return {
        metricId: metric.id,
        name: metric.name,
        color: metricColor(index),
        path,
        points,
        whiskers,
      }
    })

    const ticks = monthTicks(goal.startDate, goal.endDate).map((date) => ({
      label: formatMonthShort(date),
      x: xForTime(date.getTime()),
    }))

    const deadlineLines = attempts
      .filter((a) => a.status !== "completed" && a.deadline)
      .map((a) => ({
        x: xForTime(a.deadline!.getTime()),
        title: `${a.title} — due ${formatShortDate(a.deadline!)}`,
      }))

    return { series, todayX, ticks, deadlineLines }
  }, [goal, attempts])

  const yAxis = [0, 25, 50, 75, 100]

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span>Progress</span>
          <Zap size={14} className="text-primary" />
          {!hasMetrics && (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <TriangleAlert size={12} />
              No metrics added yet
            </span>
          )}
        </div>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Settings2 size={13} />
          Progress settings
        </button>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-48 w-full min-w-[520px]"
          role="img"
        >
          {yAxis.map((percent) => {
            const y = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * (1 - percent / 100)
            return (
              <g key={percent}>
                <line
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth={1}
                />
                <text x={0} y={y + 3} className="fill-muted-foreground text-[10px]">
                  {percent}%
                </text>
              </g>
            )
          })}

          <path
            d={`M${PAD_LEFT},${HEIGHT - PAD_BOTTOM} L${WIDTH - PAD_RIGHT},${PAD_TOP}`}
            className="stroke-muted-foreground/40"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="none"
          />

          <line
            x1={todayX}
            x2={todayX}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            className="stroke-muted-foreground/40"
            strokeWidth={1}
          />
          <text x={todayX} y={PAD_TOP - 8} textAnchor="middle" className="fill-foreground text-[10px]">
            Today
          </text>

          {deadlineLines.map((line, i) => (
            <g key={i} className="text-muted-foreground">
              <title>{line.title}</title>
              <line
                x1={line.x}
                x2={line.x}
                y1={PAD_TOP}
                y2={HEIGHT - PAD_BOTTOM}
                stroke="currentColor"
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <path
                d={`M${line.x},${PAD_TOP} l4,3 l-4,3 Z`}
                fill="currentColor"
                fillOpacity={0.8}
              />
            </g>
          ))}

          {series.map((s) => (
            <g key={s.metricId}>
              <path d={s.path} stroke={s.color} strokeWidth={2} fill="none" />

              {s.whiskers.map((w, i) => (
                <g key={i} opacity={0.85}>
                  <title>{`${w.attemptTitle} — prediction (${s.name})`}</title>
                  <line x1={w.x} x2={w.x} y1={w.worstY} y2={w.bestY} stroke={s.color} strokeWidth={1.5} strokeDasharray="2 2" />
                  <line x1={w.x - 4} x2={w.x + 4} y1={w.worstY} y2={w.worstY} stroke={s.color} strokeWidth={1.5} />
                  <line x1={w.x - 4} x2={w.x + 4} y1={w.bestY} y2={w.bestY} stroke={s.color} strokeWidth={1.5} />
                  <circle cx={w.x} cy={w.acceptableY} r={2.5} fill={s.color} />
                </g>
              ))}

              {s.points.map((p, i) =>
                p.attemptTitle ? (
                  <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={s.color}>
                    <title>{`${p.attemptTitle}: ${p.value}`}</title>
                  </circle>
                ) : null
              )}

              <circle
                cx={s.points[s.points.length - 1].x}
                cy={s.points[s.points.length - 1].y}
                r={3.5}
                fill={s.color}
              />
            </g>
          ))}

          {/* Goal target marker, top-right */}
          <circle cx={WIDTH - PAD_RIGHT} cy={PAD_TOP} r={4} className="fill-foreground" />

          {ticks.map((tick) => (
            <text
              key={tick.label + tick.x}
              x={tick.x}
              y={HEIGHT - 4}
              textAnchor="start"
              className="fill-muted-foreground text-[10px]"
            >
              {tick.label}
            </text>
          ))}
        </svg>
      </div>

      {hasMetrics && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {goal.metrics.map((metric, index) => (
            <span key={metric.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: metricColor(index) }} />
              {metric.name}
              <span className="text-foreground">{Math.round(metricProgress(metric))}%</span>
            </span>
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground">
            {formatShortDate(goal.startDate)} → {formatShortDate(goal.endDate)}
          </span>
        </div>
      )}
    </div>
  )
}
