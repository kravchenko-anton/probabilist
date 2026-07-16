import { FileText } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface TaskRowProps {
  title: string
  emoji?: string
  done: boolean
  hasNote?: boolean
  rightLabel?: string
  rightLabelClassName?: string
  selected?: boolean
  onSelect: () => void
  onToggleDone: (done: boolean) => void
}

export function TaskRow({
  title,
  emoji,
  done,
  hasNote,
  rightLabel,
  rightLabelClassName,
  selected,
  onSelect,
  onToggleDone,
}: TaskRowProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 px-4 py-2 text-left text-foreground hover:bg-white/5",
        selected && "bg-white/5"
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={(checked) => onToggleDone(!!checked)}
        onClick={(e) => e.stopPropagation()}
      />
      {emoji && <span className="text-[13px] leading-none">{emoji}</span>}
      <span className={cn("flex-1 truncate", done && "text-muted-foreground line-through")}>
        {title}
      </span>
      {hasNote && <FileText size={13} className="text-muted-foreground" />}
      {rightLabel && (
        <span className={cn("text-xs text-muted-foreground", rightLabelClassName)}>
          {rightLabel}
        </span>
      )}
    </div>
  )
}
