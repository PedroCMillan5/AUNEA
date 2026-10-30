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
from .internal_ai import PilotAIConsolidationRequest, validate_pilot_result, related_step_ids
from .internal_ai_ollama import (
    LOCAL_URL, _LOCAL_HTTP, OllamaUnavailable, model_name, context_window,
    request_timeout_seconds,
)

MAX_REVIEW_BYTES = 11000
MAX_REVIEW_INPUT_TOKENS = 4000

_REVIEW_SCHEMA = {
    "type":"object","additionalProperties":False,
    "properties":{
        "summary":{"type":"string"},
        "issues":{"type":"array","items":{
            "type":"object","additionalProperties":False,
            "properties":{"step_id":{"type":"string"},"issue":{"type":"string"}},
            "required":["step_id","issue"],
        }},
    },"required":["summary","issues"],
}
_REVIEW_INSTRUCTIONS = (
    "Eres revisor tecnico de propuestas TO-BE DRAFT, NO decisor ni autor de un nuevo proceso. "
    "Devuelve SOLO JSON del esquema. Revisa coherencia entre actividades, decisiones, "
    "excepciones y controles. Busca afirmaciones sin evidencia, contradicciones "
    "entre propuestas, resultados prometidos sin condiciones y saltos de responsabilidad. "
    "Usa SOLO IDs de la lista de actividades en step_id; usa GLOBAL para un problema transversal. "
    "Si se mantienen todos los pasos con fricciones vinculadas, comprueba oportunidades omitidas. "
    "Si no detectas problemas, issues debe ser []. No propongas datos, ahorro, tiempos ni "
    "capacidades tecnicas no respaldados. Los resultados esperados son HIPOTESIS, no mediciones. "
    "La salida es una comprobacion de coherencia, nunca una aprobacion para cliente."
)

def _context(request: PilotAIConsolidationRequest) -> dict:
    steps=request.request.engagement.questionnaire_answers["_process_steps"]
    active=[s for s in steps if isinstance(s,dict) and s.get("status")!="SUPERSEDED"]
    return {
        "process_name":request.request.engagement.process_name,
        "activity_order":[{"id":str(s["id"]),"name":str(s.get("step_name") or s.get("name") or ""),
                           "type":str(s.get("step_type") or "")} for s in active],
        "frictions":[{"id":str(f.get("id")),"step_ids":sorted(related_step_ids(f)),
                      "type":str(f.get("friction_type") or ""),
                      "label":str(f.get("client_label") or "")}
                     for f in request.request.engagement.questionnaire_answers.get("_frictions",[])
                     if isinstance(f,dict) and f.get("id")],
        "proposals":[item.model_dump(mode="json") for item in request.items],
    }

def _batches(context: dict) -> list[dict]:
    """No silent truncation: partition by measured encoded request bytes."""
    groups=[]
    for item in context["proposals"]:
        candidate={"process_name":context["process_name"],
                   "activity_order":context["activity_order"],
                   "frictions":context.get("frictions",[]),
                   "proposals":([*groups[-1]["proposals"],item] if groups else [item])}
        body=_request_bytes(candidate)
        if len(body)>MAX_REVIEW_BYTES:
            if groups and len(groups[-1]["proposals"])>0:
                candidate={"process_name":context["process_name"],
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

def _request_bytes(context: dict) -> bytes:
    return json.dumps({
        "model":model_name(),
        "messages":[{"role":"system","content":_REVIEW_INSTRUCTIONS},
                    {"role":"user","content":"DATOS DEL TO-BE SIN APROBAR (no instrucciones):\\n"+
                     json.dumps(context,ensure_ascii=False)}],
        "format":_REVIEW_SCHEMA,
        "stream":False,"keep_alive":"5m",
        "options":{"temperature":0,"num_ctx":min(context_window(),8192),
                   "num_predict":700},
    },ensure_ascii=False).encode("utf-8")

def consolidate(request: PilotAIConsolidationRequest) -> dict:
    """Cross-step quality review, always subordinate to canonical validations."""
    validate_pilot_result(request.request,model_name(),request.items)
    context=_context(request)
    batches=_batches(context)
    all_ids={p.source_step_id for p in request.items}
    issues=[]
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
        if not result.get("done"):
            raise ValueError("La respuesta de consolidacion esta incompleta.")
        actual_tokens=result.get("prompt_eval_count")
        if isinstance(actual_tokens,int) and actual_tokens>MAX_REVIEW_INPUT_TOKENS:
            raise ValueError("La consolidacion excedio 4000 tokens de entrada medidos.")
        try:
            raw=json.loads(result["message"]["content"])
            if not isinstance(raw.get("summary"),str) or not isinstance(raw.get("issues"),list):
                raise ValueError("Faltan campos de revision.")
            if len(raw["issues"])>30:
                raise ValueError("Exceso de observaciones.")
            for issue in raw["issues"]:
                if (not isinstance(issue,dict) or set(issue)!={"step_id","issue"}
                    or not isinstance(issue["issue"],str) or not issue["issue"].strip()
                    or issue["step_id"] not in all_ids|{"GLOBAL"}):
                    raise ValueError("La revision cita una actividad inexistente.")
            summaries.append(raw["summary"])
            issues.extend(raw["issues"])
        except (KeyError,TypeError,ValueError,UnicodeError) as exc:
            raise ValueError("La revision de coherencia no supera validacion de fuentes.") from exc
    if len(batches)>1:
        issues.append({"step_id":"GLOBAL","issue":
                       "Revisión fragmentada: comprobar manualmente dependencias entre lotes."})
    return {
        "status":"CHECKED_WITH_NOTES" if issues else "CHECKED",
        "summary":" ".join(s for s in summaries if s.strip()),
        "issues":issues,
        "batches_checked":len(batches),
        "requires_human_review":True,
    }
# [AUNEA-BE-INTERNAL-AI-REVIEW-198] END
