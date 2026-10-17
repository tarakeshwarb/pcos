import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../components/GlassCard.jsx'
import QuestionCard from '../components/QuestionCard.jsx'
import {
  getCurrentUser,
  saveAssessmentCategory,
  fetchAllAssessmentCategories,
  submitAssessment,
  ASSESSMENT_CATEGORY_TABLES,
} from '../lib/api.js'
import { questionnaire, liveBmi, runPipeline } from '../lib/ruleEngine.js'
import { extractReportData } from '../lib/reportExtractor.js'
import { PCOS_CASE, HEALTHY_CASE } from '../data/demoProfiles.js'

// ============================================================
// 7 REAL Questionnaire Categories from questionnaire.json
// mapped directly to dedicated Supabase assessment tables
// ============================================================
export const ASSESSMENT_SECTIONS = [
  {
    key: 'first_line',
    number: 1,
    title: 'First-Line Testing',
    subtitle: 'Rotterdam Diagnostic Gate',
    short: 'First-Line',
    icon: '🔬',
    desc: 'Rotterdam international consensus criteria: irregular menstrual cycles, clinical or biochemical androgen excess, and polycystic ovarian morphology.',
    table: 'assessment_first_line',
    questions: questionnaire.first_line?.questions || [],
  },
  {
    key: 'metabolic',
    number: 2,
    title: 'Metabolic Phenotype Axis',
    subtitle: 'Insulin Resistance & Glucose Dynamics',
    short: 'Metabolic',
    icon: '⚡',
    desc: 'Evaluates fasting insulin, HOMA-IR, glucose tolerance, lipid ratios, visceral weight distribution, and acanthosis nigricans.',
    table: 'assessment_metabolic',
    questions: questionnaire.phenotypes?.metabolic?.questions || [],
  },
  {
    key: 'hormonal',
    number: 3,
    title: 'Hormonal Phenotype Axis',
    subtitle: 'Ovarian Hyperandrogenism & LH/FSH',
    short: 'Hormonal',
    icon: '🧬',
    desc: 'Evaluates LH:FSH ratio, total & free testosterone, SHBG, hirsutism (Ferriman-Gallwey scale), and post-pill amenorrhea.',
    table: 'assessment_hormonal',
    questions: questionnaire.phenotypes?.hormonal?.questions || [],
  },
  {
    key: 'adrenal',
    number: 4,
    title: 'Adrenal Phenotype Axis',
    subtitle: 'Stress-Driven HPA & Cortisol',
    short: 'Adrenal',
    icon: '🧘',
    desc: 'Evaluates DHEA-S, morning cortisol, resting vitals, Perceived Stress Scale (PSS-10), and sleep disruption.',
    table: 'assessment_adrenal',
    questions: questionnaire.phenotypes?.adrenal?.questions || [],
  },
  {
    key: 'inflammatory',
    number: 5,
    title: 'Inflammatory Phenotype Axis',
    subtitle: 'Systemic Inflammation & Gut Dysbiosis',
    short: 'Inflammatory',
    icon: '🛡️',
    desc: 'Evaluates hs-CRP, ESR, gut permeability/IBS symptoms, food intolerances, chronic fatigue, and joint pain.',
    table: 'assessment_inflammatory',
    questions: questionnaire.phenotypes?.inflammatory?.questions || [],
  },
  {
    key: 'mitochondrial',
    number: 6,
    title: 'Energy Screen (Mitochondrial)',
    subtitle: 'Cellular Bioenergetics & Fatigue',
    short: 'Energy Screen',
    icon: '🔋',
    desc: 'Screens for cellular mitochondrial depletion, post-meal brain fog, sudden energy crashes, and poor exercise recovery.',
    table: 'assessment_mitochondrial',
    questions: questionnaire.mitochondrial_axis?.questions || [],
  },
  {
    key: 'exclusions',
    number: 7,
    title: 'Exclusion Criteria & Differentials',
    subtitle: 'Ruling Out Mimicking Conditions',
    short: 'Exclusions',
    icon: '🩺',
    desc: 'Rules out mimicking conditions including thyroid disorders (TSH), hyperprolactinemia, and congenital adrenal hyperplasia.',
    table: 'assessment_exclusions',
    questions: questionnaire.exclusions?.questions || [],
  },
]

// Identify the primary step for shared questions so they sync across sections
const PRIMARY_STEP_FOR_SHARED_FIELD = {}
for (const sec of ASSESSMENT_SECTIONS) {
  for (const q of sec.questions || []) {
    if (q.shared_field && !(q.shared_field in PRIMARY_STEP_FOR_SHARED_FIELD)) {
      PRIMARY_STEP_FOR_SHARED_FIELD[q.shared_field] = sec.key
    }
  }
}

export default function Questionnaire() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [currentUser, setCurrentUser] = useState(null)
  const [answers, setAnswers] = useState({})
  const [activeCategoryKey, setActiveCategoryKey] = useState(
    searchParams.get('category') || 'first_line'
  )

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [savingCategory, setSavingCategory] = useState(null)
  const [saveNotices, setSaveNotices] = useState({})
  const [submittingFinal, setSubmittingFinal] = useState(false)
  const [demoProfile, setDemoProfile] = useState(null)

  // Lab report upload state
  const [uploadStatus, setUploadStatus] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [extractedFlags, setExtractedFlags] = useState({})
  const [showUploadModal, setShowUploadModal] = useState(false)

  // 1. Initial Load: user demographics, Supabase category tables, & cache
  useEffect(() => {
    const cur = getCurrentUser()
    setCurrentUser(cur)

    const initialAnswers = {}
    if (cur?.demographics?.height) initialAnswers.height_cm = Number(cur.demographics.height)
    if (cur?.demographics?.weight) initialAnswers.weight_kg = Number(cur.demographics.weight)

    // Check demo profile
    const demoKey = sessionStorage.getItem('pcos_demo_profile')
    if (demoKey === 'pcos' || demoKey === 'healthy') {
      const profile = demoKey === 'pcos' ? PCOS_CASE : HEALTHY_CASE
      setAnswers({ ...initialAnswers, ...profile.answers })
      setDemoProfile(demoKey)
      setLoadingInitial(false)
      return
    }

    // Check extracted report
    const extracted = sessionStorage.getItem('pcos_extracted_report')
    if (extracted) {
      try {
        const flagged = JSON.parse(extracted)
        for (const [key, { value }] of Object.entries(flagged)) {
          initialAnswers[key] = value
        }
        setExtractedFlags(flagged)
      } catch {}
    }

    if (cur?.email) {
      fetchAllAssessmentCategories(cur.email)
        .then(({ unified }) => {
          if (unified && Object.keys(unified).length > 0) {
            setAnswers((prev) => ({ ...initialAnswers, ...prev, ...unified }))
          } else {
            setAnswers((prev) => ({ ...initialAnswers, ...prev }))
          }
        })
        .finally(() => {
          setLoadingInitial(false)
        })
    } else {
      setAnswers((prev) => ({ ...initialAnswers, ...prev }))
      setLoadingInitial(false)
    }
  }, [])

  // Sync active category with URL param
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat && ASSESSMENT_SECTIONS.some((s) => s.key === cat)) {
      setActiveCategoryKey(cat)
    }
  }, [searchParams])

  // Answer change handler
  const handleAnswerChange = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  // Active section object and index
  const activeSectionIndex = ASSESSMENT_SECTIONS.findIndex(
    (s) => s.key === activeCategoryKey
  )
  const activeSection = ASSESSMENT_SECTIONS[activeSectionIndex] || ASSESSMENT_SECTIONS[0]

  // Category progress calculator
  function getCategoryProgress(section, currentAnswers) {
    let totalFields = 0
    let filledFields = 0
    for (const q of section.questions) {
      if (q.fields) {
        for (const f of q.fields) {
          totalFields++
          const val = currentAnswers[f.key]
          if (val !== undefined && val !== '' && val !== null) {
            filledFields++
          }
        }
      }
    }
    return {
      total: totalFields,
      filled: filledFields,
      isComplete: totalFields > 0 && filledFields === totalFields,
      hasAnswers: filledFields > 0,
      percentage: totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0,
    }
  }

  // Overall progress across all 7 categories
  const overallProgress = useMemo(() => {
    let total = 0
    let filled = 0
    for (const sec of ASSESSMENT_SECTIONS) {
      const p = getCategoryProgress(sec, answers)
      total += p.total
      filled += p.filled
    }
    return {
      total,
      filled,
      percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
    }
  }, [answers])

  // Jump to specific category
  function jumpToCategory(sectionKey) {
    setActiveCategoryKey(sectionKey)
    setSearchParams({ category: sectionKey })
    setTimeout(() => {
      document.getElementById('questions-container')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 40)
  }

  // Next and Previous Category helpers
  function handleNextCategory() {
    if (activeSectionIndex < ASSESSMENT_SECTIONS.length - 1) {
      const nextKey = ASSESSMENT_SECTIONS[activeSectionIndex + 1].key
      jumpToCategory(nextKey)
    }
  }

  function handlePrevCategory() {
    if (activeSectionIndex > 0) {
      const prevKey = ASSESSMENT_SECTIONS[activeSectionIndex - 1].key
      jumpToCategory(prevKey)
    }
  }

  // Save an individual category to its dedicated Supabase table
  async function handleSaveCategory(sectionKey, andJumpToNext = false) {
    const email = currentUser?.email || 'guest@pcos.local'
    const section = ASSESSMENT_SECTIONS.find((s) => s.key === sectionKey)
    if (!section) return

    setSavingCategory(sectionKey)
    setSaveNotices((prev) => ({
      ...prev,
      [sectionKey]: { type: 'loading', text: `Saving to ${section.table}…` },
    }))

    // Extract only this category's field values
    const categoryAnswers = {}
    for (const q of section.questions) {
      if (q.fields) {
        for (const f of q.fields) {
          if (answers[f.key] !== undefined && answers[f.key] !== '') {
            categoryAnswers[f.key] = answers[f.key]
          }
        }
      }
    }

    try {
      const res = await saveAssessmentCategory(email, sectionKey, categoryAnswers)
      if (res.success) {
        setSaveNotices((prev) => ({
          ...prev,
          [sectionKey]: {
            type: 'success',
            text: `✓ Saved answers to ${section.table} table in Supabase!`,
          },
        }))
      } else {
        setSaveNotices((prev) => ({
          ...prev,
          [sectionKey]: {
            type: 'success',
            text: `✓ Saved locally in your browser.`,
          },
        }))
      }
    } catch (e) {
      setSaveNotices((prev) => ({
        ...prev,
        [sectionKey]: {
          type: 'error',
          text: `Saved locally.`,
        },
      }))
    } finally {
      setSavingCategory(null)
    }

    setTimeout(() => {
      setSaveNotices((prev) => ({ ...prev, [sectionKey]: null }))
    }, 4500)

    if (andJumpToNext) {
      if (activeSectionIndex < ASSESSMENT_SECTIONS.length - 1) {
        handleNextCategory()
      } else {
        // If on the last category, proceed to Dashboard results
        handleFinalSubmit()
      }
    }
  }

  // Final Submission: saves last category, computes diagnosis, and opens Dashboard results
  async function handleFinalSubmit() {
    setSubmittingFinal(true)
    const email = currentUser?.email || 'guest@pcos.local'

    // 1. Save active category first
    const section = activeSection
    const categoryAnswers = {}
    for (const q of section.questions) {
      if (q.fields) {
        for (const f of q.fields) {
          if (answers[f.key] !== undefined && answers[f.key] !== '') {
            categoryAnswers[f.key] = answers[f.key]
          }
        }
      }
    }
    await saveAssessmentCategory(email, section.key, categoryAnswers)

    // 2. Compute full diagnostic pipeline & submit
    try {
      const region = currentUser?.region_preference || 'South Indian'
      const diet = currentUser?.diet_type || 'Vegetarian'
      const payload = {
        email,
        demographics: {
          height: answers.height_cm || currentUser?.demographics?.height || null,
          weight: answers.weight_kg || currentUser?.demographics?.weight || null,
        },
        answers,
        region_preference: region,
        diet_type: diet,
      }
      const result = await submitAssessment(payload)
      sessionStorage.setItem('pcos_last_result', JSON.stringify(result))

      // Navigate to Dashboard to view results!
      navigate('/dashboard?tab=overview')
    } catch (err) {
      console.error(err)
      navigate('/dashboard?tab=overview')
    } finally {
      setSubmittingFinal(false)
    }
  }

  // Handle Lab Report Upload & OCR
  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploadStatus('Reading lab report locally in your browser…')
    try {
      const extracted = await extractReportData(file)
      const count = Object.keys(extracted).length
      if (count > 0) {
        setUploadStatus(`Extracted ${count} biomarkers! Pre-filled into your questionnaire questions.`)
        setExtractedFlags(extracted)
        setAnswers((prev) => {
          const next = { ...prev }
          for (const [key, { value }] of Object.entries(extracted)) {
            next[key] = value
          }
          return next
        })
      } else {
        setUploadStatus('Report scanned successfully. No standard PCOS biomarkers detected.')
      }
    } catch (err) {
      console.error(err)
      setUploadError('Could not parse file. You can enter values directly in each category.')
      setUploadStatus(null)
    }
  }

  // Load Demo Profiles
  function loadDemo(profileKey) {
    const profile = profileKey === 'pcos' ? PCOS_CASE : HEALTHY_CASE
    sessionStorage.setItem('pcos_registration', JSON.stringify(profile.registration))
    sessionStorage.setItem('pcos_demo_profile', profileKey)
    setAnswers((prev) => ({ ...prev, ...profile.answers }))
    setDemoProfile(profileKey)
  }

  // Live BMI if on metabolic category
  const bmi =
    activeSection.key === 'metabolic'
      ? liveBmi(answers.height_cm, answers.weight_kg)
      : null

  const currentNotice = saveNotices[activeSection.key]

  return (
    <div className="relative min-h-screen">
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 pt-20 sm:pt-24">
        {/* ============================================================ */}
        {/* TOP CONTROLS & DEMO SHORTCUTS                               */}
        {/* ============================================================ */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-bio-400 animate-pulse" />
            <span>
              {currentUser?.email ? (
                <>
                  Logged in as <strong className="text-white">{currentUser.email}</strong> · Synced to Supabase tables
                </>
              ) : (
                'Medical Assessment Center'
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {demoProfile && (
              <span className="rounded-full border border-bio-400/30 bg-bio-500/10 px-3 py-1 text-xs text-bio-200">
                Demo: {demoProfile === 'pcos' ? 'PCOS Profile' : 'Healthy Profile'}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadDemo('pcos')}
              className="btn-ghost !px-3 !py-1.5 text-xs text-slate-300 hover:text-bio-200"
              title="Fills every question with a PCOS-positive profile"
            >
              ⚡ Fill PCOS Case
            </button>
            <button
              type="button"
              onClick={() => loadDemo('healthy')}
              className="btn-ghost !px-3 !py-1.5 text-xs text-slate-300 hover:text-bio-200"
              title="Fills every question with normal values"
            >
              ⚡ Fill Healthy Case
            </button>
            <label className="btn-ghost !px-3 !py-1.5 text-xs text-bio-300 hover:text-white cursor-pointer border border-bio-400/30">
              📄 Upload Blood Report (OCR)
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* OCR Status Banner */}
        {uploadStatus && (
          <div className="mb-6 rounded-xl border border-bio-400/40 bg-bio-500/10 px-4 py-3 text-xs text-bio-200 flex items-center justify-between">
            <span>{uploadStatus}</span>
            <button onClick={() => setUploadStatus(null)} className="text-slate-400 hover:text-white font-bold ml-3">✕</button>
          </div>
        )}
        {uploadError && (
          <div className="mb-6 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 flex items-center justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="text-slate-400 hover:text-white font-bold ml-3">✕</button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TITLE & OVERALL PROGRESS                                     */}
        {/* ============================================================ */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="chip mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-bio-300" />
                7 Clinical Questionnaire Categories
              </span>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Clinical PCOS Assessment
              </h1>
              <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                Jump between any category below to check or update your answers. Each category has its own individual <strong>Save</strong> button that records data directly into its dedicated Supabase table. When finished, view your comprehensive results on the Dashboard.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="btn-ghost shrink-0 self-start sm:self-auto !px-4 !py-2.5 text-xs font-semibold text-bio-300 hover:text-white border border-bio-400/30"
              title="Go to Dashboard to view calculated results"
            >
              📊 View Results on Dashboard →
            </Link>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-medium">
                Overall Assessment Progress
              </span>
              <span className="font-mono text-bio-300 font-bold">
                {overallProgress.filled} / {overallProgress.total} Questions Answered ({overallProgress.percentage}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-bio-400 to-plasma-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(4, overallProgress.percentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CATEGORY JUMPING NAVIGATION PILLS                            */}
        {/* (Allows user to jump and check each category's questions)    */}
        {/* ============================================================ */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Jump to Category to Check / Edit Questions:
            </p>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Click any pill to inspect questions
            </span>
          </div>

          {/* Horizontal Category Pill List */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {ASSESSMENT_SECTIONS.map((sec) => {
              const prog = getCategoryProgress(sec, answers)
              const isActive = sec.key === activeCategoryKey

              return (
                <button
                  type="button"
                  key={sec.key}
                  onClick={() => jumpToCategory(sec.key)}
                  className={`relative flex flex-col justify-between rounded-xl p-3 text-left transition-all ${
                    isActive
                      ? 'border-2 border-bio-400 bg-bio-500/20 shadow-lg shadow-bio-500/20'
                      : 'border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-base">{sec.icon}</span>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        prog.isComplete
                          ? 'border border-bio-400/40 bg-bio-500/20 text-bio-300'
                          : prog.hasAnswers
                          ? 'border border-amber-400/30 bg-amber-500/10 text-amber-300'
                          : 'border border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      {prog.isComplete ? `✓ ${prog.filled}/${prog.total}` : `${prog.filled}/${prog.total}`}
                    </span>
                  </div>

                  <div>
                    <span className="block font-mono text-[10px] text-slate-400">
                      Step {sec.number}
                    </span>
                    <span
                      className={`block text-xs font-semibold leading-tight line-clamp-1 ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {sec.short}
                    </span>
                  </div>

                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-bio-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick-Jump Dropdown (Convenient on Mobile) */}
          <div className="mt-3 flex items-center gap-2 sm:hidden">
            <span className="text-xs text-slate-400 shrink-0">Quick jump:</span>
            <select
              value={activeCategoryKey}
              onChange={(e) => jumpToCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
            >
              {ASSESSMENT_SECTIONS.map((sec) => {
                const prog = getCategoryProgress(sec, answers)
                return (
                  <option key={sec.key} value={sec.key}>
                    {sec.number}. {sec.title} ({prog.filled}/{prog.total} answered)
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ACTIVE CATEGORY QUESTIONS CONTAINER                          */}
        {/* ============================================================ */}
        <div id="questions-container" className="scroll-mt-24 space-y-6">
          {/* Active Category Header Card */}
          <GlassCard className="p-6 sm:p-7 border-l-4 border-l-bio-400">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-bio-400/40 bg-bio-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-bio-300">
                    Category {activeSection.number} of 7
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    Table: <code className="text-bio-200">{activeSection.table}</code>
                  </span>
                </div>
                <h2 className="mt-2 font-display text-2xl font-bold text-white flex items-center gap-2.5">
                  <span>{activeSection.icon}</span>
                  <span>{activeSection.title}</span>
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  {activeSection.desc}
                </p>
              </div>

              {/* Individual Save Button at Top of Category */}
              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSaveCategory(activeSection.key)}
                  disabled={savingCategory === activeSection.key}
                  className="btn-primary !px-5 !py-2.5 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bio-500/20"
                >
                  {savingCategory === activeSection.key ? (
                    <>
                      <Spinner /> Saving to {activeSection.table}…
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save {activeSection.short} Answers</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] text-slate-400">
                  Saves only this category to Supabase
                </span>
              </div>
            </div>

            {/* Save Notification Banner */}
            {currentNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 rounded-xl border px-4 py-2.5 text-xs font-medium flex items-center justify-between ${
                  currentNotice.type === 'error'
                    ? 'border-rose-400/40 bg-rose-500/10 text-rose-300'
                    : 'border-bio-400/40 bg-bio-500/10 text-bio-200'
                }`}
              >
                <span>{currentNotice.text}</span>
                <span className="text-bio-300 font-mono text-[10px]">Cloud Synced</span>
              </motion.div>
            )}

            {/* Live BMI display if Metabolic category */}
            {bmi && (
              <div className="mt-5 flex items-center justify-between rounded-xl border border-bio-400/30 bg-bio-500/5 p-4">
                <div>
                  <p className="text-xs text-slate-400">Computed Body Mass Index (Live)</p>
                  <p className="font-display text-lg font-bold text-white">
                    {bmi.bmi} <span className="text-sm font-normal text-slate-400">kg/m²</span>
                  </p>
                </div>
                <span className="rounded-full border border-bio-400/40 bg-bio-500/20 px-3 py-1 text-xs font-semibold text-bio-300">
                  {bmi.category}
                </span>
              </div>
            )}
          </GlassCard>

          {/* Active Category Questions List */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {activeSection.questions.length === 0 ? (
                <GlassCard className="p-8 text-center text-slate-400 text-sm">
                  No questions found in this category.
                </GlassCard>
              ) : (
                activeSection.questions.map((q, i) => {
                  const carriedOver = Boolean(
                    q.shared_field &&
                    answers[q.shared_field] !== undefined &&
                    activeSection.key !== PRIMARY_STEP_FOR_SHARED_FIELD[q.shared_field]
                  )
                  const reportFlag = q.fields?.map((f) => extractedFlags[f.key]).find(Boolean)

                  return (
                    <QuestionCard
                      key={q.id || i}
                      question={q}
                      index={i}
                      answers={answers}
                      onChange={handleAnswerChange}
                      carriedOver={carriedOver}
                      reportFlag={reportFlag}
                    />
                  )
                })
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom Action & Navigation Footer */}
          <GlassCard className="p-5 sm:p-6 mt-8">
            {/* Inline Save Notice */}
            {currentNotice && (
              <div className="mb-4 rounded-xl border border-bio-400/40 bg-bio-500/10 px-4 py-2.5 text-xs text-bio-200">
                {currentNotice.text}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Back / Previous Category Button */}
              <button
                type="button"
                onClick={handlePrevCategory}
                disabled={activeSectionIndex === 0}
                className="btn-ghost !px-4 !py-2.5 text-xs text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
              >
                ← Previous Category
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Individual Save Button */}
                <button
                  type="button"
                  onClick={() => handleSaveCategory(activeSection.key)}
                  disabled={savingCategory === activeSection.key}
                  className="btn-ghost !px-4 !py-2.5 text-xs font-semibold text-bio-300 hover:text-white border border-bio-400/30"
                >
                  {savingCategory === activeSection.key ? (
                    'Saving…'
                  ) : (
                    `💾 Save ${activeSection.short}`
                  )}
                </button>

                {/* Save & Jump to Next Category */}
                {activeSectionIndex < ASSESSMENT_SECTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => handleSaveCategory(activeSection.key, true)}
                    className="btn-primary !px-5 !py-2.5 text-xs font-semibold"
                  >
                    Save & Jump to Next Category →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submittingFinal}
                    className="btn-primary !bg-bio-400 !text-slate-950 !px-6 !py-2.5 text-xs font-bold hover:!bg-bio-300 shadow-xl shadow-bio-500/30"
                  >
                    {submittingFinal ? (
                      <>
                        <Spinner /> Generating Diagnostic Report…
                      </>
                    ) : (
                      '🚀 Save & View Results on Dashboard →'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Skip Helper */}
            {activeSectionIndex < ASSESSMENT_SECTIONS.length - 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-500">
                <span>Want to fill other categories first?</span>
                <button
                  type="button"
                  onClick={handleNextCategory}
                  className="text-slate-400 hover:text-bio-300 underline"
                >
                  Skip to Next Category without saving →
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
