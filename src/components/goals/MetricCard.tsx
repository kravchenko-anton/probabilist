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
    <div className="flex flex-col gap-2.5 rounded-large bg-content1 px-4 py-3.5 ring-1 ring-foreground/8">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-small font-medium text-foreground">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <span className="truncate">{metric.name}</span>
        </span>
        <span className="text-tiny tabular-nums text-default-500">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: color }}
        />
      </div>

      <div className="flex items-center justify-between text-tiny text-default-500">
        <span>{formatValue(metric.startValue, metric.unit)}</span>
        <span className="font-medium text-foreground tabular-nums">
          {formatValue(metric.currentValue, metric.unit)}
        </span>
        <span>{formatValue(metric.targetValue, metric.unit)}</span>
      </div>
    </div>
  )
}
