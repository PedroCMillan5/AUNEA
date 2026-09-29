# [AUNEA-BE-FRICTION-REVIEW-071] START — Non-additive friction attribution checks
# PURPOSE: Surface incomplete frequency, broken anchors and unallocated effort/loss
#          without inventing a persisted friction-step relationship or counting twice.
# SOURCE: Diagnostic Master v1.2 DF059–DF063, RULE_ECON_AGGREGATION EAR-001/004/006/012,
#         DEC-032/033/040.
# INPUTS: Active ProcessSteps and Frictions already captured by the 90-minute session.
# OUTPUTS: Validation findings only. Never an official economic result.
# SIDE_EFFECTS: None.
# CHANGE_RISK: HIGH.
from __future__ import annotations

from typing import Any


def _material(value: Any) -> bool:
    if isinstance(value, dict):
        if value.get("mode") in ("UNKNOWN", "NONE"):
            return False
        value = value.get("value")
    if value is None or isinstance(value, bool):
        return False
    try:
        return float(value) > 0
    except (ValueError, TypeError):
        return False


def review_frictions(
    steps: list[dict[str, Any]], frictions: list[dict[str, Any]]
) -> dict[str, Any]:
    active_step_ids = {
        str(step.get("id")) for step in steps
        if step.get("status") != "SUPERSEDED" and step.get("id")
    }
    seen: set[str] = set()
    findings: list[dict[str, Any]] = []
    for friction in frictions:
        if friction.get("status") == "SUPERSEDED":
            continue
        friction_id = str(friction.get("id") or "")
        affected = friction.get("affected_steps") or []
        affected = affected if isinstance(affected, list) else [affected]
        anchors = list(dict.fromkeys(str(x) for x in affected if x))
        errors: list[str] = []
        if not friction_id or friction_id in seen:
            errors.append("Identificador de fricción ausente o repetido; no contabilizar.")
        if friction_id:
            seen.add(friction_id)
        if not anchors:
            errors.append("DF059: la fricción requiere al menos un paso activo.")
        detached = [x for x in anchors if x not in active_step_ids]
        if detached:
            errors.append("DF059: referencias a pasos inexistentes o retirados: " + ", ".join(detached))
        frequency = friction.get("frequency") or {}
        if not isinstance(frequency, dict):
            frequency = {"value": frequency}
        if _material(frequency.get("value")):
            mode = frequency.get("mode")
            period = frequency.get("period")
            if mode not in ("percent", "count"):
                errors.append("DF060: falta denominador de frecuencia (porcentaje o casos).")
            elif mode == "percent":
                try:
                    value = float(frequency["value"])
                except (ValueError, TypeError):
                    value = 101
                if value > 100:
                    errors.append("DF060: el porcentaje de casos afectados excede el 100 %.")
            elif period not in ("case", "day", "month", "year"):
                errors.append("DF060: recuento sin periodo comparable.")
        elif _material(friction.get("active_time_loss")) or _material(friction.get("direct_loss")):
            errors.append("DF060: falta frecuencia para cuantificar el impacto declarado.")
        has_effort = _material(friction.get("active_time_loss"))
        has_loss = _material(friction.get("direct_loss"))
        if has_effort:
            errors.append(
                "DF062: relación con DF039 sin atribuir; no sumar al retrabajo del paso."
            )
        if has_loss:
            errors.append(
                "DF063: pérdida directa pendiente de conciliación de evento con DF082 y otras fricciones."
            )
        if errors:
            findings.append({
                "friction_id": friction_id or None,
                "step_ids": anchors,
                "issues": errors,
                "attribution_status": "PENDING",
            })
    return {
        "status": "PENDING_REVIEW" if findings else "NO_FINDINGS",
        "findings": findings,
        "rule": "Una fricción vinculada a varios pasos representa una observación, no una pérdida por paso.",
    }
# [AUNEA-BE-FRICTION-REVIEW-071] END
