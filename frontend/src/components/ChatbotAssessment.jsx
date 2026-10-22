import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ASSESSMENT_SECTIONS } from '../data/assessmentSections.js'
import { liveBmi } from '../lib/ruleEngine.js'
import { processChatMessage } from '../lib/clinicalNlp.js'

export default function ChatbotAssessment({
  answers = {},
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
  activeCategoryKey,
  onSelectCategory,
}) {
  // Category & Question index
  const initialCatIdx = useMemo(() => {
    if (!activeCategoryKey) return 0
    const idx = ASSESSMENT_SECTIONS.findIndex((s) => s.key === activeCategoryKey)
    return idx >= 0 ? idx : 0
  }, [activeCategoryKey])

  const [activeCatIndex, setActiveCatIndex] = useState(initialCatIdx)
  const [activeQIndex, setActiveQIndex] = useState(0)
  const [numInputs, setNumInputs] = useState({})
  const [toastNotice, setToastNotice] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)

  // Mini-ChatGPT Conversation Message Stream
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your HelixDx Clinical Intake Assistant. I'll guide you through your PCOS phenotype diagnostic evaluation according to the Rotterdam Consensus.\n\nYou can select options on the card below or type naturally here (e.g. *"change weight to 65kg"*, *"my cycle is irregular"*, or *"set acne to no"*).`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputMessage, setInputMessage] = useState('')

  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Sync category from parent prop
  useEffect(() => {
    if (activeCategoryKey) {
      const idx = ASSESSMENT_SECTIONS.findIndex((s) => s.key === activeCategoryKey)
      if (idx >= 0 && idx !== activeCatIndex) {
        setActiveCatIndex(idx)
        setActiveQIndex(0)
      }
    }
  }, [activeCategoryKey])

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeQIndex, activeCatIndex, chatMessages])

  // Live BMI calculation
  const calculatedBmi = useMemo(() => {
    return liveBmi(answers.height_cm, answers.weight_kg)
  }, [answers.height_cm, answers.weight_kg])

  const showToast = (msg) => {
    setToastNotice(msg)
    setTimeout(() => setToastNotice(null), 2000)
  }

  // Record answer WITHOUT changing the question
  const handleSelectOption = (key, val) => {
    onAnswerChange(key, val)
    const valText = val === 'yes' ? 'Yes' : val === 'no' ? 'No' : val
    showToast(`Option selected: ${valText}`)

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'assistant',
        text: `Recorded **${valText}** for "${currentQuestion.label || currentQuestion.text}". Click Next or type to adjust.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  // Save number fields WITHOUT changing the question
  const handleSaveNumbers = () => {
    let saved = false
    const savedValues = []
    for (const [key, val] of Object.entries(numInputs)) {
      if (val !== '' && val !== null && val !== undefined) {
        onAnswerChange(key, Number(val))
        saved = true
        savedValues.push(`${val}`)
      }
    }
    if (saved) {
      showToast('Value saved')
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'assistant',
          text: `Saved **${savedValues.join(', ')}** for "${currentQuestion.label || currentQuestion.text}".`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }
  }

  // Mini-ChatGPT natural language submission
  const handleSendMessage = (e) => {
    if (e) e.preventDefault()
    const text = inputMessage.trim()
    if (!text) return

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: nowTime,
    }

    setChatMessages((prev) => [...prev, userMsg])
    setInputMessage('')

    // Process NLP offline
    const result = processChatMessage(text, currentQuestion, answers)
    if (!result) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: `I received your message. You can enter values directly on the question card or say "change weight to 65 kg" or "cycle: irregular".`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      return
    }

    if (result.type === 'update') {
      onAnswerChange(result.fieldKey, result.value)
      showToast(`Updated: ${result.fieldLabel}`)

      // If category belongs elsewhere, switch to it smoothly
      if (result.categoryKey && result.categoryKey !== currentCategory.key) {
        const catIdx = ASSESSMENT_SECTIONS.findIndex((s) => s.key === result.categoryKey)
        if (catIdx >= 0) {
          setActiveCatIndex(catIdx)
          onSelectCategory?.(result.categoryKey)
        }
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: result.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } else if (result.type === 'nav') {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: result.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])

      if (result.action === 'next') {
        advanceNext()
      } else if (result.action === 'prev') {
        movePrev()
      } else if (result.action === 'save') {
        onSaveCategory?.(currentCategory.key)
        showToast(`Saved ${currentCategory.short}`)
      } else if (result.action === 'submit') {
        handleFinalReport()
      }
    } else {
      // reply, summary, help, greeting
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: result.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }
  }

  // Advance question only on explicit button click
  const advanceNext = () => {
    if (currentQuestion?.fields?.some((f) => f.type === 'number')) {
      handleSaveNumbers()
    }

    if (activeQIndex < currentQuestions.length - 1) {
      setActiveQIndex((prev) => prev + 1)
    } else {
      onSaveCategory?.(currentCategory.key)
      if (activeCatIndex < ASSESSMENT_SECTIONS.length - 1) {
        const nextIdx = activeCatIndex + 1
        setActiveCatIndex(nextIdx)
        setActiveQIndex(0)
        onSelectCategory?.(ASSESSMENT_SECTIONS[nextIdx].key)
        showToast(`Moved to ${ASSESSMENT_SECTIONS[nextIdx].short}`)
      } else {
        showToast('All 7 Evaluation Categories finished!')
      }
    }
  }

  const movePrev = () => {
    if (activeQIndex > 0) {
      setActiveQIndex((prev) => prev - 1)
    } else if (activeCatIndex > 0) {
      const prevCatIdx = activeCatIndex - 1
      setActiveCatIndex(prevCatIdx)
      const prevQuestions = ASSESSMENT_SECTIONS[prevCatIdx].questions || []
      setActiveQIndex(Math.max(0, prevQuestions.length - 1))
      onSelectCategory?.(ASSESSMENT_SECTIONS[prevCatIdx].key)
    }
  }

  const handleFinalReport = async () => {
    setIsSubmitting(true)
    try {
      await onFinalSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCurrentAnswered = currentQuestion?.fields?.some(
    (f) => answers[f.key] !== undefined && answers[f.key] !== '' && answers[f.key] !== null
  )

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-[#0d111c] text-slate-900 dark:text-slate-100 font-body relative overflow-hidden transition-colors">
      {/* ============================================================ */}
      {/* 1. TOP HEADER (Mobile-First Responsive Layout)               */}
      {/* ============================================================ */}
      <header className="h-12 sm:h-14 shrink-0 border-b border-rose-100/90 dark:border-white/10 bg-white/95 dark:bg-[#121826]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 z-30 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 truncate">
          {/* Model Badge */}
          <div className="flex items-center gap-1.5 rounded-lg sm:rounded-xl border border-rose-200/80 bg-rose-50/60 dark:border-white/10 dark:bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 shrink-0">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 dark:bg-bio-400 animate-pulse" />
            <span className="font-display text-xs font-bold text-slate-900 dark:text-white tracking-wide sm:hidden">
              Chatbot
            </span>
            <span className="font-display text-xs font-bold text-slate-900 dark:text-white tracking-wide hidden sm:inline">
              PCOS Chatbot Assistant
            </span>
          </div>

          {/* Category Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className="flex items-center gap-1 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 font-semibold max-w-[130px] sm:max-w-none truncate shadow-xs"
            >
              <span className="truncate">{currentCategory.short}</span>
              <span className="text-[10px] text-rose-600 dark:text-bio-300 font-mono shrink-0">
                {activeQIndex + 1}/{currentQuestions.length}
              </span>
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Category Dropdown Modal / Bottom-sheet */}
            {showCategoryMenu && (
              <div className="fixed inset-x-3 top-14 sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-1.5 w-auto sm:w-64 max-h-[75vh] overflow-y-auto rounded-2xl border border-rose-200 bg-white p-2.5 shadow-2xl backdrop-blur-2xl z-50 dark:border-white/20 dark:bg-slate-900/98">
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-rose-100 dark:border-white/10 mb-1">
                  <span>Switch Category</span>
                  <button onClick={() => setShowCategoryMenu(false)} className="text-slate-400 hover:text-slate-800 dark:hover:text-white sm:hidden">✕</button>
                </div>
                {ASSESSMENT_SECTIONS.map((sec, idx) => (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => {
                      setActiveCatIndex(idx)
                      setActiveQIndex(0)
                      onSelectCategory?.(sec.key)
                      setShowCategoryMenu(false)
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs ${
                      idx === activeCatIndex
                        ? 'bg-rose-50 text-rose-600 font-bold border border-rose-200 dark:bg-bio-500/20 dark:text-bio-300 dark:border-bio-400/30'
                        : 'text-slate-700 hover:bg-rose-50/50 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>0{sec.number} {sec.short}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{sec.questions?.length} Qs</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          <button
            type="button"
            onClick={() => {
              onSaveCategory?.(currentCategory.key)
              showToast(`Saved ${currentCategory.short} Axis`)
            }}
            className="btn-ghost !px-2.5 !py-1 text-xs"
          >
            Save
          </button>

          <button
            type="button"
            onClick={handleFinalReport}
            disabled={isSubmitting}
            className="btn-primary !px-3 !py-1 text-xs font-bold shadow-sm"
          >
            {isSubmitting ? 'Evaluating…' : 'Report'}
          </button>
        </div>
      </header>

      {/* OCR Status Banners */}
      {uploadStatus && (
        <div className="bg-rose-50 border-b border-rose-200 px-3 py-1.5 text-xs text-rose-700 flex items-center justify-between z-20 dark:bg-bio-500/15 dark:border-bio-400/30 dark:text-bio-200">
          <span className="truncate pr-2">{uploadStatus}</span>
          <button onClick={() => setUploadStatus(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold shrink-0">✕</button>
        </div>
      )}
      {uploadError && (
        <div className="bg-rose-500/15 border-b border-rose-400/30 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-300 flex items-center justify-between z-20">
          <span className="truncate pr-2">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold shrink-0">✕</button>
        </div>
      )}

      {/* Toast Notice */}
      <AnimatePresence>
        {toastNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-14 inset-x-3 sm:inset-x-auto sm:right-4 z-50 rounded-xl border border-rose-200 bg-white/95 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-xl text-center backdrop-blur-md dark:border-bio-400/40 dark:bg-slate-900/98 dark:text-bio-200"
          >
            {toastNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 2. CHAT AREA (Question Card & Options Down Below)            */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
          {/* Conversation Stream (Mini-ChatGPT Messages) */}
          <div className="space-y-3 pb-2">
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex gap-2.5 sm:gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[#E11D48] border border-rose-200 mt-0.5 text-xs font-bold font-mono shadow-2xs">
                    Dx
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#E11D48] text-white rounded-tr-xs shadow-sm font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-xs rounded-tl-xs whitespace-pre-line'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className={`block text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-rose-200' : 'text-slate-400'}`}>
                    {msg.time}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Question Message Box (Active Question Card) */}
          <div className="flex items-start gap-2.5 sm:gap-3.5 rounded-2xl border border-rose-100 bg-white p-4 sm:p-5 shadow-xs">
            {/* ChatGPT Bot Avatar */}
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 border border-rose-200 shadow-sm mt-0.5 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>

            {/* Question Text */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white">PCOS Clinical Assistant</span>
                <span className="text-[10px] text-rose-600 dark:text-bio-300 font-mono font-semibold">
                  Q{activeQIndex + 1} of {currentQuestions.length}
                </span>
                {currentQuestion?.category && (
                  <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/5 dark:text-slate-400 px-2 py-0.5 rounded-md hidden sm:inline font-medium">
                    {currentQuestion.category}
                  </span>
                )}
              </div>

              {/* Main Question Label */}
              <h2 className="font-display text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {currentQuestion?.label || currentQuestion?.text}
              </h2>

              {/* Description Context (if any) */}
              {currentQuestion?.description && (
                <p className="text-xs text-slate-600 bg-rose-50/60 dark:bg-white/5 dark:text-slate-300 p-2.5 sm:p-3 rounded-xl leading-relaxed border-l-2 border-rose-500 dark:border-bio-400">
                  {currentQuestion.description}
                </p>
              )}

              {/* Reference threshold */}
              {currentQuestion?.reference && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Reference range: <span className="text-slate-800 dark:text-slate-200 font-medium">{currentQuestion.reference}</span>
                </p>
              )}

              {/* Live BMI if metabolic */}
              {calculatedBmi && currentCategory.key === 'metabolic' && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-2 sm:p-2.5 text-xs flex items-center justify-between dark:border-bio-400/30 dark:bg-bio-500/10">
                  <span className="text-slate-700 dark:text-slate-300">Live BMI: <strong className="text-rose-600 dark:text-bio-300">{calculatedBmi.bmi} kg/m²</strong></span>
                  <span className="text-rose-700 dark:text-bio-200 text-[10px] font-bold uppercase">{calculatedBmi.category}</span>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* DOWN TEXT OPTIONS / INPUTS (Zero indent on mobile)          */}
          {/* ============================================================ */}
          <div className="pl-0 sm:pl-11 space-y-3 sm:space-y-4 w-full">
            {currentQuestion?.fields?.map((field) => {
              const currentVal = answers[field.key]

              // 1. YES / NO (Large thumb-friendly touch targets)
              if (field.type === 'yesno') {
                return (
                  <div key={field.key} className="space-y-1.5 sm:space-y-2 w-full">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">Select an option:</span>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
                      {['yes', 'no'].map((opt) => {
                        const isSelected = currentVal === opt
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => handleSelectOption(field.key, opt)}
                            className={`flex items-center justify-center gap-2 rounded-xl min-h-[48px] sm:min-h-[52px] py-3 px-3 font-display text-sm sm:text-base font-bold capitalize transition-all active:scale-[0.98] ${
                              isSelected
                                ? 'border-2 border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200 shadow-sm dark:border-bio-400 dark:bg-bio-400/25 dark:text-bio-300 dark:ring-bio-400/30'
                                : 'border border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/40 shadow-xs dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-bio-400/50 dark:hover:bg-white/10'
                            }`}
                          >
                            <span>{opt === 'yes' ? 'Yes' : 'No'}</span>
                            {isSelected && (
                              <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-rose-500 text-white dark:bg-bio-400 dark:text-slate-950 text-[10px] sm:text-xs font-bold">
                                ✓
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              // 2. SELECT OPTIONS (Multiple choices)
              if (field.type === 'select') {
                return (
                  <div key={field.key} className="space-y-1.5 sm:space-y-2 w-full">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">Choose an option:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                      {field.options?.map((opt) => {
                        const isSelected = currentVal === opt
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => handleSelectOption(field.key, opt)}
                            className={`flex items-center justify-between rounded-xl border min-h-[46px] p-3 text-left text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] ${
                              isSelected
                                ? 'border-2 border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200 font-bold shadow-sm dark:border-bio-400 dark:bg-bio-400/20 dark:text-bio-300 dark:ring-bio-400/30'
                                : 'border border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/40 shadow-xs dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-bio-400/50 dark:hover:bg-white/10'
                            }`}
                          >
                            <span className="pr-2">{opt}</span>
                            {isSelected && (
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white dark:bg-bio-400 dark:text-slate-950 text-[10px] font-bold">
                                ✓
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              // 3. SCALE 0 TO 4 (Optimized 5-column touch grid on mobile)
              if (field.type === 'scale') {
                const min = field.min ?? 0
                const max = field.max ?? 4
                const options = []
                for (let i = min; i <= max; i++) {
                  options.push(i)
                }

                return (
                  <div key={field.key} className="space-y-1.5 sm:space-y-2 w-full">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Select rating:</span>
                      {currentVal !== undefined && field.labels?.[currentVal] && (
                        <span className="text-rose-600 dark:text-bio-300 font-bold font-mono">
                          {currentVal} · {field.labels[currentVal]}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full">
                      {options.map((score) => {
                        const isSelected = currentVal === score
                        const labelText = field.labels?.[score] || score

                        return (
                          <button
                            type="button"
                            key={score}
                            onClick={() => handleSelectOption(field.key, score)}
                            className={`flex flex-col items-center justify-center rounded-xl border min-h-[50px] p-1.5 sm:p-2 text-center transition-all active:scale-[0.98] ${
                              isSelected
                                ? 'border-2 border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200 font-bold shadow-sm dark:border-bio-400 dark:bg-bio-400/25 dark:text-bio-300 dark:ring-bio-400/30'
                                : 'border border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/40 shadow-xs dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-bio-400/50 dark:hover:bg-white/10'
                            }`}
                          >
                            <span className="font-mono text-sm sm:text-base font-bold">{score}</span>
                            <span className="text-[9px] sm:text-[10px] opacity-80 leading-tight mt-0.5 truncate max-w-full">
                              {labelText}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              // 4. NUMBER INPUT (16px text-base to prevent mobile browser zoom)
              if (field.type === 'number') {
                return (
                  <div key={field.key} className="space-y-1.5 w-full max-w-md">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold truncate pr-2">
                        {field.label} {field.unit && <span className="text-rose-600 dark:text-bio-300 font-mono">({field.unit})</span>}
                      </label>
                      {(field.min !== undefined || field.max !== undefined) && (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {field.min ?? '—'} to {field.max ?? '—'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          step={field.step ?? 'any'}
                          min={field.min}
                          max={field.max}
                          placeholder={field.unit ? `Enter ${field.unit}…` : 'Enter value…'}
                          value={numInputs[field.key] ?? ''}
                          onChange={(e) =>
                            setNumInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleSaveNumbers()
                            }
                          }}
                          className="w-full rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none transition-all font-mono min-h-[46px] shadow-xs dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:border-bio-400 dark:focus:ring-0"
                        />
                        {field.unit && (
                          <span className="absolute right-3 top-3 text-xs font-mono text-slate-400 pointer-events-none">
                            {field.unit}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveNumbers}
                        className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold shrink-0 min-h-[46px] active:scale-95 dark:border-bio-400/40 dark:bg-bio-500/20 dark:text-bio-300"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )
              }

              // 5. TEXT INPUT
              return (
                <div key={field.key} className="space-y-1.5 w-full max-w-md">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">{field.label}:</label>
                  <input
                    type="text"
                    value={answers[field.key] ?? ''}
                    onChange={(e) => onAnswerChange(field.key, e.target.value)}
                    className="w-full rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-rose-500 focus:outline-none min-h-[46px] shadow-xs dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </div>
              )
            })}

            {/* Selected Value Indicator */}
            {isCurrentAnswered && (
              <div className="pt-1 text-xs text-rose-600 dark:text-bio-300 flex items-center gap-1.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 dark:bg-bio-400 shrink-0" />
                <span className="shrink-0">Recorded: </span>
                <strong className="text-slate-800 dark:text-white truncate">
                  {currentQuestion.fields
                    .map((f) => {
                      const v = answers[f.key]
                      if (v === undefined || v === '' || v === null) return null
                      return `${v === 'yes' ? 'Yes' : v === 'no' ? 'No' : v}${f.unit ? ' ' + f.unit : ''}`
                    })
                    .filter(Boolean)
                    .join(' · ')}
                </strong>
              </div>
            )}

            {/* Navigation Buttons Right Under Options */}
            <div className="pt-3 sm:pt-4 flex items-center justify-between gap-2.5 border-t border-rose-100 dark:border-white/10 w-full">
              <button
                type="button"
                onClick={movePrev}
                disabled={activeCatIndex === 0 && activeQIndex === 0}
                className="btn-ghost !px-3.5 !py-2.5 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none min-h-[44px] shrink-0"
              >
                Back
              </button>

              <button
                type="button"
                onClick={advanceNext}
                className="btn-primary flex-1 sm:flex-none justify-center !px-5 sm:!px-6 !py-2.5 text-xs font-bold shadow-md min-h-[44px]"
              >
                <span className="truncate">
                  {activeQIndex < currentQuestions.length - 1
                    ? 'Next Question'
                    : activeCatIndex < ASSESSMENT_SECTIONS.length - 1
                    ? `Next: ${ASSESSMENT_SECTIONS[activeCatIndex + 1].short}`
                    : 'Finish All Questions'}
                </span>
              </button>
            </div>
          </div>

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. STICKY BOTTOM PROMPT BAR (Thumb-Friendly on Mobile)        */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* 3. STICKY BOTTOM PROMPT BAR (Mini-ChatGPT Input Form)        */}
      {/* ============================================================ */}
      <footer className="px-3 py-2 sm:p-4 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-[#0d111c] dark:via-[#0d111c]/95 shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-20">
        <div className="max-w-2xl mx-auto space-y-1.5 sm:space-y-2">
          {/* Quick Yes/No suggestions above the prompt input */}
          {currentQuestion?.fields?.length === 1 && currentQuestion.fields[0].type === 'yesno' && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">Quick Answer:</span>
              <button
                type="button"
                onClick={() => handleSelectOption(currentQuestion.fields[0].key, 'yes')}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                  answers[currentQuestion.fields[0].key] === 'yes'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold dark:border-bio-400 dark:bg-bio-500/20 dark:text-bio-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleSelectOption(currentQuestion.fields[0].key, 'no')}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                  answers[currentQuestion.fields[0].key] === 'no'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold dark:border-bio-400 dark:bg-bio-500/20 dark:text-bio-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                }`}
              >
                No
              </button>
            </div>
          )}

          {/* Prompt Form with OCR Attachment + Message Input + Submit Button */}
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 rounded-xl sm:rounded-2xl border border-rose-200/90 bg-white p-1.5 sm:p-2 shadow-xl backdrop-blur-xl focus-within:border-rose-400 dark:border-white/10 dark:bg-[#151b2a] dark:focus-within:border-bio-400/50"
          >
            {/* Attachment for lab report */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl text-slate-500 hover:text-rose-600 active:bg-rose-50 transition-colors dark:text-slate-400 dark:hover:text-white dark:active:bg-white/10"
              title="Upload lab report (OCR)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={onFileUpload}
              className="hidden"
            />

            {/* Chat Input */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask or say 'change weight to 65kg', 'cycle: irregular'..."
              className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
            />

            {/* Circular Send / Advance Button */}
            {inputMessage.trim() ? (
              <button
                type="submit"
                className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-bold transition-all shadow-md shadow-rose-500/25 active:scale-90 dark:bg-bio-400 dark:text-slate-950 dark:hover:bg-bio-300"
                title="Send message"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={advanceNext}
                className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-bold transition-all shadow-md shadow-rose-500/25 active:scale-90 dark:bg-bio-400 dark:text-slate-950 dark:hover:bg-bio-300"
                title="Next Question"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </form>

          <p className="text-center text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            Rotterdam Consensus Rule Engine v3.1 • Offline NLP Mini-ChatGPT
          </p>
        </div>
      </footer>
    </div>
  )
}
