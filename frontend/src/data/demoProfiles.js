// Two complete, every-field-filled demo profiles used for live walkthroughs
// of the whole app (Registration page + every Questionnaire step), not just
// the questionnaire itself. Shared between pages/Registration.jsx and
// pages/Questionnaire.jsx so there is exactly one source of truth.
//
// PCOS_CASE clearly meets the Rotterdam gate and tallies Metabolic as a
// clean primary phenotype (no override triggered, for a simple story);
// HEALTHY_CASE deliberately fails the Rotterdam gate and has normal values
// on every single field, demonstrating the tool correctly recognizing a
// true negative. Neither is wired to the backend -- purely local/session
// state, same as the original single demo button.

export const PCOS_CASE = {
  registration: {
    fullName: 'Ananya Sharma',
    email: 'ananya.demo@example.com',
    dob: '2003-05-14',
    age: '22',
    occupation: 'Student',
    relationship_status: 'Single, no pregnancy goals yet',
    ethnicity: 'South Indian',
    living_environment: 'Urban - Polluted',
    pcos_diagnosis_age: '20',
    region_preference: 'South Indian',
    diet_type: 'Vegetarian',
  },
  goals: ['Get my periods more regular', 'Help my body respond better to insulin', 'Overcome constant tiredness & brain fog'],
  answers: {
    // First-line / Rotterdam -- 3 of 3 met
    irregular_cycle: 'yes',
    high_testosterone_symptoms: 'yes',
    polycystic_ovaries_usg: 'yes',
    exclusion_other_disorders: 'no',
    // Metabolic -- clean tally leader, below both override thresholds
    height_cm: 160, weight_kg: 82, waist_cm: 94, hip_cm: 102,
    triglycerides: 180, hdl: 38,
    acanthosis_nigricans: 'yes', skin_tags: 'yes', postprandial_slump: 'yes',
    fasting_glucose: 99, fasting_insulin: 8, hba1c: 5.6, homa_ir: 1.9,
    sedentary: 'yes', ultraprocessed_food: 'yes',
    sleep_apnea: 'no', hypoxia: 'no',
    body_type: 'Obese',
    // Hormonal -- some findings, below Metabolic's tally
    cycle_length_days: 45, cycle_absent: 'no',
    hirsutism_severity: 'Mild', alopecia: 'no', sym_acne: 'yes',
    follicle_count: 24, ovarian_volume_ml: 8,
    total_testosterone: 65, free_testosterone: 0.5,
    lh_fsh_ratio: 1.5, shbg: 70, post_pill_amenorrhea: 'no',
    // Adrenal -- mild findings, no override
    systolic: 118, diastolic: 76, heart_rate: 88, spo2: 97,
    dhea_s: 200, cortisol_am: 15,
    pss_1: 2, pss_2: 2, pss_3: 2, pss_4: 2, pss_5: 2, pss_6: 2, pss_7: 2, pss_8: 2, pss_9: 2, pss_10: 2,
    phq2_1: 1, phq2_2: 1,
    sleep_hours: 6.5, sleep_poor_quality: 'yes',
    adrenal_fatigue: 'yes', worried: 'yes', poor_concentration: 'no', shallow_breathing: 'no', mood_swings: 'no',
    // Inflammatory -- some findings, no override
    joint_pain: 'no', hs_crp: 0.8,
    tsh: 2.5, tpo_ab_positive: 'no',
    vitamin_d3: 35, serum_zinc: 95,
    edc_exposure: 'Moderate', heavy_metal_exposure: 'no',
    gut_health_issue: 'yes', gut_dysbiosis_severe: 'no',
    autoimmune_history: 'no',
    low_sun_exposure: 'yes', vitd_deficiency_symptoms: 'no',
    // Energy Screen -- flag triggers (2+ positive)
    mito_fatigue: 'yes', mito_pem: 'no', mito_detraining: 'yes',
  },
}

export const HEALTHY_CASE = {
  registration: {
    fullName: 'Priya Reddy',
    email: 'priya.demo@example.com',
    dob: '2002-11-02',
    age: '23',
    occupation: 'Student',
    relationship_status: 'Single, no pregnancy goals yet',
    ethnicity: 'South Indian',
    living_environment: 'Urban - Not polluted',
    pcos_diagnosis_age: '',
    region_preference: 'South Indian',
    diet_type: 'Vegetarian',
  },
  goals: ['Sleep better', 'Have more energy & stamina'],
  answers: {
    // First-line / Rotterdam -- 0 of 3 met -> correctly gated out as "not PCOS"
    irregular_cycle: 'no',
    high_testosterone_symptoms: 'no',
    polycystic_ovaries_usg: 'no',
    exclusion_other_disorders: 'no',
    // Metabolic -- all normal
    height_cm: 162, weight_kg: 58, waist_cm: 70, hip_cm: 92,
    triglycerides: 90, hdl: 65,
    acanthosis_nigricans: 'no', skin_tags: 'no', postprandial_slump: 'no',
    fasting_glucose: 85, fasting_insulin: 4, hba1c: 5.0, homa_ir: 0.9,
    sedentary: 'no', ultraprocessed_food: 'no',
    sleep_apnea: 'no', hypoxia: 'no',
    body_type: 'Lean',
    // Hormonal -- all normal
    cycle_length_days: 28, cycle_absent: 'no',
    hirsutism_severity: 'None', alopecia: 'no', sym_acne: 'no',
    follicle_count: 8, ovarian_volume_ml: 6,
    total_testosterone: 30, free_testosterone: 0.4,
    lh_fsh_ratio: 1.0, shbg: 60, post_pill_amenorrhea: 'no',
    // Adrenal -- all normal, low stress
    systolic: 112, diastolic: 72, heart_rate: 70, spo2: 99,
    dhea_s: 180, cortisol_am: 14,
    pss_1: 0, pss_2: 0, pss_3: 0, pss_4: 4, pss_5: 4, pss_6: 0, pss_7: 4, pss_8: 4, pss_9: 0, pss_10: 0,
    phq2_1: 0, phq2_2: 0,
    sleep_hours: 8, sleep_poor_quality: 'no',
    adrenal_fatigue: 'no', worried: 'no', poor_concentration: 'no', shallow_breathing: 'no', mood_swings: 'no',
    // Inflammatory -- all normal
    joint_pain: 'no', hs_crp: 0.5,
    tsh: 2.0, tpo_ab_positive: 'no',
    vitamin_d3: 45, serum_zinc: 80,
    edc_exposure: 'Low', heavy_metal_exposure: 'no',
    gut_health_issue: 'no', gut_dysbiosis_severe: 'no',
    autoimmune_history: 'no',
    low_sun_exposure: 'no', vitd_deficiency_symptoms: 'no',
    // Energy Screen -- no flag
    mito_fatigue: 'no', mito_pem: 'no', mito_detraining: 'no',
  },
}
