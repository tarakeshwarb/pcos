import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../components/GlassCard.jsx'
import PhenotypeRadar from '../components/PhenotypeRadar.jsx'
import UnifiedLogDashboard from '../components/LogAnalyticsGraph.jsx'
import {
  getCurrentUser,
  updatePatientProfile,
  fetchUserSubmissions,
  saveLifestylePlan,
  fetchLifestylePlan,
  saveDailyLog,
  fetchDailyLogs,
  deleteDailyLog,
  fetchAllAssessmentCategories,
} from '../lib/api.js'
import { runPipeline } from '../lib/ruleEngine.js'
import dietProtocols from '../data/diet_protocols.json'

const PHENOTYPE_META = {
  adrenal: {
    label: 'Adrenal PCOS',
    tag: 'Stress-Driven',
    color: '#a78bfa',
    badge: 'border-purple-400/40 bg-purple-500/10 text-purple-300',
    desc: 'Driven by elevated stress hormones (DHEA-S/cortisol) activating adrenal androgens.',
  },
  hormonal: {
    label: 'Hormonal PCOS',
    tag: 'Ovarian / Post-Pill',
    color: '#4bf3d6',
    badge: 'border-bio-400/40 bg-bio-500/10 text-bio-300',
    desc: 'Driven by LH/FSH imbalances, ovarian hyperandrogenism, and anovulation.',
  },
  inflammatory: {
    label: 'Inflammatory PCOS',
    tag: 'Immune / Gut-Driven',
    color: '#ff8a80',
    badge: 'border-rose-400/40 bg-rose-500/10 text-rose-300',
    desc: 'Driven by systemic inflammation, gut permeability (hs-CRP), or environmental toxins.',
  },
  metabolic: {
    label: 'Metabolic PCOS',
    tag: 'Insulin-Resistant',
    color: '#fbbf24',
    badge: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
    desc: 'Driven by insulin resistance, fasting hyperinsulinemia, and impaired glucose uptake.',
  },
}

export default function Dashboard({ initialTab }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState(tabFromUrl || initialTab || 'overview')
  const [submissions, setSubmissions] = useState([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  useEffect(() => {
    if (tabFromUrl === 'history') {
      navigate('/reports', { replace: true })
    } else if (tabFromUrl === 'diet' || tabFromUrl === 'protocol') {
      navigate('/diet', { replace: true })
    } else if (tabFromUrl === 'cycle-log' || tabFromUrl === 'cycle') {
      navigate('/cycle-log', { replace: true })
    } else if (tabFromUrl === 'journey' || tabFromUrl === 'daily-log') {
      navigate('/journey', { replace: true })
    }
  }, [tabFromUrl, navigate])

  // First-time notification modal state
  const [showNotificationModal, setShowNotificationModal] = useState(false)

  // Questionnaire answers state (unified from Supabase category tables)
  const [answers, setAnswers] = useState({})

  // Profile Form state
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    dob: '',
    age: '',
    region_preference: 'South Indian',
    diet_type: 'Vegetarian',
    height: '',
    weight: '',
    occupation: '',
    living_environment: '',
  })
  const [profileSaveStatus, setProfileSaveStatus] = useState(null)

  // Daily cycle journey tracker state
  const [cycleLog, setCycleLog] = useState({
    date: new Date().toISOString().slice(0, 10),
    cycle: 'Period',
    mood: 3,
    sleep_hours: '7.5',
    symptoms: ['Bloating'],
    notes: '',
  })
  const [journeyEntries, setJourneyEntries] = useState([])
  const [journeySavedNotice, setJourneySavedNotice] = useState(false)

  useEffect(() => {
    let cur = getCurrentUser()
    if (!cur) {
      try {
        const cachedReg = JSON.parse(sessionStorage.getItem('pcos_registration') || '{}')
        cur = {
          full_name: cachedReg?.full_name || 'Patient',
          email: cachedReg?.email || null,
          region_preference: cachedReg?.region_preference || 'South Indian',
          diet_type: cachedReg?.diet_type || 'Vegetarian',
          demographics: cachedReg || {},
          isGuest: true,
        }
      } catch {
        cur = {
          full_name: 'Patient',
          email: null,
          region_preference: 'South Indian',
          diet_type: 'Vegetarian',
          demographics: {},
          isGuest: true,
        }
      }
    }
    setUser(cur)

    setProfileData({
      full_name: cur.full_name || '',
      email: cur.email || '',
      phone: cur.phone || '',
      dob: cur.dob || '',
      age: cur.age ? cur.age.toString() : '',
      region_preference: cur.region_preference || 'South Indian',
      diet_type: cur.diet_type || 'Vegetarian',
      height: cur.demographics?.height || '',
      weight: cur.demographics?.weight || '',
      occupation: cur.demographics?.occupation || '',
      living_environment: cur.demographics?.living_environment || '',
    })

    // Load last result from cache if available (ensuring it belongs to this user and is not a preview baseline)
    let cachedResult = null
    const cached = sessionStorage.getItem('pcos_last_result')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed && parsed.id !== 'preview' && (!parsed.email || !cur.email || parsed.email === cur.email)) {
          cachedResult = parsed
          setLastResult(cachedResult)
        }
      } catch (e) {
        console.error(e)
      }
    }

    if (!cachedResult && cur.email) {
      try {
        const localUserAssessment = localStorage.getItem(`pcos_assessment_${cur.email}`)
        if (localUserAssessment && localUserAssessment !== 'true') {
          cachedResult = JSON.parse(localUserAssessment)
          setLastResult(cachedResult)
        }
      } catch (e) {}
    }

    if (cur.email) {
      // 1. Fetch ALL saved questionnaire category answers from Supabase tables
      fetchAllAssessmentCategories(cur.email).then(({ unified }) => {
        if (unified && Object.keys(unified).length > 0) {
          setAnswers(unified)
          // Re-evaluate phenotype using unified answers
          const res = runPipeline(unified, cur.region_preference || 'South Indian', cur.diet_type || 'Vegetarian')
          setLastResult((prev) => prev || {
            id: 'latest',
            created_at: new Date().toISOString(),
            ...res,
          })
        }
      })

      // 2. Check if first-time notification modal should be shown
      const modalDismissed = localStorage.getItem(`pcos_modal_dismissed_${cur.email}`)
      if (!modalDismissed && !cachedResult) {
        setShowNotificationModal(true)
      }

      // 3. Load past submissions from Supabase
      setLoadingSubmissions(true)
      fetchUserSubmissions(cur.email).then((list) => {
        setSubmissions(list)
        if (!cachedResult && list.length > 0) {
          setLastResult(list[0])
        }
        setLoadingSubmissions(false)
      })

      // 4. Load saved Daily Logs from Supabase daily_logs table
      fetchDailyLogs(cur.email).then((logs) => {
        if (logs && logs.length > 0) {
          setJourneyEntries(logs)
        } else {
          try {
            const localLogs = localStorage.getItem('pcos_journey_entries')
            if (localLogs) setJourneyEntries(JSON.parse(localLogs))
          } catch {}
        }
      })

      // 5. Load saved Lifestyle Plan from Supabase lifestyle_plans table
      fetchLifestylePlan(cur.email).then((plan) => {
        if (plan) {
          setProfileData((prev) => ({
            ...prev,
            region_preference: plan.region_preference || prev.region_preference,
            diet_type: plan.diet_type || prev.diet_type,
          }))
        }
      })
    } else {
      // Guest or local mode
      try {
        const localLogs = localStorage.getItem('pcos_journey_entries')
        if (localLogs) setJourneyEntries(JSON.parse(localLogs))
      } catch {}
    }
  }, [navigate])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  function dismissNotificationModal(openAssessment = false) {
    if (user?.email) {
      localStorage.setItem(`pcos_modal_dismissed_${user.email}`, 'true')
    }
    setShowNotificationModal(false)
    if (openAssessment) {
      navigate('/assessment')
    }
  }

  // Calculate BMI dynamically
  const bmi =
    profileData.height && profileData.weight
      ? (
          Number(profileData.weight) /
          Math.pow(Number(profileData.height) / 100, 2)
        ).toFixed(1)
      : null

  function getBmiBadge(val) {
    if (!val) return null
    const n = Number(val)
    if (n < 18.5) return { text: 'Underweight', color: 'text-amber-300 border-amber-400/30 bg-amber-500/10' }
    if (n < 25) return { text: 'Normal BMI', color: 'text-bio-300 border-bio-400/30 bg-bio-500/10' }
    if (n < 30) return { text: 'Overweight', color: 'text-amber-300 border-amber-400/30 bg-amber-500/10' }
    return { text: 'Obese', color: 'text-rose-300 border-rose-400/30 bg-rose-500/10' }
  }

  // Journey check-in
  async function handleAddJourneyEntry(e) {
    e.preventDefault()
    const newEntry = {
      id: `${Date.now()}`,
      date: cycleLog.date,
      cycle_phase: cycleLog.cycle,
      mood: cycleLog.mood,
      sleep_hours: cycleLog.sleep_hours ? Number(cycleLog.sleep_hours) : null,
      symptoms: cycleLog.symptoms,
      notes: cycleLog.notes.trim(),
    }
    const updated = [newEntry, ...journeyEntries]
    setJourneyEntries(updated)
    localStorage.setItem('pcos_journey_entries', JSON.stringify(updated))

    if (user?.email) {
      await saveDailyLog(user.email, newEntry)
    }
    setJourneySavedNotice(true)
    setTimeout(() => setJourneySavedNotice(false), 2500)
    setCycleLog((prev) => ({ ...prev, notes: '' }))
  }

  async function handleDeleteJourneyEntry(id) {
    const updated = journeyEntries.filter((j) => j.id !== id)
    setJourneyEntries(updated)
    localStorage.setItem('pcos_journey_entries', JSON.stringify(updated))
    await deleteDailyLog(id)
  }

  if (!user) return null

  // Check if user has genuinely completed the clinical assessment
  const hasCompletedAssessment = Boolean(
    lastResult &&
    lastResult.id !== 'preview' &&
    (lastResult.classification || lastResult.scores)
  )

  // Active primary phenotype resolution
  const primaryPhenotype = lastResult?.classification?.primary_phenotype || 'metabolic'
  const dietCategory = profileData.diet_type === 'Non-Vegetarian' ? 'non_vegetarian' : 'vegetarian'
  const currentDietProtocol =
    dietProtocols[primaryPhenotype]?.[dietCategory] ||
    dietProtocols['metabolic']?.['vegetarian']
  const meta = PHENOTYPE_META[primaryPhenotype] || PHENOTYPE_META.metabolic

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-16 pt-24 sm:px-6">
      {/* ============================================================ */}
      {/* FIRST-TIME ONBOARDING MODAL                                  */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => dismissNotificationModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-lg rounded-2xl border border-bio-400/40 bg-slate-900/95 p-6 sm:p-8 shadow-2xl shadow-bio-500/20 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bio-500/20 text-bio-300 font-mono text-sm font-bold ring-1 ring-bio-400/30">
                  Dx
                </span>
                <div>
                  <span className="rounded-full border border-bio-400/40 bg-bio-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-bio-300">
                    Welcome, {user.full_name || 'Patient'}!
                  </span>
                  <h3 className="font-display text-xl font-bold text-white">
                    Complete Medical Details
                  </h3>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                To uncover your specific <strong>PCOS Phenotype</strong> (Metabolic, Hormonal, Inflammatory, or Adrenal) and unlock your personalized diet, exercise, and supplement protocols, please complete the questionnaire categories.
              </p>

              <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-bio-300 font-bold">•</span>
                  <span>7 Distinct Questionnaire Categories stored in dedicated Supabase tables</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-bio-300 font-bold">•</span>
                  <span>Each category has its own individual Save button</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-bio-300 font-bold">•</span>
                  <span>Cuisine-Specific Nutritional Protocol & Workout Plan</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => dismissNotificationModal(true)}
                  className="btn-primary flex-1 justify-center !py-3 text-sm font-semibold shadow-lg shadow-bio-500/25"
                >
                  Fill Medical Details Now
                </button>
                <button
                  type="button"
                  onClick={() => dismissNotificationModal(false)}
                  className="btn-ghost flex-1 justify-center !py-3 text-xs text-slate-400 hover:text-white"
                >
                  I'll do it later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* HEADER BANNER & PATIENT STATUS BAR                           */}
      {/* (Only 1 Sign Out button in SiteHeader; duplicate removed)    */}
      {/* ============================================================ */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.025em] text-[#0A192F] sm:text-4xl">
              Hello, {user.full_name || 'Patient'}
            </h1>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              Active Patient
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Personal Health Dashboard
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/assessment"
            className="btn-primary !px-5 !py-2.5 text-xs font-semibold rounded-full shadow-sm"
          >
            {hasCompletedAssessment ? 'Retake Assessment' : 'Take Assessment'}
          </Link>
        </div>
      </div>

      {/* Assessment Required Top Banner if not completed */}
      {!hasCompletedAssessment && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-3xl border border-rose-200 bg-rose-50/70 p-6 sm:p-8 shadow-xs"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E11D48] text-white shadow-sm font-bold text-lg">
                !
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
                    Assessment Required
                  </span>
                  <span className="text-xs text-rose-700 font-medium">To see results & monitor</span>
                </div>
                <h2 className="font-heading text-lg sm:text-xl font-semibold text-[#202321]">
                  Complete your clinical assessment to view diagnostic results.
                </h2>
                <p className="text-xs sm:text-sm text-[#626762] max-w-xl leading-relaxed">
                  Evaluates your biomarkers and symptoms to identify your PCOS root phenotype.
                </p>
              </div>
            </div>
            <Link
              to="/assessment"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#E11D48] px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#BE123C] active:scale-95 transition-all"
            >
              Take Assessment
            </Link>
          </div>
        </motion.div>
      )}

      {/* ============================================================ */}
      {/* SECTION HEADER: CLINICAL RESULTS & OVERVIEW                  */}
      {/* ============================================================ */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="chip mb-2 border-purple-200/80 bg-purple-50/70 text-purple-900 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
            Clinical Overview
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#202321]">
            Results & Monitoring
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#626762]">
            Biomarker diagnostics, root-cause phenotype, and clinical tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/diet"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/40 transition-all"
          >
            <span>Diet Protocol</span>
          </Link>
          <Link
            to="/cycle-log"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/40 transition-all"
          >
            <span>Daily Cycle Log</span>
          </Link>
          <Link
            to="/journey"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/40 transition-all"
          >
            <span>Daily Log</span>
          </Link>
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-2xs hover:border-rose-400 hover:bg-rose-100 transition-all"
          >
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Reports</span>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* OVERVIEW & HEALTH STATUS CONTENT                             */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
          {/* Quick Snapshot Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs text-slate-500">Diagnostic Status</p>
              <p className="mt-1 font-display text-base font-semibold text-slate-900">
                {hasCompletedAssessment ? (
                  <span className="text-emerald-600 font-bold">Assessed</span>
                ) : (
                  <span className="text-amber-600 font-bold">Assessment Pending</span>
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs text-slate-500">Primary Phenotype</p>
              <p className="mt-1 font-display text-base font-semibold capitalize text-slate-900">
                {hasCompletedAssessment ? (lastResult?.classification?.classification || 'Assessed') : 'Pending Intake'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs text-slate-500">Body Mass Index</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-base font-semibold text-slate-900">
                  {bmi ? `${bmi} kg/m²` : 'Not entered'}
                </span>
                {bmi && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getBmiBadge(bmi).color}`}>
                    {getBmiBadge(bmi).text}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs text-slate-500">Regional Cuisine</p>
              <p className="mt-1 font-display text-base font-semibold text-slate-900">
                {profileData.region_preference}
              </p>
            </div>
          </div>

          {!hasCompletedAssessment ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-[#E11D48] border border-rose-200 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-[#202321]">
                Complete Your Assessment
              </h2>
              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-[#626762] leading-relaxed">
                Unlock your phenotype breakdown, biomarker radar, and personalized nutrition plan.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  to="/assessment"
                  className="btn-primary !px-5 !py-2.5 text-xs font-semibold rounded-full shadow-md"
                >
                  Take Assessment
                </Link>
              </div>
            </div>
          ) : (
            /* Main Phenotype Report or Call to Action */
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 h-full flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                        Phenotypic Root Cause Analysis
                      </span>
                      {lastResult && (
                        <span className="text-xs text-slate-500">
                          Evaluated {new Date(lastResult.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                      {lastResult
                        ? `${meta.label} (${meta.tag})`
                        : 'Complete the Clinical Questionnaire'}
                    </h2>

                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {lastResult
                        ? meta.desc
                        : 'Our clinical rule engine uses your biomarkers and symptoms across 7 categories to classify you into one of 4 phenotypes: Metabolic, Hormonal, Inflammatory, or Adrenal.'}
                    </p>

                    {lastResult && (
                      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {['adrenal', 'hormonal', 'inflammatory', 'metabolic'].map((phenoKey) => {
                          const pct = lastResult.scores?.[phenoKey]?.percentage ?? 0
                          const isPrimary = primaryPhenotype === phenoKey
                          return (
                            <div
                              key={phenoKey}
                              className={`rounded-xl border p-3 text-center transition-all ${
                                isPrimary
                                  ? 'border-rose-300 bg-rose-50/70 shadow-xs'
                                  : 'border-slate-200 bg-slate-50/70'
                              }`}
                            >
                              <span className="text-xs font-semibold capitalize text-slate-600">
                                {phenoKey}
                              </span>
                              <p className="mt-1 font-display text-lg font-bold text-slate-900">
                                {pct}%
                              </p>
                              {isPrimary && (
                                <span className="text-[10px] uppercase font-bold text-rose-600">
                                  Primary Driver
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
                    {lastResult?.id ? (
                      <>
                        <Link
                          to={`/results/${lastResult.id}`}
                          className="btn-primary !px-5 !py-2.5 text-xs font-semibold"
                        >
                          View Full Clinical Report
                        </Link>
                        <Link
                          to="/diet"
                          className="btn-ghost !px-4 !py-2.5 text-xs text-purple-700 hover:text-purple-900 font-semibold"
                        >
                          View Nutrition Blueprint
                        </Link>
                      </>
                    ) : (
                      <Link
                        to="/assessment"
                        className="btn-primary !px-6 !py-3 text-xs font-semibold shadow-md"
                      >
                        Fill Clinical Assessment Questionnaire
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Radar Visualizer Card */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 flex flex-col items-center justify-center text-center h-full shadow-sm">
                  <h3 className="font-display text-sm font-semibold text-slate-800 mb-2">
                    Phenotypic Balance Radar
                  </h3>
                  {lastResult?.scores ? (
                    <PhenotypeRadar
                      scores={lastResult.scores}
                      primaryPhenotype={primaryPhenotype}
                    />
                  ) : (
                    <div className="py-16 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-500 font-mono text-xs">
                        Radar
                      </div>
                      <p className="mt-3 text-xs text-slate-400 max-w-xs">
                        Radar chart will illuminate once medical questionnaire answers or lab markers are saved.
                      </p>
                      <Link
                        to="/assessment"
                        className="btn-ghost mt-4 !px-4 !py-2 text-xs text-rose-600"
                      >
                        Fill Assessment Questionnaire
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ============================================================ */}
        {/* INTERACTIVE LOG ANALYSIS & GRAPH TRACKERS SECTION            */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-12 pt-10 border-t border-slate-200"
        >
          <UnifiedLogDashboard userEmail={user?.email} />
        </motion.div>
    </div>
  )
}
