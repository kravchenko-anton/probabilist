import './App.css'
import { Navigate, Route, Routes } from "react-router-dom"
import { Calendar1, CalendarRange, Inbox, Sunrise } from "lucide-react"
import { Layout } from "@/components/Layout"
import { DateView } from "@/pages/DateView"
import { ProjectView } from "@/pages/ProjectView"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<DateView view="inbox" title="Inbox" icon={Inbox} />} />
        <Route path="today" element={<DateView view="today" title="Today" icon={Calendar1} />} />
        <Route
          path="tomorrow"
          element={<DateView view="tomorrow" title="Tomorrow" icon={Sunrise} />}
        />
        <Route
          path="next-7-days"
          element={<DateView view="next7" title="Next 7 Days" icon={CalendarRange} />}
        />
        <Route path="project/:slug" element={<ProjectView />} />
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Route>
    </Routes>
  )
}

export default App
