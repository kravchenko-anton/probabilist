import { CalendarDays, Flag, MessageSquare, MoreHorizontal } from "lucide-react"

interface TaskDetailPaneProps {
  emoji?: string
  title: string
  subtitle?: string
  description?: string[]
  dueLabel: string
  footerEmoji?: string
  footerLabel: string
}

export function TaskDetailPane({
  emoji,
  title,
  subtitle,
  description,
  dueLabel,
  footerEmoji,
  footerLabel,
}: TaskDetailPaneProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-3">
        <span className="size-4 shrink-0 rounded-full border border-muted-foreground/50" />
        <span className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs text-primary">
          <CalendarDays size={13} />
          {dueLabel}
        </span>
        <div className="flex-1" />
        <Flag size={15} className="text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-2 px-5 py-2">
        <h3 className="flex items-center gap-2 font-heading text-lg font-medium text-foreground">
          {emoji && <span>{emoji}</span>}
          {title}
        </h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {description && description.length > 0 && (
        <ul className="flex flex-col gap-1.5 px-5 py-2">
          {description.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
              <span className="size-4 shrink-0 rounded-full border border-muted-foreground/50" />
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-border px-5 py-3 text-muted-foreground">
        {footerEmoji && <span className="text-[13px] leading-none">{footerEmoji}</span>}
        <span className="flex-1 truncate text-xs">{footerLabel}</span>
        <MessageSquare size={15} />
        <MoreHorizontal size={15} />
      </div>
    </div>
  )
}
