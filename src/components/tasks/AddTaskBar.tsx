import { Plus } from "lucide-react"

export function AddTaskBar() {
  return (
    <div className="mx-3 mb-2 flex items-center gap-2 rounded-md px-2 py-2 text-muted-foreground hover:bg-white/5">
      <Plus size={15} />
      <span>Add task</span>
    </div>
  )
}
