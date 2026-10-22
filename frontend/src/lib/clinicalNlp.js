import { liveBmi } from './ruleEngine.js'

// ============================================================
// Clinical NLP Knowledge Base of All Rotterdam & Phenotype Fields
// ============================================================
export const CLINICAL_FIELDS = [
  // First-Line Testing
  {
    key: 'irregular_cycle',
    label: 'Irregular menstrual cycle',
    category: 'first_line',
    type: 'yesno',
    synonyms: [
      'irregular cycle',
      'cycle irregular',
      'periods',
      'period',
      'menstrual',
      'irregular period',
      'irregular periods',
      'amenorrhea',
      'oligomenorrhea',
      'period cycle',
      'cycle',
      'bleeding',
    ],
  },
  {
    key: 'high_testosterone_symptoms',
    label: 'Clinical androgen excess symptoms',
    category: 'first_line',
    type: 'yesno',
    synonyms: [
      'high testosterone',
      'androgen excess',
      'excess androgen',
      'androgen symptoms',
      'testosterone symptoms',
      'male pattern hair',
    ],
  },
  {
    key: 'polycystic_ovaries_usg',
    label: 'Polycystic ovarian morphology (USG)',
    category: 'first_line',
    type: 'yesno',
    synonyms: [
      'ultrasound',
      'usg',
      'scan',
      'ovaries',
      'ovary',
      'polycystic ovaries',
      'cysts',
      'follicles on ultrasound',
    ],
  },

  // Metabolic Phenotype
  {
    key: 'weight_kg',
    label: 'Weight',
    category: 'metabolic',
    type: 'number',
    unit: 'kg',
    synonyms: ['weight', 'weigh', 'kg', 'kilos', 'body weight', 'bodyweight', 'mass'],
  },
  {
    key: 'height_cm',
    label: 'Height',
    category: 'metabolic',
    type: 'number',
    unit: 'cm',
    synonyms: ['height', 'tall', 'cm', 'centimeter', 'centimeters'],
  },
  {
    key: 'waist_cm',
    label: 'Waist circumference',
    category: 'metabolic',
    type: 'number',
    unit: 'cm',
    synonyms: ['waist', 'waist size', 'waist circumference', 'belly size'],
  },
  {
    key: 'hip_cm',
    label: 'Hip circumference',
    category: 'metabolic',
    type: 'number',
    unit: 'cm',
    synonyms: ['hip', 'hip size', 'hip circumference'],
  },
  {
    key: 'fasting_glucose',
    label: 'Fasting Glucose',
    category: 'metabolic',
    type: 'number',
    unit: 'mg/dL',
    synonyms: ['fasting glucose', 'glucose', 'blood sugar', 'sugar', 'fasting blood sugar', 'fbs'],
  },
  {
    key: 'fasting_insulin',
    label: 'Fasting Insulin',
    category: 'metabolic',
    type: 'number',
    unit: 'µIU/mL',
    synonyms: ['fasting insulin', 'insulin', 'serum insulin'],
  },
  {
    key: 'hba1c',
    label: 'HbA1c',
    category: 'metabolic',
    type: 'number',
    unit: '%',
    synonyms: ['hba1c', 'a1c', 'glycated hemoglobin'],
  },
  {
    key: 'triglycerides',
    label: 'Triglycerides',
    category: 'metabolic',
    type: 'number',
    unit: 'mg/dL',
    synonyms: ['triglycerides', 'triglyceride', 'tg'],
  },
  {
    key: 'hdl',
    label: 'HDL Cholesterol',
    category: 'metabolic',
    type: 'number',
    unit: 'mg/dL',
    synonyms: ['hdl', 'hdl cholesterol', 'good cholesterol'],
  },
  {
    key: 'acanthosis_nigricans',
    label: 'Acanthosis nigricans',
    category: 'metabolic',
    type: 'yesno',
    synonyms: ['acanthosis', 'acanthosis nigricans', 'dark skin patches', 'dark neck', 'dark patches'],
  },
  {
    key: 'skin_tags',
    label: 'Skin tags',
    category: 'metabolic',
    type: 'yesno',
    synonyms: ['skin tags', 'skin tag', 'skintags'],
  },
  {
    key: 'postprandial_slump',
    label: 'Energy slump after meals',
    category: 'metabolic',
    type: 'yesno',
    synonyms: ['post meal slump', 'postprandial slump', 'food coma', 'slump after eating', 'tired after meals'],
  },

  // Hormonal Phenotype
  {
    key: 'sym_acne',
    label: 'Acne & skin breakouts',
    category: 'hormonal',
    type: 'yesno',
    synonyms: ['acne', 'pimple', 'pimples', 'breakout', 'breakouts', 'cystic acne', 'skin breakouts', 'adult acne'],
  },
  {
    key: 'hirsutism_severity',
    label: 'Hirsutism (excess hair growth)',
    category: 'hormonal',
    type: 'select',
    options: ['None', 'Mild', 'Moderate', 'Severe'],
    synonyms: ['hirsutism', 'facial hair', 'chin hair', 'excess hair', 'body hair', 'upper lip hair'],
  },
  {
    key: 'alopecia',
    label: 'Alopecia (scalp thinning)',
    category: 'hormonal',
    type: 'yesno',
    synonyms: ['alopecia', 'hair loss', 'hair thinning', 'scalp thinning', 'bald', 'thinning hair', 'hair fall'],
  },
  {
    key: 'total_testosterone',
    label: 'Total Testosterone',
    category: 'hormonal',
    type: 'number',
    unit: 'ng/dL',
    synonyms: ['total testosterone', 'testosterone level', 'testosterone'],
  },
  {
    key: 'free_testosterone',
    label: 'Free Testosterone',
    category: 'hormonal',
    type: 'number',
    unit: 'ng/dL',
    synonyms: ['free testosterone', 'free test'],
  },
  {
    key: 'lh_fsh_ratio',
    label: 'LH:FSH ratio',
    category: 'hormonal',
    type: 'number',
    synonyms: ['lh fsh', 'lh to fsh', 'lh:fsh', 'lh fsh ratio', 'lh/fsh'],
  },
  {
    key: 'shbg',
    label: 'SHBG',
    category: 'hormonal',
    type: 'number',
    unit: 'nmol/L',
    synonyms: ['shbg', 'sex hormone binding globulin'],
  },
  {
    key: 'post_pill_amenorrhea',
    label: 'Post-pill amenorrhea history',
    category: 'hormonal',
    type: 'yesno',
    synonyms: ['post pill', 'post-pill', 'post pill amenorrhea', 'birth control', 'oral contraceptive'],
  },

  // Adrenal Phenotype
  {
    key: 'dhea_s',
    label: 'DHEA-S',
    category: 'adrenal',
    type: 'number',
    unit: 'µg/dL',
    synonyms: ['dhea', 'dheas', 'dhea-s', 'adrenal androgen'],
  },
  {
    key: 'cortisol_am',
    label: 'AM Cortisol',
    category: 'adrenal',
    type: 'number',
    unit: 'µg/dL',
    synonyms: ['cortisol', 'morning cortisol', 'am cortisol', 'stress hormone'],
  },
  {
    key: 'sleep_hours',
    label: 'Daily sleep',
    category: 'adrenal',
    type: 'number',
    unit: 'hours',
    synonyms: ['sleep', 'sleep hours', 'sleeping', 'hours of sleep', 'night sleep'],
  },
  {
    key: 'sleep_poor_quality',
    label: 'Frequent awakenings / poor sleep',
    category: 'adrenal',
    type: 'yesno',
    synonyms: ['poor sleep', 'insomnia', 'waking up at night', 'restless sleep', 'disturbed sleep'],
  },
  {
    key: 'adrenal_fatigue',
    label: 'Adrenal burnout & fatigue',
    category: 'adrenal',
    type: 'yesno',
    synonyms: ['fatigue', 'adrenal fatigue', 'burnout', 'worn out', 'exhausted', 'tired', 'extreme fatigue'],
  },
  {
    key: 'mood_swings',
    label: 'Frequent mood swings',
    category: 'adrenal',
    type: 'yesno',
    synonyms: ['mood swings', 'moodiness', 'irritability', 'mood swing', 'anxious mood'],
  },
  {
    key: 'systolic',
    label: 'Systolic Blood Pressure',
    category: 'adrenal',
    type: 'number',
    unit: 'mmHg',
    synonyms: ['systolic', 'systolic bp', 'blood pressure top', 'bp systolic'],
  },
  {
    key: 'diastolic',
    label: 'Diastolic Blood Pressure',
    category: 'adrenal',
    type: 'number',
    unit: 'mmHg',
    synonyms: ['diastolic', 'diastolic bp', 'blood pressure bottom', 'bp diastolic'],
  },
  {
    key: 'heart_rate',
    label: 'Resting Heart Rate',
    category: 'adrenal',
    type: 'number',
    unit: 'bpm',
    synonyms: ['heart rate', 'pulse', 'pulse rate', 'resting heart rate', 'bpm'],
  },

  // Inflammatory Phenotype
  {
    key: 'hs_crp',
    label: 'hs-CRP (C-Reactive Protein)',
    category: 'inflammatory',
    type: 'number',
    unit: 'mg/L',
    synonyms: ['crp', 'hs-crp', 'hscrp', 'c-reactive protein', 'inflammation marker'],
  },
  {
    key: 'tsh',
    label: 'TSH (Thyroid Stimulating Hormone)',
    category: 'inflammatory',
    type: 'number',
    unit: 'mIU/L',
    synonyms: ['tsh', 'thyroid', 'thyroid level', 'tsh level'],
  },
  {
    key: 'vitamin_d3',
    label: 'Vitamin D3',
    category: 'inflammatory',
    type: 'number',
    unit: 'ng/mL',
    synonyms: ['vitamin d', 'vit d', 'vitamin d3', 'vit d3', '25-oh vitamin d'],
  },
  {
    key: 'serum_zinc',
    label: 'Serum Zinc',
    category: 'inflammatory',
    type: 'number',
    unit: 'µg/dL',
    synonyms: ['zinc', 'serum zinc'],
  },
  {
    key: 'gut_health_issue',
    label: 'Bloating, IBS & gut dysbiosis',
    category: 'inflammatory',
    type: 'yesno',
    synonyms: ['gut', 'bloating', 'bloat', 'ibs', 'gas', 'constipation', 'gut issues', 'digestion', 'leaky gut'],
  },
  {
    key: 'joint_pain',
    label: 'Joint pain & unexplained swelling',
    category: 'inflammatory',
    type: 'yesno',
    synonyms: ['joint pain', 'joints', 'joint aches', 'swelling', 'joint swelling', 'body aches'],
  },
  {
    key: 'autoimmune_history',
    label: 'Autoimmune history',
    category: 'inflammatory',
    type: 'yesno',
    synonyms: ['autoimmune', 'autoimmunity', 'hashimotos', 'chronic infections'],
  },

  // Energy & Sleep
  {
    key: 'sleep_apnea',
    label: 'Sleep apnea symptoms',
    category: 'mitochondrial',
    type: 'yesno',
    synonyms: ['sleep apnea', 'stop breathing during sleep', 'apnea', 'choking in sleep'],
  },
  {
    key: 'mito_fatigue',
    label: 'Cellular fatigue / low energy',
    category: 'mitochondrial',
    type: 'yesno',
    synonyms: ['low energy', 'brain fog', 'sluggish', 'chronic exhaustion'],
  },
  {
    key: 'sedentary',
    label: 'Sedentary routine',
    category: 'metabolic',
    type: 'yesno',
    synonyms: ['sedentary', 'physical inactivity', 'exercise habit', 'inactive', 'no exercise'],
  },
  {
    key: 'ultraprocessed_food',
    label: 'Ultra-processed / high sugar diet',
    category: 'metabolic',
    type: 'yesno',
    synonyms: ['junk food', 'processed food', 'sugar diet', 'fast food', 'sweet cravings'],
  },
]

// ============================================================
// Intelligent Natural Language Processing Engine (Mini-ChatGPT)
// ============================================================
export function processChatMessage(rawInput, currentQuestion, currentAnswers) {
  if (!rawInput || typeof rawInput !== 'string') return null
  const text = rawInput.trim()
  const lower = text.toLowerCase()

  // 1. Direct answer to current question if simple yes/no
  if (currentQuestion?.fields?.length === 1) {
    const field = currentQuestion.fields[0]
    if (field.type === 'yesno') {
      if (/^(yes|yeah|yep|yup|true|correct|positive|i do|i have|affirmative|sure)\b/i.test(lower)) {
        return {
          type: 'update',
          fieldKey: field.key,
          value: 'yes',
          fieldLabel: currentQuestion.label || field.label,
          message: `✓ Got it! I've recorded **Yes** for **${currentQuestion.label}**.`,
          categoryKey: currentQuestion.categoryKey,
        }
      }
      if (/^(no|nope|nah|false|negative|i don'?t|none|never)\b/i.test(lower)) {
        return {
          type: 'update',
          fieldKey: field.key,
          value: 'no',
          fieldLabel: currentQuestion.label || field.label,
          message: `✓ Got it! I've recorded **No** for **${currentQuestion.label}**.`,
          categoryKey: currentQuestion.categoryKey,
        }
      }
    }

    if (field.type === 'number') {
      const match = lower.match(/^(\d+(?:\.\d+)?)\s*(?:kg|cm|mg\/dl|lbs)?$/i)
      if (match) {
        const numVal = parseFloat(match[1])
        let extra = ''
        if (field.key === 'weight_kg' && currentAnswers.height_cm) {
          const bmi = liveBmi(currentAnswers.height_cm, numVal)
          if (bmi) extra = ` (Calculated BMI: **${bmi.bmi} kg/m²**)`
        }
        return {
          type: 'update',
          fieldKey: field.key,
          value: numVal,
          fieldLabel: currentQuestion.label || field.label,
          message: `✓ Saved **${numVal}${field.unit ? ' ' + field.unit : ''}** for **${field.label}**!${extra}`,
          categoryKey: currentQuestion.categoryKey,
        }
      }
    }
  }

  // 2. Navigation & Special Commands
  if (/^(next|next question|continue|proceed|skip|go next|advance)$/i.test(lower)) {
    return {
      type: 'command',
      command: 'next',
      message: 'Moving to the next question for you.',
    }
  }

  if (/^(back|previous|prev|go back|last question)$/i.test(lower)) {
    return {
      type: 'command',
      command: 'prev',
      message: 'Heading back to the previous question.',
    }
  }

  if (/^(save|save answers|sync|save category)$/i.test(lower)) {
    return {
      type: 'command',
      command: 'save',
      message: 'Saving your current category answers to the secure clinical database.',
    }
  }

  if (/^(report|generate report|submit|finish|done|results)$/i.test(lower)) {
    return {
      type: 'command',
      command: 'submit',
      message: 'Calculating your Rotterdam phenotype balance and generating your clinical diagnostic report…',
    }
  }

  if (/(summary|what did i answer|show answers|show details|recorded|my answers|review)/i.test(lower)) {
    const recordedList = []
    for (const f of CLINICAL_FIELDS) {
      const v = currentAnswers[f.key]
      if (v !== undefined && v !== null && v !== '') {
        const displayVal = v === 'yes' ? 'Yes' : v === 'no' ? 'No' : `${v}${f.unit ? ' ' + f.unit : ''}`
        recordedList.push(`• **${f.label}**: ${displayVal}`)
      }
    }
    const msg =
      recordedList.length > 0
        ? `Here are your currently recorded clinical parameters:\n\n${recordedList.slice(0, 10).join('\n')}${recordedList.length > 10 ? `\n...and ${recordedList.length - 10} more` : ''}\n\nYou can say *'change [detail] to [value]'* anytime to update any of them!`
        : "You haven't recorded any answers yet! Answer the questions on screen or type naturally (e.g. *'my cycle is irregular'*, *'change weight to 65'*)."

    return {
      type: 'reply',
      message: msg,
    }
  }

  if (/^(hello|hi|hey|greetings|start|help|how to use)/i.test(lower)) {
    return {
      type: 'reply',
      message:
        "Hello! I'm your **HelixDx PCOS Clinical Assistant**. I work like ChatGPT to track and update your clinical intake:\n\n" +
        "You can type changes anytime, for example:\n" +
        "• *'change weight to 65 kg'*\n" +
        "• *'my cycle is irregular'*\n" +
        "• *'set acne to no'*\n" +
        "• *'fasting glucose 92'*\n" +
        "• *'sleep 8 hours'*\n\n" +
        "What detail would you like to update?",
    }
  }

  // 3. Search and Match Clinical Field & New Value
  let matchedField = null
  let bestScore = 0

  for (const field of CLINICAL_FIELDS) {
    for (const syn of field.synonyms) {
      if (lower.includes(syn)) {
        if (syn.length > bestScore) {
          bestScore = syn.length
          matchedField = field
        }
      }
    }
  }

  // Check if user is asking to change answer for current question
  if (!matchedField && /(change answer|set answer|change to|update to|make it|it is)/i.test(lower)) {
    if (currentQuestion?.fields?.[0]) {
      matchedField = CLINICAL_FIELDS.find((f) => f.key === currentQuestion.fields[0].key) || {
        key: currentQuestion.fields[0].key,
        label: currentQuestion.label,
        type: currentQuestion.fields[0].type,
        unit: currentQuestion.fields[0].unit,
      }
    }
  }

  if (matchedField) {
    // Extract intended value based on field type
    if (matchedField.type === 'number') {
      const numMatch = lower.match(/\b(\d+(?:\.\d+)?)\b/)
      if (numMatch) {
        const parsedNum = parseFloat(numMatch[1])
        let extra = ''
        if (matchedField.key === 'weight_kg') {
          const height = currentAnswers.height_cm
          if (height) {
            const bmi = liveBmi(height, parsedNum)
            if (bmi) extra = ` (Your updated BMI is now **${bmi.bmi} kg/m²** — ${bmi.category})`
          }
        }
        return {
          type: 'update',
          fieldKey: matchedField.key,
          value: parsedNum,
          fieldLabel: matchedField.label,
          message: `✓ Updated **${matchedField.label}** to **${parsedNum}${matchedField.unit ? ' ' + matchedField.unit : ''}**!${extra}`,
          categoryKey: matchedField.category,
        }
      }
    } else if (matchedField.type === 'yesno') {
      let isYes = null
      if (
        /\b(yes|yeah|yep|yup|true|irregular|have|having|i do|positive|severe|moderate|always|often)\b/i.test(lower) &&
        !/\b(not|no|don'?t|never|regular)\b/i.test(lower)
      ) {
        isYes = true
      } else if (
        /\b(no|nope|nah|false|regular|none|never|negative|don'?t|without|not)\b/i.test(lower)
      ) {
        isYes = false
      } else if (/\b(to yes|is yes)\b/i.test(lower)) {
        isYes = true
      } else if (/\b(to no|is no)\b/i.test(lower)) {
        isYes = false
      }

      if (isYes !== null) {
        const val = isYes ? 'yes' : 'no'
        const valText = isYes ? 'Yes' : 'No'
        return {
          type: 'update',
          fieldKey: matchedField.key,
          value: val,
          fieldLabel: matchedField.label,
          message: `✓ Got it! I've updated **${matchedField.label}** to **${valText}** for you.`,
          categoryKey: matchedField.category,
        }
      }
    } else if (matchedField.type === 'select') {
      if (/\b(none|absent|zero)\b/i.test(lower)) {
        return {
          type: 'update',
          fieldKey: matchedField.key,
          value: 'None',
          fieldLabel: matchedField.label,
          message: `✓ Updated **${matchedField.label}** to **None**.`,
          categoryKey: matchedField.category,
        }
      }
      if (/\b(mild|low)\b/i.test(lower)) {
        return {
          type: 'update',
          fieldKey: matchedField.key,
          value: 'Mild',
          fieldLabel: matchedField.label,
          message: `✓ Updated **${matchedField.label}** to **Mild**.`,
          categoryKey: matchedField.category,
        }
      }
      if (/\b(moderate|medium)\b/i.test(lower)) {
        return {
          type: 'update',
          fieldKey: matchedField.key,
          value: 'Moderate',
          fieldLabel: matchedField.label,
          message: `✓ Updated **${matchedField.label}** to **Moderate**.`,
          categoryKey: matchedField.category,
        }
      }
      if (/\b(severe|high|heavy)\b/i.test(lower)) {
        return {
          type: 'update',
          fieldKey: matchedField.key,
          value: 'Severe',
          fieldLabel: matchedField.label,
          message: `✓ Updated **${matchedField.label}** to **Severe**.`,
          categoryKey: matchedField.category,
        }
      }
    }
  }

  // Fallback assistant response if not understood
  return {
    type: 'reply',
    message:
      `I understood you want to update something, but couldn't detect the exact detail and value.\n\n` +
      `Try writing like:\n` +
      `• *"change weight to 68 kg"*\n` +
      `• *"my cycle is irregular"*\n` +
      `• *"set acne to no"*\n` +
      `• *"update glucose to 95"*\n\n` +
      `Or select your option directly above!`,
  }
}
