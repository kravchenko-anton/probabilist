import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { inboxTasks } from "@/data/tasks"
import { groupsForView, type DateViewKind } from "@/lib/task-groups"
import { formatHeaderDate, formatTime, formatWeekdayShort } from "@/lib/date"
import { TaskListHeader } from "@/components/tasks/TaskListHeader"
import { AddTaskBar } from "@/components/tasks/AddTaskBar"
import { TaskSection } from "@/components/tasks/TaskSection"
import { TaskRow } from "@/components/tasks/TaskRow"
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane"

interface DateViewProps {
  view: DateViewKind
  title: string
  icon?: LucideIcon
}

export function DateView({ view, title, icon }: DateViewProps) {
  const groups = useMemo(() => groupsForView(inboxTasks, view), [view])
  const allTasks = useMemo(() => groups.flatMap((group) => group.tasks), [groups])
  const [selectedId, setSelectedId] = useState(allTasks[0]?.id)

  const selectedTask =
    allTasks.find((task) => task.id === selectedId) ?? allTasks[0]

  return (
    <div className="flex h-screen flex-1">
      <div className="flex w-[60%] flex-col border-r border-border">
        <TaskListHeader title={title} icon={icon} />
        <AddTaskBar />
        <div className="flex flex-1 flex-col overflow-y-auto pb-4">
          {groups.map((group) => (
            <TaskSection key={group.kind} title={group.title} count={group.tasks.length}>
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  hasNote={!!task.description}
                  selected={task.id === selectedTask?.id}
                  onSelect={() => setSelectedId(task.id)}
                  rightLabel={
                    group.kind === "next7" ? formatWeekdayShort(task.date) : formatTime(task.date)
                  }
                  rightLabelClassName={group.kind === "next7" ? "text-primary" : undefined}
                />
              ))}
            </TaskSection>
          ))}
          {allTasks.length === 0 && (
            <p className="px-4 py-6 text-center text-muted-foreground">No tasks here.</p>
          )}
        </div>
      </div>

      <div className="flex-1">
        {selectedTask ? (
          <TaskDetailPane
            title={selectedTask.title}
            subtitle={selectedTask.subtitle}
            description={selectedTask.description}
            dueLabel={`${formatHeaderDate(selectedTask.date)} · ${formatTime(selectedTask.date)}`}
            footerLabel="Inbox"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a task
          </div>
        )}
      </div>
    </div>
  )
}
