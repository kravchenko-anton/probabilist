import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { dayOffsetFromToday, formatShortDate, formatTime, hasTimeOfDay } from "@/lib/date"
import { cn } from "@/lib/utils"

interface SchedulePopoverProps {
  date?: Date
  done?: boolean
  onSchedule: (date?: Date) => void
  placeholder?: string
  className?: string
}

function scheduleLabel(date: Date) {
  const offset = dayOffsetFromToday(date)
  const day =
    offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : offset === -1 ? "Yesterday" : formatShortDate(date)
  return hasTimeOfDay(date) ? `${day} · ${formatTime(date)}` : day
}

/** Chip that shows the planned day and opens a calendar to (re)schedule the task. */
export function SchedulePopover({
  date,
  done,
  onSchedule,
  placeholder = "Plan",
  className,
}: SchedulePopoverProps) {
  const [open, setOpen] = useState(false)
  const overdue = !!date && !done && dayOffsetFromToday(date) < 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs hover:bg-white/10",
              overdue ? "text-red-400" : date ? "text-primary-foreground/80" : "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarDays size={13} />
        {date ? scheduleLabel(date) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="p-0" align="end" onClick={(e) => e.stopPropagation()}>
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          numberOfMonths={1}
          onSelect={(picked) => {
            if (picked && date && hasTimeOfDay(date)) {
              picked.setHours(date.getHours(), date.getMinutes(), 0, 0)
            }
            onSchedule(picked ?? undefined)
            setOpen(false)
          }}
        />
        {date && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => {
                onSchedule(undefined)
                setOpen(false)
              }}
            >
              Remove date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
