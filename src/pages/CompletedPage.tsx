import { useMemo } from "react"
import { useAppTasks, type AppTask } from "@/lib/tasks-store"
import { completedTasks } from "@/lib/task-groups"
import { dayOffsetFromToday, formatShortDate } from "@/lib/date"
import { TaskListHeader } from "@/components/tasks/TaskListHeader"
import { TaskSection } from "@/components/tasks/TaskSection"
import { TaskRow } from "@/components/tasks/TaskRow"

function completedDay(task: AppTask) {
  return task.completedAt ?? task.date
}

function dayLabel(date?: Date) {
  if (!date) return "Earlier"
  const offset = dayOffsetFromToday(date)
  if (offset === 0) return "Today"
  if (offset === -1) return "Yesterday"
  return formatShortDate(date)
}

export function CompletedPage() {
  const { tasks, updateAppTask } = useAppTasks()
  const completed = useMemo(() => completedTasks(tasks), [tasks])

  const sections = useMemo(() => {
    const byDay: { label: string; tasks: AppTask[] }[] = []
    for (const task of completed) {
      const label = dayLabel(completedDay(task))
      const last = byDay[byDay.length - 1]
      if (last && last.label === label) last.tasks.push(task)
      else byDay.push({ label, tasks: [task] })
    }
    return byDay
  }, [completed])

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <TaskListHeader title="Completed" emoji="✅" />
        <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-2">
          {sections.map((section) => (
            <TaskSection key={section.label} title={section.label} count={section.tasks.length}>
              {section.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  emoji={task.origin.kind === "attempt" ? task.origin.emoji : task.emoji}
                  done={task.done}
                  hasNote={!!task.description}
                  onSelect={() => {}}
                  onToggleDone={(done) => updateAppTask(task, { done })}
                  rightLabel={task.origin.kind === "attempt" ? task.origin.label : undefined}
                />
              ))}
            </TaskSection>
          ))}
          {completed.length === 0 && (
            <p className="px-4 py-6 text-center text-muted-foreground">
              Nothing completed yet — finished tasks land here once their day passes.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
