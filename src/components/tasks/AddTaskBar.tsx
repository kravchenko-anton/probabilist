import { useState } from "react"
import { Plus } from "lucide-react"

interface AddTaskBarProps {
  onAdd: (title: string) => void
  placeholder?: string
}

export function AddTaskBar({ onAdd, placeholder = "Add task" }: AddTaskBarProps) {
  const [value, setValue] = useState("")

  const submit = () => {
    const title = value.trim()
    if (!title) return
    onAdd(title)
    setValue("")
  }

  return (
    <div className="mx-3 mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground focus-within:bg-white/5 hover:bg-white/5">
      <Plus size={15} className="shrink-0" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
        }}
        placeholder={placeholder}
        className="h-6 w-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
