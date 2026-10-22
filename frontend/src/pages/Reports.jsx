import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getCurrentUser, fetchUserSubmissions, hasUserCompletedAssessment } from '../lib/api.js'

const PHENOTYPE_THEMES = {
  metabolic: {
    label: 'Metabolic PCOS',
    tag: 'Insulin-Resistant',
    color: '#D97706',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    badge: 'border-amber-300 bg-amber-100 text-amber-900',
  },
  hormonal: {
    label: 'Hormonal PCOS',
    tag: 'Ovarian / Post-Pill',
    color: '#0D9488',
    border: 'border-teal-200',
    bg: 'bg-teal-50',
    badge: 'border-teal-300 bg-teal-100 text-teal-900',
  },
  inflammatory: {
    label: 'Inflammatory PCOS',
    tag: 'Immune / Gut-Driven',
    color: '#E11D48',
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    badge: 'border-rose-300 bg-rose-100 text-rose-900',
  },
  adrenal: {
    label: 'Adrenal PCOS',
    tag: 'Stress-Driven',
    color: '#7C3AED',
    border: 'border-purple-200',
    bg: 'bg-purple-50',
    badge: 'border-purple-300 bg-purple-100 text-purple-900',
  },
}

export default function Reports() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [latestReport, setLatestReport] = useState(null)

  useEffect(() => {
    const cur = getCurrentUser()
    if (!cur) {
      navigate('/login?redirect=/reports', { replace: true })
      return
    }
    setCurrentUser(cur)

    // Check completion status
    hasUserCompletedAssessment(cur.email).then((completed) => {
      setHasCompleted(completed)
    })

    // Load cached latest result if available
    let cachedResult = null
    try {
      const cached = sessionStorage.getItem('pcos_last_result')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.id !== 'preview' && (parsed.classification || parsed.scores)) {
          cachedResult = parsed
          setLatestReport(parsed)
        }
      }
      if (!cachedResult && cur.email) {
        const local = localStorage.getItem(`pcos_assessment_${cur.email}`)
        if (local && local !== 'true') {
          const parsed = JSON.parse(local)
          if (parsed && (parsed.classification || parsed.scores)) {
            cachedResult = parsed
            setLatestReport(parsed)
          }
        }
      }
    } catch (e) {
      console.error(e)
    }

    // Fetch user submission history from Supabase
    if (cur.email) {
      fetchUserSubmissions(cur.email)
        .then((list) => {
          let resultList = list || []
          if (resultList.length === 0 && cachedResult) {
            resultList = [cachedResult]
          }
          setSubmissions(resultList)
          if (resultList.length > 0 && !cachedResult) {
            setLatestReport(resultList[0])
          }
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [navigate])

  return (
    <div className="relative min-h-screen bg-[#F5F6F4]">
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 pt-20 sm:pt-24">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6"
        >
          <div>
            <span className="chip mb-2 border-purple-200/80 bg-purple-50/70 text-purple-900 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
              Clinical Reports
            </span>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-[#202321]">
              Assessment Reports
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              Diagnostic reports, phenotype classifications, and clinical records.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/assessment"
              className="btn-primary !px-4 !py-2 text-xs font-semibold rounded-full shadow-sm"
            >
              + New Assessment
            </Link>
          </div>
        </motion.div>

        {/* Assessment Required Top Alert if not completed */}
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
                  No Reports Generated Yet
                </h3>
                <p className="text-xs text-amber-800 mt-0.5 max-w-lg">
                  Complete the clinical questionnaire to calculate your phenotype and generate your report.
                </p>
              </div>
            </div>
            <Link
              to="/assessment"
              className="btn-primary !px-5 !py-2.5 text-xs font-semibold rounded-full shadow-xs"
            >
              Take Assessment
            </Link>
          </motion.div>
        )}

        {/* Latest Report Featured Card */}
        {latestReport && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7C3AED] text-white font-bold text-sm shadow-xs font-mono">
                  Dx
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">
                      Latest Diagnostic Report
                    </span>
                    <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.2 text-[10px] font-bold text-emerald-800">
                      Active
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl font-semibold text-[#202321] mt-0.5">
                    {latestReport.classification?.classification || 'Primary Phenotype Complete'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  to={latestReport.id ? `/results/${latestReport.id}` : '/results'}
                  className="btn-primary !px-5 !py-2.5 text-xs font-semibold rounded-full shadow-sm"
                >
                  View Full Report
                </Link>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <span className="text-xs text-slate-500 font-medium">Evaluation Date</span>
                <p className="mt-1 font-heading text-base font-semibold text-[#202321]">
                  {latestReport.created_at
                    ? new Date(latestReport.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Current Intake'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <span className="text-xs text-slate-500 font-medium">Rotterdam Diagnostic Status</span>
                <p className="mt-1 font-heading text-base font-semibold text-emerald-700">
                  Confirmed Criteria
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <span className="text-xs text-slate-500 font-medium">Phenotype Confidence</span>
                <p className="mt-1 font-heading text-base font-semibold text-[#E11D48]">
                  {latestReport.classification?.score !== undefined
                    ? `${Math.round(latestReport.classification.score)}% Concordance`
                    : 'High Concordance'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Past Reports History List Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-heading text-xl font-semibold text-[#202321]">
                Past Reports History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved records from your clinical intakes in the Supabase <code>submissions</code> registry.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 font-mono">
              {submissions.length} Total {submissions.length === 1 ? 'Report' : 'Reports'}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <div className="mx-auto h-6 w-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
              Loading your past reports…
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#E11D48] border border-rose-200 mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-heading text-base font-semibold text-[#202321]">No past reports on record</p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Once you complete an assessment, your verified clinical evaluations and printable PDF reports will be listed here.
              </p>
              <Link
                to="/assessment"
                className="btn-primary mt-5 inline-flex !px-6 !py-2.5 text-xs font-semibold rounded-full shadow-sm"
              >
                Take Assessment
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub, idx) => {
                const date = sub.created_at
                  ? new Date(sub.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent'
                const diagnosis =
                  sub.classification?.classification || 'PCOS Diagnostic Assessment'
                const rawPhenotype = (sub.classification?.classification || '').toLowerCase()
                const themeKey = Object.keys(PHENOTYPE_THEMES).find((k) => rawPhenotype.includes(k)) || 'metabolic'
                const theme = PHENOTYPE_THEMES[themeKey]

                return (
                  <div
                    key={sub.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-slate-300 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs font-bold text-slate-700">
                        #{submissions.length - idx}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-heading text-base font-semibold text-[#202321]">
                            {diagnosis}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${theme.badge}`}>
                            {theme.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Completed on {date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Link
                        to={`/results/${sub.id}`}
                        className="btn-ghost !px-4 !py-2 text-xs font-semibold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-full shadow-xs"
                      >
                        View Report
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
