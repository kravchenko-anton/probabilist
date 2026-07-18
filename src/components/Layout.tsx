import { BottomNav } from "@/components/BottomNav"
import { Sidebar } from "@/components/sidebar/Sidebar"
import { TimeLogDialog } from "@/components/tasks/TimeLogDialog"
import { Outlet } from "react-router-dom"

export function Layout() {
  return (
    <div className="flex h-dvh w-full flex-col md:flex-row">
      <Sidebar />
      <main className="flex min-h-0 w-full flex-1">
        <Outlet />
      </main>
      <BottomNav />
      <TimeLogDialog />
    </div>
  )
}
