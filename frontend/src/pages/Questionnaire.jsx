import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import QuestionCard from '../components/QuestionCard.jsx'
import ChatbotAssessment from '../components/ChatbotAssessment.jsx'
import {
  getCurrentUser,
  saveAssessmentCategory,
  fetchAllAssessmentCategories,
  submitAssessment,
  markUserAssessmentCompleted,
  ASSESSMENT_CATEGORY_TABLES,
} from '../lib/api.js'
import { questionnaire, liveBmi, runPipeline } from '../lib/ruleEngine.js'
import { extractReportData } from '../lib/reportExtractor.js'
import { PCOS_CASE, HEALTHY_CASE } from '../data/demoProfiles.js'
import { ASSESSMENT_SECTIONS, PRIMARY_STEP_FOR_SHARED_FIELD } from '../data/assessmentSections.js'

export default function Questionnaire() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [currentUser, setCurrentUser] = useState(null)
  const [answers, setAnswers] = useState({})
  const [activeCategoryKey, setActiveCategoryKey] = useState(
    searchParams.get('category') || 'first_line'
  )
  const [assessmentMode, setAssessmentMode] = useState(
    searchParams.get('mode') || 'chat'
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
    if (!cur) {
      navigate('/login?redirect=/assessment', { replace: true })
      return
    }
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

  // Sync active category and mode with URL params
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat && ASSESSMENT_SECTIONS.some((s) => s.key === cat)) {
      setActiveCategoryKey(cat)
    }
    const m = searchParams.get('mode')
    if (m === 'form' || m === 'chat') {
      setAssessmentMode(m)
    }
  }, [searchParams])

  function switchMode(newMode) {
    setAssessmentMode(newMode)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('mode', newMode)
      return next
    })
  }

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
            text: `Saved answers to ${section.table} table in Supabase.`,
          },
        }))
      } else {
        setSaveNotices((prev) => ({
          ...prev,
          [sectionKey]: {
            type: 'success',
            text: `Saved locally in your browser.`,
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
      if (currentUser?.email) {
        markUserAssessmentCompleted(currentUser.email, result)
      }

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
    <div className="relative min-h-screen bg-[#F5F6F4]">
      <div className={`relative mx-auto max-w-5xl px-4 sm:px-6 pt-20 sm:pt-24 ${assessmentMode === 'chat' ? 'pb-6 flex flex-col h-[calc(100vh-10px)] min-h-[680px]' : 'py-8 sm:py-12'}`}>
        {/* ============================================================ */}
        {/* TWO INTAKE OPTIONS SELECTOR (Consultation vs Form View)      */}
        {/* ============================================================ */}
        <div className="mb-6 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#E11D48] border border-rose-200 text-xs font-mono font-bold shadow-xs">
              Rx
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#202321]">Assessment Format</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose between conversational guided chat or clinical form.
              </p>
            </div>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-[#F0F2EE] border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => switchMode('chat')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                assessmentMode === 'chat'
                  ? 'font-semibold bg-white text-[#202321] shadow-xs border border-slate-200/80'
                  : 'font-medium text-slate-600 hover:text-[#202321]'
              }`}
            >
              {assessmentMode === 'chat' && <span className="h-1.5 w-1.5 rounded-full bg-[#E11D48]" />}
              <span>Guided Chat</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('form')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                assessmentMode === 'form'
                  ? 'font-semibold bg-white text-[#202321] shadow-xs border border-slate-200/80'
                  : 'font-medium text-slate-600 hover:text-[#202321]'
              }`}
            >
              {assessmentMode === 'form' && <span className="h-1.5 w-1.5 rounded-full bg-[#E11D48]" />}
              <span>Form View</span>
            </button>
          </div>
        </div>

        {assessmentMode === 'chat' ? (
          <div className="flex-1 w-full min-h-[580px] rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
            <ChatbotAssessment
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onSaveCategory={handleSaveCategory}
              onFinalSubmit={handleFinalSubmit}
              currentUser={currentUser}
              demoProfile={demoProfile}
              onLoadDemo={loadDemo}
              onFileUpload={handleFileUpload}
              uploadStatus={uploadStatus}
              uploadError={uploadError}
              setUploadStatus={setUploadStatus}
              setUploadError={setUploadError}
              extractedFlags={extractedFlags}
              overallProgress={overallProgress}
              onSwitchToForm={() => switchMode('form')}
              activeCategoryKey={activeCategoryKey}
              onSelectCategory={(key) => jumpToCategory(key)}
            />
          </div>
        ) : (
          <div>
          {/* ============================================================ */}
          {/* TOP CONTROLS & DEMO SHORTCUTS                               */}
          {/* ============================================================ */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {currentUser?.email ? (
                  <>
                    Authenticated as <strong className="text-[#202321] font-semibold">{currentUser.email}</strong> · Cloud Synced
                  </>
                ) : (
                  'Clinical Diagnostic Center'
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {demoProfile && (
                <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                  Active Demo: {demoProfile === 'pcos' ? 'PCOS Profile' : 'Healthy Profile'}
                </span>
              )}
              <button
                type="button"
                onClick={() => loadDemo('pcos')}
                className="btn-ghost !px-3.5 !py-1.5 text-xs text-slate-700 hover:text-[#202321] rounded-full border border-slate-200 bg-white shadow-xs"
                title="Fills every question with a PCOS-positive profile"
              >
                Load PCOS Profile
              </button>
              <button
                type="button"
                onClick={() => loadDemo('healthy')}
                className="btn-ghost !px-3.5 !py-1.5 text-xs text-slate-700 hover:text-[#202321] rounded-full border border-slate-200 bg-white shadow-xs"
                title="Fills every question with normal values"
              >
                Load Healthy Profile
              </button>
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all shadow-xs">
                Upload Lab Report (OCR)
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
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
              <span>{uploadStatus}</span>
              <button onClick={() => setUploadStatus(null)} className="text-emerald-900 hover:underline font-bold ml-3">Dismiss</button>
            </div>
          )}
          {uploadError && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 flex items-center justify-between shadow-xs">
              <span>{uploadError}</span>
              <button onClick={() => setUploadError(null)} className="text-rose-900 hover:underline font-bold ml-3">Dismiss</button>
            </div>
          )}

          {/* ============================================================ */}
          {/* TITLE & OVERALL PROGRESS                                     */}
          {/* ============================================================ */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="chip mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  7 Clinical Evaluation Categories
                </span>
                <h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] text-[#202321] sm:text-4xl">
                  Clinical PCOS Diagnostic Assessment
                </h1>
                <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
                  Navigate between clinical categories below to review and record your diagnostic parameters. Each category records data directly into dedicated clinical tables.
                </p>
              </div>

              <Link
                to="/dashboard"
                className="btn-ghost shrink-0 self-start sm:self-auto !px-4 !py-2.5 text-xs font-semibold text-[#202321] hover:bg-slate-50 border border-slate-200 shadow-xs rounded-full"
                title="Go to Dashboard to view calculated results"
              >
                View Results on Dashboard
              </Link>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="text-slate-700 font-medium">
                  Overall Assessment Progress
                </span>
                <span className="font-mono text-[#E11D48] font-bold">
                  {overallProgress.filled} / {overallProgress.total} Questions Answered ({overallProgress.percentage}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-[#E11D48] transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(4, overallProgress.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CATEGORY JUMPING NAVIGATION PILLS                            */}
          {/* ============================================================ */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                    className={`relative flex flex-col justify-between rounded-2xl p-3.5 text-left transition-all ${
                      isActive
                        ? 'border-2 border-[#E11D48] bg-rose-50/70 shadow-sm ring-1 ring-rose-200'
                        : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className={`font-mono text-xs font-bold ${isActive ? 'text-[#E11D48]' : 'text-slate-500'}`}>
                        0{sec.number}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          prog.isComplete
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : prog.hasAnswers
                            ? 'border border-amber-200 bg-amber-50 text-amber-700'
                            : 'border border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {prog.filled}/{prog.total}
                      </span>
                    </div>

                    <div>
                      <span className="block font-mono text-[10px] text-slate-400">
                        Step {sec.number}
                      </span>
                      <span
                        className={`block text-xs font-semibold leading-tight line-clamp-1 ${
                          isActive ? 'text-[#202321]' : 'text-slate-700'
                        }`}
                      >
                        {sec.short}
                      </span>
                    </div>

                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-[#E11D48]" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Quick-Jump Dropdown (Convenient on Mobile) */}
            <div className="mt-3 flex items-center gap-2 sm:hidden">
              <span className="text-xs text-slate-500 shrink-0">Quick jump:</span>
              <select
                value={activeCategoryKey}
                onChange={(e) => jumpToCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#202321] shadow-xs"
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
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs border-l-4 border-l-[#E11D48]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                    Category {activeSection.number} of 7
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    Table: <code className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">{activeSection.table}</code>
                  </span>
                </div>
                <h2 className="mt-2.5 font-heading text-2xl font-semibold text-[#202321] flex items-center gap-2.5">
                  <span>{activeSection.icon}</span>
                  <span>{activeSection.title}</span>
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  {activeSection.desc}
                </p>
              </div>

              {/* Individual Save Button at Top of Category */}
              <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSaveCategory(activeSection.key)}
                  disabled={savingCategory === activeSection.key}
                  className="btn-ghost !px-4 !py-2 text-xs font-semibold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-full shadow-xs flex items-center gap-2 transition-all"
                >
                  {savingCategory === activeSection.key ? (
                    <>
                      <Spinner /> Saving to {activeSection.table}…
                    </>
                  ) : (
                    <span>Save {activeSection.short} Answers</span>
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
                className={`mt-4 rounded-xl border px-4 py-2.5 text-xs font-medium flex items-center justify-between shadow-xs ${
                  currentNotice.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                <span>{currentNotice.text}</span>
                <span className="font-mono text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Cloud Synced</span>
              </motion.div>
            )}

            {/* Live BMI display if Metabolic category */}
            {bmi && (
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Computed Body Mass Index (Live)</p>
                  <p className="font-heading text-xl font-semibold text-[#202321] mt-0.5">
                    {bmi.bmi} <span className="text-sm font-normal text-slate-500">kg/m²</span>
                  </p>
                </div>
                <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-xs">
                  {bmi.category}
                </span>
              </div>
            )}
          </div>

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
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm shadow-xs">
                  No questions found in this category.
                </div>
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
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs mt-8">
            {/* Inline Save Notice */}
            {currentNotice && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 shadow-xs">
                {currentNotice.text}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Back / Previous Category Button */}
              <button
                type="button"
                onClick={handlePrevCategory}
                disabled={activeSectionIndex === 0}
                className="btn-ghost !px-5 !py-2.5 text-xs font-semibold text-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-full border border-slate-200 shadow-xs"
              >
                ← Previous Category
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Individual Save Button */}
                <button
                  type="button"
                  onClick={() => handleSaveCategory(activeSection.key)}
                  disabled={savingCategory === activeSection.key}
                  className="btn-ghost !px-4 !py-2.5 text-xs font-semibold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-full shadow-xs"
                >
                  {savingCategory === activeSection.key ? (
                    'Saving…'
                  ) : (
                    `Save ${activeSection.short}`
                  )}
                </button>

                {/* Save & Jump to Next Category */}
                {activeSectionIndex < ASSESSMENT_SECTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => handleSaveCategory(activeSection.key, true)}
                    className="btn-primary !px-6 !py-2.5 text-xs font-semibold rounded-full shadow-sm"
                  >
                    Save & Proceed to Next Category
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submittingFinal}
                    className="btn-primary !bg-[#E11D48] hover:!bg-[#BE123C] text-white !px-7 !py-3 text-xs font-bold rounded-full shadow-md"
                  >
                    {submittingFinal ? (
                      <>
                        <Spinner /> Generating Diagnostic Report…
                      </>
                    ) : (
                      'Save & Generate Diagnostic Report'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Skip Helper */}
            {activeSectionIndex < ASSESSMENT_SECTIONS.length - 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <span>Want to fill other categories first?</span>
                <button
                  type="button"
                  onClick={handleNextCategory}
                  className="text-rose-600 hover:text-rose-700 font-medium underline"
                >
                  Skip to Next Category without saving
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
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
