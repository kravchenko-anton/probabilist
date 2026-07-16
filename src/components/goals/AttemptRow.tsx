import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  deadlineMissDays,
  formatMissDays,
  isOverdue,
  todosDoneCount,
  type Attempt,
} from "@/data/attempts"
import { formatShortDate } from "@/lib/date"

interface AttemptRowProps {
  attempt: Attempt
  selected?: boolean
  onSelect: () => void
}

function StatusIndicator({ attempt }: { attempt: Attempt }) {
  if (attempt.status === "completed") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check size={10} />
      </span>
    )
  }
  if (attempt.status === "active") {
    return <span className="size-4 shrink-0 rounded-full border-2 border-primary bg-primary/20" />
  }
  return <span className="size-4 shrink-0 rounded-full border border-muted-foreground/50" />
}

function Subtitle({ attempt }: { attempt: Attempt }) {
  if (attempt.status === "completed") {
    const miss = deadlineMissDays(attempt)
    return (
      <span className="truncate text-xs text-muted-foreground">
        {attempt.completedAt ? `Completed ${formatShortDate(attempt.completedAt)}` : "Completed"}
        {miss !== null && (
          <>
            {" · "}
            <span className={miss > 0 ? "text-red-400" : "text-emerald-400"}>
              {formatMissDays(miss)}
            </span>
          </>
        )}
      </span>
    )
  }

  const steps =
    attempt.status === "active"
      ? `${todosDoneCount(attempt)}/${attempt.todos.length} steps`
      : `${attempt.todos.length} steps`

  return (
    <span className="truncate text-xs text-muted-foreground">
      <span className={cn(isOverdue(attempt) && "text-red-400")}>
        {attempt.deadline ? `Due ${formatShortDate(attempt.deadline)}` : "No deadline"}
      </span>
      {" · "}
      {steps}
    </span>
  )
}

export function AttemptRow({ attempt, selected, onSelect }: AttemptRowProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-start gap-2.5 px-4 py-2 text-left hover:bg-white/5",
        selected && "bg-white/5"
      )}
    >
      <span className="mt-0.5 flex items-center gap-2">
        <StatusIndicator attempt={attempt} />
        {attempt.icon && <span className="text-[15px] leading-none">{attempt.icon}</span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{attempt.title}</span>
        <Subtitle attempt={attempt} />
      </span>
    </button>
  )
}
