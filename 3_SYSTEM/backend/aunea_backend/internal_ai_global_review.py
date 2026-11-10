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

def _positive_action(pattern: str, action: str) -> bool:
    """Detect asserted changes, not clauses saying the change must NOT occur."""
    for found in re.finditer(pattern, action, flags=re.IGNORECASE):
        left = action[max(0, found.start() - 44):found.start()]
        if re.search(r"\b(?:sin|no|evitar|impedir|prohibir)\s+(?:\w+\s+){0,3}$", left):
            continue
        if re.search(r"\bno\s+se\s+(?:debe|puede|va\s+a)\s+(?:\w+\s+){0,2}$", left):
            continue
        return True
    return False


def _action_dependency(action: str) -> list[dict]:
    """Requested functions are hypotheses: existing tool presence proves no feature."""
    details = []
    def add(source: str, message: str) -> None:
        if not any(row["question"] == message for row in details):
            details.append({"source": source, "question": message})
    if re.search(r"\b(?:erp|crm|plataforma|sistema)\b", action) and re.search(
        r"automat|integr|api|conect|webhook|campo|registr|sincron|carga", action):
        add("CAPACIDAD_TECNICA", "Comprobar con el responsable del ERP/CRM si la función propuesta existe, "
            "qué permisos y licencias requiere y cómo probarla sin cambiar la operación.")
    if re.search(r"integr|api|webhook|sincron|intercambi|conect|enviar datos|extraer datos", action):
        add("CAPACIDAD_TECNICA", "Verificar disponibilidad de integración y controles de acceso, "
            "tratamiento de datos y auditoría entre los sistemas mencionados.")
    if re.search(r"avisos?|notific|recordatori|alertas?|correos?|emails?", action):
        add("CAPACIDAD_TECNICA", "Verificar que el canal actual admite los avisos y sus disparadores, "
            "manteniendo responsable, permisos y seguimiento.")
    if re.search(r"firma(?:s)? digital|firma(?:s)? electr[oó]nic", action):
        add("CAPACIDAD_TECNICA", "Verificar validez de la firma, identidad del firmante y soporte "
            "real de la herramienta antes de diseñar el control.")
    if re.search(r"formulario|plantilla|importar|captur|carga de datos", action):
        add("CAPACIDAD_TECNICA", "Verificar formato de entrada y campos disponibles; "
            "no suponer que el sistema admite importación o captura automatizada.")
    if re.search(r"nueva herramienta|nueva plataforma|migrar|sustituir (?:el |la )?(?:erp|crm|sistema)", action):
        add("DF089", "Revisar la preferencia por las herramientas actuales, el coste "
            "operativo de cambio y la autorización requerida.")
    if not details:
        add("VIABILIDAD_PENDIENTE", "Confirmar con el responsable del proceso que el cambio "
            "se puede ejecutar con los controles y recursos disponibles.")
    return details



def assess_operational_burden(how: str) -> list[dict]:
    """Flag *possible* added work, never assert a saving or prohibit a solution.

    These are advisory review questions for any process or industry, not
    business rules and not a substitute for measured AS-IS/TO-BE evidence.
    """
    action = _normalized(how)
    checks: list[dict] = []
    def warn(pattern: str, question: str) -> None:
        if _positive_action(pattern, action):
            checks.append({"source": "IMPACTO_OPERATIVO_PENDIENTE",
                           "question": question})
    warn(r"\b(?:crear|introducir|a[nñ]adir|incorporar|establecer|implantar|abrir|generar) "
         r"(?:un |una |otro |otra |nuevo |nueva |adicional )?"
         r"(?:formularios?|registros?|plantillas?|hojas? de c[aá]lculo|"
         r"tablas? de seguimiento|listas? de control)\b",
         "Comprobar si el nuevo registro o formulario sustituye trabajo existente "
         "o introduce una segunda captura, responsable o mantenimiento.")
    warn(r"\b(?:copiar|teclear|transcribir|duplicar|reintroducir|"
         r"traspasar manualmente|registrar de nuevo)\b",
         "Verificar que la transferencia de información evita trabajo duplicado "
         "en lugar de desplazar la carga manual a otro paso o persona.")
    warn(r"\b(?:nueva|otra|adicional) (?:aprobaci[oó]n|validaci[oó]n|"
         r"revisi[oó]n|firma|entrega|derivaci[oó]n|transferencia)\b",
         "Contrastar si el control o traspaso adicional es proporcional al riesgo "
         "y qué espera, dependencia o intervención humana añade.")
    return checks


def assess_alignment(objective: str, how: str, context: dict) -> dict:
    """Warnings only: never rewrite or approve an AI proposal."""
    goal = _normalized(objective)
    action = _normalized(how)
    capture = bool(re.search(r"reintroduc|volver a teclear|doble captura|captura duplicada", goal))
    notice = bool(re.search(r"recordatori|avisos?|alertas?|notificaci|seguimiento", action))
    reuse = bool(re.search(r"reutiliz|reintroduc|tecle|captur|validar (?:los |las )?datos", action))
    issues = []
    if capture and notice and not reuse:
        issues.append({"code":"OBJECTIVE_ACTION",
          "message":"El objetivo aborda la doble captura y la intervención sólo propone seguimiento; revisar."})
    focus = str(context.get("focus_source_id") or "")
    problems = [*context.get("frictions", []), *context.get("risks", [])]
    original = next((x for x in problems if str(x.get("id")) == focus), None)
    if original:
        declared = _normalized(" ".join(str(original.get(field) or "") for field in
            ("label", "description", "observable_signal", "cause")))
        duplicate_capture = bool(re.search(
            r"reintroduc|tecle|captura repetida|datos duplicados", declared))
        if duplicate_capture and notice and not reuse:
            issues.append({"code":"ACTION_SOURCE",
              "message":"La fuente documenta captura repetida; los avisos no la resuelven directamente."})
    return {"status":"REVIEW" if issues else "NOT_FLAGGED",
            "basis":"HEURISTIC_NOT_CERTIFICATION","issues":issues}


def assess_recommendation(how: str, context: dict, stated_constraints: str = "") -> dict:
    """Source-backed incompatibilities + action-specific checks, never a green feasibility claim.

    The client's answer IDs are the only source for actual limits. Ollama's
    'constraints' text may be checked for invented bans, never adopted as truth.
    All outputs are read-only advisory metadata in the existing PG11 DRAFT.
    """
    action = _normalized(how)
    stated = _normalized(stated_constraints)
    declared = explain_limits(context)
    codes = {item["value"] for item in declared}
    def source_for(*values: str) -> str:
        return "/".join(dict.fromkeys(
            item["source"] for item in declared if item["value"] in values))
    conflicts: list[dict] = []
    applicable: list[dict] = []
    verifications = _action_dependency(action)
    operational_checks = assess_operational_burden(how)

    def add_conflict(source: str, reason: str) -> None:
        if not any(item["source"] == source and item["reason"] == reason
                   for item in conflicts):
            conflicts.append({"source": source, "reason": reason})

    def track(source: str, effect: str, reason: str) -> None:
        if not any(item["source"] == source and item["reason"] == reason
                   for item in applicable):
            applicable.append({"source": source, "effect": effect, "reason": reason})

    approval_action = _positive_action(
        r"(?:aprobaci[oó]n autom[aá]tica|aprobar autom[aá]ticamente|"
        r"automatizar (?:la |las )?aprobaci[oó]n|"
        r"(?:eliminar|suprimir|sustituir) (?:la |las )?(?:aprobaciones?|decisi[oó]n humana)|"
        r"decidir autom[aá]ticamente (?:la )?aprobaci[oó]n)", action)
    requires_human = bool(codes & {"HUMAN_DECISION", "APPROVAL", "FINAL_DECISION"})
    if requires_human and approval_action:
        add_conflict(source_for("HUMAN_DECISION","APPROVAL","FINAL_DECISION"),
                     "La intervención sustituye o automatiza una aprobación/decisión humana "
                     "que el cliente ha declarado obligatoria.")
        track(source_for("HUMAN_DECISION","APPROVAL","FINAL_DECISION"), "BLOCKS",
              "La aprobación o decisión final debe permanecer en una persona autorizada.")
    elif requires_human:
        track("DF075/DF087/DF088", "KEEP",
              "Mantener la aprobación y las decisiones humanas declaradas.")
        if re.search(r"aprob|valid|decisi[oó]n|autoriza", action):
            verifications.append({"source": "DF087/DF088",
                "question": "Confirmar quién aprueba y cómo queda acreditada su decisión."})

    financial_action = _positive_action(
        r"(?:(?:ejecutar|realizar|ordenar|autorizar|automatizar) "
        r"(?:autom[aá]ticamente )?(?:los |las )?(?:pagos?|transferencias?|"
        r"acciones? financieras?)|(?:pagos?|transferencias?) autom[aá]ticos?)", action)
    if "FINANCIAL_ACTION" in codes and financial_action:
        add_conflict(source_for("FINANCIAL_ACTION"), "El cliente excluye la ejecución automática de "
                     "acciones financieras o pagos.")
        track(source_for("FINANCIAL_ACTION"), "BLOCKS", "Los pagos y decisiones financieras quedan fuera del alcance.")

    irreversible = _positive_action(
        r"(?:(?:eliminar|borrar|suprimir) autom[aá]ticamente "
        r"(?:los |las )?(?:registros?|datos|documentos?)|"
        r"(?:eliminaci[oó]n|borrado) autom[aá]tic[oa] irreversible)", action)
    if "DELETE" in codes and irreversible:
        add_conflict(source_for("DELETE"), "El cliente prohíbe automatizar eliminaciones irreversibles.")
        track(source_for("DELETE"), "BLOCKS", "Conservar intervención humana en las eliminaciones.")

    downtime = _positive_action(
        r"(?:paralizar|detener|interrumpir|suspender) (?:la |las |el )?"
        r"(?:operaci[oó]n|actividad|producci[oó]n|servicio)|"
        r"parada (?:de la )?(?:operaci[oó]n|actividad|producci[oó]n)", action)
    if "NO_DOWNTIME" in codes and downtime:
        add_conflict(source_for("NO_DOWNTIME"), "La intervención exige detener la operación, prohibido por el cliente.")
        track(source_for("NO_DOWNTIME"), "BLOCKS", "No interrumpir la operación diaria.")
    elif "NO_DOWNTIME" in codes:
        track("DF091", "KEEP", "El cambio debe implantarse sin interrumpir la actividad.")
        verifications.append({"source": "DF091",
                              "question": "Comprobar el plan de implantación y reversión "
                              "sin interrumpir la operación."})

    audit_removal = _positive_action(
        r"(?:desactivar|eliminar|suprimir|omitir) (?:el |la |los )?"
        r"(?:registro(?:s)? de )?(?:auditor[ií]a|trazabilidad)", action)
    if "AUDIT_LOG" in codes and audit_removal:
        add_conflict("DF090", "La intervención elimina trazabilidad o auditoría exigida por el cliente.")
        track("DF090", "BLOCKS", "El registro de auditoría debe mantenerse.")
    elif "AUDIT_LOG" in codes:
        track("DF090", "KEEP", "Debe mantenerse la trazabilidad de las acciones.")
        verifications.append({"source": "DF090",
                              "question": "Verificar que la alternativa conserva evidencias y "
                              "registro auditable de cada cambio."})

    unrestricted_access = _positive_action(
        r"(?:sin permisos|sin control de acceso|acceso libre a todos|"
        r"sin (?:restricciones?|validaci[oó]n) de acceso)", action)
    if "RBAC" in codes and unrestricted_access:
        add_conflict("DF090", "La intervención elimina los permisos por rol exigidos por el cliente.")
        track("DF090", "BLOCKS", "Los permisos deben mantenerse por rol.")
    elif "RBAC" in codes:
        track("DF090", "KEEP", "Mantener los permisos por rol existentes.")
        verifications.append({"source": "DF090",
                              "question": "Comprobar permisos reales del rol encargado de ejecutar "
                              "o configurar la mejora."})

    if "MFA" in codes and _positive_action(
        r"(?:desactivar|eliminar|omitir|suprimir) "
        r"(?:el |la )?(?:mfa|doble factor|segundo factor|autenticaci[oó]n reforzada)", action):
        add_conflict("DF090", "La intervención desactiva autenticación reforzada que debe conservarse.")
        track("DF090", "BLOCKS", "No retirar la autenticación reforzada.")

    # Explicit free-text prohibitions are meaningful, unlike preference codes.
    for entry in declared:
        value = _normalized(entry["value"])
        source = entry["source"]
        external_prohibited = bool(re.search(
            r"(?:no se permite|prohibid[oa]|no autoriza|sin acceso)\s+"
            r"(?:el |la |los )?(?:acceso|env[ií]o|transferencia|salida) "
            r"(?:de |a |al )?(?:datos? )?(?:extern[oa]s?|fuera)", value)
            or re.search(r"(?:no se permite|prohibid[oa]) .{0,35}"
                         r"(?:datos? (?:fuera|extern[oa])|acceso extern)", value))
        external_action = _positive_action(
            r"(?:enviar|transferir|publicar|compartir|subir|almacenar) "
            r"(?:los |las |el |la )?(?:datos?|facturas?|documentos?|informaci[oó]n) "
            r".{0,65}(?:servicio extern|plataforma externa|nube externa|"
            r"servidor extern|fuera de (?:la |el )?(?:empresa|entorno))", action)
        if external_prohibited and external_action:
            add_conflict(source, "La propuesta envía datos fuera del entorno pese a "
                         "una prohibición explícita del cliente.")
            track(source, "BLOCKS", "Los datos no pueden salir del entorno autorizado.")
        new_tools_prohibited = bool(re.search(
            r"(?:no (?:se permite|autoriza|quiere|puede) |prohibid[oa] |sin )"
            r"(?:incorporar |instalar |implantar |introducir )?"
            r"(?:nuevas? (?:herramientas?|plataformas?|sistemas?)|software nuevo)", value))
        new_tool_action = _positive_action(
            r"(?:incorporar|instalar|implantar|introducir|migrar a|usar) "
            r"(?:una? |el )?(?:nueva? (?:herramienta|plataforma|sistema)|software nuevo)", action)
        if new_tools_prohibited and new_tool_action:
            add_conflict(source, "La intervención incorpora una herramienta nueva pese "
                         "a una prohibición explícita registrada por el cliente.")
            track(source, "BLOCKS", "No introducir nuevas herramientas sin cambiar el alcance.")

    if "CRM_NATIVE" in codes and re.search(
        r"(?:prohibid[ao]|no se permite|no est[aá] permitido).{0,95}"
        r"(?:crm|funcionalidad(?:es)? nativa|funciones? nativa)", stated):
        track("DF089", "MISSTATED", "La propuesta interpreta erróneamente una preferencia "
              "como prohibición; corregir la justificación antes de aprobar.")
        verifications.append({"source": "DF089",
                              "question": "Corregir la falsa prohibición: el cliente "
                              "prioriza funciones nativas, sin impedir otras opciones."})

    if "KEEP_EXISTING" in codes:
        if re.search(r"nueva plataforma|nueva herramienta|migrar|sustituir "
                     r"(?:el |la )?(?:erp|crm|sistema)", action):
            track("DF089", "PREFERENCE",
                  "El cliente prefiere mantener sus herramientas; el cambio requiere "
                  "justificación y autorización, pero no está prohibido.")
        else:
            track("DF089", "PREFERENCE", "Se prioriza aprovechar las herramientas actuales.")
    if "CRM_NATIVE" in codes:
        track("DF089", "PREFERENCE",
              "Las funciones nativas se prefieren, sin dar por probada su disponibilidad.")
    if "TRAINING" in codes:
        track("DF091", "REVIEW", "La implantación debe contemplar la formación necesaria.")
        verifications.append({"source": "DF091",
                              "question": "Validar esfuerzo de formación y responsable de adopción."})

    # Additional declared restrictions still need human review even if there is
    # no rule-specific detector. Do NOT automatically classify them as satisfied.
    handled_sources = set()
    for row in applicable:
        handled_sources.update(row["source"].split("/"))
    for entry in declared:
        if entry["source"] not in handled_sources and entry["source"] in {
                "DF010", "DF073", "DF075", "DF087", "DF088", "DF089", "DF090", "DF091", "DF092"}:
            track(entry["source"], "REVIEW",
                  "Contrastar el cambio con la condición declarada: " + entry["meaning"] + ".")

    if conflicts:
        reason = "Incompatibilidad con " + ", ".join(
            dict.fromkeys(x["source"] for x in conflicts)) + ": " + conflicts[0]["reason"]
    else:
        relevant = next((row for row in applicable if row["effect"] == "PREFERENCE"), None)
        reason = (relevant["reason"] + " " if relevant else "") + (
            "Viabilidad sin acreditar: " + verifications[0]["question"])
    return {
        "status": "INCOMPATIBLE" if conflicts else "CONDITIONED",
        "conflicts": conflicts,
        "checks": applicable,
        "verifications": verifications,
        "capability_status": "UNVERIFIED",
        "operational_checks": operational_checks,
        "reason": reason,
    }


# [AUNEA-BE-PG11-GLOBAL-REVIEW-292] END
