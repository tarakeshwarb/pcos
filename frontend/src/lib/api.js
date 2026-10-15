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

  try {
    const record = {
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

    const { data, error } = await supabase
      .from('submissions')
      .insert([record])
      .select()
      .single()

    if (error) throw error

    return {
      ...data,
      source: 'supabase',
    }
  } catch (err) {
    console.warn('Supabase submit error, falling back to local result:', err)
    return {
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      scores: result.scores,
      classification: result.classification,
      recommendation: result.recommendation,
      questionnaire_version: defaultVersion,
      source: 'local',
      _localPayload: payload,
    }
  }
}
