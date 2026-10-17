import { questionnaire, runPipeline } from './ruleEngine.js'
import { supabase } from './supabase.js'

export async function fetchQuestionnaire() {
  return { data: questionnaire, source: 'local' }
}

export async function fetchResult(id) {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) throw error || new Error('Not found')
    return { ...data, source: 'supabase' }
  } catch (err) {
    console.warn('Could not fetch from Supabase:', err)
    // Check local fallback
    try {
      const cached = sessionStorage.getItem('pcos_last_result')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.id === id || id === 'latest') return parsed
      }
    } catch {}
    throw err
  }
}

export async function registerPatient(payload) {
  try {
    const record = {
      full_name: payload.full_name,
      email: payload.email,
      dob: payload.dob || null,
      age: payload.age ? parseInt(payload.age, 10) : null,
      demographics: payload.demographics || {},
      region_preference: payload.region_preference || null,
      diet_type: payload.diet_type || null,
      extracted_report: payload.extracted_report || null,
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert([record])
      .select()
      .single()

    if (error) throw error
    return { ...data, source: 'supabase' }
  } catch (err) {
    console.warn('Supabase registration error, falling back locally:', err)
    return { source: 'local' }
  }
}

export async function submitFeedback(payload) {
  try {
    const record = {
      rating: payload.rating ? parseInt(payload.rating, 10) : null,
      comments: payload.comments || '',
      context: payload.context || null,
      contact_email: payload.contact_email || null,
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert([record])
      .select()
      .single()

    if (error) throw error
    return { ...data, source: 'supabase' }
  } catch (err) {
    console.warn('Supabase feedback error, falling back locally:', err)
    return { source: 'local' }
  }
}

export async function submitAssessment(payload) {
  // Compute deterministic scores & diet recommendations locally
  const result = runPipeline(payload.answers, payload.region_preference, payload.diet_type)
  const defaultVersion = questionnaire.meta?.version || '1.0.0'

  const submissionPayload = {
    email: payload.email || getCurrentUser()?.email || null,
    demographics: payload.demographics || {},
    answers: payload.answers || {},
    primary_goals: payload.primary_goals || [],
    region_preference: payload.region_preference || null,
    diet_type: payload.diet_type || null,
    scores: result.scores,
    classification: result.classification,
    recommendation: result.recommendation,
    questionnaire_version: defaultVersion,
  }

  try {
    const { data, error } = await supabase
      .from('submissions')
      .insert([submissionPayload])
      .select()
      .single()

    if (error) throw error

    const fullResult = {
      ...data,
      source: 'supabase',
    }
    sessionStorage.setItem('pcos_last_result', JSON.stringify(fullResult))
    return fullResult
  } catch (err) {
    console.warn('Supabase submit error, falling back to local result:', err)
    const localResult = {
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      scores: result.scores,
      classification: result.classification,
      recommendation: result.recommendation,
      questionnaire_version: defaultVersion,
      source: 'local',
      _localPayload: payload,
    }
    sessionStorage.setItem('pcos_last_result', JSON.stringify(localResult))
    return localResult
  }
}

// ==========================================
// Authentication & Patient Profile Management
// ==========================================

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('pcos_current_user')
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to read current user:', e)
  }
  return null
}

export function logoutUser() {
  try {
    localStorage.removeItem('pcos_current_user')
    supabase.auth.signOut().catch(() => {})
  } catch (e) {
    console.error(e)
  }
}

export async function registerUser({
  name,
  email,
  password,
  phone = '',
  dob = '',
  age = null,
  height = '',
  weight = '',
  region_preference = 'South Indian',
  diet_type = 'Vegetarian',
  demographics = {},
}) {
  const normalizedEmail = (email || '').trim().toLowerCase()
  if (!normalizedEmail || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  let accounts = {}
  try {
    const raw = localStorage.getItem('pcos_accounts')
    if (raw) accounts = JSON.parse(raw)
  } catch {}

  if (accounts[normalizedEmail]) {
    return { success: false, error: 'An account with this email already exists. Please log in.' }
  }

  // Calculate age from DOB if DOB provided and age not explicitly given
  let calculatedAge = age ? parseInt(age, 10) : null
  if (!calculatedAge && dob) {
    try {
      const birthDate = new Date(dob)
      const today = new Date()
      let a = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        a--
      }
      if (a >= 0) calculatedAge = a
    } catch {}
  }

  const mergedDemographics = {
    ...demographics,
    height: height || demographics.height || '',
    weight: weight || demographics.weight || '',
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const newUser = {
    id: userId,
    full_name: name || 'Patient',
    email: normalizedEmail,
    password,
    phone: phone || '',
    dob: dob || '',
    age: calculatedAge,
    region_preference: region_preference || 'South Indian',
    diet_type: diet_type || 'Vegetarian',
    demographics: mergedDemographics,
    created_at: new Date().toISOString(),
    is_new: false,
  }

  accounts[normalizedEmail] = newUser
  localStorage.setItem('pcos_accounts', JSON.stringify(accounts))
  localStorage.setItem('pcos_current_user', JSON.stringify(newUser))

  // Also sync to Supabase registrations table
  try {
    const regPayload = {
      full_name: newUser.full_name,
      email: newUser.email,
      password: newUser.password,
      phone: newUser.phone || null,
      dob: newUser.dob ? newUser.dob : null,
      age: newUser.age || null,
      region_preference: newUser.region_preference,
      diet_type: newUser.diet_type,
      demographics: newUser.demographics,
    }
    const { error: regErr } = await supabase.from('registrations').insert([regPayload])
    if (regErr) console.warn('Supabase register error:', regErr)
  } catch (e) {
    console.warn('Supabase register sync note:', e)
  }

  return { success: true, user: newUser }
}

export async function loginUser(email, password) {
  const normalizedEmail = (email || '').trim().toLowerCase()
  if (!normalizedEmail || !password) {
    return { success: false, error: 'Please enter both email and password.' }
  }

  let accounts = {}
  try {
    const raw = localStorage.getItem('pcos_accounts')
    if (raw) accounts = JSON.parse(raw)
  } catch {}

  const existing = accounts[normalizedEmail]
  if (existing) {
    if (existing.password === password) {
      localStorage.setItem('pcos_current_user', JSON.stringify(existing))
      return { success: true, user: existing }
    } else {
      return { success: false, error: 'Incorrect password. Please try again.' }
    }
  }

  // Look in Supabase registrations if already registered previously
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle()

    if (data && !error) {
      const recoveredUser = {
        id: data.id || `usr_${Date.now()}`,
        full_name: data.full_name || 'Patient',
        email: normalizedEmail,
        password,
        region_preference: data.region_preference || 'South Indian',
        diet_type: data.diet_type || 'Vegetarian',
        dob: data.dob,
        age: data.age,
        demographics: data.demographics || {},
      }
      accounts[normalizedEmail] = recoveredUser
      localStorage.setItem('pcos_accounts', JSON.stringify(accounts))
      localStorage.setItem('pcos_current_user', JSON.stringify(recoveredUser))
      return { success: true, user: recoveredUser }
    }
  } catch (e) {
    console.warn('Supabase lookup note:', e)
  }

  // If user doesn't exist, create new account so login never blocks
  const newUser = {
    id: `usr_${Date.now()}`,
    full_name: normalizedEmail.split('@')[0] || 'Patient',
    email: normalizedEmail,
    password,
    region_preference: 'South Indian',
    diet_type: 'Vegetarian',
    demographics: {},
    is_new: true,
  }
  accounts[normalizedEmail] = newUser
  localStorage.setItem('pcos_accounts', JSON.stringify(accounts))
  localStorage.setItem('pcos_current_user', JSON.stringify(newUser))
  return { success: true, user: newUser }
}

export async function updatePatientProfile(userId, updates) {
  try {
    const cur = getCurrentUser() || {}
    const updatedUser = { ...cur, ...updates }

    localStorage.setItem('pcos_current_user', JSON.stringify(updatedUser))

    let accounts = {}
    try {
      const raw = localStorage.getItem('pcos_accounts')
      if (raw) accounts = JSON.parse(raw)
    } catch {}
    if (updatedUser.email && accounts[updatedUser.email]) {
      accounts[updatedUser.email] = updatedUser
      localStorage.setItem('pcos_accounts', JSON.stringify(accounts))
    }

    if (updatedUser.email) {
      await supabase
        .from('registrations')
        .update({
          full_name: updatedUser.full_name,
          phone: updatedUser.phone,
          dob: updatedUser.dob || null,
          age: updatedUser.age || null,
          region_preference: updatedUser.region_preference,
          diet_type: updatedUser.diet_type,
          demographics: updatedUser.demographics || {},
        })
        .eq('email', updatedUser.email)
    }

    return { success: true, user: updatedUser }
  } catch (e) {
    console.warn('updatePatientProfile error:', e)
    return { success: false, error: e.message }
  }
}

export async function fetchUserSubmissions(email) {
  try {
    let query = supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (email) {
      query = query.eq('email', email)
    }

    const { data, error } = await query

    if (!error && Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch (e) {
    console.warn('fetchUserSubmissions error:', e)
  }

  try {
    const cached = sessionStorage.getItem('pcos_last_result')
    if (cached) {
      return [JSON.parse(cached)]
    }
  } catch {}

  return []
}

// ==========================================
// Category-Specific Database Tables Integration
// ==========================================

// --- Category 1: Medical Details & Biomarkers Record ---
export async function saveMedicalRecord(email, data) {
  if (!email) return { success: false, error: 'Email required' }
  const payload = {
    email,
    rotterdam_irregular_cycles: data.rotterdam_irregular_cycles || 'no',
    rotterdam_hyperandrogenism: data.rotterdam_hyperandrogenism || 'no',
    rotterdam_polycystic_ovaries: data.rotterdam_polycystic_ovaries || 'no',
    exclusion_other_disorders: data.exclusion_other_disorders || 'no',
    lab_total_testosterone: data.lab_total_testosterone ? Number(data.lab_total_testosterone) : null,
    lab_dheas: data.lab_dheas ? Number(data.lab_dheas) : null,
    lab_fasting_insulin: data.lab_fasting_insulin ? Number(data.lab_fasting_insulin) : null,
    lab_fasting_glucose: data.lab_fasting_glucose ? Number(data.lab_fasting_glucose) : null,
    lab_hscrp: data.lab_hscrp ? Number(data.lab_hscrp) : null,
    lab_lh: data.lab_lh ? Number(data.lab_lh) : null,
    lab_fsh: data.lab_fsh ? Number(data.lab_fsh) : null,
    extracted_report: data.extracted_report || null,
    raw_answers: data.raw_answers || null,
    updated_at: new Date().toISOString(),
  }

  try {
    const { data: existing } = await supabase
      .from('medical_records')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    let res
    if (existing?.id) {
      res = await supabase
        .from('medical_records')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      res = await supabase
        .from('medical_records')
        .insert([payload])
        .select()
        .single()
    }

    if (res.error) throw res.error
    localStorage.setItem(`pcos_medical_${email}`, JSON.stringify(res.data))
    return { success: true, data: res.data }
  } catch (err) {
    console.warn('saveMedicalRecord Supabase note:', err)
    localStorage.setItem(`pcos_medical_${email}`, JSON.stringify(payload))
    return { success: true, data: payload, local: true }
  }
}

export async function fetchMedicalRecord(email) {
  if (!email) return null
  try {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) return data
  } catch (err) {
    console.warn('fetchMedicalRecord note:', err)
  }

  try {
    const cached = localStorage.getItem(`pcos_medical_${email}`)
    if (cached) return JSON.parse(cached)
  } catch {}
  return null
}

// --- Category 2: Lifestyle & Diet Protocols ---
export async function saveLifestylePlan(email, plan) {
  if (!email) return { success: false }
  const payload = {
    email,
    region_preference: plan.region_preference,
    diet_type: plan.diet_type,
    primary_phenotype: plan.primary_phenotype,
    dietary_strategy: plan.dietary_strategy,
    exercise_routine: plan.exercise_routine,
    supplement_roadmap: plan.supplement_roadmap,
    sample_day: plan.sample_day || {},
    updated_at: new Date().toISOString(),
  }

  try {
    const { data: existing } = await supabase
      .from('lifestyle_plans')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    let res
    if (existing?.id) {
      res = await supabase
        .from('lifestyle_plans')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      res = await supabase
        .from('lifestyle_plans')
        .insert([payload])
        .select()
        .single()
    }

    if (res.error) throw res.error
    localStorage.setItem(`pcos_lifestyle_${email}`, JSON.stringify(res.data))
    return { success: true, data: res.data }
  } catch (err) {
    console.warn('saveLifestylePlan note:', err)
    localStorage.setItem(`pcos_lifestyle_${email}`, JSON.stringify(payload))
    return { success: true, data: payload, local: true }
  }
}

export async function fetchLifestylePlan(email) {
  if (!email) return null
  try {
    const { data, error } = await supabase
      .from('lifestyle_plans')
      .select('*')
      .eq('email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) return data
  } catch (err) {
    console.warn('fetchLifestylePlan note:', err)
  }

  try {
    const cached = localStorage.getItem(`pcos_lifestyle_${email}`)
    if (cached) return JSON.parse(cached)
  } catch {}
  return null
}

// --- Category 3: Daily Logs & Cycle Tracking ---
export async function saveDailyLog(email, entry) {
  if (!email) return { success: false }
  const payload = {
    email,
    date: entry.date || new Date().toISOString().slice(0, 10),
    cycle_phase: entry.cycle_phase || entry.cycle,
    mood: entry.mood ? Number(entry.mood) : null,
    sleep_hours: entry.sleep_hours ? Number(entry.sleep_hours) : null,
    symptoms: entry.symptoms || [],
    notes: entry.notes || '',
  }

  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.warn('saveDailyLog note:', err)
    return { success: true, data: payload, local: true }
  }
}

export async function fetchDailyLogs(email) {
  if (!email) return []
  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('email', email)
      .order('date', { ascending: false })
      .limit(30)

    if (!error && Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch (err) {
    console.warn('fetchDailyLogs note:', err)
  }

  try {
    const local = localStorage.getItem('pcos_journey_entries')
    if (local) return JSON.parse(local)
  } catch {}
  return []
}

export async function deleteDailyLog(id) {
  try {
    await supabase.from('daily_logs').delete().eq('id', id)
  } catch (e) {
    console.warn('deleteDailyLog note:', e)
  }
}

// ==========================================
// Assessment Category Tables (first_line, metabolic, hormonal, adrenal, inflammatory, mitochondrial, exclusions)
// ==========================================

export const ASSESSMENT_CATEGORY_TABLES = {
  first_line: 'assessment_first_line',
  metabolic: 'assessment_metabolic',
  hormonal: 'assessment_hormonal',
  adrenal: 'assessment_adrenal',
  inflammatory: 'assessment_inflammatory',
  mitochondrial: 'assessment_mitochondrial',
  exclusions: 'assessment_exclusions',
}

export async function saveAssessmentCategory(email, categoryKey, categoryAnswers) {
  const table = ASSESSMENT_CATEGORY_TABLES[categoryKey]
  if (!table || !email) return { success: false, error: 'Invalid category or email' }

  const payload = {
    email,
    answers: categoryAnswers,
    updated_at: new Date().toISOString(),
  }

  try {
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    let res
    if (existing?.id) {
      res = await supabase
        .from(table)
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      res = await supabase
        .from(table)
        .insert([payload])
        .select()
        .single()
    }

    if (res.error) throw res.error
    localStorage.setItem(`pcos_cat_${categoryKey}_${email}`, JSON.stringify(categoryAnswers))
    return { success: true, data: res.data, table }
  } catch (err) {
    console.warn(`saveAssessmentCategory [${table}] note:`, err)
    localStorage.setItem(`pcos_cat_${categoryKey}_${email}`, JSON.stringify(categoryAnswers))
    return { success: true, data: payload, local: true, table }
  }
}

export async function fetchAssessmentCategory(email, categoryKey) {
  const table = ASSESSMENT_CATEGORY_TABLES[categoryKey]
  if (!table || !email) return {}

  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data?.answers) {
      return data.answers
    }
  } catch (err) {
    console.warn(`fetchAssessmentCategory [${table}] note:`, err)
  }

  try {
    const cached = localStorage.getItem(`pcos_cat_${categoryKey}_${email}`)
    if (cached) return JSON.parse(cached)
  } catch {}
  return {}
}

export async function fetchAllAssessmentCategories(email) {
  if (!email) return { byCategory: {}, unified: {} }
  const keys = Object.keys(ASSESSMENT_CATEGORY_TABLES)
  const results = await Promise.all(
    keys.map((key) => fetchAssessmentCategory(email, key).then((ans) => ({ key, ans })))
  )
  const byCategory = {}
  const unified = {}
  for (const { key, ans } of results) {
    byCategory[key] = ans || {}
    Object.assign(unified, ans || {})
  }
  return { byCategory, unified }
}


