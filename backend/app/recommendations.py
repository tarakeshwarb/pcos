"""
Step 5 - Recommendation mapping.

Pure lookup: takes the phenotype(s) decided by rule_engine.classify(), plus the
patient's region (South/North Indian) and diet type (Veg/Non-Veg/Vegan), and
returns the matching blocks from app/data/diet_protocols.json (Section 4 of the
questionnaire). No computation, no AI -- exactly as Plan A Step 5 specifies.
"""
from typing import Any, Dict, List

from .rule_engine import DIET_PROTOCOLS


def _body_type_modifier(body_type: str) -> Dict[str, Any]:
    modifiers = DIET_PROTOCOLS.get("body_type_modifiers", {})
    return modifiers.get(body_type) if body_type else None


def _phenotype_block(phenotype_id: str, region: str, diet_type: str, body_type: str = None) -> Dict[str, Any]:
    general = DIET_PROTOCOLS["general_protocol"][phenotype_id]
    regional = DIET_PROTOCOLS["regional_suggestions"][phenotype_id]
    plan = DIET_PROTOCOLS["meal_plans"][phenotype_id]
    modifier = _body_type_modifier(body_type)
    return {
        "phenotype": phenotype_id,
        "focus": general["focus"],
        "diet_strategy": general["diet_strategy"] + modifier["diet_strategy"] if modifier else general["diet_strategy"],
        "exercise": general["exercise"] + modifier["exercise"] if modifier else general["exercise"],
        "priorities": general["priorities"],
        "body_type": body_type,
        "regional_suggestions": {
            "region": region,
            "primary_focus": regional["primary_focus"],
            "suggestions": regional.get(region, {}),
        },
        "day_plan": {
            "diet_type": diet_type,
            "meals": plan.get(diet_type, {}),
            "mid_meals_and_beverages": plan["mid_meals"],
        },
    }


def build_recommendation(classification: Dict[str, Any], scores: Dict[str, Any],
                          region: str, diet_type: str, body_type: str = None) -> Dict[str, Any]:
    """Step 5 recommendation mapping. `body_type` (Obese/Lean, mentor
    feedback item) layers extra diet/exercise guidance on top of the
    phenotype-general protocol -- an obese-phenotype and a lean-phenotype
    person with the same classification still need different plans."""
    involved = classification["phenotypes_involved"]
    is_mixed = classification["classification"].startswith("Mixed")

    blocks: List[Dict[str, Any]] = [_phenotype_block(pid, region, diet_type, body_type) for pid in involved]

    mito_flag = scores.get("mitochondrial", {}).get("flag", False)
    mitochondrial_block = _phenotype_block("mitochondrial", region, diet_type, body_type)

    return {
        "is_mixed": is_mixed,
        "phenotype_blocks": blocks,
        "mitochondrial_support": {
            "recommended_priority": "high" if mito_flag else "foundational",
            "note": (
                "Mitochondrial/hypoxia screen (Section 2, Table 5) flagged 2+ positive findings -- "
                "treat this as a co-primary support track alongside the phenotype protocol above."
                if mito_flag else
                "General foundational support; add if energy, fatigue, or hypoxia symptoms are prominent."
            ),
            **mitochondrial_block,
        },
    }
