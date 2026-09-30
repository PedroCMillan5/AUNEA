# [AUNEA-BE-FRICTION-REVIEW-071] START — Non-additive friction attribution checks
# PURPOSE: Surface incomplete frequency, broken anchors and unallocated effort/loss
#          while enforcing DEC-068 one-owner time attribution without counting twice.
# SOURCE: Diagnostic Master v1.2 DF059–DF063, RULE_ECON_AGGREGATION EAR-001/004/006/012,
#         DEC-032/033/040/068.
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


ATTRIBUTION_MODES = {"INCLUDED", "BREAKDOWN", "ADDITIONAL"}


def _attribution(friction: dict[str, Any], anchors: list[str], errors: list[str]) -> tuple[str | None, str | None]:
    """One event has one economic owner, even if it affects several steps."""
    relation = friction.get("time_attribution")
    if not isinstance(relation, dict):
        errors.append("DF062: clasificar la relación con el paso: Incluido / Desglose / Adicional.")
        return None, None
    mode = str(relation.get("mode") or "").upper()
    owner = str(relation.get("step_id") or "")
    if mode not in ATTRIBUTION_MODES:
        errors.append("DF062: relación inválida; usar Incluido, Desglose o Adicional.")
    if not owner or owner not in anchors:
        errors.append("DF062: seleccionar un paso responsable entre los afectados; no multiplicar por todos.")
    return (mode if mode in ATTRIBUTION_MODES else None,
            owner if owner in anchors else None)


def review_frictions(
    steps: list[dict[str, Any]], frictions: list[dict[str, Any]]
) -> dict[str, Any]:
    """DEC-068: validate temporal attribution separately from monetary reconciliation.

    DF062 has one economic owner even if DF059 references several affected steps.
    DF063 is a separate monetary event: its pending DF082 reconciliation must
    never erase an otherwise valid ADDITIONAL time projection.
    """
    active_step_ids = {
        str(step.get("id")) for step in steps
        if step.get("status") != "SUPERSEDED" and step.get("id")
    }
    seen: set[str] = set()
    findings: list[dict[str, Any]] = []
    classified: list[dict[str, Any]] = []
    money_findings: list[dict[str, Any]] = []

    for friction in frictions:
        if friction.get("status") == "SUPERSEDED":
            continue
        friction_id = str(friction.get("id") or "")
        affected = friction.get("affected_steps") or []
        affected = affected if isinstance(affected, list) else [affected]
        anchors = list(dict.fromkeys(str(x) for x in affected if x))
        errors: list[str] = []
        money_warnings: list[str] = []

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
        has_effort = _material(friction.get("active_time_loss"))
        has_loss = _material(friction.get("direct_loss"))
        frequency_issues: list[str] = []
        if has_effort or has_loss:
            if not _material(frequency.get("value")):
                frequency_issues.append("DF060: falta frecuencia para cuantificar el impacto declarado.")
            else:
                mode = frequency.get("mode")
                period = frequency.get("period")
                if mode not in ("percent", "count"):
                    frequency_issues.append("DF060: falta denominador de frecuencia (porcentaje o recuento).")
                elif mode == "percent":
                    try:
                        value = float(frequency["value"])
                    except (ValueError, TypeError):
                        value = 101
                    if value > 100:
                        frequency_issues.append("DF060: el porcentaje de casos afectados excede el 100 %.")
                elif period not in ("case", "day", "month", "year"):
                    frequency_issues.append("DF060: recuento sin periodo comparable.")
        if has_effort:
            errors.extend(frequency_issues)
        if has_loss:
            money_warnings.extend(frequency_issues)
            money_warnings.append(
                "DF063: conciliar evento monetario con DF082/otras fricciones; "
                "tiempo y dinero no son el mismo sumando."
            )

        attribution_mode, owner_step_id = (None, None)
        if has_effort:
            attribution_mode, owner_step_id = _attribution(friction, anchors, errors)
            if owner_step_id and owner_step_id not in active_step_ids:
                errors.append("DF062: el paso responsable ya no está activo.")

        if attribution_mode and owner_step_id:
            classified.append({
                "friction_id": friction_id, "owner_step_id": owner_step_id,
                "mode": attribution_mode,
                "counted_as_additional": attribution_mode == "ADDITIONAL" and not errors,
            })
        if has_loss:
            money_findings.append({
                "friction_id": friction_id or None,
                "warnings": list(dict.fromkeys(money_warnings)),
                "reconciliation_status": "PENDING_DF082",
            })
        if errors or money_warnings:
            findings.append({
                "friction_id": friction_id or None,
                "step_ids": anchors,
                "issues": list(dict.fromkeys(errors + money_warnings)),
                "blocking_issues": list(dict.fromkeys(errors)),
                "monetary_warnings": list(dict.fromkeys(money_warnings)),
                "attribution_status": (
                    "PENDING" if errors else "VALIDATED" if has_effort else "NOT_APPLICABLE"
                ),
            })
    return {
        "status": "PENDING_REVIEW" if findings else "NO_FINDINGS",
        "findings": findings,
        "classified": classified,
        "monetary_reconciliation": money_findings,
        "rule": "Una fricción tiene un único paso propietario de su tiempo; otros pasos son vínculos contextuales.",
    }
# [AUNEA-BE-FRICTION-REVIEW-071] END
