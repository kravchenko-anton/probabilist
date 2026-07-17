import { Check } from "lucide-react"
import { Emoji } from "@/components/ui/emoji"
import { cn } from "@/lib/utils"
import {
  activeTasks,
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
      ? `${tasksDoneCount(attempt)}/${activeTasks(attempt).length} tasks`
      : `${activeTasks(attempt).length} tasks`

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

export function AttemptRow({ attempt, selected, onSelect }: AttemptRowProps) {
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
        {attempt.icon && <Emoji value={attempt.icon} className="size-[15px]" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{attempt.title}</span>
        <Subtitle attempt={attempt} />
      </span>
    </div>
  )
}
