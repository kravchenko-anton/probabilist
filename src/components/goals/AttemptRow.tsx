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

function StatusIndicator({ attempt }: { attempt: Attempt }) {
  if (attempt.status === "completed") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-400/15 text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-400" />
      </span>
    )
  }
  if (attempt.status === "active") {
    return (
      <span className="size-4 shrink-0 rounded-full border-2 border-primary bg-primary/20" />
    )
  }
  return <span className="size-4 shrink-0 rounded-full border border-input" />
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
      <span className="truncate text-xs text-muted-foreground">
        {attempt.completedAt
          ? formatShortDate(attempt.completedAt)
          : "Completed"}
        {outcome && (
          <>
            {" · "}
            <span className={outcome.className}>{outcome.short}</span>
          </>
        )}
        {attempt.retrospective?.futureNote && (
          <>
            {" · "}
            <span className="text-foreground/70">
              “{attempt.retrospective.futureNote}”
            </span>
          </>
        )}
      </span>
    )
  }

  if (attempt.status === "active") {
    return (
      <span className="truncate text-xs text-muted-foreground">
        <span className="text-primary">Running</span>
        {attempt.predictions.length > 0 && " · predicted"}
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
    <span className="truncate text-xs text-muted-foreground">
      Ready to predict
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
    <div
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/5 active:scale-[0.995]",
        selected && "bg-white/5",
      )}
    >
      <span className="mt-0.5 flex items-center gap-2">
        <StatusIndicator attempt={attempt} />
        {attempt.icon && <Emoji value={attempt.icon} className="size-[15px]" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">
          {attempt.title}
        </span>
        <Subtitle attempt={attempt} goal={goal} />
      </span>
    </div>
  )
}
