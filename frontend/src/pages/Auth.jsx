import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../components/GlassCard.jsx'
import { loginUser, registerUser, hasUserCompletedAssessment } from '../lib/api.js'

export default function Auth({ defaultTab = 'register' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') || defaultTab
  const [isRegister, setIsRegister] = useState(initialMode !== 'login')
  const [regStep, setRegStep] = useState(1) // 1: Credentials, 2: Personal Details & Health Profile

  // Step 1: Credentials
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Step 2: Personal Details & Health Profile
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [regionPreference, setRegionPreference] = useState('South Indian')
  const [dietType, setDietType] = useState('Vegetarian')

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Dynamic BMI Calculation
  const bmi =
    height && weight && Number(height) > 0 && Number(weight) > 0
      ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)
      : null

  function getBmiBadge(val) {
    if (!val) return null
    const n = Number(val)
    if (n < 18.5) return { text: 'Underweight', color: 'text-amber-300 border-amber-400/30 bg-amber-500/10' }
    if (n < 25) return { text: 'Normal BMI', color: 'text-bio-300 border-bio-400/30 bg-bio-500/10' }
    if (n < 30) return { text: 'Overweight', color: 'text-amber-300 border-amber-400/30 bg-amber-500/10' }
    return { text: 'Obese', color: 'text-rose-300 border-rose-400/30 bg-rose-500/10' }
  }

  // Handle Step 1 Next Button
  function handleStep1Next(e) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // Advance to Step 2: Personal Details & Health Profile
    setRegStep(2)
  }

  // Handle Final Registration (Step 2 Submission)
  async function handleFinalRegister(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await registerUser({
      name: fullName.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      dob: dob || '',
      height: height ? height.toString() : '',
      weight: weight ? weight.toString() : '',
      region_preference: regionPreference,
      diet_type: dietType,
    })

    setLoading(false)

    if (res.success) {
      const userEmail = res.user?.email || email.trim()
      const hasCompleted = await hasUserCompletedAssessment(userEmail)
      if (hasCompleted) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/assessment', { replace: true })
      }
    } else {
      setError(res.error || 'Failed to create account. Please try again.')
    }
  }

  // Handle Direct Sign In
  async function handleLoginSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await loginUser(email, password)
    setLoading(false)

    if (res.success) {
      const userEmail = res.user?.email || email.trim()
      const hasCompleted = await hasUserCompletedAssessment(userEmail)
      if (hasCompleted) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/assessment', { replace: true })
      }
    } else {
      setError(res.error || 'Invalid email or password.')
    }
  }

  return (
    <div className={`relative mx-auto px-6 py-20 pt-28 transition-all ${isRegister && regStep === 2 ? 'max-w-2xl' : 'max-w-lg'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <span className="chip mx-auto mb-3">
            {isRegister
              ? regStep === 1
                ? 'Step 1 of 2: Account Setup'
                : 'Step 2 of 2: Health Profile'
              : 'Patient Access'}
          </span>
          <h1 className="font-heading text-3xl font-semibold text-[#0A192F] sm:text-4xl tracking-[-0.025em]">
            {isRegister
              ? regStep === 1
                ? 'Create Your Account'
                : 'Personal Details & Health Profile'
              : 'Welcome Back'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-[1.6] font-normal">
            {isRegister
              ? regStep === 1
                ? 'Register with your name, email, and password to begin your clinical intake.'
                : 'Keep your personal demographics and contact details updated. Changes sync directly to your Supabase account.'
              : 'Sign in with your email and password to access your personalized health dashboard.'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-lg">
          {/* Tab Switcher (Visible on Login or Step 1) */}
          {(!isRegister || regStep === 1) && (
            <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false)
                  setRegStep(1)
                  setError(null)
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  !isRegister
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true)
                  setRegStep(1)
                  setError(null)
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  isRegister
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
            >
              {error}
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* FLOW A: DIRECT LOGIN                                      */}
          {/* ========================================================= */}
          {!isRegister && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors shadow-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center !py-3.5 mt-2 font-semibold shadow-md disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing In…
                  </span>
                ) : (
                  <span>Sign In to Dashboard</span>
                )}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* FLOW B: REGISTRATION STEP 1 (Credentials)                 */}
          {/* ========================================================= */}
          {isRegister && regStep === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email Address (Account ID)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors shadow-xs"
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center !py-3.5 mt-2 font-semibold shadow-md"
              >
                Continue to Personal Details
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* FLOW B: REGISTRATION STEP 2 (Personal Details Profile)    */}
          {/* ========================================================= */}
          {isRegister && regStep === 2 && (
            <form onSubmit={handleFinalRegister} className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs text-rose-600 font-semibold uppercase tracking-wider">
                  Demographics & Preferences
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRegStep(1)
                    setError(null)
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  ← Edit Credentials
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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
                    value={email}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
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
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                    Regional Cuisine
                  </label>
                  <select
                    value={regionPreference}
                    onChange={(e) => setRegionPreference(e.target.value)}
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
                    value={dietType}
                    onChange={(e) => setDietType(e.target.value)}
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

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRegStep(1)
                    setError(null)
                  }}
                  className="btn-ghost !px-4 !py-3 text-xs text-slate-600 sm:w-auto"
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 justify-center !py-3.5 font-semibold shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving to Supabase & Creating Account…
                    </span>
                  ) : (
                    <span>Save Profile & Enter Dashboard</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer toggle */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            {isRegister ? (
              <p className="text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false)
                    setRegStep(1)
                    setError(null)
                  }}
                  className="font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                >
                  Sign In here
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                First time here?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true)
                    setRegStep(1)
                    setError(null)
                  }}
                  className="font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                >
                  Create an account
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
