# [AUNEA-BE-PG11-GLOBAL-ALTERNATIVE-294] START — pure helper for source-backed alternatives
# PG11 alternative safeguards — helper for the existing AUNEA-BE-PG11-GLOBAL-AI-282 owner.
# SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055.
# INPUT: confirmed scoped context, rejected action, stated constraints.
# OUTPUT: review evidence. No business writes or approvals.
import json
import re
import unicodedata
from difflib import SequenceMatcher

from .internal_ai_global_review import assess_recommendation

def confirmed_conflict(action, constraints, context):
    review = assess_recommendation(action, context, constraints)
    if review["status"] != "INCOMPATIBLE" or not review["conflicts"]:
        raise ValueError("La propuesta no contradice ninguna restricción confirmada.")
    return review

def alternative_instructions(review, action):
    return {
        "system": (
            " ALTERNATIVA POR CONFLICTO CONFIRMADO: resuelve la misma fricción "
            "con otra intervención, sin repetir la rechazada. Conserva controles "
            "y decisiones humanas y no supongas funciones del ERP/CRM no probadas. "
            "Las preferencias de herramienta no constituyen prohibición. "
            "Si no hay opción sustentada, devuelve opportunities=[]. "
        ),
        "user": (
            "\\nINTERVENCIÓN RECHAZADA: " + action +
            "\\nCONFLICTOS CONFIRMADOS: " +
            json.dumps(review["conflicts"], ensure_ascii=False)
        )
    }


def _normalized_action(value):
    text = unicodedata.normalize("NFKD", str(value or "").casefold())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def repeats_rejected_action(candidate, rejected):
    first, second = _normalized_action(candidate), _normalized_action(rejected)
    if not first or not second:
        return False
    if first == second or SequenceMatcher(None, first, second).ratio() >= 0.85:
        return True
    a, b = set(first.split()), set(second.split())
    common = len(a & b)
    return min(len(a), len(b)) >= 5 and common >= 5 and (
        common / min(len(a), len(b)) >= 0.9)


# No separate business owner or persisted state.

# [AUNEA-BE-PG11-GLOBAL-ALTERNATIVE-294] END
