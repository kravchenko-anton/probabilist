import { useState, type ReactNode } from "react"
import { CalendarDays, Inbox, Sun } from "lucide-react"

export type NavItem = "inbox" | "today" | "upcoming" | "filters"

const navItems: { id: NavItem; label: string; icon: ReactNode }[] = [
  { id: "inbox", label: "Inbox", icon: <Inbox size={15} /> },
  { id: "today", label: "Today", icon: <Sun size={15} /> },
  { id: "upcoming", label: "Upcoming", icon: <CalendarDays size={15} /> },
]

export function SidebarNav() {
  const [activeNav, setActiveNav] = useState<NavItem>("inbox")

  return (
    <nav className="space-y-0.5 px-2">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveNav(item.id)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
            activeNav === item.id
              ? "bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
          }`}
        >
          <span className={activeNav === item.id ? "text-foreground" : "text-muted-foreground"}>
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}
