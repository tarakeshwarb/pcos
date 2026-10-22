import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentUser, logoutUser } from '../lib/api.js'

export default function SiteHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef(null)

  useEffect(() => {
    setCurrentUser(getCurrentUser())
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)
  }, [location.pathname])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logoutUser()
    setCurrentUser(null)
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('')
      return
    }

    const handleScroll = () => {
      const scrollY = window.scrollY
      const phenotypesEl = document.getElementById('phenotypes')
      const pcosEl = document.getElementById('pcos')
      const aboutEl = document.getElementById('about')

      if (phenotypesEl && scrollY >= phenotypesEl.offsetTop - 260) {
        setActiveSection('phenotypes')
      } else if (pcosEl && scrollY >= pcosEl.offsetTop - 260) {
        setActiveSection('pcos')
      } else if (aboutEl && scrollY >= aboutEl.offsetTop - 260) {
        setActiveSection('about')
      } else {
        setActiveSection('home')
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  const scrollToSection = (e, sectionId) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`)
      setTimeout(() => {
        const el = document.getElementById(sectionId)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 150)
    } else {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        window.history.pushState(null, '', `#${sectionId}`)
      }
    }
  }

  const scrollToTop = (e) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    if (location.pathname !== '/') {
      navigate('/')
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      window.history.pushState(null, '', '/')
    }
  }

  // Get user initial for circle avatar
  const userInitial = (currentUser?.full_name || currentUser?.name || 'User').charAt(0).toUpperCase()

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E5E7E2] bg-[#F5F6F4]/95 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          {/* Left Brand */}
          <div className="flex items-center">
            <Link
              to="/"
              onClick={(e) => {
                if (location.pathname === '/') {
                  scrollToTop(e)
                }
              }}
              className="group flex items-center gap-2"
            >
              <span className="font-heading text-xl font-normal tracking-[-0.03em] text-[#202321] uppercase">
                HELIX<span className="text-[#7C3AED] font-semibold">DX</span>
              </span>
            </Link>
          </div>

          {/* ============================================================ */}
          {/* DESKTOP NAVIGATION (Hidden on mobile)                       */}
          {/* ============================================================ */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6">
              {currentUser ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`text-[14px] font-medium transition-colors ${
                      isActive('/dashboard')
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Dashboard
                  </Link>

                  <Link
                    to="/diet"
                    className={`text-[14px] font-medium transition-colors ${
                      isActive('/diet') || isActive('/protocol')
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Diet & Lifestyle Protocol
                  </Link>

                  <Link
                    to="/cycle-log"
                    className={`text-[14px] font-medium transition-colors ${
                      isActive('/cycle-log') || isActive('/cycle')
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Daily Cycle Log
                  </Link>

                  <Link
                    to="/journey"
                    className={`text-[14px] font-medium transition-colors ${
                      isActive('/journey') || isActive('/daily-log')
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Daily Log
                  </Link>

                  <Link
                    to="/reports"
                    className={`text-[14px] font-medium transition-colors ${
                      isActive('/reports') || isActive('/report')
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Report
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className={`text-[14px] font-medium transition-colors ${
                      location.pathname === '/' && activeSection === 'home'
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Home
                  </button>

                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, 'about')}
                    className={`text-[14px] font-medium transition-colors ${
                      location.pathname === '/' && activeSection === 'about'
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    About
                  </button>

                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, 'pcos')}
                    className={`text-[14px] font-medium transition-colors ${
                      location.pathname === '/' && activeSection === 'pcos'
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    PCOS
                  </button>

                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, 'phenotypes')}
                    className={`text-[14px] font-medium transition-colors ${
                      location.pathname === '/' && activeSection === 'phenotypes'
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Phenotypes
                  </button>

                  <Link
                    to="/diet"
                    className={`text-[14px] font-medium transition-colors ${
                      isActive('/diet') || isActive('/protocol')
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Diet & Lifestyle Protocol
                  </Link>

                  <Link
                    to="/cycle-log"
                    className={`text-[14px] font-medium transition-colors ${
                      isActive('/cycle-log') || isActive('/cycle')
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Daily Cycle Log
                  </Link>

                  <Link
                    to="/journey"
                    className={`text-[14px] font-medium transition-colors ${
                      isActive('/journey') || isActive('/daily-log')
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Daily Log
                  </Link>

                  <Link
                    to="/reports"
                    className={`text-[14px] font-medium transition-colors ${
                      isActive('/reports') || isActive('/report')
                        ? 'text-purple-700 border-b-2 border-purple-600 pb-0.5 font-semibold'
                        : 'text-[#626762] hover:text-[#202321]'
                    }`}
                  >
                    Report
                  </Link>
                </>
              )}
            </nav>

            {/* Action Area: Take Assessment & Account Avatar */}
            {currentUser ? (
              <>
                <Link
                  to="/assessment"
                  className="btn-primary !px-5 !py-2 text-[14px] font-medium rounded-full shadow-sm"
                >
                  Take Assessment
                </Link>

                {/* RIGHT TOP CORNER: CIRCLE AVATAR ACCOUNT BUTTON */}
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:border-slate-800 hover:text-slate-900 shadow-xs hover:scale-105 active:scale-95 transition-all focus:outline-none"
                    title={`Account: ${currentUser.full_name || 'User'}`}
                    aria-label="User account menu"
                  >
                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </button>

                  {/* Floating Account Dropdown Menu */}
                  <AnimatePresence>
                    {accountMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50"
                      >
                        {/* User Header */}
                        <div className="flex items-center gap-3 p-2.5 border-b border-slate-100">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 shadow-xs">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="truncate flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {currentUser.full_name || 'Patient'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {currentUser.email || 'patient@helixdx.com'}
                            </p>
                          </div>
                        </div>

                        {/* Menu Links */}
                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Profile & Details</span>
                          </Link>

                          <Link
                            to="/dashboard"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Dashboard</span>
                          </Link>

                          <Link
                            to="/diet"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span>Diet & Lifestyle Protocol</span>
                          </Link>

                          <Link
                            to="/cycle-log"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Daily Cycle Log</span>
                          </Link>

                          <Link
                            to="/journey"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Daily Log</span>
                          </Link>

                          <Link
                            to="/reports"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Assessment Reports</span>
                          </Link>
                        </div>

                        {/* Sign Out Action */}
                        <div className="pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Single Unified Button: "Take Assessment" (directs to login first, then to assessment) */
              <Link
                to="/login?redirect=/assessment"
                className="btn-primary !px-6 !py-2.5 text-[14px] font-medium rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                Take Assessment
              </Link>
            )}
          </div>

          {/* ============================================================ */}
          {/* MOBILE CONTROLS (Assessment shortcut + Circle Avatar + Slider) */}
          {/* ============================================================ */}
          <div className="flex md:hidden items-center gap-2.5">
            {currentUser ? (
              <>
                <Link
                  to="/assessment"
                  className="btn-primary !px-3.5 !py-1.5 text-xs font-semibold rounded-lg"
                >
                  Assessment
                </Link>

                {/* Mobile Circle Avatar Shortcut */}
                <Link
                  to="/profile"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-xs hover:border-slate-800 transition-colors"
                  title={`Account: ${currentUser.full_name || 'User'}`}
                >
                  <svg className="w-4.5 h-4.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              </>
            ) : (
              <Link
                to="/login?redirect=/assessment"
                className="btn-primary !px-4 !py-1.5 text-xs font-semibold rounded-lg"
              >
                Take Assessment
              </Link>
            )}

            {/* Slider Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-rose-600 transition-all shadow-xs"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MOBILE SLIDER DRAWER (Slide-out menu for mobile alone)       */}
      {/* ============================================================ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Slide-out Drawer Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-[290px] bg-white border-l border-slate-200 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto md:hidden"
            >
              <div className="space-y-6">
                {/* Drawer Top Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED] text-white font-bold text-xs shadow-sm">
                      Dx
                    </span>
                    <span className="font-heading font-semibold text-[#0A192F] text-base tracking-tight">
                      HELIX<span className="text-[#7C3AED] font-bold">DX</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* User Card if Authenticated */}
                {currentUser ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="truncate flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {currentUser.full_name || 'Patient'}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center text-xs font-semibold text-rose-600 bg-white border border-rose-200 py-1.5 rounded-lg shadow-sm hover:bg-rose-50 transition-colors"
                    >
                      View & Edit Profile
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-center space-y-2.5">
                    <p className="text-xs text-slate-600">
                      Sign in to track and save your clinical assessment results.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="btn-ghost !px-3 !py-2 text-xs font-semibold"
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/registration"
                        onClick={() => setMobileMenuOpen(false)}
                        className="btn-primary !px-3 !py-2 text-xs font-bold"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                )}

                {/* Mobile Navigation List (Slider Links) */}
                <div className="space-y-1.5">
                  <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Menu Navigation
                  </div>

                  {currentUser ? (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/dashboard')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Dashboard</span>
                      </Link>

                      <Link
                        to="/diet"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/diet') || isActive('/protocol')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Diet & Lifestyle Protocol</span>
                      </Link>

                      <Link
                        to="/cycle-log"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/cycle-log') || isActive('/cycle')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Daily Cycle Log</span>
                      </Link>

                      <Link
                        to="/journey"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/journey') || isActive('/daily-log')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Daily Log</span>
                      </Link>

                      <Link
                        to="/reports"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/reports') || isActive('/report')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Report</span>
                      </Link>

                      <Link
                        to="/assessment"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/assessment') || isActive('/chatbot')
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <span>Assessment</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/10 text-current">
                          Clinical
                        </span>
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/profile')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile & Details</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={scrollToTop}
                        className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          location.pathname === '/' && activeSection === 'home'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Home</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => scrollToSection(e, 'about')}
                        className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          location.pathname === '/' && activeSection === 'about'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>About</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => scrollToSection(e, 'pcos')}
                        className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          location.pathname === '/' && activeSection === 'pcos'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>PCOS</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => scrollToSection(e, 'phenotypes')}
                        className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          location.pathname === '/' && activeSection === 'phenotypes'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <span>Phenotypes</span>
                      </button>

                      <Link
                        to="/diet"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/diet') || isActive('/protocol')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Diet & Lifestyle Protocol</span>
                      </Link>

                      <Link
                        to="/cycle-log"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/cycle-log') || isActive('/cycle')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Daily Cycle Log</span>
                      </Link>

                      <Link
                        to="/journey"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/journey') || isActive('/daily-log')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Daily Log</span>
                      </Link>

                      <Link
                        to="/reports"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/reports') || isActive('/report')
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Report</span>
                      </Link>

                      <Link
                        to="/login?redirect=/assessment"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                          isActive('/assessment') || isActive('/chatbot')
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <span>Take Assessment</span>
                        </div>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="pt-6 border-t border-slate-100 space-y-3">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-600 py-3 text-xs font-semibold hover:bg-rose-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <Link
                    to="/login?redirect=/assessment"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full block text-center rounded-xl bg-rose-500 text-white font-bold py-3 text-xs shadow-md shadow-rose-500/25"
                  >
                    Take Assessment
                  </Link>
                )}

                <p className="text-center text-[10px] text-slate-400 font-mono">
                  Rotterdam Consensus Intelligence
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

