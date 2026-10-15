import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../components/GlassCard.jsx'

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

  useEffect(() => {
    setEntries(loadEntries())
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
    <div className="relative mx-auto max-w-3xl px-6 py-20 pt-28">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="text-center mb-10">
          <span className="chip mx-auto mb-4">My PCOS Journey</span>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">A running log, just for you</h1>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            Cycle, sleep, mood and symptom notes — saved only in this browser, never uploaded anywhere.
            Clearing your browser data clears this too.
          </p>
        </div>

        <GlassCard className="p-8 sm:p-10 mb-10">
          <form onSubmit={handleAdd} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Cycle</label>
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                >
                  {CYCLE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Mood today</label>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => setMood(m.value === mood ? 0 : m.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      mood === m.value
                        ? 'border-bio-300/60 bg-bio-400/15 text-bio-100 shadow-glow'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Sleep <span className="text-slate-500">(hours, optional)</span>
              </label>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="w-full sm:w-48 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                placeholder="e.g. 7.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Symptoms today</label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_OPTIONS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                      symptoms.includes(s)
                        ? 'border-plasma-400/60 bg-plasma-500/15 text-plasma-100'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                placeholder="Anything else worth remembering about today..."
              />
            </div>

            {storageError && (
              <p className="text-xs text-alert-400">
                Your browser blocked local storage, so this entry won't be saved after you leave this page.
              </p>
            )}

            <button type="submit" className="btn-primary w-full justify-center">Save entry</button>
          </form>
        </GlassCard>

        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-slate-100">Past entries</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500">No entries yet — your first one will show up here.</p>
          ) : (
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <GlassCard className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold text-slate-100">{entry.date}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {entry.cycle}
                          {entry.mood ? ` · Mood: ${MOOD_OPTIONS.find((m) => m.value === entry.mood)?.label}` : ''}
                          {entry.sleep_hours != null ? ` · ${entry.sleep_hours}h sleep` : ''}
                        </p>
                        {entry.symptoms?.length > 0 && (
                          <p className="mt-2 text-xs text-plasma-300">{entry.symptoms.join(', ')}</p>
                        )}
                        {entry.notes && <p className="mt-2 text-sm text-slate-300">{entry.notes}</p>}
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="shrink-0 text-xs font-medium text-slate-500 hover:text-alert-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Have feedback on this tool? <Link to="/feedback" className="text-bio-300 hover:text-bio-200">Let us know</Link>.
        </p>
      </motion.div>
    </div>
  )
}
