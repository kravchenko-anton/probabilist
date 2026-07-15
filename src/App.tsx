import './App.css'
import { useEffect, useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Sidebar } from "@/components/sidebar/Sidebar"
import { TodoPanel } from "@/components/todo/TodoPanel"

function App() {
  const [todo, setTodo] = useState<string[]>(() => {
    const stored = localStorage.getItem("todo")
    return stored ? JSON.parse(stored) : []
  })
  const [draft, setDraft] = useState("")

  useEffect(() => {
    localStorage.setItem("todo", JSON.stringify(todo))
  }, [todo])

  const addTask = () => {
    const value = draft.trim()
    if (!value) return
    setTodo((prev) => [...prev, value])
    setDraft("")
  }

  const removeTask = (index: number) =>
    setTodo((prev) => prev.filter((_, i) => i !== index))

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <Sidebar  />
        <TodoPanel
          todo={todo}
          draft={draft}
          setDraft={setDraft}
          addTask={addTask}
          removeTask={removeTask}
        />
      </div>
    </TooltipProvider>
  )
}

export default App
