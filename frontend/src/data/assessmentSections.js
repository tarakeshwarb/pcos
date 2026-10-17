import questionnaire from './questionnaire.json'

// ============================================================
// 7 REAL Questionnaire Categories from questionnaire.json
// mapped directly to dedicated Supabase assessment tables
// ============================================================
export const ASSESSMENT_SECTIONS = [
  {
    key: 'first_line',
    number: 1,
    title: 'First-Line Testing',
    subtitle: 'Rotterdam Diagnostic Gate',
    short: 'First-Line',
    icon: '🔬',
    desc: 'Rotterdam international consensus criteria: irregular menstrual cycles, clinical or biochemical androgen excess, and polycystic ovarian morphology.',
    table: 'assessment_first_line',
    questions: questionnaire.first_line?.questions || [],
  },
  {
    key: 'metabolic',
    number: 2,
    title: 'Metabolic Phenotype Axis',
    subtitle: 'Insulin Resistance & Glucose Dynamics',
    short: 'Metabolic',
    icon: '⚡',
    desc: 'Evaluates fasting insulin, HOMA-IR, glucose tolerance, lipid ratios, visceral weight distribution, and acanthosis nigricans.',
    table: 'assessment_metabolic',
    questions: questionnaire.phenotypes?.metabolic?.questions || [],
  },
  {
    key: 'hormonal',
    number: 3,
    title: 'Hormonal Phenotype Axis',
    subtitle: 'Ovarian Hyperandrogenism & LH/FSH',
    short: 'Hormonal',
    icon: '🧬',
    desc: 'Evaluates LH:FSH ratio, total & free testosterone, SHBG, hirsutism (Ferriman-Gallwey scale), and post-pill amenorrhea.',
    table: 'assessment_hormonal',
    questions: questionnaire.phenotypes?.hormonal?.questions || [],
  },
  {
    key: 'adrenal',
    number: 4,
    title: 'Adrenal Phenotype Axis',
    subtitle: 'Stress-Driven HPA & Cortisol',
    short: 'Adrenal',
    icon: '🧘',
    desc: 'Evaluates DHEA-S, morning cortisol, resting vitals, Perceived Stress Scale (PSS-10), and sleep disruption.',
    table: 'assessment_adrenal',
    questions: questionnaire.phenotypes?.adrenal?.questions || [],
  },
  {
    key: 'inflammatory',
    number: 5,
    title: 'Inflammatory Phenotype Axis',
    subtitle: 'Systemic Inflammation & Gut Dysbiosis',
    short: 'Inflammatory',
    icon: '🛡️',
    desc: 'Evaluates hs-CRP, ESR, gut permeability/IBS symptoms, food intolerances, chronic fatigue, and joint pain.',
    table: 'assessment_inflammatory',
    questions: questionnaire.phenotypes?.inflammatory?.questions || [],
  },
  {
    key: 'mitochondrial',
    number: 6,
    title: 'Energy Screen (Mitochondrial)',
    subtitle: 'Cellular Bioenergetics & Fatigue',
    short: 'Energy Screen',
    icon: '🔋',
    desc: 'Screens for cellular mitochondrial depletion, post-meal brain fog, sudden energy crashes, and poor exercise recovery.',
    table: 'assessment_mitochondrial',
    questions: questionnaire.mitochondrial_axis?.questions || [],
  },
  {
    key: 'exclusions',
    number: 7,
    title: 'Exclusion Criteria & Differentials',
    subtitle: 'Ruling Out Mimicking Conditions',
    short: 'Exclusions',
    icon: '🩺',
    desc: 'Rules out mimicking conditions including thyroid disorders (TSH), hyperprolactinemia, and congenital adrenal hyperplasia.',
    table: 'assessment_exclusions',
    questions: questionnaire.exclusions?.questions || [],
  },
]

// Identify the primary step for shared questions so they sync across sections
export const PRIMARY_STEP_FOR_SHARED_FIELD = {}
for (const sec of ASSESSMENT_SECTIONS) {
  for (const q of sec.questions || []) {
    if (q.shared_field && !(q.shared_field in PRIMARY_STEP_FOR_SHARED_FIELD)) {
      PRIMARY_STEP_FOR_SHARED_FIELD[q.shared_field] = sec.key
    }
  }
}
