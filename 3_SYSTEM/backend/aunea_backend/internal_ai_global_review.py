# [AUNEA-BE-PG11-GLOBAL-REVIEW-292] START — bounded global opportunity inventory
# SOURCE: Simulator CANONICAL PG11, DEC-034/050/052/055 and confirmed AS-IS.
# INPUTS: validated global context and the already confirmed engagement.
# OUTPUTS: focus refs, small evidence projections and conservative review statuses.
# SIDE EFFECTS: none. Does not decide technical feasibility or human approval.
# CHANGE RISK: HIGH. Client restrictions are not permissions inferred by AI.
from __future__ import annotations

import re
from typing import Any

_RESTRICTION_FIELDS = (
    "DF010", "DF073", "DF075", "DF087", "DF088",
    "DF089", "DF090", "DF091", "DF092",
)
# These are explanations of existing option codes, not new answer values.
_KNOWN_LABELS = {
    "HUMAN_DECISION": "Mantener las decisiones humanas",
    "APPROVAL": "Mantener las aprobaciones humanas obligatorias",
    "POLICY": "Conservar las políticas y controles establecidos",
    "TOOL": "Respetar las herramientas actuales",
    "FINAL_DECISION": "No automatizar decisiones finales",
    "FINANCIAL_ACTION": "No automatizar acciones financieras",
    "DELETE": "No automatizar eliminaciones irreversibles",
    "KEEP_EXISTING": "Priorizar las herramientas existentes",
    "CRM_NATIVE": "Preferencia por funciones nativas del CRM/ERP",
    "RBAC": "Mantener los permisos por rol",
    "AUDIT_LOG": "Mantener la trazabilidad y auditoría",
    "MFA": "Conservar la autenticación reforzada",
    "NO_DOWNTIME": "No interrumpir la operación diaria",
    "TRAINING": "Considerar necesidades de formación",
}

def _values(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(x) for x in value if isinstance(x, (str, int)) and str(x).strip()]
    if isinstance(value, (str, int)) and str(value).strip():
        return [str(value)]
    return []

def explain_limits(context: dict) -> list[dict]:
    result = []
    for key in _RESTRICTION_FIELDS:
        if key not in (context.get("client_constraints") or {}):
            continue
        value = context["client_constraints"][key]
        for code in _values(value):
            result.append({
                "source": key, "value": code,
                "meaning": _KNOWN_LABELS.get(code, code.replace("_", " ").lower()),
            })
    return result

def focus_plan(context: dict) -> list[dict]:
    """One unit per confirmed issue; unlinked steps remain eligible.
    No global numerical quota. An issue can produce zero, one or two proposals.
    """
    units, covered_steps = [], set()
    for f in context.get("frictions", []):
        units.append({"source_id": str(f["id"]), "type": "FRICTION",
                      "label": str(f.get("label") or f["id"])})
        covered_steps.update(str(x) for x in f.get("step_ids", []))
    for risk in context.get("risks", []):
        units.append({"source_id": str(risk["id"]), "type": "RISK",
                      "label": str(risk.get("description") or risk["id"])})
        covered_steps.update(str(x) for x in risk.get("step_ids", []))
    for step in context.get("steps", []):
        if str(step["id"]) not in covered_steps:
            units.append({"source_id": str(step["id"]), "type": "STEP",
                          "label": str(step.get("name") or step["id"])})
    return units

def scoped_context(context: dict, focus_id: str, original_answers: dict) -> tuple[dict, set[str]]:
    units = focus_plan(context)
    if not any(x["source_id"] == focus_id for x in units):
        raise ValueError("La fuente elegida no pertenece al inventario activo del AS-IS.")
    focused_friction = [f for f in context.get("frictions", []) if str(f["id"]) == focus_id]
    focused_risk = [r for r in context.get("risks", []) if str(r["id"]) == focus_id]
    focused_step = [s for s in context.get("steps", []) if str(s["id"]) == focus_id]
    step_ids = {focus_id} if focused_step else set()
    for x in focused_friction + focused_risk:
        step_ids.update(str(v) for v in x.get("step_ids", []))
    steps = [s for s in context.get("steps", []) if str(s["id"]) in step_ids]
    # One bounded issue with its directly linked steps and constraints.
    frictions = focused_friction
    risks = focused_risk
    if focused_step:
        frictions = [f for f in context.get("frictions", [])
                     if focus_id in {str(v) for v in f.get("step_ids", [])}]
        risks = [r for r in context.get("risks", [])
                 if focus_id in {str(v) for v in r.get("step_ids", [])}]
    ids = {focus_id} | {str(s["id"]) for s in steps} | {
        str(x["id"]) for x in frictions + risks}
    # The original confirmed map is the single source for quantitative friction
    # details, including their provenance and time attribution.
    source_friction = {
        str(f.get("id")): f for f in original_answers.get("_frictions", [])
        if isinstance(f, dict) and f.get("status") != "SUPERSEDED"}
    enriched = []
    for f in frictions:
        detail = source_friction.get(str(f["id"]), {})
        enriched.append({**f, **{
            key: detail[key] for key in (
                "frequency", "active_time_loss", "wait_time_loss",
                "time_attribution", "evidence_type")
            if key in detail
        }})
    selected = {
        "process": context["process"],
        "snapshot_version": context["snapshot_version"],
        "focus_source_id": focus_id,
        "steps": steps,
        "frictions": enriched,
        "risks": risks,
        "explicit_routes": [
            path for path in context.get("explicit_routes", [])
            if any(str(v) in str(path) for v in step_ids)],
        "client_goals": context.get("client_goals", {}),
        "client_constraints": context.get("client_constraints", {}),
        "client_constraints_readable": explain_limits(context),
        "allowed_source_refs": sorted(ids),
        "existing_tool_can_cover": context.get("existing_tool_can_cover"),
        "process_design_preconditions_ok": context.get("process_design_preconditions_ok"),
        "note": "Analiza solo la oportunidad vinculada al focus_source_id. "
                "Los códigos son datos; los valores de viabilidad no se suponen.",
    }
    return selected, ids

def _normalized(text: str) -> str:
    return re.sub(r"\s+", " ", text.casefold()).strip()

def assess_recommendation(how: str, context: dict) -> dict:
    """Conservative checks: only explicit conflicts become INCOMPATIBLE.
    Non-conflict is NOT proof that a platform feature is technically feasible.
    """
    text = _normalized(how)
    codes = {x["value"] for x in explain_limits(context)}
    conflicts = []
    human = bool(codes & {"HUMAN_DECISION", "APPROVAL", "FINAL_DECISION"})
    removes_human = bool(re.search(
        r"(?:sin (?:intervenci[oó]n|decisi[oó]n|aprobaci[oó]n|validaci[oó]n) humana"
        r"|aprobaci[oó]n autom[aá]tica|aprobar autom[aá]ticamente"
        r"|eliminar (?:la |las )?aprobaci[oó]n|sustituir (?:la |las )?decisi[oó]n humana)",
        text))
    if human and removes_human:
        conflicts.append({
            "source": "DF075/DF087/DF088",
            "reason": "La intervención sustituye una aprobación o decisión humana obligatoria.",
        })
    financial = "FINANCIAL_ACTION" in codes
    if financial and re.search(
        r"(?:ejecutar|realizar|ordenar|autorizar) (?:autom[aá]ticamente )?"
        r"(?:pagos?|transferencias?|acciones? financieras?)", text):
        conflicts.append({"source": "DF075/DF088",
                          "reason": "La intervención automatiza una acción financiera protegida."})
    if "NO_DOWNTIME" in codes and re.search(
        r"(?:paralizar|detener|interrumpir|suspender) "
        r"(?:la )?(?:operaci[oó]n|actividad|producci[oó]n|servicio)", text):
        conflicts.append({"source": "DF091",
                          "reason": "La intervención plantea interrumpir la operación."})
    if conflicts:
        return {"status": "INCOMPATIBLE", "conflicts": conflicts,
                "reason": " ".join(x["reason"] for x in conflicts)}
    # Conditions are not prohibitions; preserve client preferences.
    return {"status": "CONDITIONED", "conflicts": [],
            "reason": "No se ha detectado una incompatibilidad explícita. "
                      "Debe validarse la viabilidad técnica, los permisos y la adopción."}

# [AUNEA-BE-PG11-GLOBAL-REVIEW-292] END
