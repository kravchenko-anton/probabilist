import './App.css'
import {useEffect, useState} from "react";
import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as Avatar from "@radix-ui/react-avatar";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Separator from "@radix-ui/react-separator";
import {
  Plus, Search, Inbox, Sun, Calendar, SlidersHorizontal,
  Hash, Bell, LayoutTemplate, ChevronDown, Clock, RefreshCw,
  Check, CalendarDays, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";



function App() {
  const [todo, setTodo] = useState<string[]>(() => {
    const stored = localStorage.getItem("todo");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("todo", JSON.stringify(todo));
  }, [todo]);
  
  const sidebarProjects = [
    { name: "Fitness", color: "#f97316" },
    { name: "Groceries", color: "#8b5cf6" },
    { name: "Appointments", color: "#3b82f6" },
  ];
  
  const teamProjects = [
    { name: "New Brand", color: "#8b5cf6" },
    { name: "Website Update", color: "#8b5cf6" },
    { name: "Product Roadmap", color: "#8b5cf6" },
    { name: "Meeting Agenda", color: "#8b5cf6" },
  ];
  
  type NavItem = "inbox" | "today" | "upcoming" | "filters";
  
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white font-[var(--font-family)]">
      
      {/* ── Sidebar ── */}
      <aside className="w-[240px] flex-shrink-0 flex flex-col h-full relative overflow-hidden">
        {/* Pink gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(160deg, #fde8e0 0%, #fdf4f0 40%, #f9f9fb 70%, #f9f9fb 100%)",
          }}
        />
        
        <div className="relative flex flex-col h-full">
          {/* User row */}
          <div className="flex items-center justify-between px-4 h-14">
            <button className="flex items-center gap-2 hover:bg-black/5 rounded-lg px-2 py-1 transition-colors">
              <Avatar.Root className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                <Avatar.Fallback className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
                  D
                </Avatar.Fallback>
              </Avatar.Root>
              <span className="text-[13px] font-semibold text-[#1f1f1f]">Denise</span>
              <ChevronDown size={13} className="text-zinc-400" />
            </button>
            <div className="flex items-center gap-1">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-black/5 hover:text-zinc-700 transition-colors">
                    <Bell size={15} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="bg-zinc-800 text-white text-[11px] px-2 py-1 rounded-md" sideOffset={4}>
                    Notifications
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-black/5 hover:text-zinc-700 transition-colors">
                    <LayoutTemplate size={15} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="bg-zinc-800 text-white text-[11px] px-2 py-1 rounded-md" sideOffset={4}>
                    Layout
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </div>
          
          {/* Add task */}
          <div className="px-3 mb-1">
            <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-semibold text-[#16a34a] hover:bg-[#16a34a]/10 transition-colors">
              <div className="w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0">
                <Plus size={12} strokeWidth={2.5} className="text-white" />
              </div>
              Add task
            </button>
          </div>
          
          {/* Nav */}
          <nav className="px-2 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  activeNav === item.id
                    ? "bg-[#16a34a]/10 text-[#16a34a]"
                    : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
                }`}
              >
                <span className={activeNav === item.id ? "text-[#16a34a]" : "text-zinc-400"}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          
          <Separator.Root className="mx-4 my-3 h-px bg-black/8" />
          
          {/* My Projects */}
          <Collapsible.Root open={myProjectsOpen} onOpenChange={setMyProjectsOpen} className="px-2">
            <Collapsible.Trigger asChild>
              <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-black/5 transition-colors group mb-0.5">
                <Avatar.Root className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0">
                  <Avatar.Fallback className="w-full h-full bg-orange-500 flex items-center justify-center text-[9px] font-bold text-white">
                    MP
                  </Avatar.Fallback>
                </Avatar.Root>
                <span className="text-[13px] font-semibold text-zinc-700 flex-1 text-left">My Projects</span>
                <ChevronDown size={13} className={`text-zinc-400 transition-transform ${myProjectsOpen ? "" : "-rotate-90"}`} />
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <div className="space-y-0.5">
                {sidebarProjects.map((p) => (
                  <button key={p.name} className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-[13px] text-zinc-600 hover:bg-black/5 hover:text-zinc-900 transition-colors">
                    <Hash size={14} style={{ color: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
          
          <Separator.Root className="mx-4 my-2 h-px bg-black/8" />
          
          {/* Team */}
          <Collapsible.Root open={teamOpen} onOpenChange={setTeamOpen} className="px-2">
            <Collapsible.Trigger asChild>
              <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-black/5 transition-colors group mb-0.5">
                <Avatar.Root className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0">
                  <Avatar.Fallback className="w-full h-full bg-[#16a34a] flex items-center justify-center text-[9px] font-bold text-white">
                    T
                  </Avatar.Fallback>
                </Avatar.Root>
                <span className="text-[13px] font-semibold text-zinc-700 flex-1 text-left">Team</span>
                <ChevronDown size={13} className={`text-zinc-400 transition-transform ${teamOpen ? "" : "-rotate-90"}`} />
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <div className="space-y-0.5">
                {teamProjects.map((p) => (
                  <button key={p.name} className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-[13px] text-zinc-600 hover:bg-black/5 hover:text-zinc-900 transition-colors">
                    <Hash size={14} style={{ color: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
          
          {/* Search at bottom */}
          <div className="mt-auto px-3 pb-4">
            <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] text-zinc-500 hover:bg-black/5 transition-colors">
              <Search size={14} className="text-zinc-400" />
              Search
            </button>
          </div>
        </div>
      </aside>
  )
}

export default App
