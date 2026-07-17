import { useMemo, useState } from "react"
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
import { useIsMobile } from "@/hooks/use-mobile"
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
  emoji?: string
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

export function DateView({ view, title, emoji }: DateViewProps) {
  const { tasks, addTask, updateAppTask, deleteAppTask } = useAppTasks()
  const groups = useMemo(() => groupsForView(tasks, view), [tasks, view])
  const allTasks = useMemo(() => groups.flatMap((group) => group.tasks), [groups])
  const [selectedId, setSelectedId] = useState<string>()
  const [detailOpen, setDetailOpen] = useState(false)

  const isMobile = useIsMobile()

  const selectedTask = allTasks.find((task) => task.id === selectedId)

  const doneCount = allTasks.filter((task) => task.done).length
  const progress =
    view === "today" || view === "tomorrow"
      ? allTasks.length > 0
        ? doneCount / allTasks.length
        : 0
      : undefined

  const detailPane = selectedTask ? (
    <TaskDetailPane
      key={selectedTask.id}
      task={selectedTask}
      footerEmoji={selectedTask.origin.kind === "attempt" ? selectedTask.origin.emoji : undefined}
      footerLabel={selectedTask.origin.kind === "attempt" ? selectedTask.origin.label : "Inbox"}
      onToggleDone={(done) => updateAppTask(selectedTask, { done })}
      onRename={(name) => updateAppTask(selectedTask, { title: name })}
      onSchedule={(date) => updateAppTask(selectedTask, { date })}
      onEstimateChange={(estimatedMinutes) => updateAppTask(selectedTask, { estimatedMinutes })}
      onActualChange={(actualMinutes) => updateAppTask(selectedTask, { actualMinutes })}
      onDescriptionChange={(description) => updateAppTask(selectedTask, { description })}
      onDelete={() => {
        deleteAppTask(selectedTask)
        setDetailOpen(false)
      }}
    />
  ) : null

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <TaskListHeader title={title} emoji={emoji} progress={progress} />
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
          {groups.map((group) => {
            const rows = group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                title={task.title}
                emoji={task.origin.kind === "attempt" ? task.origin.emoji : task.emoji}
                done={task.done}
                hasNote={!!task.description}
                selected={task.id === selectedId && detailOpen}
                onSelect={() => {
                  setSelectedId(task.id)
                  setDetailOpen(true)
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
            ))

            // Skip the section header when it would just repeat the page title.
            if (group.title === title)
              return (
                <div key={group.kind} className="flex flex-col pt-1.5">
                  {rows}
                </div>
              )

            return (
              <TaskSection key={group.kind} title={group.title} count={group.tasks.length}>
                {rows}
              </TaskSection>
            )
          })}
          {allTasks.length === 0 && (
            <p className="px-4 py-6 text-center text-muted-foreground">No tasks here.</p>
          )}
        </div>
      </div>

      <Sheet open={detailOpen && !!selectedTask} onOpenChange={setDetailOpen}>
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
