import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

interface TaskSectionProps {
  title: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
}

export function TaskSection({
  title,
  count,
  defaultOpen = true,
  children,
}: TaskSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        >
          <ChevronDown size={14} className="text-default-400" />
        </motion.span>
        <span className="text-small font-medium text-foreground">{title}</span>
        <span className="text-tiny text-default-400">{count}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn("overflow-hidden")}
          >
            <div className="flex flex-col">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
