import { addDays } from "@/lib/date"

export interface InboxTask {
  id: string
  title: string
  subtitle?: string
  date: Date
  description?: string[]
}

function at(dayOffset: number, hours: number, minutes: number) {
  const date = addDays(new Date(), dayOffset)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export const inboxTasks: InboxTask[] = [
  {
    id: "morning-run",
    title: "Morning Run",
    date: at(0, 7, 0),
  },
  {
    id: "go-grocery-shopping",
    title: "Go Grocery Shopping",
    subtitle: "Prepare Shopping Bags in Advance",
    date: at(0, 9, 0),
    description: ["Eggs", "Milk", "Bread", "Paper Towels", "Body Wash"],
  },
  {
    id: "reply-to-emails",
    title: "Reply to Emails",
    date: at(0, 12, 0),
  },
  {
    id: "discuss-plan-with-client",
    title: "Discuss Plan with Client",
    date: at(0, 13, 0),
  },
  {
    id: "shoot-video",
    title: "Shoot Video",
    date: at(1, 8, 0),
  },
  {
    id: "host-project-meeting",
    title: "Host Project Meeting",
    date: at(1, 14, 0),
  },
  {
    id: "finalize-promo-video",
    title: "Finalize Promo Video",
    date: at(1, 17, 30),
  },
  {
    id: "pick-up-package",
    title: "Pick Up Package",
    date: at(2, 10, 0),
  },
  {
    id: "organize-project-meeting",
    title: "Organize Project Meeting",
    date: at(3, 11, 0),
  },
  {
    id: "complete-client-proposal",
    title: "Complete Client Proposal",
    date: at(5, 9, 0),
  },
]
