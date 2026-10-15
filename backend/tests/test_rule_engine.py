"""
Step 7 - Testing and validation.

Each case below was tallied BY HAND against the questionnaire before being
encoded here (see the comment above each case). If someone changes a number in
app/data/questionnaire.json without updating the source document to match,
one of these should fail.

Every phenotype-tally case below also satisfies the Rotterdam first-line gate
(irregular_cycle + polycystic_ovaries_usg = 2 of 3) added per mentor feedback,
since the 4-phenotype tally no longer runs at all for someone who doesn't meet
Rotterdam criteria -- see the dedicated Rotterdam-gate tests at the bottom.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.rule_engine import run_pipeline  # noqa: E402
from app.recommendations import build_recommendation  # noqa: E402

ROTTERDAM_PASS = {"irregular_cycle": "yes", "polycystic_ovaries_usg": "yes"}


def test_case1_metabolic_primary_by_tally_no_override():
    # Hand tally: BMI/WHR(1) + acanthosis(1) + skin tags(1) + postprandial(1)
    # + glucose/insulin(1) + HbA1c(1) + HOMA-IR(1) + lipid panel(1) = 8/13.
    # sedentary=no, ultraprocessed=no -> both negative. Insulin 6 and HOMA-IR 1.8
    # are both below the >10 / >2.0 override thresholds, so no override fires.
    # (The lipid panel was previously two separate questions -- metabolic_lipid
    # and metabolic_lipids -- that both fired off the same triglycerides/hdl
    # values, double-counting one abnormal panel as two positive ticks. Merged
    # into a single question with a combined any-of rule; see recommendations
    # for why.)
    answers = {
        **ROTTERDAM_PASS,
        "weight_kg": 85, "height_cm": 160, "waist_cm": 95, "hip_cm": 100,
        "acanthosis_nigricans": "yes",
        "skin_tags": "yes",
        "postprandial_slump": "yes",
        "fasting_glucose": 100, "fasting_insulin": 6,
        "hba1c": 5.6,
        "homa_ir": 1.8,
        "triglycerides": 160, "hdl": 40,
        "sedentary": "no",
        "ultraprocessed_food": "no",
    }
    result = run_pipeline(answers)
    scores, classification = result["scores"], result["classification"]

    assert scores["metabolic"]["positive_count"] == 8
    assert scores["metabolic"]["biochemical_positive_count"] == 4  # glucose/insulin, hba1c, homa-ir, lipid panel
    assert scores["adrenal"]["positive_count"] == 0
    assert scores["hormonal"]["positive_count"] == 0
    assert scores["inflammatory"]["positive_count"] == 0

    assert classification["overrides_triggered"] == []
    assert classification["classification"] == "Primary Phenotype"
    assert classification["primary_phenotype"] == "metabolic"
    assert classification["tally_leaders"] == ["metabolic"]


def test_case2_adrenal_override_beats_hormonal_tally_leader():
    # Hormonal tally (hand count): cycle length 45d(1) + severe hirsutism(1)
    # + alopecia(1) + acne(1) = 4/10 = 40% -> tally leader.
    # Adrenal tally: only DHEA-S 400 (>350 override; also outside the real
    # 83-377 ug/dL reference range, Mayo Clinic Laboratories) = 1/10 = 10%.
    # But DHEA-S > 350 with insulin/HOMA-IR unset (=> "normal") triggers the
    # Adrenal override, which must win over the 40% Hormonal tally leader.
    answers = {
        **ROTTERDAM_PASS,
        "cycle_length_days": 45,
        "hirsutism_severity": "Severe",
        "alopecia": "yes",
        "sym_acne": "yes",  # shared field: also ticks Inflammatory's acne question
        "dhea_s": 400,
    }
    result = run_pipeline(answers)
    scores, classification = result["scores"], result["classification"]

    assert scores["hormonal"]["positive_count"] == 4
    assert scores["adrenal"]["positive_count"] == 1
    assert scores["inflammatory"]["positive_count"] == 1  # shared acne field

    assert classification["tally_leaders"] == ["hormonal"]
    override_ids = [o["id"] for o in classification["overrides_triggered"]]
    assert override_ids == ["adrenal_override"]
    assert classification["classification"] == "Primary Phenotype (Biomarker Override)"
    assert classification["primary_phenotype"] == "adrenal"


def test_case3_mixed_phenotype_on_tied_tally():
    # Hormonal: alopecia(1) + severe hirsutism(1) + absent cycle(1) = 3/10 = 30%
    # Inflammatory: joint pain(1) + high EDC exposure(1) + heavy metal exposure(1) = 3/10 = 30%
    # (Adrenal now carries 11 questions instead of 10 since the old single
    # combined stress/anxiety question was split into a real PSS-10 + a real
    # PHQ-2 -- see the professor-feedback follow-up -- so it can no longer tie
    # cleanly against a 10-question phenotype. Metabolic carries 13 questions
    # for the same kind of reason. Hormonal and Inflammatory are both still
    # 10-question categories, so they're used for the tie case instead.)
    # Tie at 30%, no lab values entered, so no override can fire ->
    # Mixed/Combination Phenotype.
    answers = {
        **ROTTERDAM_PASS,
        "alopecia": "yes",
        "hirsutism_severity": "Severe",
        "cycle_absent": "yes",
        "joint_pain": "yes",
        "edc_exposure": "High",
        "heavy_metal_exposure": "yes",
    }
    result = run_pipeline(answers)
    scores, classification = result["scores"], result["classification"]

    assert scores["hormonal"]["positive_count"] == 3
    assert scores["inflammatory"]["positive_count"] == 3
    assert classification["overrides_triggered"] == []
    assert classification["classification"] == "Mixed/Combination Phenotype"
    assert classification["primary_phenotype"] is None
    assert set(classification["phenotypes_involved"]) == {"hormonal", "inflammatory"}


def test_case4_inconclusive_when_rotterdam_met_but_no_findings():
    # Rotterdam criteria met, but nothing else answered -> still a valid PCOS
    # diagnosis with an inconclusive phenotype (not "excluded"/"not_pcos").
    result = run_pipeline(dict(ROTTERDAM_PASS))
    classification = result["classification"]
    assert classification["classification"] == "Inconclusive / Minimal Findings"
    assert classification["primary_phenotype"] is None
    for pid in ("adrenal", "hormonal", "inflammatory", "metabolic"):
        assert result["scores"][pid]["positive_count"] == 0


def test_case5_multiple_overrides_force_mixed_classification():
    # Fasting insulin 12 > 10 -> Metabolic override.
    # hs-CRP 2.0 > 1.5 -> Inflammatory override.
    # Both fire at once regardless of tally -> Mixed/Combination Phenotype.
    answers = {**ROTTERDAM_PASS, "fasting_insulin": 12, "hs_crp": 2.0}
    result = run_pipeline(answers)
    classification = result["classification"]

    override_phenotypes = sorted(o["phenotype"] for o in classification["overrides_triggered"])
    assert override_phenotypes == ["inflammatory", "metabolic"]
    assert classification["classification"] == "Mixed/Combination Phenotype"
    assert classification["primary_phenotype"] is None
    assert set(classification["phenotypes_involved"]) == {"inflammatory", "metabolic"}


def test_biomarker_support_flag_surfaces_without_forcing_primary():
    # 4 biochemical findings in Metabolic (glucose/insulin, HbA1c, HOMA-IR
    # under the 2.0 override line, lipid panel) should flip the informational
    # "3+ positive biomarkers" flag on, even though tally alone already made
    # Metabolic primary here -- this checks the flag computes independently.
    answers = {
        **ROTTERDAM_PASS,
        "fasting_glucose": 100, "fasting_insulin": 6,
        "hba1c": 5.6, "homa_ir": 1.8,
        "triglycerides": 160, "hdl": 40,
    }
    result = run_pipeline(answers)
    scores = result["scores"]
    assert scores["metabolic"]["biochemical_positive_count"] == 4
    assert scores["metabolic"]["biomarker_support_flag"] is True
    assert "metabolic" in result["classification"]["biomarker_supported_phenotypes"]


# ---------------------------------------------------------------------------
# Rotterdam first-line gate + exclusion criteria (mentor feedback, Sep 2026):
# these run BEFORE the 4-phenotype tally and can short-circuit it entirely.
# ---------------------------------------------------------------------------
def test_rotterdam_not_met_short_circuits_before_scoring():
    # No Rotterdam criteria answered at all -> gated out before phenotyping,
    # even though these lab values would otherwise trigger a Metabolic tally.
    answers = {"acanthosis_nigricans": "yes", "skin_tags": "yes"}
    result = run_pipeline(answers)
    classification = result["classification"]
    assert classification["classification"] == "Inconclusive — Does not meet Rotterdam Criteria"
    assert classification["primary_phenotype"] is None
    assert classification["phenotypes_involved"] == []


def test_rotterdam_met_by_testosterone_lab_value_alone():
    # Total testosterone 60 ng/dL (> 45) satisfies the "high testosterone"
    # criterion without needing the symptom checkbox.
    answers = {"irregular_cycle": "yes", "total_testosterone": 60}
    result = run_pipeline(answers)
    assert result["classification"]["classification"] != "Inconclusive — Does not meet Rotterdam Criteria"


def test_excluded_when_other_disorder_flagged():
    # Exclusion criteria (CAH, androgen-secreting tumor, Cushing's, etc.)
    # short-circuits everything, even if Rotterdam would otherwise be met.
    answers = {**ROTTERDAM_PASS, "exclusion_other_disorders": "yes"}
    result = run_pipeline(answers)
    classification = result["classification"]
    assert classification["classification"] == "Excluded"
    assert classification["primary_phenotype"] is None


# ---------------------------------------------------------------------------
# Body-type diet branching (mentor feedback): an Obese-phenotype and a
# Lean-phenotype person with the *same* classification should get different
# diet/exercise guidance layered on top of the shared phenotype protocol.
# ---------------------------------------------------------------------------
def test_body_type_changes_diet_strategy_for_same_phenotype():
    classification = {"phenotypes_involved": ["metabolic"], "classification": "Primary Phenotype"}
    scores = {"mitochondrial": {"flag": False}}

    obese = build_recommendation(classification, scores, "South Indian", "Vegetarian", "Obese")
    lean = build_recommendation(classification, scores, "South Indian", "Vegetarian", "Lean")
    neither = build_recommendation(classification, scores, "South Indian", "Vegetarian", None)

    obese_strategy = obese["phenotype_blocks"][0]["diet_strategy"]
    lean_strategy = lean["phenotype_blocks"][0]["diet_strategy"]
    neither_strategy = neither["phenotype_blocks"][0]["diet_strategy"]

    assert obese_strategy != lean_strategy
    assert len(obese_strategy) > len(neither_strategy)
    assert len(lean_strategy) > len(neither_strategy)
    assert obese["phenotype_blocks"][0]["body_type"] == "Obese"


# ---------------------------------------------------------------------------
# Real validated PSS-10 / PHQ-2 instruments (professor feedback: stress via
# the Perceived Stress Scale, anxiety/mood via PHQ-2, as two separate
# questions with a real scoring cutoff -- not a single made-up slider).
# ---------------------------------------------------------------------------
def test_pss10_high_stress_ticks_with_correct_reverse_scoring():
    # Items 4, 5, 7, 8 are reverse-scored (4 - response). All items at 3
    # except the reverse ones at 1 (which become 4-1=3 each) -> total = 30,
    # i.e. every item effectively contributes 3 -> 30, which is >= 27 (the
    # published "high stress" cutoff) so this should tick.
    answers = {
        **ROTTERDAM_PASS,
        "pss_1": 3, "pss_2": 3, "pss_3": 3,
        "pss_4": 1, "pss_5": 1,  # reverse: 4-1=3
        "pss_6": 3,
        "pss_7": 1, "pss_8": 1,  # reverse: 4-1=3
        "pss_9": 3, "pss_10": 3,
    }
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["adrenal"]["ticks"]}
    assert result["computed_values"]["pss_total"] == 30
    assert ticks["adrenal_pss"] is True


def test_pss10_low_stress_does_not_tick():
    answers = {
        **ROTTERDAM_PASS,
        "pss_1": 0, "pss_2": 0, "pss_3": 0,
        "pss_4": 4, "pss_5": 4,  # reverse: 4-4=0
        "pss_6": 0,
        "pss_7": 4, "pss_8": 4,  # reverse: 4-4=0
        "pss_9": 0, "pss_10": 0,
    }
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["adrenal"]["ticks"]}
    assert result["computed_values"]["pss_total"] == 0
    assert ticks["adrenal_pss"] is False


def test_phq2_positive_screen_ticks_at_official_cutoff():
    # Official PHQ-2 cutoff: total >= 3 out of 6 warrants further evaluation.
    answers = {**ROTTERDAM_PASS, "phq2_1": 2, "phq2_2": 1}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["adrenal"]["ticks"]}
    assert result["computed_values"]["phq2_total"] == 3
    assert ticks["adrenal_phq2"] is True


def test_phq2_below_cutoff_does_not_tick():
    answers = {**ROTTERDAM_PASS, "phq2_1": 1, "phq2_2": 1}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["adrenal"]["ticks"]}
    assert result["computed_values"]["phq2_total"] == 2
    assert ticks["adrenal_phq2"] is False


# --- Reference-range cross-verification (Sept 2026 pass) ---------------------
# Several thresholds were narrower than the real published reference range for
# the lab, effectively flagging normal results as abnormal. Each test below
# uses a value that is a false-positive under the OLD (wrong) range but a true
# negative under the corrected, cited range -- so a regression back to the old
# number fails loudly here.


def test_tsh_within_real_ata_range_does_not_tick():
    # American Thyroid Association reference range is 0.4-4.0 mIU/L. The app
    # previously used a narrow "optimal" band of 1.0-2.0, which would have
    # wrongly flagged this as abnormal.
    answers = {**ROTTERDAM_PASS, "tsh": 3.0, "tpo_ab_positive": "no"}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["inflammatory"]["ticks"]}
    assert ticks["inflammatory_thyroid"] is False


def test_shbg_within_real_mayo_range_does_not_tick():
    # Mayo Clinic Laboratories (test SHBG1) premenopausal range is
    # 18.2-135.5 nmol/L. The app previously used 40-100, which would have
    # wrongly flagged this as abnormal.
    answers = {**ROTTERDAM_PASS, "shbg": 30}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["hormonal"]["ticks"]}
    assert ticks["hormonal_shbg"] is False


def test_serum_zinc_within_real_mayo_range_does_not_tick():
    # Mayo Clinic Laboratories normal serum zinc range is 60-106 ug/dL. The
    # app previously used 90-120, which would have wrongly flagged this.
    answers = {**ROTTERDAM_PASS, "serum_zinc": 70}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["inflammatory"]["ticks"]}
    assert ticks["inflammatory_vitd_zinc"] is False


def test_serum_zinc_above_real_mayo_range_now_ticks():
    # The old 90-120 upper bound was too generous -- 110 sat inside it even
    # though it's above Mayo's real 106 ug/dL upper limit.
    answers = {**ROTTERDAM_PASS, "serum_zinc": 110}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["inflammatory"]["ticks"]}
    assert ticks["inflammatory_vitd_zinc"] is True


def test_am_cortisol_within_real_mayo_range_does_not_tick():
    # Mayo Clinic Laboratories AM (6-10:30am) cortisol range is 5-25 ug/dL.
    # The app previously used 10-20, which would have wrongly flagged this.
    answers = {**ROTTERDAM_PASS, "cortisol_am": 22}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["adrenal"]["ticks"]}
    assert ticks["adrenal_cortisol"] is False


def test_resting_heart_rate_within_standard_range_does_not_tick():
    # Standard adult resting heart-rate range is 60-100 bpm. The app
    # previously used 60-75, which would have wrongly flagged this.
    answers = {**ROTTERDAM_PASS, "systolic": 110, "diastolic": 70, "heart_rate": 85, "spo2": 98}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["adrenal"]["ticks"]}
    assert ticks["adrenal_vitals"] is False


def test_whr_below_real_who_cutoff_does_not_tick():
    # WHO waist-to-hip ratio cutoff for women is 0.85. The app previously
    # used 0.8, which would have wrongly flagged this (with normal BMI).
    answers = {
        **ROTTERDAM_PASS,
        "height_cm": 165, "weight_kg": 60,  # BMI ~= 22.0, within 18.5-24.9
        "waist_cm": 82, "hip_cm": 100,  # WHR = 0.82
    }
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["metabolic"]["ticks"]}
    assert ticks["metabolic_bmi_whr"] is False


def test_dhea_s_within_real_mayo_age_range_does_not_tick():
    # Mayo Clinic Laboratories (test DHES1) reference range for women aged
    # 18-30 is 83-377 ug/dL. The app previously used 100-250, which would
    # have wrongly flagged this.
    answers = {**ROTTERDAM_PASS, "dhea_s": 300}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["adrenal"]["ticks"]}
    assert ticks["adrenal_dheas"] is False


def test_total_testosterone_within_real_range_does_not_tick():
    # General adult-women reference range is 8-60 ng/dL (Endocrine Society /
    # Mayo Clinic Laboratories). The app previously used 20-45, which would
    # have wrongly flagged this.
    answers = {**ROTTERDAM_PASS, "total_testosterone": 50}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["hormonal"]["ticks"]}
    assert ticks["hormonal_total_testosterone"] is False


def test_free_testosterone_within_real_mayo_age_range_does_not_tick():
    # Mayo Clinic Laboratories (test TTFB) range for women aged 20-30 is
    # 0.13-1.08 ng/dL. The app previously used 0.1-0.85, which would have
    # wrongly flagged this.
    answers = {**ROTTERDAM_PASS, "free_testosterone": 1.0}
    result = run_pipeline(answers)
    ticks = {t["id"]: t["positive"] for t in result["scores"]["hormonal"]["ticks"]}
    assert ticks["hormonal_free_testosterone"] is False
