import { questionnaire, runPipeline } from './ruleEngine.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function fetchQuestionnaire() {
  try {
    const res = await fetch(`${API_BASE}/api/questionnaire`, { signal: AbortSignal.timeout(2500) })
    if (!res.ok) throw new Error('bad response')
    return { data: await res.json(), source: 'backend' }
  } catch {
    return { data: questionnaire, source: 'local' }
  }
}

export async function fetchResult(id) {
  const res = await fetch(`${API_BASE}/api/result/${id}`, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) throw new Error('not found')
  return { ...(await res.json()), source: 'backend' }
}

export async function registerPatient(payload) {
  // Real backend table now (Ishi's call), but registration must never block
  // the flow -- if the backend is unreachable the page still proceeds using
  // its existing sessionStorage handoff, same fallback shape as elsewhere
  // in this file. Nothing here is ever sent to an AI provider or any
  // service outside this project's own database.
  try {
    const res = await fetch(`${API_BASE}/api/registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error('bad response')
    return { ...(await res.json()), source: 'backend' }
  } catch {
    return { source: 'local' }
  }
}

export async function submitFeedback(payload) {
  // Same best-effort pattern as registerPatient: never blocks the UI, and
  // never sends anything anywhere except this project's own backend.
  try {
    const res = await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error('bad response')
    return { ...(await res.json()), source: 'backend' }
  } catch {
    return { source: 'local' }
  }
}

export async function submitAssessment(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error('bad response')
    const data = await res.json()
    return { ...data, source: 'backend' }
  } catch {
    // Backend unreachable -- compute locally with the identical rule engine
    // so the demo never blocks on infrastructure being up.
    const result = runPipeline(payload.answers, payload.region_preference, payload.diet_type)
    return {
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      scores: result.scores,
      classification: result.classification,
      recommendation: result.recommendation,
      questionnaire_version: questionnaire.meta.version,
      source: 'local',
      _localPayload: payload,
    }
  }
}
