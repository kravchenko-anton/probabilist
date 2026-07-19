import { GoalFormDialog } from "@/components/goals/GoalFormDialog"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { LogOut, Plus, Target, UserRound } from "lucide-react"
import { useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"

const tabClass =
  "relative flex flex-1 flex-col items-center justify-center gap-0.5 px-3 py-1.5 transition-colors duration-200 active:scale-[0.97]"

/** Floating glass tab bar — pill + detached action (iOS / liquid-glass style). */
export function BottomNav() {
  const [createGoalOpen, setCreateGoalOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onGoals = pathname.startsWith("/goals") || pathname.startsWith("/goal/")

  async function handleSignOut() {
    setAccountOpen(false)
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <>
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 md:hidden"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2.5">
          {/* Frosted pill */}
          <div className="flex h-[58px] min-w-0 flex-1 items-stretch rounded-full border border-white/15 bg-white/[0.08] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 supports-backdrop-filter:bg-white/[0.06]">
            <NavLink
              to="/goals"
              onClick={() => setAccountOpen(false)}
              className={cn(
                tabClass,
                onGoals && !accountOpen ? "text-primary" : "text-white/55",
              )}
            >
              {onGoals && !accountOpen && (
                <span
                  aria-hidden
                  className="absolute inset-y-0.5 inset-x-0.5 rounded-full bg-white/12"
                />
              )}
              <Target
                size={22}
                strokeWidth={onGoals && !accountOpen ? 2.25 : 1.75}
                absoluteStrokeWidth
                className="relative"
              />
              <span className="relative text-[10px] leading-none font-medium tracking-tight">
                Goals
              </span>
            </NavLink>

            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className={cn(
                tabClass,
                accountOpen ? "text-primary" : "text-white/55",
              )}
            >
              {accountOpen && (
                <span
                  aria-hidden
                  className="absolute inset-y-0.5 inset-x-0.5 rounded-full bg-white/12"
                />
              )}
              <UserRound
                size={22}
                strokeWidth={accountOpen ? 2.25 : 1.75}
                absoluteStrokeWidth
                className="relative"
              />
              <span className="relative text-[10px] leading-none font-medium tracking-tight">
                Account
              </span>
            </button>
          </div>

          {/* Detached circular action — New goal */}
          <button
            type="button"
            onClick={() => setCreateGoalOpen(true)}
            aria-label="New goal"
            className="flex size-[58px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-200 active:scale-95 supports-backdrop-filter:bg-white/[0.06]"
          >
            <Plus size={24} strokeWidth={2} absoluteStrokeWidth />
          </button>
        </div>
      </nav>

      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="gap-0 rounded-t-3xl border-divider bg-content1 p-0"
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15" />
          <SheetTitle className="px-5 pt-4 text-lg font-medium">
            Account
          </SheetTitle>
          <div className="flex flex-col gap-4 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {user?.email && (
              <p className="truncate text-small text-default-500">
                {user.email}
              </p>
            )}
            <Button
              variant="secondary"
              className="h-11 w-full justify-start gap-2 rounded-full"
              onClick={handleSignOut}
            >
              <LogOut size={18} className="rotate-180" />
              Log Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <GoalFormDialog open={createGoalOpen} onOpenChange={setCreateGoalOpen} />
    </>
  )
}
