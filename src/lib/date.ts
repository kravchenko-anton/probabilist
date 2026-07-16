const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, amount: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + amount)
  return d
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function dayOffsetFromToday(date: Date) {
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function formatWeekdayShort(date: Date) {
  return WEEKDAY_SHORT[date.getDay()]
}

export function formatHeaderDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export function formatMonthShort(date: Date) {
  return MONTH_SHORT[date.getMonth()]
}

export function formatShortDate(date: Date) {
  return `${formatMonthShort(date)} ${date.getDate()}`
}

export function formatDateRangeLabel(start: Date, end: Date) {
  return `${formatShortDate(start)} – ${formatShortDate(end)}, ${end.getFullYear()}`
}

export function formatTimeSince(date: Date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export interface QuarterOption {
  label: string
  startDate: Date
  endDate: Date
}

export function quarterOptions(): QuarterOption[] {
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3)

  return [0, 1, 2].map((offset) => {
    const quarterIndex = currentQuarter + offset
    const year = now.getFullYear() + Math.floor(quarterIndex / 4)
    const quarter = ((quarterIndex % 4) + 4) % 4
    const startDate = new Date(year, quarter * 3, 1)
    const endDate = new Date(year, quarter * 3 + 3, 0)
    const fiscalYear = String(year).slice(-2)
    const label = `Q${quarter + 1} FY${fiscalYear} · ${formatShortDate(startDate)} – ${formatShortDate(endDate)}`
    return { label, startDate, endDate }
  })
}
