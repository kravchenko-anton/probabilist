import { useState } from "react"
import { Clock, Timer } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { formatDuration } from "@/lib/date"
import { cn } from "@/lib/utils"

const PRESETS = [15, 30, 45, 60, 90, 120, 180, 240]

interface DurationPopoverProps {
  minutes?: number
  onChange: (minutes?: number) => void
  /** Chip text while no duration is set. */
  placeholder: string
  /** Prefix shown before the value, e.g. "~" for an estimate or "took" for actual time. */
  prefix?: string
  icon?: "clock" | "timer"
  className?: string
}

/** Chip that shows a duration and opens preset/custom pickers to change it. */
export function DurationPopover({
  minutes,
  onChange,
  placeholder,
  prefix,
  icon = "clock",
  className,
}: DurationPopoverProps) {
  const [open, setOpen] = useState(false)
  const Icon = icon === "timer" ? Timer : Clock

  const hoursPart = minutes ? Math.floor(minutes / 60) : 0
  const minutesPart = minutes ? minutes % 60 : 0

  const commitCustom = (hours: number, mins: number) => {
    const total = hours * 60 + mins
    onChange(total > 0 ? total : undefined)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs hover:bg-white/10",
              minutes ? "text-primary-foreground/80" : "text-muted-foreground",
              className
            )}
          />
        }
      >
        <Icon size={13} />
        {minutes ? `${prefix ?? ""}${formatDuration(minutes)}` : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onChange(preset)
                setOpen(false)
              }}
              className={cn(
                "rounded-md px-1.5 py-1 text-xs hover:bg-white/10",
                preset === minutes
                  ? "bg-primary/20 text-primary-foreground"
                  : "bg-white/5 text-foreground"
              )}
            >
              {formatDuration(preset)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">Custom</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <input
              type="number"
              min={0}
              value={hoursPart || ""}
              onChange={(e) => commitCustom(Math.max(0, Number(e.target.value)), minutesPart)}
              placeholder="0"
              className="w-10 rounded-md bg-white/5 px-1.5 py-1 text-right text-xs text-foreground outline-none hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-ring"
            />
            h
            <input
              type="number"
              min={0}
              max={59}
              value={minutesPart || ""}
              onChange={(e) =>
                commitCustom(hoursPart, Math.min(59, Math.max(0, Number(e.target.value))))
              }
              placeholder="0"
              className="w-10 rounded-md bg-white/5 px-1.5 py-1 text-right text-xs text-foreground outline-none hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-ring"
            />
            m
          </div>
        </div>
        {minutes !== undefined && (
          <div className="mt-2 border-t border-border pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange(undefined)
                setOpen(false)
              }}
            >
              Remove time
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
