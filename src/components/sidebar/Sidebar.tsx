import { useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
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
import { goalProgress } from "@/data/goals"
import { todosDoneCount } from "@/data/attempts"
import { useGoals } from "@/lib/goals-store"
import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
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

const footerLinks = [
  { label: "Settings", icon: Settings },
  { label: "About", icon: Info },
  { label: "Feedback", icon: MessageCircle },
]

export function Sidebar() {
  const { goals, attempts } = useGoals()
  const [createGoalOpen, setCreateGoalOpen] = useState(false)
  const location = useLocation()
  const activeAttemptId = new URLSearchParams(location.search).get("attempt")

  return (
    <div className="hidden h-full w-[220px] shrink-0 flex-col overflow-y-auto bg-sidebar px-3 py-3 text-[13px] md:flex">
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
          <button onClick={() => setCreateGoalOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Plus size={15} />
          </button>
        </div>
        {goals.length > 0 ? goals.map((goal) => {
          const goalAttempts = attempts.filter(
            (attempt) => attempt.goalId === goal.id && attempt.status !== "completed"
          )
          return (
            <div key={goal.slug} className="flex flex-col gap-0.5">
              <NavLink
                to={`/goal/${goal.slug}`}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground hover:bg-white/5",
                    isActive && !activeAttemptId && "bg-white/5"
                  )
                }
              >
                <span className="flex size-5 items-center justify-center text-[14px] leading-none">
                  {goal.emoji}
                </span>
                <span className="flex-1 truncate text-left">{goal.title}</span>
                <span className="text-muted-foreground">{Math.round(goalProgress(goal))}%</span>
              </NavLink>

              {goalAttempts.map((attempt) => {
                const isActive =
                  location.pathname === `/goal/${goal.slug}` && activeAttemptId === attempt.id
                return (
                  <Link
                    key={attempt.id}
                    to={`/goal/${goal.slug}?attempt=${attempt.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md py-1 pl-9 pr-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground",
                      isActive && "bg-white/5 text-foreground"
                    )}
                  >
                    <span className="text-[12px] leading-none">{attempt.icon ?? "📝"}</span>
                    <span className="flex-1 truncate">{attempt.title}</span>
                    <span
                      className={cn(
                        "text-[10px]",
                        attempt.status === "active" && "text-primary-foreground/70"
                      )}
                    >
                      {todosDoneCount(attempt)}/{attempt.todos.length}
                    </span>
                  </Link>
                )
              })}
            </div>
          )
        }) : (
          <div className='h-32 flex items-center rounded-md bg-accent w-full'>
            <div className='text-center flex flex-col gap-2'>
              <p className="text-white text-[10px] mx-4">Organize and plan your work with goals</p>
              <Button
                onClick={() => setCreateGoalOpen(true)}
                size="xs"
                className="ml-2 mr-2 hover:bg-white hover:text-black w-[40%] mx-auto bg-transparent border-white text-white"
              >
                New goal
              </Button>
            </div>
          </div>
        )
        }
      </div>

      <GoalFormDialog open={createGoalOpen} onOpenChange={setCreateGoalOpen} />

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
