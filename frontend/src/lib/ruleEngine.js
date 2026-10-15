// JS port of backend/app/rule_engine.py — kept in lock-step with it so the
// app can classify locally (offline demo / backend down) exactly the same
// way the FastAPI backend does. If you change a threshold, change it in
// src/data/questionnaire.json (and the backend's copy) — not here.
import diet from '../data/diet_protocols.json'
import questionnaire from '../data/questionnaire.json'

const PHENOTYPE_IDS = Object.keys(questionnaire.phenotypes)

function get(values, field) {
  const v = values[field]
  if (v === undefined || v === null || v === '') return null
  return v
}

export function evaluateRule(rule, values) {
  const { op } = rule
  if (op === 'any') return rule.rules.some((r) => evaluateRule(r, values))
  if (op === 'all') return rule.rules.every((r) => evaluateRule(r, values))
  if (op === 'not') return !evaluateRule(rule.rule, values)

  const v = get(values, rule.field)

  if (op === 'eq') return v !== null && String(v).toLowerCase() === String(rule.value).toLowerCase()
  if (op === 'in') return v !== null && rule.values.map(String).includes(String(v))
  if (v === null) return false
  const n = Number(v)
  if (op === 'gt') return n > rule.value
  if (op === 'gte') return n >= rule.value
  if (op === 'lt') return n < rule.value
  if (op === 'lte') return n <= rule.value
  if (op === 'outside') {
    const [low, high] = rule.range
    return n < low || n > high
  }
  throw new Error(`Unknown rule op: ${op}`)
}

const FORMULAS = {
  bmi: (v) => v.weight_kg / Math.pow(v.height_cm / 100, 2),
  whr: (v) => v.waist_cm / v.hip_cm,
  tg_hdl_ratio: (v) => v.triglycerides / v.hdl,
  // Perceived Stress Scale (PSS-10): sum all 10 items, with items 4, 5, 7
  // and 8 reverse-scored (4 - response) -- standard Cohen et al. 1983
  // scoring. Must match the `computed.pss_total` expression string in
  // questionnaire.json exactly (the Python backend interprets that string
  // directly; this JS engine hardcodes the same formula instead).
  pss_total: (v) => (
    v.pss_1 + v.pss_2 + v.pss_3 + (4 - v.pss_4) + (4 - v.pss_5)
    + v.pss_6 + (4 - v.pss_7) + (4 - v.pss_8) + v.pss_9 + v.pss_10
  ),
  // PHQ-2: simple sum of both items (0-3 each), standard Kroenke et al. 2003.
  phq2_total: (v) => v.phq2_1 + v.phq2_2,
}

// Live BMI helper for the Metabolic page (mentor feedback: show BMI as soon
// as height/weight are entered, not just after submitting). Not tied to the
// rule engine's internal `bmi` field name on purpose, so the UI can call it
// straight from raw form input.
export function liveBmi(heightCm, weightKg) {
  const h = Number(heightCm)
  const w = Number(weightKg)
  if (!h || !w) return null
  const bmi = w / Math.pow(h / 100, 2)
  if (!Number.isFinite(bmi)) return null
  let category = 'Normal'
  if (bmi < 18.5) category = 'Underweight'
  else if (bmi >= 25 && bmi < 30) category = 'Overweight'
  else if (bmi >= 30) category = 'Obese'
  return { bmi: Math.round(bmi * 10) / 10, category }
}

export function computeDerivedFields(values) {
  const enriched = { ...values }
  for (const phenotype of Object.values(questionnaire.phenotypes)) {
    for (const q of phenotype.questions) {
      const computed = q.computed || {}
      for (const key of Object.keys(computed)) {
        const fn = FORMULAS[key]
        if (!fn) continue
        try {
          const result = fn(enriched)
          if (Number.isFinite(result)) enriched[key] = result
        } catch {
          /* missing inputs -> leave uncomputed */
        }
      }
    }
  }
  return enriched
}

function severityLabel(positiveCount) {
  for (const band of questionnaire.severity_bands.bands) {
    if (positiveCount >= band.min && positiveCount <= band.max) return band.label
  }
  return 'Severe Driver / Primary Target'
}

export function scorePhenotypes(answers) {
  const values = computeDerivedFields(answers)
  const results = {}

  for (const [pid, phenotype] of Object.entries(questionnaire.phenotypes)) {
    let biochemicalPositive = 0
    const ticks = phenotype.questions.map((q) => {
      const positive = evaluateRule(q.rule, values)
      if (positive && q.category === 'Biochemical Evaluation') biochemicalPositive += 1
      return { id: q.id, label: q.label, category: q.category, reference: q.reference, positive }
    })
    const total = phenotype.questions.length
    const positiveCount = ticks.filter((t) => t.positive).length
    results[pid] = {
      label: phenotype.label,
      positive_count: positiveCount,
      total_questions: total,
      percentage: Math.round((positiveCount / total) * 1000) / 10,
      severity: severityLabel(positiveCount),
      biochemical_positive_count: biochemicalPositive,
      biomarker_support_flag: biochemicalPositive >= 3,
      ticks,
    }
  }

  const mito = questionnaire.mitochondrial_axis
  const mitoTicks = mito.questions.map((q) => ({
    id: q.id, label: q.label, reference: q.reference, positive: evaluateRule(q.rule, values),
  }))
  const mitoPositive = mitoTicks.filter((t) => t.positive).length
  results.mitochondrial = {
    label: mito.label,
    positive_count: mitoPositive,
    total_questions: mito.questions.length,
    percentage: Math.round((mitoPositive / mito.questions.length) * 1000) / 10,
    ticks: mitoTicks,
    flag: mitoPositive >= 2,
  }

  return { scores: results, values }
}

export function evaluateOverrides(values) {
  const triggered = []
  for (const override of questionnaire.overrides) {
    if (evaluateRule(override.rule, values)) {
      triggered.push({ id: override.id, phenotype: override.phenotype, label: override.label, reference: override.reference })
    }
  }
  return triggered
}

export function classify(scores, overridesTriggered) {
  const percentages = Object.fromEntries(PHENOTYPE_IDS.map((pid) => [pid, scores[pid].percentage]))
  const maxPct = Math.max(...Object.values(percentages))
  const tallyLeaders = PHENOTYPE_IDS.filter((pid) => percentages[pid] === maxPct)

  const overridePhenotypes = [...new Set(overridesTriggered.map((o) => o.phenotype))].sort()
  const biomarkerSupport = PHENOTYPE_IDS.filter((pid) => scores[pid].biomarker_support_flag)

  let classification, primary, involved, reason

  if (overridePhenotypes.length >= 2) {
    classification = 'Mixed/Combination Phenotype'
    primary = null
    involved = overridePhenotypes
    reason = `Multiple biomarker overrides triggered simultaneously (${overridesTriggered
      .map((o) => o.label)
      .join(', ')}) — Section 3 Key Biomarker Priority Overrules.`
  } else if (overridePhenotypes.length === 1) {
    const forced = overridePhenotypes[0]
    classification = 'Primary Phenotype (Biomarker Override)'
    primary = forced
    involved = [forced]
    const matching = overridesTriggered.find((o) => o.phenotype === forced)
    reason = `Biomarker override triggered: ${matching.label} — ${matching.reference}.`
    if (!tallyLeaders.includes(forced)) {
      reason += ` This overrules the tally leader(s) (${tallyLeaders.join(', ')}).`
    }
  } else if (maxPct === 0) {
    classification = 'Inconclusive / Minimal Findings'
    primary = null
    involved = []
    reason = 'No positive ticks recorded in any of the four phenotype categories.'
  } else if (tallyLeaders.length === 1) {
    classification = 'Primary Phenotype'
    primary = tallyLeaders[0]
    involved = [primary]
    reason = `Highest tick percentage (${maxPct}%) with no conflicting biomarker override.`
  } else {
    classification = 'Mixed/Combination Phenotype'
    primary = null
    involved = tallyLeaders
    reason = `Tied highest tick percentage (${maxPct}%) between ${tallyLeaders.join(', ')} — Section 3 Mixed/Combination rule.`
  }

  return {
    classification,
    primary_phenotype: primary,
    phenotypes_involved: involved,
    reason,
    tally_leaders: tallyLeaders,
    overrides_triggered: overridesTriggered,
    biomarker_supported_phenotypes: biomarkerSupport,
  }
}

function bodyTypeModifier(bodyType) {
  const modifiers = diet.body_type_modifiers
  if (!modifiers || !bodyType) return null
  return modifiers[bodyType] || null
}

function phenotypeBlock(phenotypeId, region, dietType, bodyType) {
  const general = diet.general_protocol[phenotypeId]
  const regional = diet.regional_suggestions[phenotypeId]
  const plan = diet.meal_plans[phenotypeId]
  const modifier = bodyTypeModifier(bodyType)
  return {
    phenotype: phenotypeId,
    focus: general.focus,
    diet_strategy: modifier ? [...general.diet_strategy, ...modifier.diet_strategy] : general.diet_strategy,
    exercise: modifier ? [...general.exercise, ...modifier.exercise] : general.exercise,
    priorities: general.priorities,
    body_type: bodyType || null,
    regional_suggestions: {
      region,
      primary_focus: regional.primary_focus,
      suggestions: regional[region] || {},
    },
    day_plan: {
      diet_type: dietType,
      meals: plan[dietType] || {},
      mid_meals_and_beverages: plan.mid_meals,
    },
  }
}

export function buildRecommendation(classification, scores, region, dietType, bodyType) {
  const involved = classification.phenotypes_involved
  const isMixed = classification.classification.startsWith('Mixed')
  const blocks = involved.map((pid) => phenotypeBlock(pid, region, dietType, bodyType))
  const mitoFlag = scores.mitochondrial?.flag
  return {
    is_mixed: isMixed,
    phenotype_blocks: blocks,
    mitochondrial_support: {
      recommended_priority: mitoFlag ? 'high' : 'foundational',
      note: mitoFlag
        ? 'Mitochondrial/hypoxia screen (Section 2, Table 5) flagged 2+ positive findings — treat this as a co-primary support track alongside the phenotype protocol above.'
        : 'General foundational support; add if energy, fatigue, or hypoxia symptoms are prominent.',
      ...phenotypeBlock('mitochondrial', region, dietType, bodyType),
    },
  }
}

export function checkRotterdamAndExclusions(answers) {
  if (answers.exclusion_other_disorders === 'yes') {
    return { status: 'excluded', reason: 'Excluded due to other suspected thyroid or pituitary disorders.' }
  }

  let rotterdamCount = 0
  if (answers.irregular_cycle === 'yes') rotterdamCount++
  if (answers.high_testosterone_symptoms === 'yes' || (answers.total_testosterone && Number(answers.total_testosterone) > 45)) rotterdamCount++
  if (answers.polycystic_ovaries_usg === 'yes') rotterdamCount++

  if (rotterdamCount < 2) {
    return { status: 'not_pcos', reason: 'Does not meet Rotterdam Criteria (requires 2 of 3: irregular cycles, high testosterone, polycystic ovaries).' }
  }

  return { status: 'pcos', reason: 'Meets Rotterdam Criteria for PCOS diagnosis.' }
}

export function runPipeline(answers, region, dietType) {
  const { scores, values } = scorePhenotypes(answers)
  
  const rotterdamResult = checkRotterdamAndExclusions(values)
  if (rotterdamResult.status !== 'pcos') {
    return {
      scores,
      classification: {
        classification: rotterdamResult.status === 'excluded' ? 'Excluded' : 'Inconclusive — Does not meet Rotterdam Criteria',
        primary_phenotype: null,
        phenotypes_involved: [],
        reason: rotterdamResult.reason,
        overrides_triggered: [],
        biomarker_supported_phenotypes: [],
      },
      recommendation: {
        is_mixed: false,
        phenotype_blocks: [],
        mitochondrial_support: null,
      },
      computed_values: values
    }
  }

  const overridesTriggered = evaluateOverrides(values)
  const classification = classify(scores, overridesTriggered)
  const recommendation = buildRecommendation(classification, scores, region, dietType, values.body_type)
  return { scores, classification, recommendation, computed_values: values }
}

export { questionnaire, diet as dietProtocols, PHENOTYPE_IDS }
