import { AnimatePresence } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import SiteHeader from './components/SiteHeader.jsx'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'
import Questionnaire from './pages/Questionnaire.jsx'
import Results from './pages/Results.jsx'
import Journey from './pages/Journey.jsx'
import Feedback from './pages/Feedback.jsx'
import Reports from './pages/Reports.jsx'
import DietProtocol from './pages/DietProtocol.jsx'
import CycleLog from './pages/CycleLog.jsx'

export default function App() {
  const location = useLocation()

  return (
    <div className="relative min-h-screen bg-[#F5F6F4]">
      <div className="relative z-10 flex min-h-screen flex-col bg-[#F5F6F4]">
        <SiteHeader />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Auth defaultTab="login" />} />
              <Route path="/registration" element={<Auth defaultTab="register" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/assessment" element={<Questionnaire />} />
              <Route path="/chatbot" element={<Questionnaire />} />
              <Route path="/results/:id" element={<Results />} />
              <Route path="/results" element={<Results />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/report" element={<Reports />} />
              <Route path="/diet" element={<DietProtocol />} />
              <Route path="/protocol" element={<DietProtocol />} />
              <Route path="/cycle-log" element={<CycleLog />} />
              <Route path="/cycle" element={<CycleLog />} />
              <Route path="/journey" element={<Journey />} />
              <Route path="/daily-log" element={<Journey />} />
              <Route path="/feedback" element={<Feedback />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
