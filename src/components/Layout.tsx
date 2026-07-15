import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/sidebar/Sidebar"

export function Layout() {
  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <Outlet />
    </div>
  )
}
