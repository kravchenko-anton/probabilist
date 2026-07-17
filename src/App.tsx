import { Layout } from "@/components/Layout"
import { CompletedPage } from "@/pages/CompletedPage"
import { DateView } from "@/pages/DateView"
import { GoalView } from "@/pages/GoalView"
import { GoalsPage } from "@/pages/GoalsPage"
import { TrashPage } from "@/pages/TrashPage"
import { Navigate, Route, Routes } from "react-router-dom"
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<DateView view="inbox" title="Inbox" emoji="📥" />} />
        <Route path="today" element={<DateView view="today" title="Today" />} />
        <Route path="tomorrow" element={<DateView view="tomorrow" title="Tomorrow" />} />
        <Route
          path="next-7-days"
          element={<DateView view="next7" title="Next 7 Days" emoji="🗓️" />}
        />
        <Route path="completed" element={<CompletedPage />} />
        <Route path="trash" element={<TrashPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="goal/:slug" element={<GoalView />} />
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Route>
    </Routes>
  )
}

export default App
