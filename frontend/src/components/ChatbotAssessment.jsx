import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ASSESSMENT_SECTIONS } from '../data/assessmentSections.js'
import { liveBmi, runPipeline } from '../lib/ruleEngine.js'

export default function ChatbotAssessment({
  answers,
  onAnswerChange,
  onSaveCategory,
  onFinalSubmit,
  currentUser,
  demoProfile,
  onLoadDemo,
  onFileUpload,
  uploadStatus,
  uploadError,
  setUploadStatus,
  setUploadError,
  extractedFlags = {},
  overallProgress,
  onSwitchToForm,
}) {
  // Category & Question index within that category
  const [activeCatIndex, setActiveCatIndex] = useState(0)
  const [activeQIndex, setActiveQIndex] = useState(0)

  // Temporary local input value for number fields before submitting
  const [numInputs, setNumInputs] = useState({})

  // Show drawer/modal of questions in current category to quickly review/jump
  const [showCategoryReview, setShowCategoryReview] = useState(false)
  const [notice, setNotice] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const chatEndRef = useRef(null)
  const inputCardRef = useRef(null)

  const currentCategory = ASSESSMENT_SECTIONS[activeCatIndex] || ASSESSMENT_SECTIONS[0]
  const currentQuestions = currentCategory.questions || []
  const currentQuestion = currentQuestions[activeQIndex] || currentQuestions[0]

  // Initialize number inputs when question changes
  useEffect(() => {
    if (currentQuestion?.fields) {
      const initial = {}
      for (const f of currentQuestion.fields) {
        if (f.type === 'number') {
          initial[f.key] =
            answers[f.key] !== undefined && answers[f.key] !== null ? answers[f.key] : ''
        }
      }
      setNumInputs(initial)
    }
  }, [currentQuestion, answers])

  // Scroll to input or bottom when changing questions
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeQIndex, activeCatIndex])

  // Category progress stats
  function getCategoryStats(cat) {
    let total = 0
    let filled = 0
    for (const q of cat.questions) {
      if (q.fields) {
        for (const f of q.fields) {
          total++
          const v = answers[f.key]
          if (v !== undefined && v !== '' && v !== null) filled++
        }
      }
    }
    return {
      total,
      filled,
      isComplete: total > 0 && filled === total,
      percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
    }
  }

  const catStats = useMemo(() => getCategoryStats(currentCategory), [currentCategory, answers])

  // Is current question answered?
  const isCurrentQuestionAnswered = useMemo(() => {
    if (!currentQuestion?.fields?.length) return false
    return currentQuestion.fields.some(
      (f) => answers[f.key] !== undefined && answers[f.key] !== '' && answers[f.key] !== null
    )
  }, [currentQuestion, answers])

  // Live BMI calculation
  const calculatedBmi = useMemo(() => {
    return liveBmi(answers.height_cm, answers.weight_kg)
  }, [answers.height_cm, answers.weight_kg])

  // Handle single field answer
  const handleSingleAnswer = (key, value) => {
    onAnswerChange(key, value)
    showToastNotice('Response recorded')

    // Advance to next question smoothly
    setTimeout(() => {
      advanceNext()
    }, 300)
  }

  // Handle multi-field submission (e.g. number fields)
  const handleSubmitNumberFields = () => {
    for (const [key, val] of Object.entries(numInputs)) {
      if (val !== '' && val !== null && val !== undefined) {
        onAnswerChange(key, Number(val))
      }
    }
    showToastNotice('Parameters recorded')
    setTimeout(() => {
      advanceNext()
    }, 300)
  }

  // Advance to next question or next category
  const advanceNext = () => {
    if (activeQIndex < currentQuestions.length - 1) {
      setActiveQIndex((prev) => prev + 1)
    } else {
      // Finished current category
      onSaveCategory?.(currentCategory.key)
      if (activeCatIndex < ASSESSMENT_SECTIONS.length - 1) {
        setActiveCatIndex((prev) => prev + 1)
        setActiveQIndex(0)
        showToastNotice(`Completed ${currentCategory.short}. Advancing to ${ASSESSMENT_SECTIONS[activeCatIndex + 1].short}…`)
      }
    }
  }

  // Move to previous question
  const movePrev = () => {
    if (activeQIndex > 0) {
      setActiveQIndex((prev) => prev - 1)
    } else if (activeCatIndex > 0) {
      const prevCat = ASSESSMENT_SECTIONS[activeCatIndex - 1]
      setActiveCatIndex(activeCatIndex - 1)
      setActiveQIndex(Math.max(0, (prevCat.questions?.length || 1) - 1))
    }
  }

  // Jump to specific category and question
  const jumpToQuestion = (catIndex, qIndex = 0) => {
    setActiveCatIndex(catIndex)
    setActiveQIndex(qIndex)
    setShowCategoryReview(false)
  }

  const showToastNotice = (msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3000)
  }

  // Trigger final submission
  const handleFinalReport = async () => {
    setIsSubmitting(true)
    try {
      await onFinalSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* ============================================================ */}
      {/* TOP CONTROLS & DEMO / OCR ACTIONS                           */}
      {/* ============================================================ */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span className="flex h-2 w-2 rounded-full bg-bio-400" />
          <span>
            {currentUser?.email ? (
              <>
                Authenticated as <strong className="text-white">{currentUser.email}</strong> · Database Connected
              </>
            ) : (
              'Clinical Diagnostic Intake Session'
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {demoProfile && (
            <span className="rounded-full border border-bio-400/30 bg-bio-500/10 px-3 py-1 text-xs text-bio-200">
              Profile: {demoProfile === 'pcos' ? 'PCOS Clinical Case' : 'Healthy Control Case'}
            </span>
          )}
          <button
            type="button"
            onClick={() => onLoadDemo('pcos')}
            className="btn-ghost !px-3 !py-1.5 text-xs text-slate-300 hover:text-bio-200 border border-white/10"
            title="Pre-fills clinical questions with a PCOS positive profile"
          >
            Load PCOS Profile
          </button>
          <button
            type="button"
            onClick={() => onLoadDemo('healthy')}
            className="btn-ghost !px-3 !py-1.5 text-xs text-slate-300 hover:text-bio-200 border border-white/10"
            title="Pre-fills all questions with standard healthy values"
          >
            Load Healthy Profile
          </button>
          <label className="btn-ghost !px-3 !py-1.5 text-xs text-bio-300 hover:text-white cursor-pointer border border-bio-400/30">
            Upload Lab Report (OCR)
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* OCR Status Banners */}
      {uploadStatus && (
        <div className="mb-6 rounded-xl border border-bio-400/40 bg-bio-500/10 px-4 py-3 text-xs text-bio-200 flex items-center justify-between">
          <span>{uploadStatus}</span>
          <button onClick={() => setUploadStatus(null)} className="text-slate-400 hover:text-white font-semibold ml-3">Dismiss</button>
        </div>
      )}
      {uploadError && (
        <div className="mb-6 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-slate-400 hover:text-white font-semibold ml-3">Dismiss</button>
        </div>
      )}

      {/* ============================================================ */}
      {/* CATEGORY SELECTOR CAROUSEL PILLS (Jump & Edit any Category) */}
      {/* ============================================================ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Evaluation Axes:
          </span>
          <button
            type="button"
            onClick={() => setShowCategoryReview(!showCategoryReview)}
            className="text-xs font-medium text-bio-300 hover:text-white"
          >
            {showCategoryReview ? 'Hide Question Index' : 'Question Index & Review'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {ASSESSMENT_SECTIONS.map((sec, idx) => {
            const stats = getCategoryStats(sec)
            const isActive = idx === activeCatIndex

            return (
              <button
                type="button"
                key={sec.key}
                onClick={() => jumpToQuestion(idx, 0)}
                className={`relative flex flex-col justify-between rounded-xl p-3 text-left transition-all ${
                  isActive
                    ? 'border-2 border-bio-400 bg-bio-500/20 shadow-lg shadow-bio-500/20'
                    : 'border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="font-mono text-xs font-bold text-bio-300">0{sec.number}</span>
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      stats.isComplete
                        ? 'border border-bio-400/40 bg-bio-500/20 text-bio-300'
                        : stats.filled > 0
                        ? 'border border-amber-400/40 bg-amber-500/20 text-amber-200'
                        : 'border border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    {stats.filled}/{stats.total}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Step {sec.number}</p>
                  <p className="text-xs font-bold text-slate-100 truncate">{sec.short}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Collapsible Category Questions Review Drawer */}
      <AnimatePresence>
        {showCategoryReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-2xl border border-bio-400/30 bg-slate-950/90 p-5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold text-bio-300">0{currentCategory.number}</span>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">
                    {currentCategory.title} · Question Directory
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select any question below to inspect or modify stored clinical values.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryReview(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                Close
              </button>
            </div>

            <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
              {currentQuestions.map((q, qIdx) => {
                const isSelected = qIdx === activeQIndex
                const qAnswered = q.fields?.some(
                  (f) => answers[f.key] !== undefined && answers[f.key] !== '' && answers[f.key] !== null
                )

                // Summarize answers for this question
                const answeredValues = q.fields
                  ?.map((f) => {
                    const val = answers[f.key]
                    if (val === undefined || val === '' || val === null) return null
                    return `${f.label}: ${val}${f.unit ? ' ' + f.unit : ''}`
                  })
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <button
                    type="button"
                    key={q.id || qIdx}
                    onClick={() => jumpToQuestion(activeCatIndex, qIdx)}
                    className={`flex items-start justify-between rounded-xl p-3 text-left transition-all ${
                      isSelected
                        ? 'border border-bio-400 bg-bio-500/20 text-white'
                        : 'border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300'
                    }`}
                  >
                    <div className="pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] text-bio-300 font-bold">
                          Item {qIdx + 1}
                        </span>
                        <span className="text-xs font-medium text-slate-200">
                          {q.label || q.text}
                        </span>
                      </div>
                      {answeredValues && (
                        <p className="text-[11px] text-bio-200 font-mono">
                          {answeredValues}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        qAnswered
                          ? 'border border-bio-400/40 bg-bio-500/20 text-bio-300'
                          : 'border border-white/10 bg-white/5 text-slate-500'
                      }`}
                    >
                      {qAnswered ? 'Recorded' : 'Pending'}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MAIN CONSULTATION CONTAINER                                  */}
      {/* ============================================================ */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bio-500/20 text-bio-300 border border-bio-400/30 font-mono text-sm font-bold">
              Dx
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold text-white">
                  Clinical Consultation Portal
                </h2>
                <span className="rounded-full border border-bio-400/40 bg-bio-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-bio-300">
                  Step {activeCatIndex + 1} of 7 · {currentCategory.short}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Protocol: <strong className="text-slate-200">{currentCategory.title}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToForm}
              className="btn-ghost !px-3 !py-1.5 text-xs text-slate-300 hover:text-white border border-white/10"
              title="Switch to standard category form view"
            >
              Form View
            </button>
            <button
              type="button"
              onClick={() => onSaveCategory?.(currentCategory.key)}
              className="btn-ghost !px-3 !py-1.5 text-xs text-bio-300 hover:text-white border border-bio-400/30"
              title="Save current category answers to Supabase"
            >
              Save Axis
            </button>
          </div>
        </div>

        {/* Category Context & Progress Header */}
        <div className="border-b border-white/5 bg-slate-900/40 px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="font-mono text-bio-300 font-bold">0{currentCategory.number}</span>
              <span className="font-semibold text-white">{currentCategory.short}:</span>
              <span className="text-slate-400 hidden md:inline truncate max-w-md">
                {currentCategory.desc}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-bio-300 font-semibold">
                Question {activeQIndex + 1} of {currentQuestions.length}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {overallProgress?.filled || 0} / 79 Total Parameters ({overallProgress?.percentage || 0}%)
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-bio-400 to-plasma-400 transition-all duration-300"
              style={{
                width: `${Math.max(
                  5,
                  Math.round(((activeQIndex + 1) / currentQuestions.length) * 100)
                )}%`,
              }}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* MESSAGES STREAM AREA                                         */}
        {/* ============================================================ */}
        <div className="flex-1 p-6 space-y-6 max-h-[520px] overflow-y-auto">
          {/* Clinical Introduction Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bio-500/20 text-bio-300 border border-bio-400/30 font-mono text-xs font-bold">
              Rx
            </div>
            <div className="max-w-2xl rounded-2xl rounded-tl-none border border-white/10 bg-slate-900/90 p-4 shadow-xl text-xs sm:text-sm text-slate-200 space-y-2">
              <p className="font-semibold text-white">
                Clinical PCOS Phenotype Intake Protocol
              </p>
              <p className="text-slate-300 leading-relaxed">
                This intake assesses diagnostic criteria according to Rotterdam consensus guidelines and endocrine evaluation thresholds. Recorded data is cross-referenced with metabolic, hormonal, and adrenal biomarker rules.
              </p>
              <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-2 border-t border-white/5 mt-2">
                <span className="text-bio-300 font-semibold">Note:</span>
                <span>You can review, modify, or jump between categories at any point.</span>
              </div>
            </div>
          </motion.div>

          {/* Previous Questions Summary in Active Category (If answered) */}
          {activeQIndex > 0 && (
            <div className="space-y-2.5 pl-11">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Recorded in {currentCategory.short}:
              </p>
              {currentQuestions.slice(0, activeQIndex).map((prevQ, pIdx) => {
                const values = prevQ.fields
                  ?.map((f) => {
                    const v = answers[f.key]
                    if (v === undefined || v === '' || v === null) return null
                    return `${f.label}: ${v}${f.unit ? ' ' + f.unit : ''}`
                  })
                  .filter(Boolean)
                  .join(' · ')

                if (!values) return null

                return (
                  <motion.div
                    key={prevQ.id || pIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2 text-xs"
                  >
                    <div className="truncate mr-3">
                      <span className="font-mono text-slate-500 mr-2">Item {pIdx + 1}</span>
                      <span className="text-slate-300">{prevQ.label || prevQ.text}: </span>
                      <strong className="text-bio-200 font-medium">{values}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveQIndex(pIdx)}
                      className="shrink-0 text-[11px] text-bio-300 hover:text-white font-medium"
                    >
                      Edit Response
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Current Question Bubble */}
          <motion.div
            key={`${currentCategory.key}-${currentQuestion?.id || activeQIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-start gap-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bio-500/20 text-bio-300 border border-bio-400/30 font-mono text-xs font-bold">
              Rx
            </div>
            <div className="max-w-2xl rounded-2xl rounded-tl-none border border-bio-400/40 bg-slate-900/95 p-5 shadow-2xl text-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <span className="font-mono text-xs font-bold text-bio-300">
                  Question {activeQIndex + 1} of {currentQuestions.length} · {currentCategory.short}
                </span>
                {currentQuestion?.category && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-slate-400">
                    {currentQuestion.category}
                  </span>
                )}
              </div>

              <h3 className="font-display text-base sm:text-lg font-bold text-white leading-snug">
                {currentQuestion?.label || currentQuestion?.text}
              </h3>

              {currentQuestion?.description && (
                <p className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-xl leading-relaxed">
                  {currentQuestion.description}
                </p>
              )}

              {currentQuestion?.reference && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Clinical Source: {currentQuestion.reference}
                </p>
              )}

              {/* Shared field note if carried over */}
              {currentQuestion?.shared_field && (
                <div className="rounded-lg border border-bio-400/20 bg-bio-500/5 px-3 py-1.5 text-xs text-bio-300">
                  Cross-referenced parameter: Shared with another phenotype axis and synchronized automatically.
                </div>
              )}
            </div>
          </motion.div>

          {/* Live BMI Analysis (If height & weight answered) */}
          {calculatedBmi && currentCategory.key === 'metabolic' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-plasma-500/20 text-plasma-300 border border-plasma-400/30 font-mono text-xs font-bold">
                BMI
              </div>
              <div className="rounded-2xl rounded-tl-none border border-plasma-400/30 bg-slate-900/90 p-4 text-xs sm:text-sm text-slate-200">
                <p className="font-semibold text-white mb-1">
                  Body Mass Index (BMI) Computed:
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl font-bold text-bio-300">
                    {calculatedBmi.bmi} kg/m²
                  </span>
                  <span className="rounded-full border border-bio-400/40 bg-bio-500/20 px-2.5 py-0.5 text-xs font-semibold text-bio-200">
                    {calculatedBmi.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Evaluated in metabolic phenotype scoring for insulin resistance risk.
                </p>
              </div>
            </motion.div>
          )}

          {/* Previous Answer Bubble (If already answered) */}
          {isCurrentQuestionAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end items-start gap-2.5"
            >
              <div className="max-w-md rounded-2xl rounded-tr-none border border-bio-400/40 bg-bio-500/10 p-4 shadow-xl text-right">
                <p className="text-[11px] font-semibold text-bio-300 mb-1">Recorded Answer:</p>
                <div className="space-y-1">
                  {currentQuestion?.fields?.map((f) => {
                    const v = answers[f.key]
                    if (v === undefined || v === '' || v === null) return null
                    return (
                      <p key={f.key} className="text-sm font-bold text-white">
                        <span className="text-slate-300 font-normal">{f.label}: </span>
                        {String(v)} {f.unit || ''}
                      </p>
                    )
                  })}
                </div>
                <div className="mt-2 flex items-center justify-end gap-2 text-[11px]">
                  <span className="text-bio-300 font-medium">Synchronized</span>
                </div>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bio-400 text-slate-950 font-bold text-xs">
                Pt
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ============================================================ */}
        {/* INTERACTIVE INPUT CONTROL AREA (Specific to Question Type)  */}
        {/* ============================================================ */}
        <div
          ref={inputCardRef}
          className="border-t border-white/10 bg-slate-900/90 p-5 sm:p-6 backdrop-blur-xl"
        >
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl border border-bio-400/40 bg-bio-500/20 px-3.5 py-1.5 text-xs text-bio-200 flex items-center justify-between"
            >
              <span>{notice}</span>
              <span className="text-[10px] font-mono text-bio-300">Synchronized</span>
            </motion.div>
          )}

          {/* Render inputs based on fields */}
          <div className="space-y-4">
            {currentQuestion?.fields?.map((field) => {
              const currentVal = answers[field.key]

              // 1. YES / NO QUESTION
              if (field.type === 'yesno') {
                return (
                  <div key={field.key} className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      {field.label}:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['yes', 'no'].map((opt) => {
                        const isSelected = currentVal === opt
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => handleSingleAnswer(field.key, opt)}
                            className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-4 font-display text-sm font-bold capitalize transition-all ${
                              isSelected
                                ? 'border-bio-400 bg-bio-400 text-slate-950 shadow-lg shadow-bio-500/30'
                                : 'border-white/10 bg-white/5 text-slate-200 hover:border-bio-400/50 hover:bg-white/10'
                            }`}
                          >
                            <span>{opt === 'yes' ? 'Yes' : 'No'}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              // 2. SELECT QUESTION (Option Chips)
              if (field.type === 'select') {
                return (
                  <div key={field.key} className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Select response: <span className="text-white">{field.label}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {field.options?.map((opt) => {
                        const isSelected = currentVal === opt
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => handleSingleAnswer(field.key, opt)}
                            className={`rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                              isSelected
                                ? 'border-bio-400 bg-bio-400 text-slate-950 font-bold shadow-lg shadow-bio-500/25'
                                : 'border-white/10 bg-white/5 text-slate-200 hover:border-bio-400/40 hover:bg-white/10'
                            }`}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              // 3. SCALE QUESTION (0 to 4 rating tiles, e.g. PSS-10 stress or symptom scale)
              if (field.type === 'scale') {
                const min = field.min ?? 0
                const max = field.max ?? 4
                const options = []
                for (let i = min; i <= max; i++) {
                  options.push(i)
                }

                return (
                  <div key={field.key} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        {field.label}:
                      </label>
                      {currentVal !== undefined && field.labels?.[currentVal] && (
                        <span className="font-mono text-xs text-bio-300 font-bold">
                          Selected: {currentVal} ({field.labels[currentVal]})
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {options.map((score) => {
                        const isSelected = currentVal === score
                        const labelText = field.labels?.[score] || score

                        return (
                          <button
                            type="button"
                            key={score}
                            onClick={() => handleSingleAnswer(field.key, score)}
                            className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                              isSelected
                                ? 'border-bio-400 bg-bio-400 text-slate-950 font-bold shadow-lg shadow-bio-500/25'
                                : 'border-white/10 bg-white/5 text-slate-200 hover:border-bio-400/40 hover:bg-white/10'
                            }`}
                          >
                            <span className="font-mono text-base font-bold">{score}</span>
                            <span className="text-[10px] opacity-80 leading-tight mt-0.5">
                              {labelText}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              // 4. NUMBER QUESTION (Biomarker, Lab test, or measurements)
              if (field.type === 'number') {
                return (
                  <div key={field.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-300">
                        {field.label} {field.unit && <span className="text-bio-300 font-mono">({field.unit})</span>}
                      </label>
                      {(field.min !== undefined || field.max !== undefined) && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Range: {field.min ?? '—'} to {field.max ?? '—'} {field.unit}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step={field.step ?? 'any'}
                        min={field.min}
                        max={field.max}
                        placeholder={field.unit ? `e.g. 70 ${field.unit}` : 'Enter numeric value…'}
                        value={numInputs[field.key] ?? ''}
                        onChange={(e) =>
                          setNumInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleSubmitNumberFields()
                          }
                        }}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-bio-400 focus:bg-white/10 focus:outline-none transition-all"
                      />
                      {field.unit && (
                        <span className="absolute right-3.5 top-3 text-xs font-mono text-slate-400 pointer-events-none">
                          {field.unit}
                        </span>
                      )}
                    </div>
                  </div>
                )
              }

              // Fallback text input
              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">{field.label}:</label>
                  <input
                    type="text"
                    value={answers[field.key] ?? ''}
                    onChange={(e) => onAnswerChange(field.key, e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:border-bio-400 focus:outline-none"
                  />
                </div>
              )
            })}
          </div>

          {/* Action Row for Number Fields or Next / Back Navigation */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={movePrev}
                disabled={activeCatIndex === 0 && activeQIndex === 0}
                className="btn-ghost !px-3.5 !py-2 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                ← Previous Question
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* If this question has number fields, provide explicit Save Number button */}
              {currentQuestion?.fields?.some((f) => f.type === 'number') && (
                <button
                  type="button"
                  onClick={handleSubmitNumberFields}
                  className="btn-primary !px-5 !py-2 text-xs font-bold shadow-md shadow-bio-500/20"
                >
                  Save & Continue →
                </button>
              )}

              {/* Skip / Next button */}
              <button
                type="button"
                onClick={advanceNext}
                className="btn-ghost !px-3.5 !py-2 text-xs text-slate-300 hover:text-bio-200 border border-white/10"
              >
                {activeQIndex < currentQuestions.length - 1
                  ? 'Skip / Next Question →'
                  : 'Complete Axis →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FINAL ASSESSMENT SUBMISSION & DASHBOARD REPORT CARD          */}
      {/* ============================================================ */}
      <div className="mt-8 rounded-3xl border border-bio-400/30 bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-slate-900/90 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-bio-400/30 bg-bio-500/10 px-3 py-1 text-xs text-bio-200">
              <span className="h-2 w-2 rounded-full bg-bio-400" />
              <span>Rotterdam & Phenotype Protocol Ready</span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
              Generate Comprehensive PCOS Diagnostic Report
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Submit your recorded parameters to execute deterministic Rotterdam evaluation, override validation, and clinical nutrition matching.
            </p>
            <p className="text-xs text-slate-400">
              Parameters Recorded: <strong className="text-bio-300">{overallProgress?.filled || 0} of 79</strong> biomarkers and symptoms evaluated.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleFinalReport}
              disabled={isSubmitting}
              className="w-full sm:w-auto btn-primary !bg-bio-400 !text-slate-950 !px-8 !py-3.5 text-sm font-extrabold hover:!bg-bio-300 shadow-2xl shadow-bio-500/40 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Computing Diagnostic Classification…</span>
                </>
              ) : (
                <span>Save & Generate Diagnostic Report →</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
