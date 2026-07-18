import { Layout } from "@/components/Layout"
import { RequireAuth } from "@/components/RequireAuth"
import { GoalView } from "@/pages/GoalView"
import { GoalsPage } from "@/pages/GoalsPage"
import { HomeRedirect } from "@/pages/HomeRedirect"
import { LoginPage } from "@/pages/LoginPage"
import { Navigate, Route, Routes } from "react-router-dom"
import "./App.css"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="goal/:slug" element={<GoalView />} />
          {/* Legacy task routes — keep bookmarks working. */}
          <Route path="inbox" element={<Navigate to="/goals" replace />} />
          <Route path="today" element={<Navigate to="/goals" replace />} />
          <Route path="tomorrow" element={<Navigate to="/goals" replace />} />
          <Route
            path="next-7-days"
            element={<Navigate to="/goals" replace />}
          />
          <Route path="completed" element={<Navigate to="/goals" replace />} />
          <Route path="trash" element={<Navigate to="/goals" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
