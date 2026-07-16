import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/sidebar/Sidebar"
import { BottomNav } from "@/components/BottomNav"

export function Layout() {
  return (
    <div className="flex h-dvh w-full flex-col md:flex-row">
      <Sidebar />
      <main className="flex min-h-0 w-full flex-1">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
