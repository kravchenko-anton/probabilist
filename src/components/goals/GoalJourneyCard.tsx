import { Button } from "@/components/ui/button"
import { Emoji } from "@/components/ui/emoji"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useState } from "react"

export interface JourneyStep {
  label: string
  detail?: string
}

interface GoalJourneyCardProps {
  /** Starting state emoji (bottom-left). */
  beforeEmoji?: string
  /** Goal state emoji (top-right). */
  afterEmoji?: string
  beforeLabel?: string
  afterLabel?: string
  /** Short headline inside the card. */
  title?: string
  /** Steps revealed along the before → after path. */
  steps?: JourneyStep[]
  ctaLabel?: string
  onCtaClick?: () => void
  className?: string
  /** Auto-advance highlighted step. Set false to keep static. */
  autoPlay?: boolean
}

const DEFAULT_STEPS: JourneyStep[] = [
  { label: "Where you are", detail: "Job hunting, no offers yet" },
  { label: "What you’ll measure", detail: "Apps sent · interviews · offer" },
  { label: "Where you’re headed", detail: "Landed the role" },
]

export function GoalJourneyCard({
  beforeEmoji = "😩",
  afterEmoji = "😎",
  beforeLabel = "Before",
  afterLabel = "After",
  title = "Turn a wish into a measurable goal",
  steps = DEFAULT_STEPS,
  ctaLabel = "Set up metrics",
  onCtaClick,
  className,
  autoPlay = true,
}: GoalJourneyCardProps) {
  const reduceMotion = useReducedMotion()
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (!autoPlay || reduceMotion || steps.length === 0) return
    const id = window.setInterval(() => {
      setActiveStep((i) => (i + 1) % steps.length)
    }, 2200)
    return () => window.clearInterval(id)
  }, [autoPlay, reduceMotion, steps.length])

  const progress = steps.length <= 1 ? 1 : activeStep / (steps.length - 1)

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative mx-auto w-full max-w-[280px] select-none", className)}
    >
      {/* After emoji — top-right, overlapping the card */}
      <FloatingEmoji
        emoji={afterEmoji}
        label={afterLabel}
        side="after"
        reduceMotion={!!reduceMotion}
        className="absolute -top-5 -right-4 z-20 sm:-top-6 sm:-right-5"
      />

      <div className="relative overflow-hidden rounded-[28px] bg-content1 shadow-small ring-1 ring-foreground/10">
        {/* Soft diagonal glow following the journey */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 15% 90%, rgba(255,159,10,0.12), transparent 45%), radial-gradient(100% 70% at 90% 10%, rgba(10,132,255,0.18), transparent 50%)",
          }}
          animate={
            reduceMotion
              ? undefined
              : { opacity: [0.65, 1, 0.65] }
          }
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative flex min-h-[300px] flex-col px-5 pt-7 pb-5">
          <p className="max-w-[11rem] text-[15px] font-medium leading-snug tracking-tight text-foreground">
            {title}
          </p>

          {/* Journey path + step labels */}
          <div className="relative mt-5 mb-4 flex-1">
            <svg
              viewBox="0 0 200 160"
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden
            >
              <defs>
                <linearGradient id="journey-stroke" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff9f0a" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0a84ff" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              {/* Track */}
              <path
                d="M 28 138 C 70 120, 110 70, 172 28"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Progress */}
              <motion.path
                d="M 28 138 C 70 120, 110 70, 172 28"
                fill="none"
                stroke="url(#journey-stroke)"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={false}
                animate={{ pathLength: progress }}
                transition={{ type: "spring", stiffness: 120, damping: 24 }}
              />
            </svg>

            <div className="relative z-10 flex h-full flex-col justify-between py-1 pl-1">
              {steps.map((step, index) => {
                const isActive = index === activeStep
                const isDone = index < activeStep
                // Fan steps along the diagonal (bottom → top)
                const align =
                  index === 0 ? "items-start" : index === steps.length - 1 ? "items-end" : "items-center"
                return (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={cn("flex w-full flex-col gap-0.5 text-left", align)}
                  >
                    <span className="flex items-center gap-2">
                      <motion.span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums ring-1",
                          isActive
                            ? "bg-primary text-primary-foreground ring-primary"
                            : isDone
                              ? "bg-primary/25 text-primary ring-primary/40"
                              : "bg-white/5 text-muted-foreground ring-white/10"
                        )}
                        animate={isActive && !reduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={{ duration: 1.6, repeat: isActive ? Infinity : 0 }}
                      >
                        {index + 1}
                      </motion.span>
                      <span
                        className={cn(
                          "text-[12px] font-medium transition-colors",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                    </span>
                    <AnimatePresence mode="wait">
                      {isActive && step.detail && (
                        <motion.span
                          key={step.detail}
                          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.22 }}
                          className="max-w-[12rem] pl-7 text-[11px] leading-snug text-muted-foreground"
                        >
                          {step.detail}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                )
              })}
            </div>
          </div>

          <motion.div whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
            <Button
              type="button"
              onClick={onCtaClick}
              className="h-10 w-full rounded-full bg-primary text-small font-semibold tracking-tight text-primary-foreground shadow-small hover:bg-primary/90"
            >
              {ctaLabel}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Before emoji — bottom-left, overlapping the card */}
      <FloatingEmoji
        emoji={beforeEmoji}
        label={beforeLabel}
        side="before"
        reduceMotion={!!reduceMotion}
        className="absolute -bottom-4 -left-4 z-20 sm:-bottom-5 sm:-left-5"
      />
    </motion.div>
  )
}

function FloatingEmoji({
  emoji,
  label,
  side,
  reduceMotion,
  className,
}: {
  emoji: string
  label: string
  side: "before" | "after"
  reduceMotion: boolean
  className?: string
}) {
  const floatY = side === "before" ? [0, -5, 0] : [0, 5, 0]

  return (
    <motion.div
      className={cn("flex flex-col items-center gap-1", className)}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: reduceMotion ? 0 : floatY,
      }}
      transition={{
        opacity: { duration: 0.4, delay: side === "before" ? 0.15 : 0.28 },
        scale: { type: "spring", stiffness: 380, damping: 18, delay: side === "before" ? 0.15 : 0.28 },
        y: {
          duration: side === "before" ? 3.2 : 3.6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: side === "before" ? 0.4 : 0.8,
        },
      }}
    >
      <div className="relative">
        <div
          aria-hidden
          className={cn(
            "absolute inset-[-18%] rounded-full blur-xl",
            side === "before" ? "bg-amber-400/25" : "bg-sky-400/30"
          )}
        />
        <Emoji value={emoji} className="relative size-14 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)] sm:size-16" />
      </div>
      <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/80 ring-1 ring-white/10 backdrop-blur-sm">
        {label}
      </span>
    </motion.div>
  )
}
