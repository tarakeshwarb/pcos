"""
Deterministic rule engine for PCOS phenotype classification (Plan A).

No AI/ML anywhere in this file. Every decision is a direct, traceable evaluation
of the JSON in app/data/questionnaire.json, which is itself a line-for-line
transcription of the uploaded questionnaire (see each field's "source").

Pipeline (mirrors the Work Plan's Steps 2-4 exactly):
    1. score_phenotypes()   -> Step 2: tally positive ticks per phenotype (/10)
    2. evaluate_overrides() -> Step 3: hard override rules on lab biomarkers
    3. classify()           -> Step 4: primary / mixed phenotype decision
"""
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path(__file__).parent / "data"

with open(DATA_DIR / "questionnaire.json") as f:
    QUESTIONNAIRE = json.load(f)

with open(DATA_DIR / "diet_protocols.json") as f:
    DIET_PROTOCOLS = json.load(f)

PHENOTYPE_IDS = list(QUESTIONNAIRE["phenotypes"].keys())  # adrenal, hormonal, inflammatory, metabolic


# ---------------------------------------------------------------------------
# Rule DSL interpreter -- the only "logic" allowed is these six operators, so
# every rule in the JSON is auditable by a non-programmer.
# ---------------------------------------------------------------------------
def _get(values: Dict[str, Any], field: str) -> Optional[float]:
    v = values.get(field)
    if v is None or v == "":
        return None
    return v


def evaluate_rule(rule: Dict[str, Any], values: Dict[str, Any]) -> bool:
    op = rule["op"]
    if op == "any":
        return any(evaluate_rule(r, values) for r in rule["rules"])
    if op == "all":
        return all(evaluate_rule(r, values) for r in rule["rules"])
    if op == "not":
        return not evaluate_rule(rule["rule"], values)

    field = rule.get("field")
    v = _get(values, field)

    if op == "eq":
        return v is not None and str(v).lower() == str(rule["value"]).lower()
    if op == "in":
        return v is not None and str(v) in [str(x) for x in rule["values"]]
    if v is None:
        # Numeric comparisons with no data entered yet cannot be positive.
        return False
    if op == "gt":
        return float(v) > rule["value"]
    if op == "gte":
        return float(v) >= rule["value"]
    if op == "lt":
        return float(v) < rule["value"]
    if op == "lte":
        return float(v) <= rule["value"]
    if op == "outside":
        low, high = rule["range"]
        return float(v) < low or float(v) > high
    raise ValueError(f"Unknown rule op: {op}")


# ---------------------------------------------------------------------------
# Safe arithmetic for the handful of computed fields (bmi, whr, tg_hdl_ratio)
# ---------------------------------------------------------------------------
import ast
import operator as _operator

_ALLOWED_BINOPS = {ast.Add: _operator.add, ast.Sub: _operator.sub,
                   ast.Mult: _operator.mul, ast.Div: _operator.truediv,
                   ast.Pow: _operator.pow}


def _safe_eval(expr: str, names: Dict[str, float]) -> Optional[float]:
    tree = ast.parse(expr, mode="eval")

    def _ev(node):
        if isinstance(node, ast.Expression):
            return _ev(node.body)
        if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
            return _ALLOWED_BINOPS[type(node.op)](_ev(node.left), _ev(node.right))
        if isinstance(node, ast.Num):  # py<3.8 fallback
            return node.n
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.Name):
            val = names.get(node.id)
            if val is None:
                raise KeyError(node.id)
            return float(val)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -_ev(node.operand)
        raise ValueError(f"Disallowed expression: {ast.dump(node)}")

    try:
        return _ev(tree)
    except (KeyError, ZeroDivisionError, TypeError):
        return None


def compute_derived_fields(values: Dict[str, Any]) -> Dict[str, Any]:
    """Adds bmi/whr/tg_hdl_ratio etc. to a copy of `values` wherever inputs exist."""
    enriched = dict(values)
    for phenotype in QUESTIONNAIRE["phenotypes"].values():
        for q in phenotype["questions"]:
            for key, expr in q.get("computed", {}).items():
                result = _safe_eval(expr, enriched)
                if result is not None:
                    enriched[key] = result
    return enriched


# ---------------------------------------------------------------------------
# Step 2 - scoring engine
# ---------------------------------------------------------------------------
def score_phenotypes(answers: Dict[str, Any]) -> Dict[str, Any]:
    values = compute_derived_fields(answers)
    results = {}
    for pid, phenotype in QUESTIONNAIRE["phenotypes"].items():
        ticks = []
        biochemical_positive = 0
        for q in phenotype["questions"]:
            positive = evaluate_rule(q["rule"], values)
            if positive and q["category"] == "Biochemical Evaluation":
                biochemical_positive += 1
            ticks.append({"id": q["id"], "label": q["label"], "category": q["category"],
                          "reference": q.get("reference", ""), "positive": positive})
        total = len(phenotype["questions"])
        positive_count = sum(1 for t in ticks if t["positive"])
        results[pid] = {
            "label": phenotype["label"],
            "positive_count": positive_count,
            "total_questions": total,
            "percentage": round(positive_count / total * 100, 1),
            "severity": severity_label(positive_count),
            "biochemical_positive_count": biochemical_positive,
            "biomarker_support_flag": biochemical_positive >= 3,
            "ticks": ticks,
        }

    mito = QUESTIONNAIRE["mitochondrial_axis"]
    mito_ticks = [{"id": q["id"], "label": q["label"], "reference": q.get("reference", ""),
                   "positive": evaluate_rule(q["rule"], values)} for q in mito["questions"]]
    mito_positive = sum(1 for t in mito_ticks if t["positive"])
    results["mitochondrial"] = {
        "label": mito["label"],
        "positive_count": mito_positive,
        "total_questions": len(mito["questions"]),
        "percentage": round(mito_positive / len(mito["questions"]) * 100, 1),
        "ticks": mito_ticks,
        "flag": mito_positive >= 2,
    }
    return results, values


def severity_label(positive_count: int) -> str:
    for band in QUESTIONNAIRE["severity_bands"]["bands"]:
        if band["min"] <= positive_count <= band["max"]:
            return band["label"]
    return "Severe Driver / Primary Target"


# ---------------------------------------------------------------------------
# Step 3 - biomarker override rules
# ---------------------------------------------------------------------------
def evaluate_overrides(values: Dict[str, Any]) -> List[Dict[str, Any]]:
    triggered = []
    for override in QUESTIONNAIRE["overrides"]:
        if evaluate_rule(override["rule"], values):
            triggered.append({"id": override["id"], "phenotype": override["phenotype"],
                              "label": override["label"], "reference": override["reference"]})
    return triggered


# ---------------------------------------------------------------------------
# Step 4 - classification logic
# ---------------------------------------------------------------------------
def classify(scores: Dict[str, Any], overrides_triggered: List[Dict[str, Any]]) -> Dict[str, Any]:
    percentages = {pid: scores[pid]["percentage"] for pid in PHENOTYPE_IDS}
    max_pct = max(percentages.values())
    tally_leaders = [pid for pid, pct in percentages.items() if pct == max_pct]

    override_phenotypes = sorted(set(o["phenotype"] for o in overrides_triggered))
    biomarker_support = [pid for pid in PHENOTYPE_IDS if scores[pid]["biomarker_support_flag"]]

    if len(override_phenotypes) >= 2:
        classification = "Mixed/Combination Phenotype"
        primary = None
        involved = override_phenotypes
        reason = ("Multiple biomarker overrides triggered simultaneously (" +
                  ", ".join(o["label"] for o in overrides_triggered) +
                  ") -- Section 3 Key Biomarker Priority Overrules.")
    elif len(override_phenotypes) == 1:
        forced = override_phenotypes[0]
        classification = "Primary Phenotype (Biomarker Override)"
        primary = forced
        involved = [forced]
        matching = [o for o in overrides_triggered if o["phenotype"] == forced][0]
        reason = f"Biomarker override triggered: {matching['label']} -- {matching['reference']}."
        if forced not in tally_leaders:
            reason += f" This overrules the tally leader(s) ({', '.join(tally_leaders)})."
    elif max_pct == 0:
        classification = "Inconclusive / Minimal Findings"
        primary = None
        involved = []
        reason = "No positive ticks recorded in any of the four phenotype categories."
    elif len(tally_leaders) == 1:
        classification = "Primary Phenotype"
        primary = tally_leaders[0]
        involved = [primary]
        reason = f"Highest tick percentage ({max_pct}%) with no conflicting biomarker override."
    else:
        classification = "Mixed/Combination Phenotype"
        primary = None
        involved = tally_leaders
        reason = f"Tied highest tick percentage ({max_pct}%) between {', '.join(tally_leaders)} -- Section 3 Mixed/Combination rule."

    return {
        "classification": classification,
        "primary_phenotype": primary,
        "phenotypes_involved": involved,
        "reason": reason,
        "tally_leaders": tally_leaders,
        "overrides_triggered": overrides_triggered,
        "biomarker_supported_phenotypes": biomarker_support,
    }


def check_rotterdam_and_exclusions(answers: Dict[str, Any]) -> Dict[str, Any]:
    """First-line testing gate (Step 0, added per mentor feedback): before the
    4-phenotype tally runs at all, check the standard Rotterdam criteria (2 of
    3: irregular cycle, high testosterone, polycystic ovaries on ultrasound).
    This is an exclusion gate, not a phenotype -- someone who doesn't meet it
    never gets a confident phenotype classification ("so the model won't be
    having delusions", per feedback)."""
    if answers.get("exclusion_other_disorders") == "yes":
        return {"status": "excluded", "reason": "Excluded due to other suspected thyroid or pituitary disorders (CAH, androgen-secreting tumor, Cushing's) that can mimic PCOS."}

    rotterdam_count = 0
    if answers.get("irregular_cycle") == "yes":
        rotterdam_count += 1

    total_test = answers.get("total_testosterone")
    try:
        total_test_val = float(total_test) if total_test not in (None, "") else None
    except (TypeError, ValueError):
        total_test_val = None
    has_high_test = answers.get("high_testosterone_symptoms") == "yes" or (total_test_val is not None and total_test_val > 45)
    if has_high_test:
        rotterdam_count += 1

    if answers.get("polycystic_ovaries_usg") == "yes":
        rotterdam_count += 1

    if rotterdam_count < 2:
        return {"status": "not_pcos", "reason": "Does not meet Rotterdam Criteria (requires 2 of 3: irregular cycles, high testosterone, polycystic ovaries)."}

    return {"status": "pcos", "reason": "Meets Rotterdam Criteria for PCOS diagnosis."}


def run_pipeline(answers: Dict[str, Any]) -> Dict[str, Any]:
    scores, enriched_values = score_phenotypes(answers)
    rotterdam_result = check_rotterdam_and_exclusions(enriched_values)
    if rotterdam_result["status"] != "pcos":
        classification = {
            "classification": "Excluded" if rotterdam_result["status"] == "excluded" else "Inconclusive — Does not meet Rotterdam Criteria",
            "primary_phenotype": None,
            "phenotypes_involved": [],
            "reason": rotterdam_result["reason"],
            "tally_leaders": [],
            "overrides_triggered": [],
            "biomarker_supported_phenotypes": []
        }
        return {"scores": scores, "classification": classification, "computed_values": enriched_values}
        
    overrides_triggered = evaluate_overrides(enriched_values)
    classification = classify(scores, overrides_triggered)
    return {"scores": scores, "classification": classification, "computed_values": enriched_values}
