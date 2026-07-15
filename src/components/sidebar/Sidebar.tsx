import { NavLink } from "react-router-dom"
import {
  BrainCog,
  Calendar1,
  CalendarRange,
  Inbox,
  Info,
  MessageCircle,
  MoreHorizontal, Plus,
  Settings,
  Sparkles,
  Sunrise,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { inboxTasks } from "@/data/tasks"
import { projects, projectTaskCount } from "@/data/projects"
import { countForView } from "@/lib/task-groups"
import { cn } from "@/lib/utils"

const topItems = [
  { label: "Today", to: "/today", icon: Calendar1, count: countForView(inboxTasks, "today") },
  { label: "Tomorrow", to: "/tomorrow", icon: Sunrise, count: countForView(inboxTasks, "tomorrow") },
  {
    label: "Next 7 Days",
    to: "/next-7-days",
    icon: CalendarRange,
    count: countForView(inboxTasks, "next7"),
  },
  { label: "Inbox", to: "/inbox", icon: Inbox, count: countForView(inboxTasks, "inbox") },
]

const dotSlugs = new Set(["september-plan", "life-memo"])

const footerLinks = [
  { label: "Settings", icon: Settings },
  { label: "About", icon: Info },
  { label: "Feedback", icon: MessageCircle },
]

export function Sidebar() {
  return (
    <div className="flex h-screen w-[220px] shrink-0 flex-col bg-sidebar px-3 py-3 text-[13px]">
      <div className="flex cursor-pointer items-center gap-2">
        <BrainCog />
        <h1 className="ml-2 font-medium">Probabilist</h1>
      </div>

      <div className="mt-4 flex flex-col gap-0.5">
        {topItems.map(({ label, to, icon: Icon, count }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground hover:bg-white/5",
                isActive && "bg-white/5"
              )
            }
          >
            <Icon size={15} className="text-muted-foreground" />
            <span className="flex-1 text-left">{label}</span>
            {count > 0 && <span className="text-muted-foreground">{count}</span>}
          </NavLink>
        ))}
      </div>
      <Separator className="mt-2" />
      <div className="mt-4 flex flex-col gap-0.5">
        <div className="px-2 py-1 flex items-center justify-between">
          <p className='font-medium  text-xs  text-muted-foreground'> Goals</p>
          <Plus className="text-muted-foreground" size={15} />
        </div>
        {projects.length > 0 ? projects.map((project) => (
          <NavLink
            key={project.slug}
            to={`/project/${project.slug}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground hover:bg-white/5",
                isActive && "bg-white/5"
              )
            }
          >
            <span className="flex size-5 items-center justify-center text-[14px] leading-none">
              {project.emoji}
            </span>
            <span className="flex-1 text-left">{project.label}</span>
            {dotSlugs.has(project.slug) && <span className="size-1.5 rounded-full bg-blue-500" />}
            <span className="text-muted-foreground">{projectTaskCount(project)}</span>
          </NavLink>
        )) : (
          <div className='h-32 flex items-center rounded-md bg-accent w-full'>
            <div className='text-center flex flex-col gap-2'>
              <p className="text-white text-[10px] mx-4">Organize and plan your work with goals</p>
              <Button size="xs" className="ml-2 mr-2 hover:bg-white hover:text-black w-[40%] mx-auto bg-transparent border-white text-white">
                New goal
              </Button>
            </div>
          </div>
        )
        }
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <div className="flex flex-col gap-0.5">
          {footerLinks.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <Icon size={15} />
              <span className="flex-1 text-left">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles size={13} />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="font-medium text-foreground">Support request</p>
            <p className="text-muted-foreground">You can make it by buying me coffee</p>
          </div>
          <Button size="sm" className="mt-1 w-full bg-white text-black hover:bg-white/90">
            Buy me a coffee
          </Button>
        </div>

        <Separator />

        <div className="flex items-center gap-2 px-1">
          <Avatar size="sm">
            <AvatarImage src="" alt="Riley Carter" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate font-medium text-foreground">Anton Kravchenko</span>
            <span className="truncate text-muted-foreground">ant...@gmail.com</span>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
