import type { GoalMetric } from "@/data/goals"
import { metricProgress } from "@/data/goals"

interface MetricCardProps {
  metric: GoalMetric
  color: string
}

function formatValue(value: number, unit?: string) {
  const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100
  return unit ? `${rounded}${unit}` : `${rounded}`
}

export function MetricCard({ metric, color }: MetricCardProps) {
  const progress = metricProgress(metric)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
          {metric.name}
        </span>
        <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: color }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Start {formatValue(metric.startValue, metric.unit)}</span>
        <span className="text-sm font-medium text-foreground">
          {formatValue(metric.currentValue, metric.unit)}
        </span>
        <span>Target {formatValue(metric.targetValue, metric.unit)}</span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Updates when you record attempt results.
      </p>
    </div>
  )
}
