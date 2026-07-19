import { Emoji } from "@/components/ui/emoji"
import {
  classifyOutcome,
  isOverdue,
  isTinyAttempt,
  metricDirection,
  type Attempt,
} from "@/data/attempts"
import type { Goal } from "@/data/goals"
import { formatShortDate } from "@/lib/date"
import { cn } from "@/lib/utils"

interface AttemptRowProps {
  attempt: Attempt
  goal?: Goal
  selected?: boolean
  onSelect: () => void
}

function Subtitle({ attempt, goal }: { attempt: Attempt; goal?: Goal }) {
  if (attempt.status === "completed") {
    const firstResult = attempt.results[0]
    const prediction = attempt.predictions.find(
      (p) => p.metricId === firstResult?.metricId,
    )
    const metric = goal?.metrics.find((m) => m.id === firstResult?.metricId)
    const outcome =
      firstResult && prediction && metric
        ? classifyOutcome(
            prediction,
            firstResult.value,
            metricDirection(metric),
          )
        : null

    return (
      <span className="truncate text-tiny text-default-500">
        {attempt.completedAt
          ? formatShortDate(attempt.completedAt)
          : "Completed"}
        {outcome && (
          <>
            {" · "}
            <span className={outcome.className}>{outcome.short}</span>
          </>
        )}
      </span>
    )
  }

  if (attempt.status === "active") {
    return (
      <span className="truncate text-tiny text-default-500">
        <span className="text-primary">Running</span>
        {attempt.deadline && (
          <>
            {" · "}
            <span className={cn(isOverdue(attempt) && "text-red-400")}>
              due {formatShortDate(attempt.deadline)}
            </span>
          </>
        )}
      </span>
    )
  }

  return (
    <span className="truncate text-tiny text-default-500">
      Ready
      {isTinyAttempt(attempt) ? "" : " · has steps"}
      {attempt.deadline && ` · due ${formatShortDate(attempt.deadline)}`}
    </span>
  )
}

export function AttemptRow({
  attempt,
  goal,
  selected,
  onSelect,
}: AttemptRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-h-14 items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200",
        selected
          ? "bg-white/[0.08] text-foreground"
          : "text-default-500 hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-large border border-divider bg-background/30">
        <Emoji value={attempt.icon ?? "🧪"} className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-small font-medium text-foreground">
          {attempt.title}
        </span>
        <Subtitle attempt={attempt} goal={goal} />
      </span>
    </button>
  )
}
