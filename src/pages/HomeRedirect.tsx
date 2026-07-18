import { useGoals } from "@/lib/goals-store"
import { Navigate } from "react-router-dom"

/** Land on the only goal when there is one; otherwise the goals list. */
export function HomeRedirect() {
  const goals = useGoals((state) => state.goals)

  if (goals.length === 1) {
    return <Navigate to={`/goal/${goals[0].slug}`} replace />
  }

  return <Navigate to="/goals" replace />
}
