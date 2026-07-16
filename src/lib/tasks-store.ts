import { useMemo } from "react"
import { create } from "zustand"
import { initialTasks, type TodoTask } from "@/data/tasks"
import { useGoalsStore } from "@/lib/goals-store"

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

export const useTasksStore = create<TasksState>()((set) => {
  const commit = (updater: (prev: TodoTask[]) => TodoTask[]) =>
    set((state) => {
      const tasks = updater(state.tasks)
      persistTasks(tasks)
      return { tasks }
    })

  return {
    tasks: loadTasks(),
    addTask: (task) => commit((prev) => [...prev, task]),
    updateTask: (taskId, patch) =>
      commit((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task))),
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
  origin: AppTaskOrigin
}

export type AppTaskPatch = Partial<Pick<AppTask, "title" | "done" | "date" | "description">>

/**
 * Date views work over one merged list: standalone inbox tasks plus attempt
 * tasks that were planned onto a date. Edits are routed back to whichever
 * store the task came from.
 */
export function useAppTasks() {
  const tasks = useTasksStore((state) => state.tasks)
  const addTask = useTasksStore((state) => state.addTask)
  const updateTask = useTasksStore((state) => state.updateTask)
  const attempts = useGoalsStore((state) => state.attempts)
  const updateAttemptTask = useGoalsStore((state) => state.updateAttemptTask)

  const appTasks = useMemo<AppTask[]>(() => {
    const standalone: AppTask[] = tasks.map((task) => ({ ...task, origin: { kind: "inbox" } }))
    const planned: AppTask[] = attempts.flatMap((attempt) =>
      attempt.status === "completed"
        ? []
        : attempt.tasks
            .filter((task) => task.date)
            .map((task) => ({
              id: task.id,
              title: task.title,
              done: task.done,
              date: task.date,
              description: task.description,
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
    if (task.origin.kind === "attempt") updateAttemptTask(task.origin.attemptId, task.id, patch)
    else updateTask(task.id, patch)
  }

  return { tasks: appTasks, addTask, updateAppTask }
}
