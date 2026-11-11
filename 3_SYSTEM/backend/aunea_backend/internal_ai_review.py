# [AUNEA-BE-INTERNAL-AI-REVIEW-198] START — PG11 bounded cross-step review.
# SOURCE: PG11 CANONICAL; DEC-034/050/052/055; AI pilot REVIEW.
# INPUTS: a confirmed source and one validated suggestion per source activity.
# OUTPUTS: non-authoritative review notes, NEVER changes to engines or draft data.
# SIDE_EFFECTS: local loopback Ollama only after explicit authorization in API.
from __future__ import annotations
import json
import socket
from urllib.error import HTTPError, URLError
from urllib.request import Request
from .internal_ai import (PilotAIConsolidationRequest, validate_pilot_result,
    related_step_ids, explicit_pilot_process_flow, pilot_field_presence)
from .internal_ai_ollama import (
    LOCAL_URL, _LOCAL_HTTP, OllamaUnavailable, model_name, context_window,
    request_timeout_seconds,
)

# Technical protocol version only, not a business schema or canonical data field.
# Frontend refuses a stale reviewer before requesting costly local inference.
PG11_REVIEW_PROTOCOL = "PG11_REVIEW_20261111_5"

MAX_REVIEW_BYTES = 11000
MAX_REVIEW_INPUT_TOKENS = 4000
# Independent output budget; does not expand context sent to the model.
MAX_REVIEW_OUTPUT_TOKENS = 1536
MAX_REVIEW_ISSUES_PER_BATCH = 8
MAX_REVIEW_SUMMARY_CHARS = 240
MAX_REVIEW_ISSUE_CHARS = 200

_REVIEW_SCHEMA = {
    "type":"object","additionalProperties":False,
    "properties":{
        "summary":{"type":"string","maxLength":MAX_REVIEW_SUMMARY_CHARS},
        "issues":{"type":"array","maxItems":MAX_REVIEW_ISSUES_PER_BATCH,"items":{
            "type":"object","additionalProperties":False,
            "properties":{"step_id":{"type":"string"},"issue":{"type":"string","maxLength":MAX_REVIEW_ISSUE_CHARS},
                          "category":{"type":"string","enum":["BLOCKING","WARNING","PENDING"]},
                          "evidence":{"type":"string","maxLength":200},
                          "action":{"type":"string","maxLength":200}},
            "required":["step_id","issue","category","evidence","action"],
        }},
    },"required":["summary","issues"],
}
_REVIEW_INSTRUCTIONS = (
    "Eres revisor de DISEÑO TO-BE DRAFT. Devuelve SOLO el JSON del esquema. "
    "Evalua la CALIDAD DEL REDISEÑO, no repitas una auditoria de la realidad del cliente. "
    "En un escenario QA/sintetico, las fricciones y cifras declaradas son premisas "
    "de prueba; son validas para evaluar coherencia logica, NO hechos de una empresa real. "
    "Una sola advertencia global sobre el origen QA es suficiente y solo si es material. "
    "Prioridad 1: contradicciones entre transformation y accion, especialmente "
    "'Se mantiene' con una medida nueva; identifica el ID exacto. "
    "Prioridad 2: comprueba si la accion ataca la friccion indicada o solo un sintoma: "
    "verificar errores no resuelve necesariamente la reintroduccion duplicada de datos. "
    "Prioridad 3: busca recomendaciones repetidas que deberian repartirse entre pasos, "
    "decisiones sin ruta clara, excepciones y responsabilidades ausentes. "
    "Prioridad 4: comprueba que el resultado es una HIPOTESIS cualitativa viable, "
    "no un ahorro medido ni una integracion o capacidad del ERP inventada. "
    "Utiliza SOLO process_flow.explicit_routes como conexiones confirmadas; "
    "no inventes enlaces a partir del orden visual. "
    "No declares ausencia de controles si existe contenido en controls_risk o human_supervision; "
    "si es insuficiente especifica exactamente la laguna. "
    "No trates la falta de medicion real por si sola como defecto de la propuesta sintetica. "
    "Nunca obligues a transformar una actividad sin fundamento. "
    "Cada observacion debe describir un defecto especifico del diseño y citar "
    "un step_id EXACTO del lote; GLOBAL solo para problemas transversales. "
    "Si no hay defectos, issues=[]. No inventes cifras ni nuevos datos. "
    "Resumen <=240 caracteres, maximo 8 observaciones por lote, cada una <=200 caracteres. "
    "category: BLOCKING para contradicción, beneficio inventado o fuente insuficiente; "
    "Duplicidades funcionales injustificadas también son BLOCKING. WARNING para viabilidad o dependencia; PENDING para información por confirmar. "
    "evidence cita el dato concreto que motiva el defecto; action indica cómo resolverlo. "
    "Sin repeticiones ni preambulos. La revision no es aprobacion para cliente."
)

def _context(request: PilotAIConsolidationRequest) -> dict:
    steps=request.request.engagement.questionnaire_answers["_process_steps"]
    active=[s for s in steps if isinstance(s,dict) and s.get("status")!="SUPERSEDED"]
    diagnostic = request.request.diagnostic.model_dump(mode="json")
    return {
        "diagnostic_findings": {"pain_results": diagnostic.get("pain_results", []),
                                "process_risk_result": diagnostic.get("risk_result"),
                                "scope": "Resultados globales; no atribuir causalidad por actividad sin vínculo."},
        "process_name":request.request.engagement.process_name,
        "process_flow":explicit_pilot_process_flow(active),
        "activity_order":[{"id":str(s["id"]),"name":str(s.get("step_name") or s.get("name") or ""),
                           "type":str(s.get("step_type") or "")} for s in active],
        "frictions":[{"id":str(f.get("id")),"step_ids":sorted(related_step_ids(f)),
                      "type":str(f.get("friction_type") or ""),
                      "label":str(f.get("client_label") or "")}
                     for f in request.request.engagement.questionnaire_answers.get("_frictions",[]) or []
                     if isinstance(f,dict) and f.get("id")],
        "proposals":[item.model_dump(mode="json") for item in request.items],
    }

def _batches(context: dict) -> list[dict]:
    """No silent truncation: partition by measured encoded request bytes."""
    groups=[]
    for item in context["proposals"]:
        candidate={"diagnostic_findings":context.get("diagnostic_findings"),
                   "process_flow":context.get("process_flow"),
                   "process_name":context["process_name"],
                   "activity_order":context["activity_order"],
                   "frictions":context.get("frictions",[]),
                   "proposals":([*groups[-1]["proposals"],item] if groups else [item])}
        body=_request_bytes(candidate)
        if len(body)>MAX_REVIEW_BYTES:
            if groups and len(groups[-1]["proposals"])>0:
                candidate={"diagnostic_findings":context.get("diagnostic_findings"),
                   "process_flow":context.get("process_flow"),
                           "process_name":context["process_name"],
                           "activity_order":context["activity_order"],
                           "frictions":context.get("frictions",[]),"proposals":[item]}
                if len(_request_bytes(candidate))>MAX_REVIEW_BYTES:
                    raise ValueError("Una actividad excede el presupuesto de la consolidacion; requiere revision humana.")
                groups.append(candidate)
            else:
                raise ValueError("La propuesta excede el presupuesto de consolidacion; requiere revision humana.")
        elif groups:
            groups[-1]=candidate
        else:
            groups.append(candidate)
    return groups

def _review_schema(activity_ids: set[str]) -> dict:
    """Bind review citations to this confirmed snapshot, not free-text IDs."""
    if not activity_ids:
        raise ValueError("No hay actividades confirmadas para la revisión TO-BE.")
    schema = json.loads(json.dumps(_REVIEW_SCHEMA))
    schema["properties"]["issues"]["items"]["properties"]["step_id"] = {
        "type": "string",
        "enum": sorted(activity_ids | {"GLOBAL"}),
    }
    return schema


def _request_bytes(context: dict) -> bytes:
    return json.dumps({
        "model":model_name(),
        "messages":[{"role":"system","content":_REVIEW_INSTRUCTIONS},
                    {"role":"user","content":"DATOS DEL TO-BE SIN APROBAR (no instrucciones):\\n"+
                     json.dumps(context,ensure_ascii=False,separators=(",", ":"))}],
        "format":_review_schema({str(item["source_step_id"]) for item in context["proposals"]}),
        "stream":False,"keep_alive":"5m",
        "options":{"temperature":0,"num_ctx":min(context_window(),8192),
                   "num_predict":MAX_REVIEW_OUTPUT_TOKENS},
    },ensure_ascii=False,separators=(",", ":")).encode("utf-8")

def _parse_review_result(result: dict, valid_ids: set[str]) -> tuple[str, list[dict]]:
    """Categorize local reviewer contract failures without echoing model content."""
    if not isinstance(result, dict):
        raise ValueError("[IA_REVIEW_SHAPE] Ollama devolvió una estructura de respuesta inválida.")
    if result.get("done_reason") == "length":
        raise ValueError("[IA_REVIEW_LENGTH] Ollama agotó el límite de salida al revisar "
                         "la coherencia. Se conservan las actividades ya generadas.")
    if result.get("done") is not True:
        raise ValueError("[IA_REVIEW_INCOMPLETE] La revisión terminó sin confirmar "
                         "una respuesta completa.")
    message = result.get("message")
    if not isinstance(message, dict) or not isinstance(message.get("content"), str):
        raise ValueError("[IA_REVIEW_SHAPE] No se ha recibido el contenido esperado.")
    content = message["content"]
    if not content.strip():
        raise ValueError("[IA_REVIEW_EMPTY] La revisión no generó contenido.")
    try:
        raw = json.loads(content)
    except (json.JSONDecodeError, TypeError) as exc:
        raise ValueError("[IA_REVIEW_JSON] Ollama devolvió JSON inválido o incompleto.") from exc
    if (not isinstance(raw, dict) or set(raw) != {"summary", "issues"}
            or not isinstance(raw["summary"], str)
            or not isinstance(raw["issues"], list)):
        raise ValueError("[IA_REVIEW_SHAPE] La revisión no cumple el esquema de resumen y observaciones.")
    if len(raw["summary"]) > MAX_REVIEW_SUMMARY_CHARS:
        raise ValueError("[IA_REVIEW_SHAPE] El resumen excede el límite de extensión.")
    if len(raw["issues"]) > MAX_REVIEW_ISSUES_PER_BATCH:
        raise ValueError("[IA_REVIEW_COUNT] La revisión excede el límite de observaciones.")
    issues = []
    for issue in raw["issues"]:
        if (not isinstance(issue, dict) or not {"step_id", "issue"} <= set(issue)
                or set(issue) - {"step_id", "issue", "category", "evidence", "action"}
                or not isinstance(issue["step_id"], str)
                or not isinstance(issue["issue"], str) or not issue["issue"].strip()
                or len(issue["issue"]) > MAX_REVIEW_ISSUE_CHARS):
            raise ValueError("[IA_REVIEW_ISSUES] La estructura de una observación es inválida.")
        if issue["step_id"] not in valid_ids | {"GLOBAL"}:
            raise ValueError("[IA_REVIEW_IDS] La revisión citó una actividad que no pertenece "
                             "al lote confirmado.")
        if (issue.get("category", "WARNING") not in ("BLOCKING", "WARNING", "PENDING")
                or any(not isinstance(issue.get(k, ""), str) or len(issue.get(k, "")) > 200
                       for k in ("evidence", "action"))):
            raise ValueError("[IA_REVIEW_ISSUES] Clasificación de observación inválida.")
        issues.append(issue)
    return raw["summary"], issues


# REVIEW safeguard: detects only clear new actions mislabeled as 'Se mantiene'.
# This is a conservative, explainable textual signal, NOT semantic proof or a
# replacement for consultant review. It does not alter a transformation.
_CHANGE_OPENERS = (
    "establecer ", "implantar ", "implementar ", "introducir ", "incorporar ",
    "crear ", "automatizar ", "integrar ", "sustituir ", "reemplazar ",
    "centralizar ", "rediseñar ", "modificar ", "eliminar ", "habilitar ",
    "configurar ", "desplegar ",
)


def _clear_transformation_conflicts(items: list) -> list[str]:
    """Only high-confidence mismatch candidates; no change enforced by friction alone."""
    flagged = []
    for item in items:
        if item.transformation != "Se mantiene":
            continue
        rationale = item.rationale.strip()
        # "Acción propuesta" is a required narrative section in the existing contract.
        action = rationale.split("Resultado esperado:", 1)[0]
        action = action.split("Acción propuesta:", 1)[-1].strip().casefold()
        if any(action.startswith(opener) for opener in _CHANGE_OPENERS):
            flagged.append(item.source_step_id)
    return flagged


# [AUNEA-BE-PG11-STRUCTURED-CANDIDATE-303] START
# Source-linked quality gate: narrative actions must agree with structured fields.
# This never fills fields, invents evidence or approves a future system.
import re

_AUTOMATION_VERBS = re.compile(
    r"^(?:crear|establecer|implantar|implementar|introducir|incorporar|configurar|desplegar|automatizar)\b",
    re.I,
)
_AUTOMATION_DESIGN = re.compile(r"automatiz|autom[aá]tic", re.I)
_EMPTY_CANDIDATES = frozenset(("", "no", "n/a", "ninguno", "sin definir", "pendiente", "—"))

def _missing_structured_actions(items: list) -> list[str]:
    """Only explicit implementation of automation, never mere mention or viability check."""
    missing = []
    for item in items:
        rationale = item.rationale
        action = re.split(r"resultado esperado\s*:", rationale, 1, flags=re.I)[0]
        action = re.split(r"acci[oó]n propuesta\s*:", action, 1, flags=re.I)[-1].strip()
        if (item.automation_ai.strip().casefold() in _EMPTY_CANDIDATES
                and _AUTOMATION_VERBS.search(action)
                and _AUTOMATION_DESIGN.search(action)
                and not re.search(r"\b(?:sin|no|evitar)\s+automatiz", action, re.I)):
            missing.append(item.source_step_id)
    return missing
# [AUNEA-BE-PG11-STRUCTURED-CANDIDATE-303] END

# [AUNEA-BE-PG11-CROSS-FIELD-307] START — deterministic completeness
# Only transformations with explicit requirements are blocked. A blank field
# on an otherwise valid proposal stays undecided, not silently approved.
def _transformation_field_gaps(items: list) -> list[dict]:
    expected = {
        "Se automatiza": ("automation_ai", "human_supervision"),
        "Se asiste con IA": ("automation_ai", "human_supervision"),
        "Se incorpora control": ("controls_risk",),
        "Requiere decisión humana": ("human_supervision",),
    }
    label = {"automation_ai": "Automatización e IA",
             "human_supervision": "Supervisión humana",
             "controls_risk": "Control y riesgo"}
    issues = []
    for item in items:
        candidates = pilot_field_presence(item)
        for field in expected.get(item.transformation, ()):
            if not candidates[field]:
                issues.append({
                    "step_id": item.source_step_id,
                    "issue": f"«{item.transformation}» exige describir «{label[field]}» en la propuesta estructurada.",
                    "evidence": f"transformation / {field}",
                    "action": "Completar el campo con evidencia; si no es viable, revisar la transformación.",
                    "category": "BLOCKING",
                    "origin": "CONTRATO_CAMPOS_IA",
                })
    return issues
# [AUNEA-BE-PG11-CROSS-FIELD-307] END

def consolidate(request: PilotAIConsolidationRequest, *, repair: bool = True) -> dict:
    """Cross-step quality review, always subordinate to canonical validations."""
    validate_pilot_result(request.request,model_name(),request.items)
    context=_context(request)
    batches=_batches(context)
    issues=_transformation_field_gaps(request.items)
    conflicts=_clear_transformation_conflicts(request.items)
    missing_structured = _missing_structured_actions(request.items)
    for sid in missing_structured:
        issues.append({"step_id": sid,
                       "issue": "Falta estructurar la automatización descrita en la acción propuesta.",
                       "evidence": "rationale / automation_ai",
                       "action": "Completar automation_ai de forma coherente con la acción y las limitaciones, sin inventar capacidades."})
    for sid in conflicts:
        issues.append({"step_id":sid,
            "issue":"Clasificada «Se mantiene», pero propone implantar una medida nueva. "
                    "Revisar la transformación antes de aplicar."})
    for item in request.items:
        if not item.problem_resolved.strip():
            issues.append({"step_id":item.source_step_id,
                           "issue":"Falta concretar el problema u oportunidad de mejora."})
        rationale=item.rationale.casefold()
        if "acción propuesta:" not in rationale and "accion propuesta:" not in rationale:
            issues.append({"step_id":item.source_step_id,
                           "issue":"No se identifica una accion operativa concreta."})
        if "resultado esperado:" not in rationale:
            issues.append({"step_id":item.source_step_id,
                           "issue":"No se explica el resultado operativo esperado."})
    if (all(item.transformation=="Se mantiene" for item in request.items)
            and any(f["step_ids"] for f in context["frictions"])):
        issues.append({"step_id":"GLOBAL","issue":
            "Todas las actividades se mantienen pese a fricciones vinculadas. "
            "Verificar si existen oportunidades de simplificacion o control; "
            "no se obliga a transformar sin fundamento."})
    summaries=[]
    audit=[]
    for batch in batches:
        body=_request_bytes(batch)
        if len(body)>MAX_REVIEW_BYTES:
            raise ValueError("El contexto de consolidacion excede su limite seguro.")
        req=Request(LOCAL_URL+"/api/chat",data=body,method="POST",
                    headers={"Content-Type":"application/json"})
        try:
            with _LOCAL_HTTP.open(req,timeout=min(request_timeout_seconds(),480)) as response:
                result=json.loads(response.read(80000).decode("utf-8"))
        except HTTPError as exc:
            raise OllamaUnavailable("Ollama rechazo la consolidacion (HTTP "+
                                    str(exc.code)+"). Las propuestas previas se conservan.") from exc
        except (socket.timeout,TimeoutError) as exc:
            raise OllamaUnavailable("Se agoto el tiempo de consolidacion; "+
                                    "las propuestas previas se conservan.") from exc
        except URLError as exc:
            raise OllamaUnavailable("Se perdio la conexion local durante la consolidacion.") from exc
        except (OSError,TypeError,ValueError,UnicodeError) as exc:
            raise OllamaUnavailable("La consolidacion local no devolvio una respuesta valida.") from exc
        actual_tokens=result.get("prompt_eval_count") if isinstance(result,dict) else None
        if isinstance(actual_tokens,int) and actual_tokens>MAX_REVIEW_INPUT_TOKENS:
            raise ValueError("[IA_REVIEW_TOKENS] La revisión superó el presupuesto "
                             "medido de 4.000 tokens de entrada.")
        batch_ids={str(item["source_step_id"]) for item in batch["proposals"]}
        summary, confirmed_issues=_parse_review_result(result,batch_ids)
        from .internal_ai_ollama import redact_audit
        audit.append(redact_audit({"request": json.loads(body), "request_bytes": len(body),
                                  "prompt_eval_count": actual_tokens,
                                  "original_response": {"summary": summary, "issues": confirmed_issues}}))
        summaries.append(summary)
        issues.extend(confirmed_issues)
    if len(batches)>1:
        issues.append({"step_id":"GLOBAL","issue":
                       "Revisión fragmentada: comprobar manualmente dependencias entre lotes."})
    # Technical defect classification is separate from semantic review, never business data.
    classified = []
    seen = set()
    for issue in issues:
        key = (issue["step_id"], issue["issue"].strip().casefold())
        if key in seen:
            continue
        seen.add(key)
        sid = issue["step_id"]
        conflict = sid in conflicts and "Clasificada" in issue["issue"]
        missing = issue.get("origin")=="CONTRATO_CAMPOS_IA" or issue["issue"].startswith(
            ("Falta concretar", "Falta estructurar",
             "No se identifica una accion", "No se explica el resultado"))
        classified.append({**issue,
            "category": "BLOCKING" if conflict or missing else issue.get("category", "WARNING"),
            "origin": "CONTROL_TEXTUAL" if conflict else "REVISION_SEMANTICA_O_COMPLETITUD",
            "evidence": issue.get("evidence") or (next((i.rationale for i in request.items if i.source_step_id == sid), "Revisión transversal del lote")),
            "action": issue.get("action") or ("Corregir transformación o intervención y volver a validar." if conflict else
                      "Contrastar la observación con las fuentes y resolverla en la revisión humana.")})
    for item in request.items:
        if item.limitations.strip():
            classified.append({"step_id": item.source_step_id, "issue": item.limitations,
                               "category": "PENDING", "origin": "PROPUESTA_IA",
                               "evidence": ", ".join(item.source_refs),
                               "action": "Confirmar esta condición con el consultor o cliente."})
    response = {
        "status":"CHECKED_WITH_NOTES" if classified else "CHECKED",
        "summary":" ".join(s for s in summaries if s.strip()),
        "issues":classified,
        "batches_checked":len(batches),
        "requires_human_review":True,
        "protocol_revision":PG11_REVIEW_PROTOCOL,
        "blocking_step_ids":sorted(set(conflicts) | {i["step_id"] for i in classified if i["category"] == "BLOCKING"}),
        "audit": audit,
    }
    if not repair:
        return response
    # Only explicitly affected activities; GLOBAL notes cannot trigger blind regeneration.
    affected = {i["step_id"] for i in classified if i["category"] == "BLOCKING"}
    affected -= set(request.correction_attempted_ids) | {"GLOBAL"}
    if not affected:
        return response
    from .internal_ai_provider import _schema, _INSTRUCTIONS
    from .internal_ai_ollama import audited_step
    from .internal_ai import validate_pilot_source
    steps = validate_pilot_source(request.request)
    corrected = []
    traces = {}
    failed = []
    for item in request.items:
        sid = item.source_step_id
        if sid not in affected:
            corrected.append(item)
            continue
        defects = [i["issue"] for i in classified if i["step_id"] == sid and i["category"] == "BLOCKING"]
        candidate, trace, error = audited_step(request.request, steps, _schema(), _INSTRUCTIONS, sid,
            correction={"defects": defects, "previous_proposal": item.model_dump(mode="json"),
                        "instruction": "Corrige sólo estos defectos; conserva las fuentes y la función de la actividad."})
        traces[sid] = trace
        corrected.append(candidate or item)
        if error:
            failed.append({"step_id": sid, "issue": error, "category": "BLOCKING",
                           "origin": "VALIDACION", "evidence": "Intento de corrección rechazado",
                           "action": "Corregir manualmente; no habrá otro reintento automático."})
    # One verification pass after corrections. Never recursively repair or approve.
    followup = request.model_copy(update={"items": corrected})
    try:
        checked = consolidate(followup, repair=False)
    except (ValueError, OllamaUnavailable):
        checked = {**response, "summary": "Corrección recibida; revisión posterior no disponible.",
                   "blocking_step_ids": sorted(affected)}
        checked["issues"] = [*classified, {"step_id": "GLOBAL", "issue": checked["summary"],
                            "category": "BLOCKING", "origin": "VALIDACION",
                            "evidence": "Fallo de revisión posterior", "action": "Revisión humana necesaria."}]
    checked["issues"].extend(failed)
    checked["blocking_step_ids"] = sorted(set(checked["blocking_step_ids"]) | {i["step_id"] for i in failed})
    checked["status"] = "CHECKED_WITH_NOTES" if checked["issues"] else "CHECKED"
    checked["initial_review"] = response
    checked["corrected_items"] = [i.model_dump(mode="json") for i in corrected]
    checked["correction_traces"] = traces
    return checked
# [AUNEA-BE-INTERNAL-AI-REVIEW-198] END
