import { AnimatePresence } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import BackgroundImage from './components/BackgroundImage.jsx'
import ParticleField from './components/ParticleField.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'
import Questionnaire from './pages/Questionnaire.jsx'
import Results from './pages/Results.jsx'
import Journey from './pages/Journey.jsx'
import Feedback from './pages/Feedback.jsx'

const BACKDROPS = {
  '/': { image: '/media/hero-bg.jpg', video: '/media/hero-bg.mp4' },
  '/login': { image: '/media/hero-bg.jpg' },
  '/registration': { image: '/media/hero-bg.jpg' },
  '/dashboard': { image: '/media/hero-bg.jpg' },
  '/profile': { image: '/media/hero-bg.jpg' },
  '/assessment': { image: '/media/assessment-bg.jpg' },
  '/results': { image: '/media/results-bg.jpg' },
  '/journey': { image: '/media/hero-bg.jpg' },
  '/feedback': { image: '/media/hero-bg.jpg' },
}

function backdropFor(pathname) {
  if (BACKDROPS[pathname]) return BACKDROPS[pathname]
  if (pathname.startsWith('/results')) return BACKDROPS['/results']
  return BACKDROPS['/']
}

export default function App() {
  const location = useLocation()
  const backdrop = backdropFor(location.pathname)

  return (
    <div className="relative min-h-screen">
      <BackgroundImage image={backdrop.image} video={backdrop.video} />
      <ParticleField />
      <div className="pointer-events-none fixed inset-0 z-[2] grid-overlay opacity-30" />
      <div className="pointer-events-none fixed inset-0 z-[3] noise-overlay" />

      <div className="relative z-10 flex min-h-screen flex-col">
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
              <Route path="/results/:id" element={<Results />} />
              <Route path="/results" element={<Results />} />
              <Route path="/journey" element={<Journey />} />
              <Route path="/feedback" element={<Feedback />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
