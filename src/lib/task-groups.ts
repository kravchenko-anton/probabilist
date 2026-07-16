import type { AppTask } from "@/lib/tasks-store"
import { dayOffsetFromToday } from "@/lib/date"

export type DateViewKind = "inbox" | "today" | "tomorrow" | "next7"

export type TaskGroupKind = "overdue" | "today" | "tomorrow" | "next7" | "nodate"

export interface TaskGroup {
  title: string
  kind: TaskGroupKind
  tasks: AppTask[]
}

function byOffset(tasks: AppTask[], predicate: (offset: number) => boolean) {
  return tasks
    .filter((task) => task.date && predicate(dayOffsetFromToday(task.date)))
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
}

export function groupsForView(tasks: AppTask[], view: DateViewKind): TaskGroup[] {
  const overdue = byOffset(tasks, (offset) => offset < 0).filter((task) => !task.done)
  const today = byOffset(tasks, (offset) => offset === 0)
  const tomorrow = byOffset(tasks, (offset) => offset === 1)
  const next7 = byOffset(tasks, (offset) => offset >= 2 && offset <= 7)
  const noDate = tasks.filter((task) => !task.date)

  const pick = (groups: TaskGroup[]) => groups.filter((group) => group.tasks.length > 0)

  if (view === "today")
    return pick([
      { title: "Overdue", kind: "overdue", tasks: overdue },
      { title: "Today", kind: "today", tasks: today },
    ])
  if (view === "tomorrow")
    return pick([{ title: "Tomorrow", kind: "tomorrow", tasks: tomorrow }])
  if (view === "next7")
    return pick([{ title: "Next 7 Days", kind: "next7", tasks: next7 }])

  return pick([
    { title: "Overdue", kind: "overdue", tasks: overdue },
    { title: "Today", kind: "today", tasks: today },
    { title: "Tomorrow", kind: "tomorrow", tasks: tomorrow },
    { title: "Next 7 Days", kind: "next7", tasks: next7 },
    { title: "No date", kind: "nodate", tasks: noDate },
  ])
}

export function countForView(tasks: AppTask[], view: DateViewKind) {
  return groupsForView(tasks, view).reduce((sum, group) => sum + group.tasks.length, 0)
}
