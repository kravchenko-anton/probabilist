import './App.css'
import { useEffect, useState, type ReactNode } from "react"
import { Collapsible } from "@base-ui/react/collapsible"
import {
  Plus, Search, Inbox, Sun, SlidersHorizontal,
  Hash, Bell, LayoutTemplate, ChevronDown, CalendarDays, Trash2,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type NavItem = "inbox" | "today" | "upcoming" | "filters"

const navItems: { id: NavItem; label: string; icon: ReactNode }[] = [
  { id: "inbox", label: "Inbox", icon: <Inbox size={15} /> },
  { id: "today", label: "Today", icon: <Sun size={15} /> },
  { id: "upcoming", label: "Upcoming", icon: <CalendarDays size={15} /> },
  { id: "filters", label: "Filters & Labels", icon: <SlidersHorizontal size={15} /> },
]

const sidebarProjects = [
  { name: "Fitness", color: "#f97316" },
  { name: "Groceries", color: "#8b5cf6" },
  { name: "Appointments", color: "#3b82f6" },
]

const teamProjects = [
  { name: "New Brand", color: "#8b5cf6" },
  { name: "Website Update", color: "#8b5cf6" },
  { name: "Product Roadmap", color: "#8b5cf6" },
  { name: "Meeting Agenda", color: "#8b5cf6" },
]

function App() {
  const [todo, setTodo] = useState<string[]>(() => {
    const stored = localStorage.getItem("todo")
    return stored ? JSON.parse(stored) : []
  })
  const [draft, setDraft] = useState("")
  const [activeNav, setActiveNav] = useState<NavItem>("inbox")
  const [myProjectsOpen, setMyProjectsOpen] = useState(true)
  const [teamOpen, setTeamOpen] = useState(true)

  useEffect(() => {
    localStorage.setItem("todo", JSON.stringify(todo))
  }, [todo])

  const addTask = () => {
    const value = draft.trim()
    if (!value) return
    setTodo((prev) => [...prev, value])
    setDraft("")
  }

  return (<div>
    
    </div>)
}

export default App
