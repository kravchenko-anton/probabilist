import type { InboxTask } from "@/data/tasks"
import { dayOffsetFromToday } from "@/lib/date"

export type DateViewKind = "inbox" | "today" | "tomorrow" | "next7"

export interface TaskGroup {
  title: string
  kind: "today" | "tomorrow" | "next7"
  tasks: InboxTask[]
}

function byOffset(tasks: InboxTask[], predicate: (offset: number) => boolean) {
  return tasks
    .filter((task) => predicate(dayOffsetFromToday(task.date)))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function groupsForView(tasks: InboxTask[], view: DateViewKind): TaskGroup[] {
  const today = byOffset(tasks, (offset) => offset === 0)
  const tomorrow = byOffset(tasks, (offset) => offset === 1)
  const next7 = byOffset(tasks, (offset) => offset >= 2 && offset <= 7)

  if (view === "today") return today.length ? [{ title: "Today", kind: "today", tasks: today }] : []
  if (view === "tomorrow")
    return tomorrow.length ? [{ title: "Tomorrow", kind: "tomorrow", tasks: tomorrow }] : []
  if (view === "next7")
    return next7.length ? [{ title: "Next 7 Days", kind: "next7", tasks: next7 }] : []

  const groups: TaskGroup[] = [
    { title: "Today", kind: "today", tasks: today },
    { title: "Tomorrow", kind: "tomorrow", tasks: tomorrow },
    { title: "Next 7 Days", kind: "next7", tasks: next7 },
  ]
  return groups.filter((group) => group.tasks.length > 0)
}

export function countForView(tasks: InboxTask[], view: DateViewKind) {
  return groupsForView(tasks, view).reduce((sum, group) => sum + group.tasks.length, 0)
}
