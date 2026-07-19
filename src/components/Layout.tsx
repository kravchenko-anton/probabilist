import { BottomNav } from "@/components/BottomNav"
import { Sidebar } from "@/components/sidebar/Sidebar"
import { TimeLogDialog } from "@/components/tasks/TimeLogDialog"
import { Outlet } from "react-router-dom"

export function Layout() {
  return (
    <div className="flex h-dvh w-full max-w-[100vw] flex-col overflow-hidden bg-background md:flex-row">
      <Sidebar />
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      <TimeLogDialog />
    </div>
  )
}
