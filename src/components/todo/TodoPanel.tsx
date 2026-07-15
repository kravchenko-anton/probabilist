import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type TodoPanelProps = {
  todo: string[]
  draft: string
  setDraft: (value: string) => void
  addTask: () => void
  removeTask: (index: number) => void
}

export function TodoPanel({ todo, draft, setDraft, addTask, removeTask }: TodoPanelProps) {
  return (
    <main className="flex flex-1 flex-col overflow-y-auto px-10 py-8">
      <h1 className="mb-6 text-2xl">Today</h1>

      <div className="mb-6 flex max-w-xl gap-2">
        <Input
          placeholder="Add a task…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <Button onClick={addTask}>
          <Plus data-icon="inline-start" />
          Add
        </Button>
      </div>

      <div className="max-w-xl space-y-2">
        {todo.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks yet. Add one above.</p>
        )}
        {todo.map((task, i) => (
          <div
            key={`${task}-${i}`}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
          >
            {task}
            <Button variant="ghost" size="icon-sm" onClick={() => removeTask(i)}>
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
    </main>
  )
}
