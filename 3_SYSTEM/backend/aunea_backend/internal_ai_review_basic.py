# [AUNEA-BE-PG11-BASIC-REVIEW-220] START
# PG11 quick deterministic check of saved IA proposals. No Ollama, no inferred facts.
# SOURCE: PG11 CANONICAL; DEC-050/052/055; PROJECT_RULES.md.
# INPUTS: confirmed source, official diagnostic, source-linked PilotAIItem entries.
# OUTPUTS: review notes only; never changes the TO-BE DRAFT or approved data.
from __future__ import annotations

import re
from .internal_ai import PilotAIConsolidationRequest, validate_pilot_result
from .internal_ai_review import PG11_REVIEW_PROTOCOL, _clear_transformation_conflicts, _missing_structured_actions

_NUMBER_CLAIM = re.compile(r"\b\d+(?:[.,]\d+)*\s*(?:%|€|euros?|minutos?|horas?|d[ií]as?)(?!\w)", re.I)


def basic_review(request: PilotAIConsolidationRequest) -> dict:
    """Review visible structure conservatively. Never claim semantic or factual validation."""
    validate_pilot_result(request.request, "Reglas AUNEA", request.items)
    conflicts = set(_clear_transformation_conflicts(request.items))
    issues = []

    def add(sid: str, category: str, detail: str, evidence: str, action: str):
        issues.append({"step_id": sid, "category": category, "issue": detail,
                       "evidence": evidence[:200], "action": action})

    for item in request.items:
        sid = item.source_step_id
        if sid in conflicts:
            add(sid, "BLOCKING",
                "La actividad figura como «Se mantiene», pero su intervención propone introducir cambios.",
                item.rationale[:200],
                "Revisar la transformación propuesta; no aplicar la intervención automáticamente.")
        if item.transformation=="Se mantiene" and sid not in conflicts:
            action=item.rationale.split("Resultado esperado:",1)[0]
            action=action.split("Acción propuesta:",1)[-1].strip().casefold()
            if action and not action.startswith(("mantener ", "conservar ", "continuar ", "sin cambios")):
                add(sid, "PENDING",
                    "La actividad aparece «Se mantiene», pero describe una intervención; comprobar si cambia el diseño.",
                    item.rationale[:200],
                    "Confirmar si la medida mantiene realmente el paso o exige otra transformación.")
        if sid in _missing_structured_actions([item]):
            add(sid, "BLOCKING",
                "La acción menciona una automatización que falta en el campo estructurado.",
                "rationale / automation_ai",
                "Corregir el candidato IA sin inferir herramientas ni aprobar cambios.")
        if not item.problem_resolved.strip():
            add(sid, "BLOCKING", "No se concreta qué problema resuelve la intervención.",
                "Campo de problema vacío", "Concretar el problema a partir del AS-IS.")
        rationale = item.rationale.casefold()
        if "acción propuesta:" not in rationale and "accion propuesta:" not in rationale:
            add(sid, "BLOCKING", "Falta una intervención explícita.",
                "Narrativa sin acción propuesta", "Especificar la acción sin inventar datos.")
        if "resultado esperado:" not in rationale:
            add(sid, "BLOCKING", "Falta un resultado esperado identificable.",
                "Narrativa sin resultado esperado", "Explicar el resultado como hipótesis.")
        if not item.source_refs or sid not in item.source_refs:
            add(sid, "BLOCKING", "La propuesta no cita su actividad de origen.",
                "Sin referencia directa al AS-IS", "Vincular a la actividad confirmada.")
        if not item.future_actor.strip():
            add(sid, "PENDING", "Responsable futuro todavía sin definir.",
                "Campo de responsable vacío", "Identificar o validar el responsable con el consultor.")
        if item.limitations.strip():
            add(sid, "PENDING", "Existen condiciones de la propuesta pendientes de confirmar.",
                item.limitations[:200], "Resolver estas condiciones antes de aprobar el diseño.")
        claims = _NUMBER_CLAIM.findall(item.rationale)
        if claims:
            add(sid, "PENDING", "La propuesta contiene cifras que requieren validación de evidencia.",
                ", ".join(claims)[:200],
                "Contrastar cifras, unidades y naturaleza de la evidencia con el AS-IS confirmado.")

    return {
        "status": "CHECKED_WITH_NOTES" if issues else "CHECKED",
        "summary": "Comprobación básica por reglas completada. No equivale a revisión semántica con IA ni a aprobación humana.",
        "issues": issues,
        "blocking_step_ids": sorted({i["step_id"] for i in issues if i["category"] == "BLOCKING"}),
        "requires_human_review": True,
        "protocol_revision": PG11_REVIEW_PROTOCOL,
        "review_mode": "RULES_ONLY",
        "batches_checked": 0,
    }
# [AUNEA-BE-PG11-BASIC-REVIEW-220] END
