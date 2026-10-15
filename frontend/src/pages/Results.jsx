import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GlassCard from '../components/GlassCard.jsx'
import PhenotypeRadar from '../components/PhenotypeRadar.jsx'
import SeverityRing from '../components/SeverityRing.jsx'
import { fetchResult } from '../lib/api.js'

const PHENOTYPE_META = {
  adrenal: { label: 'Adrenal', color: '#a78bfa' },
  hormonal: { label: 'Hormonal', color: '#4bf3d6' },
  inflammatory: { label: 'Inflammatory', color: '#ff8a80' },
  metabolic: { label: 'Metabolic', color: '#fbbf24' },
  mitochondrial: { label: 'Mitochondrial', color: '#60a5fa' },
}

export default function Results() {
  const { id } = useParams()
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const cached = sessionStorage.getItem('pcos_last_result')
    if (cached) {
      setResult(JSON.parse(cached))
      return
    }
    if (id) {
      fetchResult(id).then(setResult).catch(() => setError('Could not load this result.'))
    } else {
      setError('No result to show yet.')
    }
  }, [id])

  if (error) return <EmptyState message={error} />
  if (!result) return <LoadingState />

  const { scores, classification, recommendation } = result
  const isMixed = classification.classification.startsWith('Mixed')
  const isInconclusive = classification.classification.startsWith('Inconclusive')
  const isExcluded = classification.classification === 'Excluded'
  // Rotterdam-gated-out and Excluded results never got a phenotype tally, so
  // there's no diet/exercise protocol (or mitochondrial block) to show.
  const hasNoRecommendation = isInconclusive || isExcluded

  return (
    <div className="relative">
      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <ClassificationBanner classification={classification} isMixed={isMixed} isInconclusive={isInconclusive} isExcluded={isExcluded} source={result.source} />

        {/* Radar + severity rings */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <GlassCard strong className="flex items-center justify-center p-6">
            <PhenotypeRadar scores={scores} primaryPhenotype={classification.primary_phenotype} />
          </GlassCard>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {['adrenal', 'hormonal', 'inflammatory', 'metabolic'].map((pid) => (
              <SeverityRing
                key={pid}
                label={PHENOTYPE_META[pid].label}
                percentage={scores[pid].percentage}
                severity={scores[pid].severity}
                positiveCount={scores[pid].positive_count}
                total={scores[pid].total_questions}
                highlighted={classification.phenotypes_involved.includes(pid)}
              />
            ))}
            <div className="col-span-2 sm:col-span-4">
              <GlassCard className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <span className="chip !bg-blue-400/10 !border-blue-400/30 !text-blue-200">Energy Screen</span>
                  <span className="text-sm text-slate-300">
                    Mitochondrial/Hypoxia: <strong className="text-white">{scores.mitochondrial.positive_count}/{scores.mitochondrial.total_questions}</strong>
                  </span>
                </div>
                {scores.mitochondrial.flag && (
                  <span className="chip !border-amber-400/40 !text-amber-300">Flagged — see support track below</span>
                )}
              </GlassCard>
            </div>
          </div>
        </div>

        {/* Overrides + biomarker support */}
        {(classification.overrides_triggered.length > 0 || classification.biomarker_supported_phenotypes.length > 0) && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {classification.overrides_triggered.length > 0 && (
              <GlassCard className="border-alert-500/30 p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-alert-400">
                  <AlertIcon /> Biomarker Overrides Triggered
                </h3>
                <ul className="space-y-2">
                  {classification.overrides_triggered.map((o) => (
                    <li key={o.id} className="text-sm text-slate-300">
                      <span className="font-medium text-slate-100">{PHENOTYPE_META[o.phenotype]?.label}:</span> {o.label}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}
            {classification.biomarker_supported_phenotypes.length > 0 && (
              <GlassCard className="p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-bio-300">
                  <InfoIcon /> Supporting Biomarker Evidence
                </h3>
                <p className="text-sm text-slate-400">
                  3+ abnormal biochemical findings in:{' '}
                  {classification.biomarker_supported_phenotypes.map((p) => PHENOTYPE_META[p].label).join(', ')} — noted per Section 3, shown for context alongside the tally result above.
                </p>
              </GlassCard>
            )}
          </div>
        )}

        {/* Recommendation blocks */}
        {!hasNoRecommendation && (
          <div className="mt-14 space-y-10">
            <SectionHeading
              eyebrow="Section 4 · Targeted Protocol"
              title={isMixed ? 'Your dual-targeted protocol' : 'Your targeted protocol'}
              desc={`Mapped to your ${recommendation.phenotype_blocks[0]?.regional_suggestions.region} · ${recommendation.phenotype_blocks[0]?.day_plan.diet_type} preference.`}
            />
            {recommendation.phenotype_blocks.map((block) => (
              <PhenotypeProtocolBlock key={block.phenotype} block={block} />
            ))}
            {recommendation.mitochondrial_support && (
              <MitochondrialBlock block={recommendation.mitochondrial_support} />
            )}
          </div>
        )}

        {!isExcluded && (
          <div className="mt-14">
            <SkippedTestsGuide />
          </div>
        )}

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4 print:hidden">
          <Link to="/assessment" className="btn-ghost">Retake Assessment</Link>
          <Link to="/journey" className="btn-ghost">Log This in My Journey</Link>
          <button onClick={() => window.print()} className="btn-primary">
            Save / Print Report
          </button>
        </div>
      </div>
    </div>
  )
}

function ClassificationBanner({ classification, isMixed, isInconclusive, isExcluded, source }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <GlassCard strong className="relative overflow-hidden p-8 sm:p-10">
        <div className="pointer-events-none absolute inset-0 scanline-veil opacity-40" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-bio-300 animate-pulse" />
              Automatically Scored From Your Responses
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              {isExcluded ? (
                'Excluded — See a Doctor First'
              ) : isInconclusive ? (
                classification.classification === 'Inconclusive — Does not meet Rotterdam Criteria'
                  ? 'Does Not Meet Rotterdam Criteria'
                  : 'Inconclusive — Minimal Findings'
              ) : isMixed ? (
                <>
                  Mixed Phenotype:{' '}
                  <span className="text-gradient-bio">
                    {classification.phenotypes_involved.map((p) => PHENOTYPE_META[p].label).join(' + ')}
                  </span>
                </>
              ) : classification.primary_phenotype && PHENOTYPE_META[classification.primary_phenotype] ? (
                <>
                  Primary Phenotype: <span className="text-gradient-bio">{PHENOTYPE_META[classification.primary_phenotype].label}</span>
                </>
              ) : (
                classification.classification
              )}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-400">{classification.reason}</p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl glass shadow-glow">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-bio-200" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 3c0 4 10 4 10 8s-10 4-10 8M17 3c0 4-10 4-10 8s10 4 10 8" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

function PhenotypeProtocolBlock({ block }) {
  const meta = PHENOTYPE_META[block.phenotype]
  const meals = block.day_plan.meals
  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.02] px-6 py-4">
        <span className="h-2.5 w-2.5 rounded-full shadow-glow" style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}` }} />
        <h3 className="font-display text-lg font-semibold text-white">{meta.label} PCOS</h3>
        <span className="text-sm text-slate-500">— {block.focus}</span>
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <InfoList title="Diet Strategy" items={block.diet_strategy} icon="leaf" />
        <InfoList title="Exercise & Training" items={block.exercise} icon="pulse" />
        <InfoList title="Why This Works" items={block.priorities} icon="target" />
      </div>

      <div className="grid gap-6 border-t border-white/5 p-6 lg:grid-cols-2">
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-bio-300/80">
            {block.regional_suggestions.region} Suggestions
          </h4>
          <dl className="space-y-2.5">
            {Object.entries(block.regional_suggestions.suggestions).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-medium text-slate-500">{k}</dt>
                <dd className="text-sm text-slate-300">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-plasma-400/80">
            {block.day_plan.diet_type} Day Plan
          </h4>
          <dl className="space-y-2.5">
            {['Breakfast', 'Lunch', 'Dinner'].map((meal) =>
              meals[meal] ? (
                <div key={meal}>
                  <dt className="text-xs font-medium text-slate-500">{meal}</dt>
                  <dd className="text-sm text-slate-300">{meals[meal]}</dd>
                </div>
              ) : null
            )}
          </dl>
          <div className="mt-4 grid gap-2 border-t border-white/5 pt-4 sm:grid-cols-3">
            {Object.entries(block.day_plan.mid_meals_and_beverages).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white/[0.03] p-2.5">
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{k}</div>
                <div className="mt-0.5 text-xs text-slate-300">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

function MitochondrialBlock({ block }) {
  const highPriority = block.recommended_priority === 'high'
  return (
    <GlassCard className={`overflow-hidden p-0 ${highPriority ? 'ring-1 ring-amber-400/40' : ''}`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[0.02] px-6 py-4">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-glow" />
        <h3 className="font-display text-lg font-semibold text-white">Mitochondrial & Energy Support</h3>
        <span className={`chip ${highPriority ? '!border-amber-400/40 !text-amber-300' : ''}`}>
          {highPriority ? 'High Priority' : 'Foundational'}
        </span>
      </div>
      <p className="px-6 pt-4 text-sm text-slate-400">{block.note}</p>
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <InfoList title="Diet & Supplements" items={block.diet_strategy} icon="leaf" />
        <InfoList title="Movement Protocol" items={block.exercise} icon="pulse" />
        <InfoList title="Why This Works" items={block.priorities} icon="target" />
      </div>
    </GlassCard>
  )
}

function InfoList({ title, items, icon }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-300">
            <IconFor icon />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function IconFor({ icon }) {
  const common = { viewBox: '0 0 24 24', className: 'mt-0.5 h-4 w-4 shrink-0 text-bio-300', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }
  if (icon === 'leaf') return <svg {...common}><path d="M5 21c8-1 14-7 15-16-9 1-15 7-16 16Z" strokeLinejoin="round" /></svg>
  if (icon === 'pulse') return <svg {...common}><path d="M3 12h4l2-7 4 14 2-7h6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>
}

function SectionHeading({ eyebrow, title, desc }) {
  return (
    <div>
      <span className="chip">{eyebrow}</span>
      <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{desc}</p>
    </div>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4M12 17h.01M10.3 3.86 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
    </svg>
  )
}

// "Tests doctors often skip" (insights-doc gap): general educational
// reference, not a diagnosis or a personalised recommendation -- static
// content, same "no black box" spirit as the rest of this app.
const OFTEN_SKIPPED_TESTS = [
  {
    name: 'Fasting Insulin / HOMA-IR',
    why: 'Routine panels often check glucose alone, which can look normal for years while insulin resistance is already building.',
  },
  {
    name: 'Free Testosterone & SHBG',
    why: 'Total testosterone alone can miss hyperandrogenism — free testosterone and SHBG give a clearer picture.',
  },
  {
    name: 'DHEA-S',
    why: 'Flags adrenal-origin androgen excess, which needs a different work-up than ovarian-origin PCOS.',
  },
  {
    name: 'Thyroid Panel (TSH ± free T4)',
    why: 'Hypothyroidism can mimic or worsen PCOS-like symptoms and is a standard differential that sometimes gets skipped.',
  },
  {
    name: '17-Hydroxyprogesterone',
    why: 'Rules out non-classic congenital adrenal hyperplasia, a condition that can look like PCOS on the surface.',
  },
  {
    name: 'Prolactin',
    why: 'Elevated prolactin can cause irregular cycles on its own and is a standard PCOS differential.',
  },
  {
    name: 'Vitamin D',
    why: 'Frequently low in PCOS and linked to insulin resistance, but rarely tested unless specifically requested.',
  },
  {
    name: 'AMH (Anti-Müllerian Hormone)',
    why: "Reflects ovarian reserve and polycystic morphology — sometimes used alongside or instead of ultrasound.",
  },
]

function SkippedTestsGuide() {
  return (
    <GlassCard className="p-6 sm:p-8">
      <h3 className="font-display text-lg font-semibold text-white">Tests worth asking your doctor about</h3>
      <p className="mt-2 text-sm text-slate-400">
        These are commonly relevant to PCOS work-ups but don't always make it onto a standard panel.
        This is general educational information, not a diagnosis or a substitute for medical advice —
        bring this list to your doctor and let them decide what's appropriate for you.
      </p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {OFTEN_SKIPPED_TESTS.map((t) => (
          <div key={t.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <dt className="font-display text-sm font-semibold text-bio-300">{t.name}</dt>
            <dd className="mt-1.5 text-xs text-slate-400">{t.why}</dd>
          </div>
        ))}
      </dl>
    </GlassCard>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-bio-300/30 border-t-bio-300" />
        <p className="text-sm text-slate-400">Calculating your results…</p>
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <GlassCard className="max-w-md p-8 text-center">
        <p className="text-slate-300">{message}</p>
        <Link to="/assessment" className="btn-primary mt-6 inline-flex">Start Assessment</Link>
      </GlassCard>
    </div>
  )
}
