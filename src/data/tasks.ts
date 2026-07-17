import { addDays } from "@/lib/date"

export interface TodoTask {
  id: string
  title: string
  emoji?: string
  done: boolean
  /** Scheduled day; tasks without a date live only in the inbox. */
  date?: Date
  /** Serialized Lexical document; plain text is also accepted. */
  description?: string
  /** Day the task was checked off; keeps it in day views until that day passes. */
  completedAt?: Date
  /** Soft delete — the task lives in Trash until restored or destroyed. */
  deletedAt?: Date
  /** How long the task is expected to take, in minutes. */
  estimatedMinutes?: number
  /** How long the task actually took, in minutes — logged after completion. */
  actualMinutes?: number
}

function at(dayOffset: number, hours: number, minutes: number) {
  const date = addDays(new Date(), dayOffset)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export const initialTasks: TodoTask[] = [
  {
    id: "morning-run",
    title: "Morning Run",
    done: false,
    date: at(0, 7, 0),
  },
  {
    id: "go-grocery-shopping",
    title: "Go Grocery Shopping",
    done: false,
    date: at(0, 9, 0),
    description: "Eggs\nMilk\nBread\nPaper Towels\nBody Wash",
  },
  {
    id: "reply-to-emails",
    title: "Reply to Emails",
    done: false,
    date: at(0, 12, 0),
  },
  {
    id: "discuss-plan-with-client",
    title: "Discuss Plan with Client",
    done: false,
    date: at(0, 13, 0),
  },
  {
    id: "shoot-video",
    title: "Shoot Video",
    done: false,
    date: at(1, 8, 0),
  },
  {
    id: "host-project-meeting",
    title: "Host Project Meeting",
    done: false,
    date: at(1, 14, 0),
  },
  {
    id: "finalize-promo-video",
    title: "Finalize Promo Video",
    done: false,
    date: at(1, 17, 30),
  },
  {
    id: "pick-up-package",
    title: "Pick Up Package",
    done: false,
    date: at(2, 10, 0),
  },
  {
    id: "organize-project-meeting",
    title: "Organize Project Meeting",
    done: false,
    date: at(3, 11, 0),
  },
  {
    id: "complete-client-proposal",
    title: "Complete Client Proposal",
    done: false,
    date: at(5, 9, 0),
  },
]
