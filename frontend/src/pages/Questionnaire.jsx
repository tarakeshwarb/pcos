import { AnimatePresence, motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard.jsx'
import ProgressRail from '../components/ProgressRail.jsx'
import QuestionCard from '../components/QuestionCard.jsx'
import { submitAssessment } from '../lib/api.js'
import { questionnaire, liveBmi } from '../lib/ruleEngine.js'
import { PCOS_CASE, HEALTHY_CASE } from '../data/demoProfiles.js'

// Order per mentor feedback (Sep 2026): Metabolic -> Hormonal -> Adrenal ->
// Inflammatory, with the Rotterdam first-line gate ahead of everything and
// the mitochondrial "Energy Screen" kept reachable right after the four
// phenotypes (it was dropped from the flow in an earlier pass -- restored
// here since its questions still feed the mitochondrial-support recommendation).
const PHENOTYPE_KEYS = ['metabolic', 'hormonal', 'adrenal', 'inflammatory']
const PHENOTYPE_STEPS = PHENOTYPE_KEYS.map((id) => ({
  key: id,
  label: questionnaire.phenotypes[id].label.split(' ')[0],
  fullLabel: questionnaire.phenotypes[id].label,
  questions: questionnaire.phenotypes[id].questions,
}))

const STEPS = [
  { key: 'first_line', label: 'First-Line Testing', fullLabel: questionnaire.first_line?.label || 'First-Line Testing', questions: questionnaire.first_line?.questions || [] },
  ...PHENOTYPE_STEPS,
  { key: 'mitochondrial', label: 'Energy Screen', fullLabel: questionnaire.mitochondrial_axis?.label || 'Energy Screen', questions: questionnaire.mitochondrial_axis?.questions || [] },
  { key: 'exclusions', label: 'Exclusions', fullLabel: questionnaire.exclusions?.label || 'Exclusions', questions: questionnaire.exclusions?.questions || [] },
  { key: 'goals', label: 'Your Goals' },
  { key: 'review', label: 'Review' },
]

// For a field shared by two questions in two different steps (e.g. sym_acne
// in Hormonal+Inflammatory, sleep_apnea/hypoxia in Metabolic+Energy Screen),
// only the step where it's asked FIRST in the flow should collect it -- every
// later step just shows it as already answered.
const PRIMARY_STEP_FOR_SHARED_FIELD = {}
for (const step of STEPS) {
  for (const q of step.questions || []) {
    if (q.shared_field && !(q.shared_field in PRIMARY_STEP_FOR_SHARED_FIELD)) {
      PRIMARY_STEP_FOR_SHARED_FIELD[q.shared_field] = step.key
    }
  }
}

export default function Questionnaire() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [goals, setGoals] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const [extractedFlags, setExtractedFlags] = useState({})
  const [demoProfile, setDemoProfile] = useState(null)

  useEffect(() => {
    // Picked up a demo profile on the Registration page? (See "Fill PCOS
    // Case" / "Fill Healthy Case" there -- those stash the key in
    // sessionStorage so it carries over here without a page reload losing
    // it.) This takes priority over OCR auto-fill below since it's a
    // deliberate, complete, demo choice.
    const demoKey = sessionStorage.getItem('pcos_demo_profile')
    if (demoKey === 'pcos' || demoKey === 'healthy') {
      const profile = demoKey === 'pcos' ? PCOS_CASE : HEALTHY_CASE
      setAnswers(profile.answers)
      setGoals(profile.goals)
      setDemoProfile(demoKey)
      return
    }

    // Auto-fill from a lab report parsed locally on the Registration page
    // (see lib/reportExtractor.js) -- each value also carries a normal /
    // overriding flag computed against this same questionnaire's thresholds.
    const extracted = sessionStorage.getItem('pcos_extracted_report')
    if (extracted) {
      try {
        const flagged = JSON.parse(extracted)
        setAnswers((prev) => {
          const next = { ...prev }
          for (const [key, { value }] of Object.entries(flagged)) next[key] = value
          return next
        })
        setExtractedFlags(flagged)
      } catch (e) {
        // Ignore parse error -- user can still fill the form by hand
      }
    }
  }, [])

  const step = STEPS[stepIndex]

  const handleAnswerChange = (key, value) => setAnswers((a) => ({ ...a, [key]: value }))
  const toggleGoal = (goal) =>
    setGoals((g) => (g.includes(goal) ? g.filter((x) => x !== goal) : [...g, goal]))

  const canAdvance = true // Validations can be added here if needed

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const registration = JSON.parse(sessionStorage.getItem('pcos_registration') || '{}')
      const { region_preference, diet_type, ...demographics } = registration
      const payload = {
        demographics,
        answers,
        primary_goals: goals,
        region_preference: region_preference || 'South Indian',
        diet_type: diet_type || 'Vegetarian',
      }
      const result = await submitAssessment(payload)
      sessionStorage.setItem('pcos_last_result', JSON.stringify(result))
      navigate(result.source === 'backend' ? `/results/${result.id}` : '/results')
    } catch (e) {
      setError('Something went wrong scoring your responses. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function next() {
    if (stepIndex === STEPS.length - 1) return handleSubmit()
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Presentation/demo helper -- loads one of the two shared demo profiles
  // (see data/demoProfiles.js) for walking a reviewer through the live
  // questionnaire page by page (not just jumping to a result). Also
  // available on the Registration page, which stashes the chosen profile
  // key in sessionStorage so it's already applied here via the mount
  // effect above if you land here straight from there.
  function loadDemo(profileKey) {
    const profile = profileKey === 'pcos' ? PCOS_CASE : HEALTHY_CASE
    sessionStorage.setItem('pcos_registration', JSON.stringify(profile.registration))
    sessionStorage.setItem('pcos_demo_profile', profileKey)
    setAnswers(profile.answers)
    setGoals(profile.goals)
    setDemoProfile(profileKey)
    // Deliberately NOT changing stepIndex -- stays on whatever step you're
    // currently viewing so the form in front of you fills in immediately,
    // and every step you walk to next (Back/Continue) is already filled too.
  }

  return (
    <div className="relative">
      <div className="relative mx-auto max-w-4xl px-6 py-14 pt-24">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {demoProfile && (
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
              Demo loaded: <span className="text-bio-200">{demoProfile === 'pcos' ? 'PCOS case' : 'Healthy / no-PCOS case'}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => loadDemo('pcos')}
            className="btn-ghost !px-4 !py-2 text-xs text-slate-400 hover:text-bio-200"
            title="Fills every step with a sample PCOS-positive case (clears Rotterdam criteria, Metabolic-primary)"
          >
            ⚡ Fill PCOS Case
          </button>
          <button
            type="button"
            onClick={() => loadDemo('healthy')}
            className="btn-ghost !px-4 !py-2 text-xs text-slate-400 hover:text-bio-200"
            title="Fills every step with a sample healthy case (normal values throughout, does not meet Rotterdam criteria)"
          >
            ⚡ Fill Healthy Case
          </button>
        </div>
        <ProgressRail steps={STEPS} currentIndex={stepIndex} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {step.key === 'goals' && (
              <GoalsStep goals={goals} onToggle={toggleGoal} />
            )}

            {step.key === 'review' && (
              <ReviewStep answers={answers} goals={goals} />
            )}

            {step.questions && (
              <PhenotypeStep step={step} answers={answers} onChange={handleAnswerChange} extractedFlags={extractedFlags} />
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-6 rounded-xl border border-alert-500/30 bg-alert-500/10 px-4 py-3 text-sm text-alert-400">
            {error}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={back}
            disabled={stepIndex === 0}
            className="btn-ghost disabled:pointer-events-none disabled:opacity-30"
          >
            Back
          </button>
          <button onClick={next} disabled={!canAdvance || submitting} className="btn-primary disabled:opacity-40">
            {submitting ? (
              <>
                <Spinner /> Scoring…
              </>
            ) : stepIndex === STEPS.length - 1 ? (
              'See My Results'
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionIntro({ title, desc }) {
  return (
    <div className="mb-2">
      <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
      <p className="mt-1.5 text-sm text-slate-400">{desc}</p>
    </div>
  )
}

function PhenotypeStep({ step, answers, onChange, extractedFlags = {} }) {
  const bmi = step.key === 'metabolic' ? liveBmi(answers.height_cm, answers.weight_kg) : null
  return (
    <>
      <SectionIntro
        title={step.fullLabel}
        desc="Fill in the relevant details below."
      />
      {bmi && (
        <GlassCard className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-slate-400">Your BMI (live, as you type)</span>
          <span className="font-display text-lg font-semibold text-bio-200">
            {bmi.bmi} <span className="text-sm font-normal text-slate-400">· {bmi.category}</span>
          </span>
        </GlassCard>
      )}
      {step.questions.map((q, i) => {
        const carriedOver = Boolean(
          q.shared_field &&
          answers[q.shared_field] !== undefined &&
          step.key !== PRIMARY_STEP_FOR_SHARED_FIELD[q.shared_field]
        )
        const reportFlag = q.fields?.map((f) => extractedFlags[f.key]).find(Boolean)
        return (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            answers={answers}
            onChange={onChange}
            carriedOver={carriedOver}
            reportFlag={reportFlag}
          />
        )
      })}
    </>
  )
}

function GoalsStep({ goals, onToggle }) {
  return (
    <>
      <SectionIntro
        title="Primary health goal(s)"
        desc="Pick as many as apply. These don't change your phenotype score, but they're shown alongside your protocol."
      />
      <GlassCard className="grid gap-2.5 p-6 sm:grid-cols-2">
        {questionnaire.primary_goals?.map((g) => (
          <button
            type="button"
            key={g}
            onClick={() => onToggle(g)}
            className="tick-toggle"
            data-active={goals.includes(g)}
          >
            <span className="text-sm text-slate-200">{g}</span>
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                goals.includes(g) ? 'border-bio-300 bg-bio-300' : 'border-white/20'
              }`}
            >
              {goals.includes(g) && (
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-void" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </button>
        ))}
      </GlassCard>
    </>
  )
}

function ReviewStep({ answers, goals }) {
  const answeredCount = Object.values(answers).filter((v) => v !== '' && v !== undefined).length
  return (
    <>
      <SectionIntro title="Review & submit" desc="Your answers are scored automatically." />
      <GlassCard className="space-y-4 p-6">
        <Row label="Fields answered" value={`${answeredCount}`} />
        <Row label="Goals selected" value={`${goals.length}`} />
      </GlassCard>
      <p className="px-1 text-xs text-slate-500">
        Click "See My Results" to run the scoring engine, override checks, and classification.
      </p>
    </>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
