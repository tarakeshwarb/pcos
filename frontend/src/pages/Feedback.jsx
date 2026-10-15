import { useState } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '../components/GlassCard.jsx'
import { submitFeedback } from '../lib/api.js'

const RATINGS = [1, 2, 3, 4, 5]

export default function Feedback() {
  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!comments.trim()) return
    setSubmitting(true)
    await submitFeedback({
      rating: rating || null,
      comments: comments.trim(),
      contact_email: contactEmail.trim() || null,
      context: 'feedback-page',
    })
    setSubmitting(false)
    setDone(true)
  }

  return (
    <div className="relative mx-auto max-w-2xl px-6 py-20 pt-28">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="text-center mb-10">
          <span className="chip mx-auto mb-4">Feedback</span>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Tell us what to fix</h1>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            This is feedback about the app, not a medical record — it stays in this project's own
            database and is only read by the team building this tool.
          </p>
        </div>

        <GlassCard className="p-8 sm:p-10">
          {done ? (
            <div className="text-center py-6">
              <p className="font-display text-lg text-bio-300">Thank you — that's been recorded.</p>
              <p className="mt-2 text-sm text-slate-400">The team will read it when reviewing the project.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  How would you rate your experience? <span className="text-slate-500">(optional)</span>
                </label>
                <div className="flex gap-2">
                  {RATINGS.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRating(r === rating ? 0 : r)}
                      className={`h-11 w-11 rounded-xl border text-sm font-semibold transition-all ${
                        rating >= r
                          ? 'border-bio-300/60 bg-bio-400/15 text-bio-100 shadow-glow'
                          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  What worked, what didn't, what's missing?
                </label>
                <textarea
                  required
                  rows={5}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                  placeholder="Be as specific as you like..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email <span className="text-slate-500">(optional — only if you want a reply)</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                  placeholder="jane@example.com"
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-wait">
                {submitting ? 'Sending…' : 'Send Feedback'}
              </button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}
