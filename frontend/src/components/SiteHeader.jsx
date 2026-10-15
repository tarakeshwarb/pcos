import { Link, useLocation } from 'react-router-dom'

export default function SiteHeader() {
  const location = useLocation()
  const onLanding = location.pathname === '/'

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 backdrop-blur-md">
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
          <Link to="/journey" className="btn-ghost !px-4 !py-2 text-sm hidden sm:inline-flex">
            My Journey
          </Link>
          <Link to="/feedback" className="btn-ghost !px-4 !py-2 text-sm hidden sm:inline-flex">
            Feedback
          </Link>
          <Link to="/assessment" className="btn-ghost !px-4 !py-2 text-sm">
            {onLanding ? 'Start Assessment' : 'Restart'}
          </Link>
        </nav>
      </div>
    </header>
  )
}
