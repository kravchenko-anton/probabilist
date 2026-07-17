import { useState } from "react"
import { Timer } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTimeLogStore, type PendingTimeLog } from "@/lib/time-log-store"
import { useGoalsStore } from "@/lib/goals-store"
import { useTasksStore } from "@/lib/tasks-store"
import { formatDuration } from "@/lib/date"
import { cn } from "@/lib/utils"

const PRESETS = [15, 30, 45, 60, 90, 120, 180, 240]

function saveActualMinutes(pending: PendingTimeLog, minutes: number) {
  if (pending.target.kind === "attempt") {
    useGoalsStore
      .getState()
      .updateAttemptTask(pending.target.attemptId, pending.target.taskId, {
        actualMinutes: minutes,
      })
  } else {
    useTasksStore.getState().updateTask(pending.target.taskId, { actualMinutes: minutes })
  }
}

function TimeLogForm({ pending, onDone }: { pending: PendingTimeLog; onDone: () => void }) {
  const base = pending.actualMinutes ?? pending.estimatedMinutes ?? 0
  const [hours, setHours] = useState(Math.floor(base / 60))
  const [mins, setMins] = useState(base % 60)
  const total = hours * 60 + mins

  const save = (minutes: number) => {
    saveActualMinutes(pending, minutes)
    onDone()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Timer size={15} className="text-muted-foreground" />
          How long did it take?
        </DialogTitle>
        <DialogDescription>
          “{pending.title}” is done
          {pending.estimatedMinutes
            ? ` — you estimated ${formatDuration(pending.estimatedMinutes)}.`
            : "."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => save(preset)}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs hover:bg-white/10",
              preset === pending.estimatedMinutes
                ? "bg-primary/20 text-primary-foreground"
                : "bg-white/5 text-foreground"
            )}
          >
            {formatDuration(preset)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Custom</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="number"
            min={0}
            value={hours || ""}
            onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
            placeholder="0"
            className="w-12 rounded-md bg-white/5 px-1.5 py-1 text-right text-xs text-foreground outline-none hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-ring"
          />
          h
          <input
            type="number"
            min={0}
            max={59}
            value={mins || ""}
            onChange={(e) => setMins(Math.min(59, Math.max(0, Number(e.target.value))))}
            placeholder="0"
            className="w-12 rounded-md bg-white/5 px-1.5 py-1 text-right text-xs text-foreground outline-none hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-ring"
          />
          m
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onDone} className="text-muted-foreground">
          Skip
        </Button>
        <Button size="sm" disabled={total <= 0} onClick={() => save(total)}>
          Save
        </Button>
      </DialogFooter>
    </>
  )
}

/**
 * Global popup asking for the actual time right after a task is checked off.
 * Stores trigger it via requestTimeLog; mounted once in the layout.
 */
export function TimeLogDialog() {
  const pending = useTimeLogStore((state) => state.pending)
  const clearTimeLog = useTimeLogStore((state) => state.clearTimeLog)

  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && clearTimeLog()}>
      <DialogContent showCloseButton={false}>
        {pending && (
          <TimeLogForm
            key={pending.target.taskId}
            pending={pending}
            onDone={clearTimeLog}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
