import { MoreHorizontal } from "lucide-react"
import { Emoji } from "@/components/ui/emoji"

interface TaskListHeaderProps {
  title: string
  emoji?: string
  /** 0..1 — renders a Things-style completion pie instead of the emoji */
  progress?: number
}

function ProgressPie({ value }: { value: number }) {
  const r = 4.75
  const c = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, value))
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" className="shrink-0 text-primary">
      <circle cx="10" cy="10" r="8.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={r * 2}
        strokeDasharray={`${clamped * c} ${c}`}
        transform="rotate(-90 10 10)"
      />
    </svg>
  )
}

export function TaskListHeader({ title, emoji, progress }: TaskListHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 px-4 pb-2 pt-5">
      {progress !== undefined ? (
        <ProgressPie value={progress} />
      ) : (
        emoji && <Emoji value={emoji} className="size-[18px]" />
      )}
      <h2 className="flex-1 text-[20px] font-semibold text-foreground">{title}</h2>
      <button className="text-muted-foreground hover:text-foreground">
        <MoreHorizontal size={16} />
      </button>
    </div>
  )
}
