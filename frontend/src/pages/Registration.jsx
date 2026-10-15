import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '../components/GlassCard.jsx'
import { questionnaire } from '../lib/ruleEngine.js'
import { extractReportData } from '../lib/reportExtractor.js'
import { registerPatient } from '../lib/api.js'
import { PCOS_CASE, HEALTHY_CASE } from '../data/demoProfiles.js'

// Everything except region/diet (rendered as their own labelled pickers
// below) comes straight from questionnaire.json, so this page stays in sync
// automatically if a field is added/removed there.
const CONTEXT_FIELDS = questionnaire.demographics.filter(
  (f) => !['region_preference', 'diet_type'].includes(f.id)
)

// One-line plain-language helper text per field, matching the pattern
// already used on the phenotype/mitochondrial questions further into the
// assessment (mentor feedback: every question should say why it's asked).
const FIELD_DESCRIPTIONS = {
  occupation: 'Night shifts and long sedentary hours can affect cortisol and metabolic phenotypes.',
  relationship_status: 'Helps tailor recommendations if fertility/pregnancy planning is a current goal.',
  ethnicity: 'Some PCOS risk factors and reference ranges vary slightly by population background.',
  living_environment: 'Pollution and activity levels in your surroundings can influence oxidative-stress markers.',
  pcos_diagnosis_age: 'Optional — leave blank if you have not been formally diagnosed yet.',
}
const REGION_DESCRIPTION = 'Used only to tailor meal suggestions to cuisines you actually eat.'
const DIET_DESCRIPTION = 'Used only to pick the right meal plan in your results — never shared beyond this app.'

export default function Registration() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    dob: '',
    age: '',
    region_preference: 'South Indian',
    diet_type: 'Vegetarian',
  })
  const [uploadStatus, setUploadStatus] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // Usability fix (insights doc): DOB isn't always known -- let the person
  // switch to typing their age directly instead of being blocked.
  const [dobUnknown, setDobUnknown] = useState(false)
  // Presentation/demo helper -- same two profiles used throughout the
  // questionnaire (see data/demoProfiles.js). Filling here fills this visible
  // form immediately, and stashes the chosen profile so every later
  // Questionnaire step is pre-filled too once "Continue to Assessment" (or
  // the direct /assessment link) is used.
  const [demoProfile, setDemoProfile] = useState(null)

  function loadDemo(profileKey) {
    const profile = profileKey === 'pcos' ? PCOS_CASE : HEALTHY_CASE
    setDobUnknown(false)
    setFormData(profile.registration)
    sessionStorage.setItem('pcos_registration', JSON.stringify(profile.registration))
    sessionStorage.setItem('pcos_demo_profile', profileKey)
    sessionStorage.removeItem('pcos_extracted_report')
    setUploadStatus(null)
    setUploadError(null)
    setDemoProfile(profileKey)
  }

  // Calculate age from DOB whenever it's known.
  useEffect(() => {
    if (dobUnknown) return // age is being entered directly -- don't overwrite it
    if (formData.dob) {
      const birthDate = new Date(formData.dob)
      const today = new Date()
      let calculatedAge = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--
      }
      setFormData((prev) => ({ ...prev, age: calculatedAge >= 0 ? calculatedAge.toString() : '' }))
    } else {
      setFormData((prev) => ({ ...prev, age: '' }))
    }
  }, [formData.dob, dobUnknown])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const toggleDobUnknown = () => {
    setDobUnknown((prev) => {
      const next = !prev
      setFormData((f) => ({ ...f, dob: '', age: next ? f.age : '' }))
      return next
    })
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploadStatus('Reading report locally in your browser…')
    try {
      const flagged = await extractReportData(file)
      sessionStorage.setItem('pcos_extracted_report', JSON.stringify(flagged))
      const count = Object.keys(flagged).length
      setUploadStatus(`${count} value${count === 1 ? '' : 's'} found and pre-filled — nothing left this browser.`)
    } catch (err) {
      setUploadStatus(null)
      setUploadError(err.message || 'Could not read this file.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // sessionStorage stays the source of truth the rest of the app reads
    // from (Questionnaire/Results), independent of whether the backend
    // save below succeeds.
    sessionStorage.setItem('pcos_registration', JSON.stringify(formData))

    setSubmitting(true)
    // Real backend table now (Ishi's call: "Build a real backend table for
    // it") -- saved only to this project's own database, never to an AI
    // provider or any third party. A failed/slow save never blocks
    // navigation; extracted report values, if any, are the already-derived
    // numbers (not the original file, which never leaves the browser).
    let extractedReport = null
    try {
      const raw = sessionStorage.getItem('pcos_extracted_report')
      if (raw) extractedReport = JSON.parse(raw)
    } catch {
      extractedReport = null
    }
    await registerPatient({
      full_name: formData.fullName,
      email: formData.email,
      dob: formData.dob || null,
      age: formData.age ? Number(formData.age) : null,
      demographics: Object.fromEntries(
        CONTEXT_FIELDS.map((f) => [f.id, formData[f.id]]).filter(([, v]) => v !== undefined && v !== '')
      ),
      region_preference: formData.region_preference,
      diet_type: formData.diet_type,
      extracted_report: extractedReport,
    })
    setSubmitting(false)
    navigate('/assessment')
  }

  return (
    <div className="relative mx-auto max-w-3xl px-6 py-20 pt-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
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
            title="Fills every step, starting here, with a sample PCOS-positive case (clears Rotterdam criteria, Metabolic-primary)"
          >
            ⚡ Fill PCOS Case
          </button>
          <button
            type="button"
            onClick={() => loadDemo('healthy')}
            className="btn-ghost !px-4 !py-2 text-xs text-slate-400 hover:text-bio-200"
            title="Fills every step, starting here, with a sample healthy case (normal values throughout, does not meet Rotterdam criteria)"
          >
            ⚡ Fill Healthy Case
          </button>
        </div>

        <div className="text-center mb-10">
          <span className="chip mx-auto mb-4">Step 1 · Registration</span>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Tell us about yourself
          </h1>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            Please fill in your personal details to begin the assessment. This stays in your
            browser and is used only to personalise your results.
          </p>
        </div>

        <GlassCard className="p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      required={!dobUnknown}
                      disabled={dobUnknown}
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Age {dobUnknown ? '' : '(Calculated)'}
                    </label>
                    <input
                      type="number"
                      name="age"
                      min="1"
                      max="120"
                      required={dobUnknown}
                      readOnly={!dobUnknown}
                      value={formData.age}
                      onChange={handleChange}
                      className={`w-full rounded-xl border px-4 py-3 transition-colors ${
                        dobUnknown
                          ? 'border-white/10 bg-white/5 text-white focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400'
                          : 'border-white/5 bg-white/5 text-slate-400 cursor-not-allowed'
                      }`}
                      placeholder={dobUnknown ? 'Enter age directly' : 'Auto-calculated'}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleDobUnknown}
                  className="mt-2 text-xs font-medium text-bio-300 hover:text-bio-200 transition-colors"
                >
                  {dobUnknown ? "Actually, I know my date of birth" : "I don't know my exact date of birth — enter age instead"}
                </button>
              </div>

              {CONTEXT_FIELDS.map((f) => (
                <div key={f.id}>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{f.label}</label>
                  {FIELD_DESCRIPTIONS[f.id] && (
                    <p className="mb-1.5 text-xs text-slate-500">{FIELD_DESCRIPTIONS[f.id]}</p>
                  )}
                  {f.type === 'select' ? (
                    <select
                      name={f.id}
                      value={formData[f.id] ?? ''}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                    >
                      <option value="" disabled>Select…</option>
                      {f.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                      name={f.id}
                      value={formData[f.id] ?? ''}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                    />
                  )}
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Regional cuisine</label>
                  <p className="mb-1.5 text-xs text-slate-500">{REGION_DESCRIPTION}</p>
                  <select
                    name="region_preference"
                    value={formData.region_preference}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                  >
                    <option value="South Indian">South Indian</option>
                    <option value="North Indian">North Indian</option>
                    <option value="East Indian">East Indian</option>
                    <option value="West Indian">West Indian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Diet type</label>
                  <p className="mb-1.5 text-xs text-slate-500">{DIET_DESCRIPTION}</p>
                  <select
                    name="diet_type"
                    value={formData.diet_type}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-bio-400 focus:outline-none focus:ring-1 focus:ring-bio-400 transition-colors"
                  >
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Eggetarian">Eggetarian</option>
                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Upload a Lab Report (Optional)</label>
                <div className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-slate-400 border-dashed hover:bg-white/10 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    id="report-upload"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="report-upload" className="cursor-pointer flex flex-col items-center">
                    <svg viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-bio-300 mb-2" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {uploadStatus ? (
                      <span className="font-medium text-bio-300">{uploadStatus}</span>
                    ) : (
                      <>
                        <span className="font-medium text-bio-300">Click to upload</span> a PDF, JPG or PNG lab report<br />
                        Parsed entirely in your browser (PDF text or on-device OCR) — nothing is uploaded anywhere
                      </>
                    )}
                  </label>
                </div>
                {uploadError && (
                  <p className="mt-2 text-xs text-alert-400">{uploadError}</p>
                )}
              </div>
            </div>

            <div className="pt-6">
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-wait">
                {submitting ? 'Saving…' : 'Continue to Assessment'}
                <svg viewBox="0 0 24 24" className="h-4 w-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

          </form>
        </GlassCard>
      </motion.div>
    </div>
  )
}
