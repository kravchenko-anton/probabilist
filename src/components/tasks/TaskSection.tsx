import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

interface TaskSectionProps {
  title: string
  count: number
  children: ReactNode
}

export function TaskSection({ title, count, children }: TaskSectionProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 px-4 py-1.5 text-foreground">
        <ChevronDown size={14} className="text-muted-foreground" />
        <span className="text-[13px] font-medium">{title}</span>
        <span className="text-[13px] text-muted-foreground">{count}</span>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}
