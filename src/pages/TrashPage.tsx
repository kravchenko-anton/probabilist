import { useMemo } from "react"
import { Undo2, X } from "lucide-react"
import { useAppTasks } from "@/lib/tasks-store"
import { trashedTasks } from "@/lib/task-groups"
import { formatShortDate } from "@/lib/date"
import { TaskListHeader } from "@/components/tasks/TaskListHeader"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function TrashPage() {
  const { tasks, restoreAppTask, destroyAppTask } = useAppTasks()
  const trashed = useMemo(() => trashedTasks(tasks), [tasks])

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <TaskListHeader title="Trash" emoji="🗑️" />
        {trashed.length > 0 && (
          <div className="flex items-center justify-between px-4 pb-1 pt-2">
            <span className="text-xs text-muted-foreground">
              {trashed.length} {trashed.length === 1 ? "task" : "tasks"} in trash
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => trashed.forEach(destroyAppTask)}
              className="text-muted-foreground hover:text-red-400"
            >
              Empty trash
            </Button>
          </div>
        )}
        <div className="flex flex-1 flex-col overflow-y-auto pb-4">
          {trashed.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-white/5"
            >
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-muted-foreground",
                  task.done && "line-through"
                )}
              >
                {task.title}
              </span>
              {task.deletedAt && (
                <span className="text-xs text-muted-foreground/70">
                  {formatShortDate(task.deletedAt)}
                </span>
              )}
              <button
                type="button"
                onClick={() => restoreAppTask(task)}
                aria-label="Restore task"
                title="Restore"
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-white/10 hover:text-foreground group-hover:opacity-100"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => destroyAppTask(task)}
                aria-label="Delete forever"
                title="Delete forever"
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {trashed.length === 0 && (
            <p className="px-4 py-6 text-center text-muted-foreground">
              Trash is empty. Deleted tasks land here before they're gone for good.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
