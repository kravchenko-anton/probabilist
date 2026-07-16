import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskSectionProps {
  title: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
}

export function TaskSection({ title, count, defaultOpen = true, children }: TaskSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex items-center gap-1.5 px-4 py-1.5 text-left text-foreground"
      >
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground transition-transform group-hover:text-foreground",
            !open && "-rotate-90"
          )}
        />
        <span className="text-[13px] font-medium">{title}</span>
        <span className="text-[13px] text-muted-foreground">{count}</span>
      </button>
      {open && <div className="flex flex-col">{children}</div>}
    </div>
  )
}
