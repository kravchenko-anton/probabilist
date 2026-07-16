import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  deadlineMissDays,
  formatMissDays,
  isOverdue,
  tasksDoneCount,
  type Attempt,
} from "@/data/attempts"
import { formatShortDate } from "@/lib/date"

interface AttemptRowProps {
  attempt: Attempt
  selected?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  onSelect: () => void
}

function StatusIndicator({ attempt }: { attempt: Attempt }) {
  if (attempt.status === "completed") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-primary bg-primary text-primary-foreground">
        <Check size={10} />
      </span>
    )
  }
  if (attempt.status === "active") {
    return <span className="size-4 shrink-0 rounded-[4px] border-2 border-primary bg-primary/20" />
  }
  return <span className="size-4 shrink-0 rounded-[4px] border border-input" />
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

  const tasks =
    attempt.status === "active"
      ? `${tasksDoneCount(attempt)}/${attempt.tasks.length} tasks`
      : `${attempt.tasks.length} tasks`

  return (
    <span className="truncate text-xs text-muted-foreground">
      <span className={cn(isOverdue(attempt) && "text-red-400")}>
        {attempt.deadline ? `Due ${formatShortDate(attempt.deadline)}` : "No deadline"}
      </span>
      {" · "}
      {tasks}
    </span>
  )
}

export function AttemptRow({
  attempt,
  selected,
  expanded,
  onToggleExpand,
  onSelect,
}: AttemptRowProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-start gap-2.5 px-4 py-2 text-left hover:bg-white/5",
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
      {onToggleExpand && (
        <button
          type="button"
          aria-label={expanded ? "Hide tasks" : "Show tasks"}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <ChevronRight size={14} className={cn("transition-transform", expanded && "rotate-90")} />
        </button>
      )}
    </div>
  )
}
