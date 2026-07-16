import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { useAppTasks, type AppTask } from "@/lib/tasks-store"
import { groupsForView, type DateViewKind, type TaskGroupKind } from "@/lib/task-groups"
import {
  addDays,
  formatShortDate,
  formatTime,
  formatWeekdayShort,
  hasTimeOfDay,
  startOfDay,
} from "@/lib/date"
import { useIsMobile, useMediaQuery } from "@/hooks/use-mobile"
import { TaskListHeader } from "@/components/tasks/TaskListHeader"
import { AddTaskBar } from "@/components/tasks/AddTaskBar"
import { TaskSection } from "@/components/tasks/TaskSection"
import { TaskRow } from "@/components/tasks/TaskRow"
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface DateViewProps {
  view: DateViewKind
  title: string
  icon?: LucideIcon
}

function rightLabelFor(task: AppTask, groupKind: TaskGroupKind) {
  if (!task.date) return undefined
  if (groupKind === "next7") return formatWeekdayShort(task.date)
  if (groupKind === "overdue") return formatShortDate(task.date)
  return hasTimeOfDay(task.date) ? formatTime(task.date) : undefined
}

function defaultDateForView(view: DateViewKind): Date | undefined {
  if (view === "today") return startOfDay(new Date())
  if (view === "tomorrow") return startOfDay(addDays(new Date(), 1))
  if (view === "next7") return startOfDay(addDays(new Date(), 2))
  return undefined
}

export function DateView({ view, title, icon }: DateViewProps) {
  const { tasks, addTask, updateAppTask } = useAppTasks()
  const groups = useMemo(() => groupsForView(tasks, view), [tasks, view])
  const allTasks = useMemo(() => groups.flatMap((group) => group.tasks), [groups])
  const [selectedId, setSelectedId] = useState(allTasks[0]?.id)
  const [detailOpen, setDetailOpen] = useState(false)

  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isMobile = useIsMobile()

  const selectedTask =
    allTasks.find((task) => task.id === selectedId) ?? allTasks[0]

  const detailPane = selectedTask ? (
    <TaskDetailPane
      key={selectedTask.id}
      task={selectedTask}
      footerEmoji={selectedTask.origin.kind === "attempt" ? selectedTask.origin.emoji : undefined}
      footerLabel={selectedTask.origin.kind === "attempt" ? selectedTask.origin.label : "Inbox"}
      onToggleDone={(done) => updateAppTask(selectedTask, { done })}
      onRename={(name) => updateAppTask(selectedTask, { title: name })}
      onSchedule={(date) => updateAppTask(selectedTask, { date })}
      onDescriptionChange={(description) => updateAppTask(selectedTask, { description })}
    />
  ) : null

  return (
    <div className="flex h-full flex-1">
      <div className="flex w-full flex-col border-border lg:w-[60%] lg:border-r">
        <TaskListHeader title={title} icon={icon} />
        <AddTaskBar
          onAdd={(taskTitle) =>
            addTask({
              id: crypto.randomUUID(),
              title: taskTitle,
              done: false,
              date: defaultDateForView(view),
            })
          }
        />
        <div className="flex flex-1 flex-col overflow-y-auto pb-4">
          {groups.map((group) => (
            <TaskSection key={group.kind} title={group.title} count={group.tasks.length}>
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  emoji={task.origin.kind === "attempt" ? task.origin.emoji : task.emoji}
                  done={task.done}
                  hasNote={!!task.description}
                  selected={task.id === selectedTask?.id}
                  onSelect={() => {
                    setSelectedId(task.id)
                    if (!isDesktop) setDetailOpen(true)
                  }}
                  onToggleDone={(done) => updateAppTask(task, { done })}
                  rightLabel={rightLabelFor(task, group.kind)}
                  rightLabelClassName={
                    group.kind === "next7"
                      ? "text-primary"
                      : group.kind === "overdue"
                        ? "text-red-400"
                        : undefined
                  }
                />
              ))}
            </TaskSection>
          ))}
          {allTasks.length === 0 && (
            <p className="px-4 py-6 text-center text-muted-foreground">No tasks here.</p>
          )}
        </div>
      </div>

      <div className="hidden flex-1 lg:block">
        {detailPane ?? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a task
          </div>
        )}
      </div>

      <Sheet open={detailOpen && !isDesktop} onOpenChange={setDetailOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          showCloseButton={false}
          className={cn("gap-0 p-0", isMobile && "rounded-t-2xl")}
          style={isMobile ? { height: "78dvh" } : undefined}
        >
          {isMobile && (
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15" />
          )}
          <SheetTitle className="sr-only">Task details</SheetTitle>
          <div className="min-h-0 flex-1">{detailPane}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
