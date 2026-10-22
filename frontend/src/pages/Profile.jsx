import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '../components/GlassCard.jsx'
import { getCurrentUser, updatePatientProfile } from '../lib/api.js'

export default function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    dob: '',
    age: '',
    height: '',
    weight: '',
    region_preference: 'South Indian',
    diet_type: 'Vegetarian',
  })

  useEffect(() => {
    const cur = getCurrentUser()
    if (!cur) {
      navigate('/login')
      return
    }
    setUser(cur)
    setFormData({
      full_name: cur.full_name || '',
      email: cur.email || '',
      phone: cur.phone || '',
      dob: cur.dob || '',
      age: cur.age || '',
      height: cur.demographics?.height || '',
      weight: cur.demographics?.weight || '',
      region_preference: cur.region_preference || 'South Indian',
      diet_type: cur.diet_type || 'Vegetarian',
    })
  }, [navigate])

  // Dynamic BMI Calculation
  const bmi =
    formData.height && formData.weight && Number(formData.height) > 0 && Number(formData.weight) > 0
      ? (Number(formData.weight) / Math.pow(Number(formData.height) / 100, 2)).toFixed(1)
      : null

  function getBmiBadge(val) {
    if (!val) return null
    const n = Number(val)
    if (n < 18.5) return { text: 'Underweight', color: 'text-amber-300 border-amber-400/30 bg-amber-500/10' }
    if (n < 25) return { text: 'Normal BMI', color: 'text-bio-300 border-bio-400/30 bg-bio-500/10' }
    if (n < 30) return { text: 'Overweight', color: 'text-amber-300 border-amber-400/30 bg-amber-500/10' }
    return { text: 'Obese', color: 'text-rose-300 border-rose-400/30 bg-rose-500/10' }
  }

  // Handle Profile Save
  async function handleProfileSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveStatus('Saving profile changes to Supabase…')

    // Compute age from DOB if DOB exists
    let calculatedAge = formData.age ? parseInt(formData.age, 10) : null
    if (formData.dob) {
      try {
        const birthDate = new Date(formData.dob)
        const today = new Date()
        let a = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          a--
        }
        if (a >= 0) calculatedAge = a
      } catch {}
    }

    const updates = {
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      dob: formData.dob || null,
      age: calculatedAge,
      region_preference: formData.region_preference,
      diet_type: formData.diet_type,
      demographics: {
        ...(user?.demographics || {}),
        height: formData.height,
        weight: formData.weight,
      },
    }

    const res = await updatePatientProfile(user.id, updates)
    setSaving(false)

    if (res.success) {
      setUser(res.user)
      setSaveStatus('Profile changes successfully saved.')
      setTimeout(() => {
        setSaveStatus(null)
        setIsEditing(false)
      }, 1500)
    } else {
      setSaveStatus('Could not save changes. Please try again.')
    }
  }

  function handleCancelEdit() {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        dob: user.dob || '',
        age: user.age || '',
        height: user.demographics?.height || '',
        weight: user.demographics?.weight || '',
        region_preference: user.region_preference || 'South Indian',
        diet_type: user.diet_type || 'Vegetarian',
      })
    }
    setIsEditing(false)
    setSaveStatus(null)
  }

  if (!user) return null

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-16 pt-24 sm:px-6 bg-white">
      {/* Top Breadcrumb Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <span>← Back to Dashboard</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="btn-ghost !px-3.5 !py-1.5 text-xs text-rose-600 hover:text-rose-700 border border-rose-200 bg-rose-50 rounded-lg"
        >
          {isEditing ? 'Cancel Editing' : 'Edit Profile'}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-0.5 text-xs font-semibold text-rose-700">
              Personal Account & Demographics
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              Table: registrations
            </span>
          </div>
          <h1 className="mt-3 font-heading text-3xl sm:text-4xl font-semibold tracking-[-0.025em] text-[#0A192F]">
            {isEditing ? 'Edit Personal Details' : 'Personal Details & Health Profile'}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 leading-[1.6] font-normal">
            Keep your personal demographics and contact details updated. Changes sync directly to your Supabase account.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {saveStatus && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
            >
              {saveStatus}
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* VIEW MODE                                                */}
          {/* ======================================================== */}
          {!isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Full Name
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formData.full_name || 'Not provided'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Email Address (Account ID)
                  </span>
                  <p className="mt-1 text-sm font-semibold text-rose-600 truncate" title={formData.email}>
                    {formData.email || 'Not provided'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Date of Birth
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formData.dob || 'Not provided'}
                    {formData.age ? ` (${formData.age} yrs)` : ''}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Phone Number
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formData.phone || 'Not provided'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Height
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formData.height ? `${formData.height} cm` : 'Not provided'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Weight
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formData.weight ? `${formData.weight} kg` : 'Not provided'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Regional Cuisine
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formData.region_preference}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Dietary Pattern
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formData.diet_type}
                  </p>
                </div>
              </div>

              {bmi && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Calculated Body Mass Index (BMI)</span>
                    <p className="text-lg font-bold text-slate-900">{bmi} kg/m²</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getBmiBadge(bmi).color}`}>
                    {getBmiBadge(bmi).text}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn-primary !px-6 !py-2.5 text-xs font-semibold shadow-sm"
                >
                  Edit Personal Details
                </button>
                <Link
                  to="/dashboard"
                  className="btn-ghost !px-5 !py-2.5 text-xs text-slate-700"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* EDIT MODE                                                */
            /* ======================================================== */
            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Email Address (Account ID)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 165"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 62"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Regional Cuisine
                  </label>
                  <select
                    value={formData.region_preference}
                    onChange={(e) => setFormData({ ...formData, region_preference: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none shadow-xs"
                  >
                    <option value="South Indian">South Indian</option>
                    <option value="North Indian">North Indian</option>
                    <option value="East Indian">East Indian</option>
                    <option value="West Indian">West Indian</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Dietary Pattern
                  </label>
                  <select
                    value={formData.diet_type}
                    onChange={(e) => setFormData({ ...formData, diet_type: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none shadow-xs"
                  >
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Eggetarian">Eggetarian</option>
                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>
              </div>

              {bmi && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Calculated Body Mass Index (BMI)</span>
                    <p className="text-lg font-bold text-slate-900">{bmi} kg/m²</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getBmiBadge(bmi).color}`}>
                    {getBmiBadge(bmi).text}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-ghost !px-5 !py-2.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary !px-6 !py-2.5 text-xs font-semibold shadow-sm disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
