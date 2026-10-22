import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../components/GlassCard.jsx'
import { getCurrentUser, hasUserCompletedAssessment } from '../lib/api.js'
import { MoodSleepGraph, SymptomDistributionChart } from '../components/LogAnalyticsGraph.jsx'

// "My PCOS Journey" (insights-doc gap): a free-form cycle/symptom/mood log.
// This is kept entirely in the browser (localStorage) -- never sent to this
// app's backend, an AI provider, or anyone else. It's the person's own
// private notes, not part of the deterministic assessment or its data.
const STORAGE_KEY = 'pcos_journey_entries'

const CYCLE_OPTIONS = ['Not tracking', 'Period', 'Fertile window', 'Neither']
const MOOD_OPTIONS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Flat' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
]
const SYMPTOM_OPTIONS = [
  'Cramps', 'Bloating', 'Acne', 'Fatigue', 'Mood swings',
  'Cravings', 'Headache', 'Hair thinning', 'Trouble sleeping',
]

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Journey() {
  const [entries, setEntries] = useState([])
  const [date, setDate] = useState(todayISO())
  const [cycle, setCycle] = useState('Not tracking')
  const [mood, setMood] = useState(0)
  const [sleepHours, setSleepHours] = useState('')
  const [symptoms, setSymptoms] = useState([])
  const [notes, setNotes] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [hasCompletedAssessment, setHasCompletedAssessment] = useState(true)

  useEffect(() => {
    setEntries(loadEntries())
    const cur = getCurrentUser()
    if (cur?.email) {
      hasUserCompletedAssessment(cur.email).then((completed) => {
        setHasCompletedAssessment(completed)
      })
    } else {
      setHasCompletedAssessment(false)
    }
  }, [])

  const persist = (next) => {
    setEntries(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStorageError(false)
    } catch {
      // Private-browsing mode or storage disabled -- the entry still shows
      // for this session, it just won't survive a reload.
      setStorageError(true)
    }
  }

  const toggleSymptom = (s) => {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const handleAdd = (e) => {
    e.preventDefault()
    const entry = {
      id: `${Date.now()}`,
      date,
      cycle,
      mood: mood || null,
      sleep_hours: sleepHours === '' ? null : Number(sleepHours),
      symptoms,
      notes: notes.trim(),
    }
    const next = [entry, ...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
    persist(next)
    setMood(0)
    setSleepHours('')
    setSymptoms([])
    setNotes('')
  }

  const handleDelete = (id) => {
    persist(entries.filter((e) => e.id !== id))
  }

  return (
    <div className="relative min-h-screen bg-[#F5F6F4]">
      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 pt-20 sm:pt-24">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <span className="chip mb-2 border-purple-200/80 bg-purple-50/70 text-purple-900 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                Wellness Tracking
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-[#202321]">
                Daily Log
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Track daily mood, physical symptoms, and sleep duration.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/cycle-log"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:border-purple-300 hover:text-purple-700 transition-colors"
              >
                <span>Daily Cycle Log</span>
              </Link>
            </div>
          </div>

          {!hasCompletedAssessment && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-3xl border border-amber-200 bg-amber-50/70 p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold text-sm">
                  !
                </span>
                <div>
                  <h3 className="font-heading text-sm sm:text-base font-semibold text-amber-900">
                    Assessment Recommended
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5 max-w-lg">
                    Complete your clinical assessment to correlate daily symptoms with your phenotype.
                  </p>
                </div>
              </div>
              <Link
                to="/assessment"
                className="btn-primary !px-4 !py-2 text-xs font-semibold rounded-full shadow-xs"
              >
                Take Assessment
              </Link>
            </motion.div>
          )}

          {/* New Entry Form Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
            <h2 className="font-heading text-xl font-semibold text-[#202321] mb-5">
              Today's Health Check-in
            </h2>

            <form onSubmit={handleAdd} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Cycle Phase
                  </label>
                  <select
                    value={cycle}
                    onChange={(e) => setCycle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                  >
                    {CYCLE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Mood Today
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((m) => (
                    <button
                      type="button"
                      key={m.value}
                      onClick={() => setMood(m.value === mood ? 0 : m.value)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                        mood === m.value
                          ? 'border-[#7C3AED] bg-[#7C3AED] text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Sleep Duration <span className="text-slate-400 font-normal lowercase">(hours, optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="w-full sm:w-56 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                  placeholder="e.g. 7.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Observed Symptoms
                </label>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOM_OPTIONS.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleSymptom(s)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                        symptoms.includes(s)
                          ? 'border-rose-300 bg-rose-50 text-rose-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Clinical Notes & Observations
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                  placeholder="Record energy levels, food cravings, exercise tolerance, or cycle changes..."
                />
              </div>

              {storageError && (
                <p className="text-xs text-rose-600">
                  Your browser blocked local storage, so this entry won't be saved after you leave this page.
                </p>
              )}

              <button
                type="submit"
                className="btn-primary !px-6 !py-3 text-sm font-semibold rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                Save Daily Check-in
              </button>
            </form>
          </div>

          {/* Visual Mood, Sleep & Symptom Graph Trackers */}
          <div className="mb-8 space-y-6">
            <MoodSleepGraph data={entries} title="Mood Rating & Sleep Recovery Curve" />
            <SymptomDistributionChart data={entries} />
          </div>

          {/* Past Entries */}
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-semibold text-[#202321]">
              Past Check-in History ({entries.length})
            </h2>

            {entries.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
                <p className="text-sm text-slate-500">No journal entries saved yet. Fill out the check-in form above to begin tracking.</p>
              </div>
            ) : (
              <AnimatePresence>
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900">{entry.date}</span>
                          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                            {entry.cycle}
                          </span>
                          {entry.mood ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              Mood: {MOOD_OPTIONS.find((m) => m.value === entry.mood)?.label}
                            </span>
                          ) : null}
                          {entry.sleep_hours != null ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              {entry.sleep_hours}h sleep
                            </span>
                          ) : null}
                        </div>

                        {entry.symptoms?.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {entry.symptoms.map((sym) => (
                              <span key={sym} className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-200">
                                {sym}
                              </span>
                            ))}
                          </div>
                        )}

                        {entry.notes && (
                          <p className="mt-2.5 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {entry.notes}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="shrink-0 text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete entry"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <p className="mt-10 text-center text-xs text-slate-500">
            Have feedback on this clinical tool? <Link to="/feedback" className="text-purple-600 hover:underline font-semibold">Let us know</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
