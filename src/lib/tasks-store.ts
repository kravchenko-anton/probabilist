import type { TodoTask } from "@/data/tasks"
import {
  dbDeleteTask,
  dbInsertTask,
  dbUpdateTask,
  fetchAllTasks,
} from "@/lib/db"
import { useGoalsStore } from "@/lib/goals-store"
import { requestTimeLog } from "@/lib/time-log-store"
import { useMemo } from "react"
import { create } from "zustand"

export type DataStatus = "idle" | "loading" | "ready" | "error"

interface TasksState {
  tasks: TodoTask[]
  status: DataStatus
  hydrate: () => Promise<void>
  reset: () => void
  addTask: (task: TodoTask) => void
  updateTask: (taskId: string, patch: Partial<TodoTask>) => void
  deleteTask: (taskId: string) => void
}

export const useTasksStore = create<TasksState>()((set, get) => ({
  tasks: [],
  status: "idle",

  hydrate: async () => {
    set({ status: "loading" })
    try {
      const tasks = await fetchAllTasks()
      set({ tasks, status: "ready" })
    } catch (error) {
      console.error("[supabase] hydrate tasks failed:", error)
      set({ tasks: [], status: "error" })
    }
  },

  reset: () => set({ tasks: [], status: "idle" }),

  addTask: (task) => {
    set((state) => ({ tasks: [...state.tasks, task] }))
    void dbInsertTask(task)
  },

  updateTask: (taskId, patch) => {
    if (patch.done) {
      const task = get().tasks.find((t) => t.id === taskId)
      if (task && !task.done)
        requestTimeLog({
          target: { kind: "inbox", taskId },
          title: task.title,
          estimatedMinutes: task.estimatedMinutes,
          actualMinutes: task.actualMinutes,
        })
    }
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task,
      ),
    }))
    void dbUpdateTask(taskId, patch)
  },

  deleteTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    }))
    void dbDeleteTask(taskId)
  },
}))

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
    const standalone: AppTask[] = tasks.map((task) => ({
      ...task,
      origin: { kind: "inbox" },
    }))
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
            })),
    )
    return [...standalone, ...planned]
  }, [tasks, attempts])

  const updateAppTask = (task: AppTask, patch: AppTaskPatch) => {
    const full: AppTaskPatch =
      patch.done === undefined
        ? patch
        : { ...patch, completedAt: patch.done ? new Date() : undefined }
    if (task.origin.kind === "attempt")
      updateAttemptTask(task.origin.attemptId, task.id, full)
    else updateTask(task.id, full)
  }

  const deleteAppTask = (task: AppTask) =>
    updateAppTask(task, { deletedAt: new Date() })

  const restoreAppTask = (task: AppTask) =>
    updateAppTask(task, { deletedAt: undefined })

  const destroyAppTask = (task: AppTask) => {
    if (task.origin.kind === "attempt")
      removeAttemptTask(task.origin.attemptId, task.id)
    else deleteTask(task.id)
  }

  return {
    tasks: appTasks,
    addTask,
    updateAppTask,
    deleteAppTask,
    restoreAppTask,
    destroyAppTask,
  }
}
