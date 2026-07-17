import { useMemo } from "react"
import { create } from "zustand"
import { initialTasks, type TodoTask } from "@/data/tasks"
import { useGoalsStore } from "@/lib/goals-store"
import { requestTimeLog } from "@/lib/time-log-store"

const TASKS_KEY = "probabilist:tasks"

function loadTasks(): TodoTask[] {
  if (typeof window === "undefined") return initialTasks
  const raw = window.localStorage.getItem(TASKS_KEY)
  if (!raw) return initialTasks
  try {
    const parsed = JSON.parse(raw) as TodoTask[]
    return parsed.map((task) => ({
      ...task,
      date: task.date ? new Date(task.date) : undefined,
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
      deletedAt: task.deletedAt ? new Date(task.deletedAt) : undefined,
    }))
  } catch {
    return initialTasks
  }
}

function persistTasks(tasks: TodoTask[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

interface TasksState {
  tasks: TodoTask[]
  addTask: (task: TodoTask) => void
  updateTask: (taskId: string, patch: Partial<TodoTask>) => void
  deleteTask: (taskId: string) => void
}

export const useTasksStore = create<TasksState>()((set, get) => {
  const commit = (updater: (prev: TodoTask[]) => TodoTask[]) =>
    set((state) => {
      const tasks = updater(state.tasks)
      persistTasks(tasks)
      return { tasks }
    })

  return {
    tasks: loadTasks(),
    addTask: (task) => commit((prev) => [...prev, task]),
    updateTask: (taskId, patch) => {
      if (patch.done) {
        const task = get().tasks.find((t) => t.id === taskId)
        // Pops the "time it took" dialog when the task flips to done.
        if (task && !task.done)
          requestTimeLog({
            target: { kind: "inbox", taskId },
            title: task.title,
            estimatedMinutes: task.estimatedMinutes,
            actualMinutes: task.actualMinutes,
          })
      }
      commit((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)))
    },
    deleteTask: (taskId) => commit((prev) => prev.filter((task) => task.id !== taskId)),
  }
})

export const useTasks = useTasksStore

export type AppTaskOrigin =
  | { kind: "inbox" }
  | { kind: "attempt"; attemptId: string; label: string; emoji?: string }

export interface AppTask {
  id: string
  title: string
  emoji?: string
  done: boolean
  date?: Date
  description?: string
  completedAt?: Date
  deletedAt?: Date
  estimatedMinutes?: number
  actualMinutes?: number
  origin: AppTaskOrigin
}

export type AppTaskPatch = Partial<
  Pick<
    AppTask,
    | "title"
    | "done"
    | "date"
    | "description"
    | "completedAt"
    | "deletedAt"
    | "estimatedMinutes"
    | "actualMinutes"
  >
>


export function useAppTasks() {
  const tasks = useTasksStore((state) => state.tasks)
  const addTask = useTasksStore((state) => state.addTask)
  const updateTask = useTasksStore((state) => state.updateTask)
  const deleteTask = useTasksStore((state) => state.deleteTask)
  const attempts = useGoalsStore((state) => state.attempts)
  const updateAttemptTask = useGoalsStore((state) => state.updateAttemptTask)
  const removeAttemptTask = useGoalsStore((state) => state.removeAttemptTask)

  const appTasks = useMemo<AppTask[]>(() => {
    const standalone: AppTask[] = tasks.map((task) => ({ ...task, origin: { kind: "inbox" } }))
    const planned: AppTask[] = attempts.flatMap((attempt) =>
      attempt.status === "completed"
        ? []
        : attempt.tasks
            .filter((task) => task.date || task.deletedAt)
            .map((task) => ({
              id: task.id,
              title: task.title,
              done: task.done,
              date: task.date,
              description: task.description,
              completedAt: task.completedAt,
              deletedAt: task.deletedAt,
              estimatedMinutes: task.estimatedMinutes,
              actualMinutes: task.actualMinutes,
              origin: {
                kind: "attempt" as const,
                attemptId: attempt.id,
                label: attempt.title,
                emoji: attempt.icon,
              },
            }))
    )
    return [...standalone, ...planned]
  }, [tasks, attempts])

  const updateAppTask = (task: AppTask, patch: AppTaskPatch) => {
    const full: AppTaskPatch =
      patch.done === undefined
        ? patch
        : { ...patch, completedAt: patch.done ? new Date() : undefined }
    if (task.origin.kind === "attempt") updateAttemptTask(task.origin.attemptId, task.id, full)
    else updateTask(task.id, full)
  }

  /** Soft delete — the task moves to Trash. */
  const deleteAppTask = (task: AppTask) => updateAppTask(task, { deletedAt: new Date() })

  const restoreAppTask = (task: AppTask) => updateAppTask(task, { deletedAt: undefined })

  /** Permanent delete — removes the task from its store entirely. */
  const destroyAppTask = (task: AppTask) => {
    if (task.origin.kind === "attempt") removeAttemptTask(task.origin.attemptId, task.id)
    else deleteTask(task.id)
  }

  return { tasks: appTasks, addTask, updateAppTask, deleteAppTask, restoreAppTask, destroyAppTask }
}
