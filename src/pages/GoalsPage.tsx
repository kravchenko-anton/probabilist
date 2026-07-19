import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { GoalJourneyCard } from "@/components/goals/GoalJourneyCard"
import { Button } from "@/components/ui/button"
import { Emoji } from "@/components/ui/emoji"
import { goalProgress, isGoalDone } from "@/data/goals"
import { useGoals } from "@/lib/goals-store"
import { cn } from "@/lib/utils"
import { motion, useReducedMotion } from "motion/react"
import { Check, Plus } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

export function GoalsPage() {
  const { goals } = useGoals()
  const [createOpen, setCreateOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex items-center gap-3 px-5 py-5 sm:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Goals
          </h1>
          <p className="mt-0.5 text-small text-default-500">
            What you want to move
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full px-4"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={14} />
          New goal
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8 sm:px-8">
        {goals.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-10 text-center sm:py-14">
            <GoalJourneyCard
              beforeEmoji="😩"
              afterEmoji="😎"
              beforeLabel="Now"
              afterLabel="Goal"
              title="Land the job you want"
              steps={[
                { label: "Where you are", detail: "Job hunting, no offers yet" },
                {
                  label: "What you’ll measure",
                  detail: "Apps · interviews · offer",
                },
                { label: "Where you’re headed", detail: "Signed and starting" },
              ]}
              ctaLabel="Set up metrics"
              onCtaClick={() => setCreateOpen(true)}
            />
            <p className="max-w-sm text-small text-default-500">
              A goal is something you want to move. Experiments are the tiny
              bets you run to learn how.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal, index) => {
              const progress = goalProgress(goal)
              const done = isGoalDone(goal)
              return (
                <motion.div
                  key={goal.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: reduceMotion ? 0 : index * 0.04,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link
                    to={`/goal/${goal.slug}`}
                    className="group flex flex-col gap-3 rounded-large bg-content1 px-4 py-4 ring-1 ring-foreground/8 transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-white/[0.04] hover:shadow-small active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-large border border-divider bg-background/40">
                        <Emoji value={goal.emoji} className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-medium text-foreground">
                          {goal.title}
                        </p>
                        <p className="truncate text-tiny text-default-500">
                          {goal.timePeriodLabel}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-small tabular-nums",
                          done ? "text-emerald-400" : "text-default-500",
                        )}
                      >
                        {done ? (
                          <Check size={15} />
                        ) : (
                          `${Math.round(progress)}%`
                        )}
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          done ? "bg-emerald-400" : "bg-primary",
                        )}
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <GoalFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
