import { ArrowDownUp, Menu, MoreHorizontal } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface TaskListHeaderProps {
  title: string
  icon?: LucideIcon
  emoji?: string
}

export function TaskListHeader({ title, icon: Icon, emoji }: TaskListHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <button className="text-muted-foreground hover:text-foreground">
        <Menu size={17} />
      </button>
      <div className="flex flex-1 items-center gap-2">
        {emoji && <span className="text-[16px] leading-none">{emoji}</span>}
        {Icon && <Icon size={16} className="text-muted-foreground" />}
        <h2 className="font-heading text-[15px] font-medium text-foreground">{title}</h2>
      </div>
      <button className="text-muted-foreground hover:text-foreground">
        <ArrowDownUp size={15} />
      </button>
      <button className="text-muted-foreground hover:text-foreground">
        <MoreHorizontal size={15} />
      </button>
    </div>
  )
}
