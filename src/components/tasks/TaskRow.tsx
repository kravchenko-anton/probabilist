import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskRowProps {
  title: string
  emoji?: string
  hasNote?: boolean
  rightLabel?: string
  rightLabelClassName?: string
  selected?: boolean
  onSelect: () => void
}

export function TaskRow({
  title,
  emoji,
  hasNote,
  rightLabel,
  rightLabelClassName,
  selected,
  onSelect,
}: TaskRowProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2 text-left text-foreground hover:bg-white/5",
        selected && "bg-white/5"
      )}
    >
      <span className="size-4 shrink-0 rounded-full border border-muted-foreground/50" />
      {emoji && <span className="text-[13px] leading-none">{emoji}</span>}
      <span className="flex-1 truncate">{title}</span>
      {hasNote && <FileText size={13} className="text-muted-foreground" />}
      {rightLabel && (
        <span className={cn("text-xs text-muted-foreground", rightLabelClassName)}>
          {rightLabel}
        </span>
      )}
    </button>
  )
}
