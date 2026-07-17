import { useState } from "react"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Emoji } from "@/components/ui/emoji"
import { RichTextEditor } from "@/components/editor/RichTextEditor"
import { SchedulePopover } from "@/components/tasks/SchedulePopover"
import { DurationPopover } from "@/components/tasks/DurationPopover"
import { cn } from "@/lib/utils"

export interface EditableTask {
  id: string
  title: string
  emoji?: string
  done: boolean
  date?: Date
  description?: string
  estimatedMinutes?: number
  actualMinutes?: number
}

interface TaskDetailPaneProps {
  task: EditableTask
  footerEmoji?: string
  footerLabel: string
  onBack?: () => void
  onToggleDone: (done: boolean) => void
  onRename: (title: string) => void
  onSchedule: (date?: Date) => void
  onEstimateChange: (minutes?: number) => void
  onActualChange: (minutes?: number) => void
  onDescriptionChange: (description?: string) => void
  /** Moves the task to Trash. */
  onDelete?: () => void
}

/**
 * Editable task card: live checkbox, renamable title, date planning and a
 * rich-text description. Re-key by task id so local drafts reset per task.
 */
export function TaskDetailPane({
  task,
  onBack,
  onToggleDone,
  onRename,
  onSchedule,
  onEstimateChange,
  onActualChange,
  onDescriptionChange,
  onDelete,
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
        <DurationPopover
          minutes={task.estimatedMinutes}
          onChange={onEstimateChange}
          placeholder="Estimate"
          prefix="~"
        />
        {task.done && (
          <DurationPopover
            minutes={task.actualMinutes}
            onChange={onActualChange}
            placeholder="Time it took"
            prefix="took "
            icon="timer"
          />
        )}
        <div className="flex-1" />
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete task"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-red-400"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 py-2">
        {task.emoji && <Emoji value={task.emoji} className="size-[18px]" />}
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
            "w-full flex-1 bg-transparent text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground",
            task.done && "text-muted-foreground"
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
    </div>
  )
}
