import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CalendarDays, Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { TimeDial } from "@/components/ui/time-dial"
import { dayOffsetFromToday, formatShortDate, formatTime, hasTimeOfDay, startOfDay } from "@/lib/date"
import { cn } from "@/lib/utils"

interface SchedulePopoverProps {
  date?: Date
  done?: boolean
  onSchedule: (date?: Date) => void
  placeholder?: string
  className?: string
}

function timeMinutes(date?: Date) {
  if (!date || !hasTimeOfDay(date)) return null
  return date.getHours() * 60 + date.getMinutes()
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
  const [timeOpen, setTimeOpen] = useState(false)
  const overdue = !!date && !done && dayOffsetFromToday(date) < 0
  const minutes = timeMinutes(date)

  function commitTime(mins: number) {
    const next = new Date(date ?? startOfDay(new Date()))
    next.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
    onSchedule(next)
  }

  function clearTime() {
    const next = new Date(date ?? startOfDay(new Date()))
    next.setHours(0, 0, 0, 0)
    onSchedule(next)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTimeOpen(false)
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs tabular-nums hover:bg-white/10",
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
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setTimeOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={13} />
              Time
            </span>
            <span
              className={cn(
                "rounded-md bg-white/5 px-2 py-1 text-xs tabular-nums",
                minutes != null ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {date && minutes != null ? formatTime(date) : "Set time"}
            </span>
          </button>
          <AnimatePresence initial={false}>
            {timeOpen && (
              <motion.div
                key="time-dial"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 480, damping: 42, mass: 0.7 }}
                className="overflow-hidden"
              >
                <TimeDial
                  className="px-3 pt-1 pb-2.5"
                  minutes={minutes}
                  onChange={commitTime}
                  onDone={(mins) => {
                    commitTime(mins)
                    setTimeOpen(false)
                  }}
                  onClear={
                    minutes != null
                      ? () => {
                          clearTime()
                          setTimeOpen(false)
                        }
                      : undefined
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
