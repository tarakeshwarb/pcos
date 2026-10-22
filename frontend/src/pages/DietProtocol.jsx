import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  getCurrentUser,
  hasUserCompletedAssessment,
  fetchLifestylePlan,
  saveLifestylePlan,
  updatePatientProfile,
} from '../lib/api.js'
import dietProtocols from '../data/diet_protocols.json'

const PHENOTYPE_META = {
  metabolic: {
    label: 'Metabolic PCOS',
    tag: 'Insulin-Resistant',
    color: '#D97706',
    border: 'border-amber-200',
    bg: 'bg-amber-50/70',
    badge: 'border-amber-300 bg-amber-100 text-amber-900',
    accent: 'from-amber-500 to-rose-500',
    desc: 'Driven by insulin resistance, fasting hyperinsulinemia, and impaired cellular glucose uptake. Focus on blunting glucose spikes and restoring insulin sensitivity.',
  },
  hormonal: {
    label: 'Hormonal PCOS',
    tag: 'Ovarian / Post-Pill',
    color: '#0D9488',
    border: 'border-teal-200',
    bg: 'bg-teal-50/70',
    badge: 'border-teal-300 bg-teal-100 text-teal-900',
    accent: 'from-teal-500 to-purple-500',
    desc: 'Driven by elevated LH:FSH ratio, ovarian hyperandrogenism, and anovulatory cycles. Focus on hepatic clearance of excess androgens and supporting natural ovulation.',
  },
  inflammatory: {
    label: 'Inflammatory PCOS',
    tag: 'Immune / Gut-Driven',
    color: '#E11D48',
    border: 'border-rose-200',
    bg: 'bg-rose-50/70',
    badge: 'border-rose-300 bg-rose-100 text-rose-900',
    accent: 'from-rose-500 to-purple-600',
    desc: 'Driven by systemic inflammation, gut endotoxemia, and elevated hs-CRP. Focus on removing mucosal irritants, healing the gut lining, and lowering cytokine release.',
  },
  adrenal: {
    label: 'Adrenal PCOS',
    tag: 'Stress / HPA-Axis',
    color: '#7C3AED',
    border: 'border-purple-200',
    bg: 'bg-purple-50/70',
    badge: 'border-purple-300 bg-purple-100 text-purple-900',
    accent: 'from-purple-600 to-fuchsia-600',
    desc: 'Driven by chronic stress, HPA-axis dysregulation, and elevated adrenal androgens (DHEA-S/cortisol). Focus on nervous system regulation, stable blood sugar, and restorative movement.',
  },
}

export default function DietProtocol() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [saveNotice, setSaveNotice] = useState(false)

  const [profileData, setProfileData] = useState({
    region_preference: 'South Indian',
    diet_type: 'Vegetarian',
  })

  useEffect(() => {
    const cur = getCurrentUser()
    if (!cur) {
      navigate('/login?redirect=/diet', { replace: true })
      return
    }
    setUser(cur)

    // Load cached latest result
    try {
      const cached = sessionStorage.getItem('pcos_last_result')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.id !== 'preview' && (parsed.classification || parsed.scores)) {
          setLastResult(parsed)
        }
      }
      if (cur.email) {
        const local = localStorage.getItem(`pcos_assessment_${cur.email}`)
        if (local && local !== 'true') {
          const parsed = JSON.parse(local)
          if (parsed && (parsed.classification || parsed.scores)) {
            setLastResult((prev) => prev || parsed)
          }
        }
      }
    } catch {}

    // Check completion status
    if (cur.email) {
      hasUserCompletedAssessment(cur.email).then((completed) => {
        setHasCompleted(completed)
      })

      fetchLifestylePlan(cur.email).then((plan) => {
        if (plan) {
          setProfileData({
            region_preference: plan.region_preference || cur.region_preference || 'South Indian',
            diet_type: plan.diet_type || cur.diet_type || 'Vegetarian',
          })
        } else {
          setProfileData({
            region_preference: cur.region_preference || 'South Indian',
            diet_type: cur.diet_type || 'Vegetarian',
          })
        }
      })
    }
  }, [navigate])

  const primaryPhenotype =
    lastResult?.classification?.primary_phenotype ||
    (lastResult?.classification?.classification || '').toLowerCase().includes('adrenal')
      ? 'adrenal'
      : (lastResult?.classification?.classification || '').toLowerCase().includes('inflammatory')
      ? 'inflammatory'
      : (lastResult?.classification?.classification || '').toLowerCase().includes('hormonal')
      ? 'hormonal'
      : 'metabolic'

  const meta = PHENOTYPE_META[primaryPhenotype] || PHENOTYPE_META.metabolic
  const dietCategory = profileData.diet_type === 'Non-Vegetarian' ? 'non_vegetarian' : 'vegetarian'
  const currentDietProtocol =
    dietProtocols[primaryPhenotype]?.[dietCategory] ||
    dietProtocols['metabolic']?.['vegetarian']
  const generalPhenotypeRules = dietProtocols.general_protocol?.[primaryPhenotype] || {}
  const regionalData =
    dietProtocols.regional_suggestions?.[primaryPhenotype]?.[profileData.region_preference] ||
    dietProtocols.regional_suggestions?.[primaryPhenotype]?.['South Indian'] ||
    {}

  const handleUpdatePreferences = async (newRegion, newDiet) => {
    const updated = {
      region_preference: newRegion ?? profileData.region_preference,
      diet_type: newDiet ?? profileData.diet_type,
    }
    setProfileData(updated)

    if (user?.id) {
      updatePatientProfile(user.id, updated)
    }

    if (user?.email) {
      await saveLifestylePlan(user.email, {
        region_preference: updated.region_preference,
        diet_type: updated.diet_type,
        primary_phenotype: primaryPhenotype,
        dietary_strategy: currentDietProtocol?.strategy,
        exercise_routine: currentDietProtocol?.exercise,
        supplement_roadmap: currentDietProtocol?.supplements,
        sample_day: currentDietProtocol?.sample_day || {},
      })
      setSaveNotice(true)
      setTimeout(() => setSaveNotice(false), 2000)
    }
  }

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
              <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
              Clinical Nutrition & Lifestyle Matrix
            </span>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-[#202321]">
              Diet & Lifestyle Protocol
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              Nutrition, exercise, and supplement protocols tailored to your phenotype.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/assessment"
              className="btn-primary !px-4 !py-2 text-xs font-semibold rounded-full shadow-xs"
            >
              {hasCompleted ? 'Update Assessment' : 'Take Assessment'}
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
                <h3 className="font-heading text-base font-semibold text-amber-900">
                  Showing Baseline Protocol (Assessment Pending)
                </h3>
                <p className="text-xs text-amber-800 mt-0.5 max-w-xl">
                  Take your clinical intake assessment to evaluate your root cause phenotype and calculate personalized macronutrient ratios.
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

        {/* Active Phenotype Overview & Cuisine Switcher Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7C3AED] text-white font-bold text-sm shadow-xs font-mono">
                Rx
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">
                    {meta.label} Protocol
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${meta.badge}`}>
                    {meta.tag}
                  </span>
                </div>
                <h2 className="font-heading text-2xl font-semibold text-[#202321] mt-0.5">
                  Targeted Phenotype Therapy
                </h2>
              </div>
            </div>

            {/* Interactive Selectors */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Regional Cuisine
                </label>
                <select
                  value={profileData.region_preference}
                  onChange={(e) => handleUpdatePreferences(e.target.value, null)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-none shadow-2xs transition-colors"
                >
                  <option value="South Indian">South Indian</option>
                  <option value="North Indian">North Indian</option>
                  <option value="East Indian">East Indian</option>
                  <option value="West Indian">West Indian</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Dietary Pattern
                </label>
                <select
                  value={profileData.diet_type}
                  onChange={(e) => handleUpdatePreferences(null, e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-none shadow-2xs transition-colors"
                >
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                </select>
              </div>

              {saveNotice && (
                <span className="text-xs text-emerald-600 font-bold self-end pb-1.5">
                  ✓ Saved
                </span>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            {meta.desc}
          </p>
        </motion.div>

        {/* 3 Core Strategy Cards: Nutrition, Exercise, Supplements */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {/* 1. Nutritional Strategy */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </span>
                <h3 className="font-heading text-base font-semibold text-[#202321]">
                  Nutritional Strategy
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentDietProtocol?.strategy ||
                  'Low glycemic carbohydrates paired with clean protein and healthy fats to stabilize insulin surges and support hormone synthesis.'}
              </p>
            </div>

            {generalPhenotypeRules?.diet_strategy && (
              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                {generalPhenotypeRules.diet_strategy.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 2. Exercise Routine */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <h3 className="font-heading text-base font-semibold text-[#202321]">
                  Targeted Exercise Routine
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentDietProtocol?.exercise ||
                  'Zone 2 steady-state aerobic conditioning (30-40 mins) combined with 3 weekly resistance training sessions to stimulate GLUT-4 receptor activity.'}
              </p>
            </div>

            {generalPhenotypeRules?.exercise && (
              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                {generalPhenotypeRules.exercise.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-teal-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 3. Targeted Supplements */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </span>
                <h3 className="font-heading text-base font-semibold text-[#202321]">
                  Targeted Supplements
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentDietProtocol?.supplements ||
                  'Myo-Inositol + D-Chiro Inositol (40:1 ratio), Magnesium Glycinate, and Vitamin D3 (2000 IU) to promote ovulatory regularity.'}
              </p>
            </div>

            {generalPhenotypeRules?.priorities && (
              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                {generalPhenotypeRules.priorities.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-purple-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>

        {/* Full Day Meal Blueprint Container */}
        {currentDietProtocol?.sample_day && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-heading text-xl font-semibold text-[#202321]">
                  Full Day Meal Blueprint
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Designed for {profileData.region_preference} cuisine with {profileData.diet_type} protein sources.
                </p>
              </div>
              <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-800 font-mono">
                Macro-Balanced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['breakfast', 'lunch', 'snack', 'dinner'].map((meal) => (
                <div
                  key={meal}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 font-mono">
                        {meal}
                      </span>
                      <span className="text-xs text-slate-400">
                        {meal === 'breakfast' ? '08:00' : meal === 'lunch' ? '13:00' : meal === 'snack' ? '16:30' : '19:30'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#202321] font-medium leading-relaxed">
                      {currentDietProtocol.sample_day[meal] || 'Balanced macro portion.'}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Protein First</span>
                    <span>High Fiber</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Regional Targeted Food Suggestions */}
        {Object.keys(regionalData).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="font-heading text-xl font-semibold text-[#202321]">
                Targeted Regional Ingredients ({profileData.region_preference})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Indigenous food options and seasonal ingredients supporting {meta.label}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {Object.entries(regionalData).map(([key, val]) => (
                <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
                    {key}
                  </span>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed font-medium">
                    {val}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
