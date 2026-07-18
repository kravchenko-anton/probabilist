import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Emoji } from "@/components/ui/emoji"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
  isTinyAttempt,
  type Attempt,
  type AttemptTask,
} from "@/data/attempts"
import { formatShortDate } from "@/lib/date"
import { useGoals } from "@/lib/goals-store"
import { cn } from "@/lib/utils"
import { CalendarIcon, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"

const EXPERIMENT_ICONS = ["🧪", "🚀", "🎬", "✍️", "📣", "🔧"]

interface AttemptFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalId: string
  attempt?: Attempt
  onCreated?: (attempt: Attempt) => void
}

export function AttemptFormDialog({
  open,
  onOpenChange,
  goalId,
  attempt,
  onCreated,
}: AttemptFormDialogProps) {
  const { addAttempt, updateAttempt } = useGoals()
  const isEditing = !!attempt
  const editingTiny = attempt ? isTinyAttempt(attempt) : true

  const [title, setTitle] = useState("")
  const [icon, setIcon] = useState(EXPERIMENT_ICONS[0])
  const [note, setNote] = useState("")
  const [deadline, setDeadline] = useState<Date>()
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false)
  const [withSteps, setWithSteps] = useState(false)
  const [tasks, setTasks] = useState<AttemptTask[]>([])
  const [taskInput, setTaskInput] = useState("")

  useEffect(() => {
    if (!open) return
    const tiny = attempt ? isTinyAttempt(attempt) : true
    setTitle(attempt?.title ?? "")
    setIcon(attempt?.icon ?? EXPERIMENT_ICONS[0])
    setNote(attempt?.description ?? "")
    setDeadline(attempt?.deadline)
    setWithSteps(!tiny)
    setTasks(attempt?.tasks ?? [])
    setTaskInput("")
  }, [open, attempt])

  function addTask() {
    const value = taskInput.trim()
    if (!value) return
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: value, done: false },
    ])
    setTaskInput("")
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  const stepTasks = tasks
    .map((task) => ({ ...task, title: task.title.trim() }))
    .filter((task) => task.title.length > 0)
  const isTiny = isEditing ? editingTiny : !withSteps
  const isValid = isTiny
    ? !!title.trim()
    : !!title.trim() && stepTasks.length > 0

  function handleSave() {
    if (!isValid) return
    const trimmedTitle = title.trim()
    const description = note.trim() || undefined

    if (attempt) {
      updateAttempt({
        ...attempt,
        title: trimmedTitle,
        icon,
        deadline,
        description,
        tasks: isTinyAttempt(attempt) ? [] : stepTasks,
      })
      onOpenChange(false)
      return
    }

    const newAttempt: Attempt = {
      id: crypto.randomUUID(),
      goalId,
      title: trimmedTitle,
      icon,
      kind: withSteps ? "standard" : "tiny",
      description,
      deadline,
      tasks: withSteps ? stepTasks : [],
      status: "planned",
      createdAt: new Date(),
      predictions: [],
      results: [],
    }
    addAttempt(newAttempt)
    onOpenChange(false)
    onCreated?.(newAttempt)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit experiment" : "New tiny experiment"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!isEditing && (
            <p className="text-sm text-muted-foreground">
              One small bet. Predict what it will do, try it, then learn.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              What are you trying?
            </label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Post at 9am instead of noon"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              Why this might work{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hypothesis, details, links…"
              className="min-h-20"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Icon</label>
              <div className="flex items-center gap-1">
                {EXPERIMENT_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md hover:bg-white/5",
                      icon === emoji && "bg-white/10 ring-1 ring-primary",
                    )}
                  >
                    <Emoji value={emoji} className="size-5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Due{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Popover
                open={deadlinePickerOpen}
                onOpenChange={setDeadlinePickerOpen}
              >
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2 font-normal"
                    />
                  }
                >
                  <CalendarIcon size={14} className="text-muted-foreground" />
                  {deadline ? formatShortDate(deadline) : "No date"}
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={(date) => {
                      setDeadline(date)
                      setDeadlinePickerOpen(false)
                    }}
                    defaultMonth={deadline}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {!isEditing && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setWithSteps((prev) => !prev)
                  if (withSteps) {
                    setTasks([])
                    setTaskInput("")
                  }
                }}
                className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {withSteps ? "Remove steps" : "Need steps? Add a checklist"}
              </button>

              {withSteps && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-white/[0.02] p-3">
                  <label className="text-xs font-medium text-foreground">
                    Steps
                  </label>
                  <div className="flex flex-col gap-1">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5"
                      >
                        <Input
                          value={task.title}
                          onChange={(e) =>
                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === task.id
                                  ? { ...t, title: e.target.value }
                                  : t,
                              ),
                            )
                          }
                          placeholder="A concrete step"
                          className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeTask(task.id)}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Input
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTask()
                        }
                      }}
                      placeholder="Add another step"
                      className="h-8 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={addTask}
                    >
                      <Plus size={13} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isEditing && !editingTiny && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Steps
              </label>
              <div className="flex flex-col gap-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5"
                  >
                    <span className="size-3.5 shrink-0 rounded-[4px] border border-muted-foreground/50" />
                    <span className="flex-1 truncate text-sm">{task.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeTask(task.id)}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTask()
                    }
                  }}
                  placeholder="Add a step"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={addTask}
                >
                  <Plus size={13} />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {isEditing ? "Save" : "Create experiment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
