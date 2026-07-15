import {  Search } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { UserRow } from "@/components/sidebar/UserRow"
import { SidebarNav } from "@/components/sidebar/SidebarNav"
import { ProjectSection, type Project } from "@/components/sidebar/ProjectSection"

const sidebarProjects: Project[] = [
  { name: "Fitness", color: "#f97316" },
  { name: "Groceries", color: "#8b5cf6" },
  { name: "Appointments", color: "#3b82f6" },
]

export function Sidebar() {
  return (
    <aside className="relative flex h-full w-[180px] flex-shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar">
      <div className="relative flex h-full flex-col">
        <UserRow />

        <SidebarNav />

        <Separator className="mx-4 my-3 w-auto" />

        <ProjectSection
          title="My Projects"
          badge="MP"
          projects={sidebarProjects}
        />

        <Separator className="mx-4 my-2 w-auto" />

        <div className="mt-auto px-3 pb-4">
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-black/5">
            <Search size={14} />
            Search
          </button>
        </div>
      </div>
    </aside>
  )
}
