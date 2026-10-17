import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../lib/api.js'

export default function SiteHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    setCurrentUser(getCurrentUser())
  }, [location.pathname])

  function handleLogout() {
    logoutUser()
    setCurrentUser(null)
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 backdrop-blur-md bg-slate-950/40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-bio-400/30 to-plasma-500/30 ring-1 ring-white/10">
            <span className="absolute inset-0 rounded-lg bg-bio-300/20 blur-md group-hover:blur-lg transition-all" />
            <svg viewBox="0 0 24 24" className="relative h-4.5 w-4.5 text-bio-200" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M7 3c0 4 10 4 10 8s-10 4-10 8M17 3c0 4-10 4-10 8s10 4 10 8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-slate-100">
            Helix<span className="text-gradient-bio">Dx</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {currentUser ? (
            <>
              <Link to="/dashboard" className="btn-ghost !px-3.5 !py-2 text-xs font-semibold text-bio-300 hover:text-white">
                📊 Dashboard
              </Link>
              <Link to="/assessment?mode=chat" className="btn-ghost !px-3.5 !py-2 text-xs font-semibold text-bio-200 hover:text-white flex items-center gap-1.5">
                <span>💬</span>
                <span>AI Chatbot</span>
              </Link>
              <Link to="/assessment?mode=form" className="btn-ghost !px-3.5 !py-2 text-xs text-slate-300 hidden sm:inline-flex items-center gap-1.5">
                <span>🩺</span>
                <span>Assessment Form</span>
              </Link>
              <Link to="/journey" className="btn-ghost !px-3.5 !py-2 text-xs text-slate-300 hidden sm:inline-flex">
                📅 Daily Log
              </Link>
              <div className="ml-2 flex items-center gap-2.5 border-l border-white/10 pl-3">
                <Link
                  to="/profile"
                  className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-bio-400/40 hover:bg-bio-500/10 hover:text-bio-200 transition-all cursor-pointer"
                  title="Click to view & edit your Personal Details"
                >
                  <span className="text-bio-300">👤</span>
                  <span>{currentUser.full_name?.split(' ')[0] || 'Profile'}</span>
                  <span className="text-[10px] text-bio-300 font-semibold opacity-70 group-hover:opacity-100">
                    Edit
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost !px-4 !py-2 text-xs font-medium text-slate-300 hover:text-white">
                Sign In
              </Link>
              <Link to="/registration" className="btn-primary !px-4 !py-2 text-xs font-semibold shadow-sm">
                Register Free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
