import { useState } from "react"
import { ArrowLeft, Flag, MessageSquare, MoreHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { RichTextEditor } from "@/components/editor/RichTextEditor"
import { SchedulePopover } from "@/components/tasks/SchedulePopover"
import { cn } from "@/lib/utils"

export interface EditableTask {
  id: string
  title: string
  emoji?: string
  done: boolean
  date?: Date
  description?: string
}

interface TaskDetailPaneProps {
  task: EditableTask
  footerEmoji?: string
  footerLabel: string
  onBack?: () => void
  onToggleDone: (done: boolean) => void
  onRename: (title: string) => void
  onSchedule: (date?: Date) => void
  onDescriptionChange: (description?: string) => void
}

/**
 * Editable task card: live checkbox, renamable title, date planning and a
 * rich-text description. Re-key by task id so local drafts reset per task.
 */
export function TaskDetailPane({
  task,
  footerEmoji,
  footerLabel,
  onBack,
  onToggleDone,
  onRename,
  onSchedule,
  onDescriptionChange,
}: TaskDetailPaneProps) {
  const [titleDraft, setTitleDraft] = useState(task.title)

  const commitTitle = () => {
    const title = titleDraft.trim()
    if (!title || title === task.title) {
      setTitleDraft(task.title)
      return
    }
    onRename(title)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mr-1 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <ArrowLeft size={15} />
          </button>
        )}
        <Checkbox
          checked={task.done}
          onCheckedChange={(checked) => onToggleDone(!!checked)}
        />
        <SchedulePopover date={task.date} done={task.done} onSchedule={onSchedule} placeholder="Pick a date" />
        <div className="flex-1" />
        <Flag size={15} className="text-muted-foreground" />
      </div>

      <div className="flex items-center gap-2 px-5 py-2">
        {task.emoji && <span className="text-lg leading-none">{task.emoji}</span>}
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
            if (e.key === "Escape") {
              setTitleDraft(task.title)
              e.currentTarget.blur()
            }
          }}
          placeholder="Task title"
          className={cn(
            "w-full flex-1 bg-transparent font-heading text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground",
            task.done && "text-muted-foreground line-through"
          )}
        />
      </div>

      <RichTextEditor
        key={task.id}
        value={task.description}
        onChange={(value) => onDescriptionChange(value || undefined)}
        placeholder="Add a description — plans, details, links…"
        className="pt-1"
      />

      <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-muted-foreground">
        {footerEmoji && <span className="text-[13px] leading-none">{footerEmoji}</span>}
        <span className="flex-1 truncate text-xs">{footerLabel}</span>
        <MessageSquare size={15} />
        <MoreHorizontal size={15} />
      </div>
    </div>
  )
}
