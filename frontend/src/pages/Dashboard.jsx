import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../components/GlassCard.jsx'
import PhenotypeRadar from '../components/PhenotypeRadar.jsx'
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

    // Load last result from cache if available
    let cachedResult = null
    const cached = sessionStorage.getItem('pcos_last_result')
    if (cached) {
      try {
        cachedResult = JSON.parse(cached)
        setLastResult(cachedResult)
      } catch (e) {
        console.error(e)
      }
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

      // If no result exists yet, create baseline from pipeline so the results are always visible
      if (!cachedResult) {
        const baseline = runPipeline({}, cur.region_preference || 'South Indian', cur.diet_type || 'Vegetarian')
        setLastResult({
          id: 'preview',
          created_at: new Date().toISOString(),
          ...baseline,
        })
      }
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
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bio-500/20 text-2xl ring-1 ring-bio-400/30">
                  🩺
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
                  <span className="text-bio-300 font-bold">✓</span>
                  <span>7 Distinct Questionnaire Categories stored in dedicated Supabase tables</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-bio-300 font-bold">✓</span>
                  <span>Each category has its own individual Save button</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-bio-300 font-bold">✓</span>
                  <span>Cuisine-Specific Nutritional Protocol & Workout Plan</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => dismissNotificationModal(true)}
                  className="btn-primary flex-1 justify-center !py-3 text-sm font-semibold shadow-lg shadow-bio-500/25"
                >
                  Fill Medical Details Now →
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
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Hello, {user.full_name || 'Patient'}
            </h1>
            <span className="rounded-full border border-bio-400/30 bg-bio-500/10 px-3 py-1 text-xs font-semibold text-bio-300">
              Active Patient
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Personal PCOS Health Dashboard & Clinical Decision Support
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/assessment"
            className="btn-primary !px-4 !py-2 text-xs font-semibold"
          >
            {lastResult ? '↻ Update Answers in Assessment' : '▶ Start Clinical Assessment'}
          </Link>
        </div>
      </div>

      {/* Pending Medical Details Banner if not completed */}
      {!lastResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:p-5"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-200">
                PCOS Phenotype Assessment Pending
              </p>
              <p className="text-xs text-amber-300/80">
                Complete your clinical questions in the Assessment section to unlock your full diagnostic results and personalized nutrition plan.
              </p>
            </div>
          </div>
          <Link
            to="/assessment"
            className="btn-primary shrink-0 !bg-amber-400 !text-slate-950 !px-4 !py-2 text-xs font-bold hover:!bg-amber-300"
          >
            Open Assessment Questionnaire →
          </Link>
        </motion.div>
      )}

      {/* ============================================================ */}
      {/* NAVBAR WITH DIFFERENT CATEGORIES (RESULTS ONLY)             */}
      {/* ============================================================ */}
      <div className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {[
          { id: 'overview', label: 'Clinical Results & Overview', icon: '📊' },
          { id: 'diet', label: 'Diet & Lifestyle Protocol', icon: '🥗' },
          { id: 'journey', label: 'Daily Cycle Log', icon: '📅' },
          { id: 'history', label: 'Past Reports History', icon: '📋' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-bio-500/20 text-bio-200 border border-bio-400/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: OVERVIEW & HEALTH STATUS                              */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Quick Snapshot Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <GlassCard className="p-4">
              <p className="text-xs text-slate-400">Diagnostic Status</p>
              <p className="mt-1 font-display text-base font-semibold text-white">
                {lastResult ? (
                  <span className="text-bio-300">✓ Assessed</span>
                ) : (
                  <span className="text-amber-300">Action Required</span>
                )}
              </p>
            </GlassCard>

            <GlassCard className="p-4">
              <p className="text-xs text-slate-400">Primary Phenotype</p>
              <p className="mt-1 font-display text-base font-semibold capitalize text-white">
                {lastResult?.classification?.classification || 'Pending Intake'}
              </p>
            </GlassCard>

            <GlassCard className="p-4">
              <p className="text-xs text-slate-400">Body Mass Index</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-base font-semibold text-white">
                  {bmi ? `${bmi} kg/m²` : 'Not entered'}
                </span>
                {bmi && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getBmiBadge(bmi).color}`}>
                    {getBmiBadge(bmi).text}
                  </span>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <p className="text-xs text-slate-400">Regional Cuisine</p>
              <p className="mt-1 font-display text-base font-semibold text-white">
                {profileData.region_preference}
              </p>
            </GlassCard>
          </div>

          {/* Main Phenotype Report or Call to Action */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <GlassCard strong className="p-6 sm:p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-bio-400/30 bg-bio-500/10 px-3 py-1 text-xs font-semibold text-bio-200">
                      Phenotypic Root Cause Analysis
                    </span>
                    {lastResult && (
                      <span className="text-xs text-slate-400">
                        Evaluated {new Date(lastResult.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
                    {lastResult
                      ? `${meta.label} (${meta.tag})`
                      : 'Complete the Clinical Questionnaire'}
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
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
                                ? 'border-bio-400/50 bg-bio-500/10 shadow-glow'
                                : 'border-white/5 bg-white/[0.02]'
                            }`}
                          >
                            <span className="text-xs font-semibold capitalize text-slate-300">
                              {phenoKey}
                            </span>
                            <p className="mt-1 font-display text-lg font-bold text-white">
                              {pct}%
                            </p>
                            {isPrimary && (
                              <span className="text-[10px] uppercase font-bold text-bio-300">
                                Primary Driver
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap gap-3 border-t border-white/5 pt-6">
                  {lastResult?.id ? (
                    <>
                      <Link
                        to={`/results/${lastResult.id}`}
                        className="btn-primary !px-5 !py-2.5 text-xs font-semibold"
                      >
                        View Full Clinical Report →
                      </Link>
                      <button
                        type="button"
                        onClick={() => setActiveTab('diet')}
                        className="btn-ghost !px-4 !py-2.5 text-xs text-bio-300"
                      >
                        View Nutrition Blueprint
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/assessment"
                      className="btn-primary !px-6 !py-3 text-xs font-semibold shadow-lg shadow-bio-500/20"
                    >
                      Fill Clinical Assessment Questionnaire →
                    </Link>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Radar Visualizer Card */}
            <div className="lg:col-span-5">
              <GlassCard className="p-6 flex flex-col items-center justify-center text-center h-full">
                <h3 className="font-display text-sm font-semibold text-slate-200 mb-2">
                  Phenotypic Balance Radar
                </h3>
                {lastResult?.scores ? (
                  <PhenotypeRadar
                    scores={lastResult.scores}
                    primaryPhenotype={primaryPhenotype}
                  />
                ) : (
                  <div className="py-16 text-center">
                    <span className="text-4xl">🕸️</span>
                    <p className="mt-3 text-xs text-slate-400 max-w-xs">
                      Radar will illuminate once medical questionnaire answers or lab markers are saved.
                    </p>
                    <Link
                      to="/assessment"
                      className="btn-ghost mt-4 !px-4 !py-2 text-xs text-bio-300"
                    >
                      Fill Assessment Questionnaire →
                    </Link>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: DIET & LIFESTYLE PROTOCOL                             */}
      {/* ============================================================ */}
      {activeTab === 'diet' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <GlassCard className="p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
              <div>
                <span className="rounded-full border border-bio-400/30 bg-bio-500/10 px-3 py-0.5 text-xs font-semibold text-bio-300 uppercase">
                  {meta.label} Protocol
                </span>
                <h2 className="mt-2 font-display text-2xl font-bold text-white">
                  Evidence-Based Clinical Protocol
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Tailored to your {profileData.region_preference} cuisine and {profileData.diet_type} preferences. Saved to <code>lifestyle_plans</code> table.
                </p>
              </div>

              {/* Dynamic Cuisine & Diet Switcher */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={profileData.region_preference}
                  onChange={(e) => {
                    const newRegion = e.target.value
                    setProfileData({ ...profileData, region_preference: newRegion })
                    if (user?.id) updatePatientProfile(user.id, { region_preference: newRegion })
                    if (user?.email) {
                      saveLifestylePlan(user.email, {
                        region_preference: newRegion,
                        diet_type: profileData.diet_type,
                        primary_phenotype: primaryPhenotype,
                        dietary_strategy: currentDietProtocol?.strategy,
                        exercise_routine: currentDietProtocol?.exercise,
                        supplement_roadmap: currentDietProtocol?.supplements,
                        sample_day: currentDietProtocol?.sample_day || {},
                      })
                    }
                  }}
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-bio-400 focus:outline-none"
                >
                  <option value="South Indian">South Indian</option>
                  <option value="North Indian">North Indian</option>
                  <option value="East Indian">East Indian</option>
                  <option value="West Indian">West Indian</option>
                </select>

                <select
                  value={profileData.diet_type}
                  onChange={(e) => {
                    const newDiet = e.target.value
                    setProfileData({ ...profileData, diet_type: newDiet })
                    if (user?.id) updatePatientProfile(user.id, { diet_type: newDiet })
                    if (user?.email) {
                      saveLifestylePlan(user.email, {
                        region_preference: profileData.region_preference,
                        diet_type: newDiet,
                        primary_phenotype: primaryPhenotype,
                        dietary_strategy: currentDietProtocol?.strategy,
                        exercise_routine: currentDietProtocol?.exercise,
                        supplement_roadmap: currentDietProtocol?.supplements,
                        sample_day: currentDietProtocol?.sample_day || {},
                      })
                    }
                  }}
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-bio-400 focus:outline-none"
                >
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                </select>
              </div>
            </div>

            {/* Core Strategy Cards */}
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-bio-300">
                  🥗 Nutritional Strategy
                </h4>
                <p className="mt-3 text-xs leading-relaxed text-slate-300">
                  {currentDietProtocol?.strategy ||
                    'Low glycemic carbohydrates paired with clean protein and healthy fats to stabilize insulin surges and support hormone synthesis.'}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  🏃 Exercise Routine
                </h4>
                <p className="mt-3 text-xs leading-relaxed text-slate-300">
                  {currentDietProtocol?.exercise ||
                    'Zone 2 steady-state aerobic conditioning (30-40 mins) combined with 3 weekly resistance training sessions to stimulate GLUT-4 receptor activity.'}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  💊 Targeted Supplements
                </h4>
                <p className="mt-3 text-xs leading-relaxed text-slate-300">
                  {currentDietProtocol?.supplements ||
                    'Myo-Inositol + D-Chiro Inositol (40:1 ratio), Magnesium Glycinate, and Vitamin D3 (2000 IU) to promote ovulatory regularity.'}
                </p>
              </div>
            </div>

            {/* Meal Plan Blueprint */}
            {currentDietProtocol?.sample_day && (
              <div className="mt-8 border-t border-white/5 pt-6">
                <h3 className="font-display text-lg font-semibold text-white mb-4">
                  Full Day Meal Blueprint ({profileData.region_preference} • {profileData.diet_type})
                </h3>
                <div className="grid gap-3 sm:grid-cols-4">
                  {['breakfast', 'lunch', 'snack', 'dinner'].map((meal) => (
                    <div
                      key={meal}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider text-bio-300">
                        {meal}
                      </span>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        {currentDietProtocol.sample_day[meal] || 'Balanced macro portion.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}



      {/* ============================================================ */}
      {/* TAB 5: DAILY CYCLE & SYMPTOMS LOG                            */}
      {/* ============================================================ */}
      {activeTab === 'journey' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <GlassCard className="p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-white">
              Daily Cycle & Wellness Journal
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Log daily menstrual phases, sleep quality, and physical symptoms. Saved to the <code>daily_logs</code> table in Supabase.
            </p>

            <form onSubmit={handleAddJourneyEntry} className="mt-6 space-y-4 border-b border-white/10 pb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={cycleLog.date}
                    onChange={(e) => setCycleLog({ ...cycleLog, date: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cycle Phase</label>
                  <select
                    value={cycleLog.cycle}
                    onChange={(e) => setCycleLog({ ...cycleLog, cycle: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value="Period">Period / Menstruation</option>
                    <option value="Fertile window">Follicular / Fertile Window</option>
                    <option value="Luteal phase">Luteal Phase</option>
                    <option value="Not tracking">Not Tracking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sleep (hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={cycleLog.sleep_hours}
                    onChange={(e) => setCycleLog({ ...cycleLog, sleep_hours: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Daily Notes</label>
                <textarea
                  rows={2}
                  placeholder="How are your energy levels, food cravings, or mood today?"
                  value={cycleLog.notes}
                  onChange={(e) => setCycleLog({ ...cycleLog, notes: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-bio-400"
                />
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" className="btn-primary !px-5 !py-2 text-xs font-semibold">
                  Save Today's Check-in
                </button>
                {journeySavedNotice && (
                  <span className="text-xs text-bio-300 font-semibold">✓ Saved to daily_logs table!</span>
                )}
              </div>
            </form>

            <div className="mt-6">
              <h3 className="font-display text-sm font-semibold text-slate-200 mb-3">
                Recent Journal Entries
              </h3>
              {journeyEntries.length === 0 ? (
                <p className="text-xs text-slate-500">No entries yet. Save your first check-in above.</p>
              ) : (
                <div className="space-y-2">
                  {journeyEntries.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.01] p-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{entry.date}</span>
                        <span className="text-slate-400 ml-2">({entry.cycle_phase || entry.cycle} • {entry.sleep_hours || '-'}h sleep)</span>
                        {entry.notes && <p className="text-slate-300 mt-1">{entry.notes}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteJourneyEntry(entry.id)}
                        className="text-slate-500 hover:text-rose-400 text-[11px]"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: PAST SUBMISSIONS & HISTORY                            */}
      {/* ============================================================ */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Assessment History
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  All past diagnostic assessments saved in your Supabase <code>submissions</code> table.
                </p>
              </div>
              <Link
                to="/assessment"
                className="btn-primary !px-4 !py-2 text-xs font-semibold"
              >
                + New Assessment
              </Link>
            </div>

            {loadingSubmissions ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading history from Supabase…
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-slate-400">No records found yet.</p>
                <Link
                  to="/assessment"
                  className="btn-primary mt-4 inline-flex !px-5 !py-2 text-xs font-semibold"
                >
                  Take Your First Assessment
                </Link>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {submissions.map((sub, idx) => {
                  const date = sub.created_at
                    ? new Date(sub.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recent'
                  const diagnosis =
                    sub.classification?.classification || 'Diagnostic Complete'

                  return (
                    <div
                      key={sub.id || idx}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:flex-row sm:items-center hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bio-400/30 bg-bio-500/10 font-mono text-xs font-bold text-bio-300">
                          #{submissions.length - idx}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{diagnosis}</p>
                          <span className="text-xs text-slate-400">Taken on {date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          to={`/results/${sub.id}`}
                          className="btn-ghost !px-4 !py-2 text-xs text-bio-300 hover:text-white"
                        >
                          View Diagnostic Report →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}
    </div>
  )
}
