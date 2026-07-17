import { create } from "zustand"

export type TimeLogTarget =
  | { kind: "inbox"; taskId: string }
  | { kind: "attempt"; attemptId: string; taskId: string }

export interface PendingTimeLog {
  target: TimeLogTarget
  title: string
  estimatedMinutes?: number
  actualMinutes?: number
}

interface TimeLogState {
  /** Task that was just completed and is waiting for its actual time. */
  pending?: PendingTimeLog
  requestTimeLog: (pending: PendingTimeLog) => void
  clearTimeLog: () => void
}

export const useTimeLogStore = create<TimeLogState>()((set) => ({
  pending: undefined,
  requestTimeLog: (pending) => set({ pending }),
  clearTimeLog: () => set({ pending: undefined }),
}))

/** Imperative entry point for stores — asks the user how long the task took. */
export function requestTimeLog(pending: PendingTimeLog) {
  useTimeLogStore.getState().requestTimeLog(pending)
}
