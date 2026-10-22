import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getCurrentUser,
  hasUserCompletedAssessment,
  saveDailyLog,
  fetchDailyLogs,
  deleteDailyLog,
} from '../lib/api.js'
import { CycleTrendGraph } from '../components/LogAnalyticsGraph.jsx'

const CYCLE_PHASES = [
  { id: 'Period', label: 'Period / Menstruation', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'Follicular', label: 'Follicular / Fertile Window', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'Ovulation', label: 'Ovulation Peak', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'Luteal', label: 'Luteal Phase', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'Not tracking', label: 'Irregular / Not Tracking', color: 'bg-slate-100 text-slate-700 border-slate-200' },
]

const FLOW_INTENSITIES = ['None', 'Spotting', 'Light', 'Medium', 'Heavy']

export default function CycleLog() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveNotice, setSaveNotice] = useState(false)

  // Form state
  const [cycleData, setCycleData] = useState({
    date: new Date().toISOString().slice(0, 10),
    cycle_phase: 'Period',
    flow: 'Medium',
    sleep_hours: '7.5',
    bbt: '',
    notes: '',
  })

  useEffect(() => {
    const cur = getCurrentUser()
    setUser(cur)

    if (cur?.email) {
      hasUserCompletedAssessment(cur.email).then((completed) => {
        setHasCompleted(completed)
      })

      fetchDailyLogs(cur.email).then((data) => {
        setEntries(data || [])
        setLoading(false)
      })
    } else {
      // Guest or local mode
      try {
        const local = localStorage.getItem('pcos_cycle_logs')
        if (local) setEntries(JSON.parse(local))
      } catch {}
      setLoading(false)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newEntry = {
      id: `${Date.now()}`,
      date: cycleData.date,
      cycle_phase: cycleData.cycle_phase,
      flow: cycleData.flow,
      sleep_hours: cycleData.sleep_hours ? Number(cycleData.sleep_hours) : null,
      bbt: cycleData.bbt ? Number(cycleData.bbt) : null,
      notes: cycleData.notes.trim(),
    }

    const updated = [newEntry, ...entries]
    setEntries(updated)
    localStorage.setItem('pcos_cycle_logs', JSON.stringify(updated))

    if (user?.email) {
      await saveDailyLog(user.email, newEntry)
    }

    setSaveNotice(true)
    setTimeout(() => setSaveNotice(false), 2500)
    setCycleData((prev) => ({ ...prev, notes: '', bbt: '' }))
  }

  const handleDelete = async (id) => {
    const updated = entries.filter((e) => e.id !== id)
    setEntries(updated)
    localStorage.setItem('pcos_cycle_logs', JSON.stringify(updated))
    await deleteDailyLog(id)
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
                Cycle Monitoring
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-[#202321]">
                Daily Cycle Log
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Track cycle phases, flow intensity, and basal body temperature.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/journey"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:border-purple-300 hover:text-purple-700 transition-colors"
              >
                <span>Daily Log</span>
              </Link>
            </div>
          </div>

          {!hasCompleted && (
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
                    Complete your intake assessment to correlate cycle patterns with your root phenotype.
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

          {/* Cycle Check-in Form Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs mb-8">
            <h2 className="font-heading text-xl font-semibold text-[#202321] mb-5">
              Record Cycle Phase & Metrics
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={cycleData.date}
                    onChange={(e) => setCycleData({ ...cycleData, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Cycle Phase
                  </label>
                  <select
                    value={cycleData.cycle_phase}
                    onChange={(e) => setCycleData({ ...cycleData, cycle_phase: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                  >
                    {CYCLE_PHASES.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Bleeding / Flow
                  </label>
                  <select
                    value={cycleData.flow}
                    onChange={(e) => setCycleData({ ...cycleData, flow: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                  >
                    {FLOW_INTENSITIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Sleep Duration <span className="text-slate-400 font-normal lowercase">(hours)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={cycleData.sleep_hours}
                    onChange={(e) => setCycleData({ ...cycleData, sleep_hours: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                    placeholder="e.g. 8.0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Basal Temperature <span className="text-slate-400 font-normal lowercase">(°F, optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="95"
                    max="105"
                    value={cycleData.bbt}
                    onChange={(e) => setCycleData({ ...cycleData, bbt: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                    placeholder="e.g. 97.8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Cycle Notes & Ovulation Symptoms
                </label>
                <textarea
                  rows={2}
                  value={cycleData.notes}
                  onChange={(e) => setCycleData({ ...cycleData, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none transition-colors"
                  placeholder="Note cervical mucus consistency, cramping, breast tenderness, or energy changes..."
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="btn-primary !px-6 !py-3 text-sm font-semibold rounded-full shadow-xs"
                >
                  Save Cycle Check-in
                </button>
                {saveNotice && (
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                    ✓ Saved to daily_logs table!
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Visual Cycle & BBT Graph Tracker */}
          <div className="mb-8">
            <CycleTrendGraph data={entries} title="Cycle & Basal Body Temperature Trajectory" />
          </div>

          {/* Historical Log Entries */}
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-semibold text-[#202321]">
              Recent Cycle Log History ({entries.length})
            </h2>

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-xs">
                Loading cycle logs…
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
                <p className="text-sm text-slate-500">No cycle logs recorded yet. Submit your first check-in above.</p>
              </div>
            ) : (
              <AnimatePresence>
                {entries.map((entry) => {
                  const phaseObj = CYCLE_PHASES.find((p) => p.id === (entry.cycle_phase || entry.cycle)) || {
                    label: entry.cycle_phase || entry.cycle || 'Tracked',
                    color: 'bg-purple-50 text-purple-700 border-purple-200',
                  }

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-900">{entry.date}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${phaseObj.color}`}>
                              {phaseObj.label}
                            </span>
                            {entry.flow && entry.flow !== 'None' && (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-200">
                                Flow: {entry.flow}
                              </span>
                            )}
                            {entry.sleep_hours != null && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                {entry.sleep_hours}h sleep
                              </span>
                            )}
                            {entry.bbt != null && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                                BBT: {entry.bbt}°F
                              </span>
                            )}
                          </div>

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
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
