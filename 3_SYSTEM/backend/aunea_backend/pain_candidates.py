from __future__ import annotations
from collections import defaultdict
from typing import Any

from .models import EngagementInput, PainCandidate, PainCandidateResult

# [AUNEA-BE-PAIN-CANDIDATE-016] START — Pain discovery as DERIVE_CANDIDATE
# PURPOSE: Detectar señales estructuradas del mapa que justifican REVISAR una fricción canónica.
# SOURCE: Diagnostic Master v1.2 RULE_PAIN_ENGINE + DIAG_PAIN_QUESTION;
#         Simulator v1.14 template rule: DERIVE_CANDIDATE allowed, AUTO_CONFIRM forbidden;
#         DEC-034 server-owned derived logic; DEC-050 single owner.
# INPUTS: current EngagementInput process-step/friction/economic trace.
# OUTPUTS: PainCandidateResult only. No RT_FRICTION/RT_PAIN mutation.
# SIDE_EFFECTS: none.
# CHANGE_RISK: CRITICAL.

QUESTIONS = {
    "P01":[
        "¿Por qué canales entra este tipo de solicitud?",
        "¿Hay que copiar/consolidar información antes de empezar?",
        "¿Se recibe la misma solicitud duplicada o con formatos distintos?",
    ],
    "P03":[
        "¿Qué datos se vuelven a introducir en otro sistema?",
        "¿Cuántas veces por caso?",
        "¿Cuánto tarda cada reentrada y existe integración?",
    ],
    "P05":[
        "¿Cómo se decide a qué persona/cola va cada caso?",
        "¿Qué reglas se aplican?",
        "¿Cuánto tiempo activo tarda clasificarlo y cuánto espera antes de asignarse?",
    ],
    "P06":[
        "¿Qué fechas/SLA son obligatorios?",
        "¿Cómo se controla el vencimiento?",
        "¿Cuántos incumplimientos hay y qué esfuerzo/coste generan?",
    ],
    "P07":[
        "¿Qué aprobaciones existen y cuándo se disparan?",
        "¿Quién aprueba y con qué evidencia?",
        "¿Cuánto tiempo activo se dedica a preparar/perseguir/registrar cada aprobación?",
    ],
    "P08":[
        "¿Dónde está la versión oficial?",
        "¿Cómo se sabe cuál es la última?",
        "¿Cuánto se tarda en localizar/reconciliar documentos y cuántos errores nacen de versiones incorrectas?",
    ],
    "P09":[
        "¿Cómo sabe hoy el responsable qué está abierto, atrasado o bloqueado?",
        "¿Qué información se recopila manualmente para tener visibilidad?",
        "¿Cuánto tarda cada ciclo de status/reporting operativo?",
    ],
    "P10":[
        "¿Qué casos no siguen el camino normal?",
        "¿Cómo se registran, asignan y resuelven?",
        "¿Se repiten excepciones similares y cuánto esfuerzo exige cada una?",
    ],
    "P11":[
        "¿Qué errores obligan a repetir/corregir trabajo?",
        "¿Cuántos ocurren por periodo?",
        "¿Cuánto tiempo y coste directo exige cada defecto?",
    ],
    "P12":[
        "¿Qué acciones futuras dependen de que alguien se acuerde?",
        "¿Cómo se recuerda hoy?",
        "¿Cuántos seguimientos se hacen y cuánto tiempo requieren?",
    ],
    "P13":[
        "¿Qué campos generan más correcciones?",
        "¿Qué reglas de formato/definición deberían cumplirse?",
        "¿Cuántos registros se corrigen y cuánto tarda la validación/corrección?",
    ],
    "P14":[
        "¿Qué reportes se reconstruyen periódicamente?",
        "¿Qué pasos son extracción/limpieza/consolidación repetitiva?",
        "¿Cuántas horas exige cada ciclo antes del análisis real?",
    ],
    "P15":[
        "¿Qué herramientas intervienen de principio a fin?",
        "¿Cómo pasa la información/estado entre ellas?",
        "¿Qué reconciliación o coste duplicado genera la fragmentación?",
    ],
    "P19":[
        "¿Qué dinero se pierde directamente por fallos del proceso?",
        "¿Cómo se demuestra el evento y su importe?",
        "¿Está ese coste ya incluido en otra métrica o factura?",
    ],
}

def _steps(e: EngagementInput) -> list[dict[str, Any]]:
    rows=e.questionnaire_answers.get("_process_steps") or []
    return [x for x in rows if isinstance(x,dict) and x.get("status")!="SUPERSEDED"]

def _frictions(e: EngagementInput) -> list[dict[str, Any]]:
    rows=e.questionnaire_answers.get("_frictions") or []
    return [x for x in rows if isinstance(x,dict) and x.get("status")!="SUPERSEDED"]

def _actions(step: dict[str, Any]) -> set[str]:
    raw=step.get("manual_actions") or []
    return {str(x) for x in raw if x}

def _positive_error(step: dict[str, Any]) -> bool:
    raw=step.get("error_rate")
    if isinstance(raw,dict):
        try:
            return float(raw.get("value") or 0)>0
        except (TypeError,ValueError):
            return False
    try:
        return float(raw or 0)>0
    except (TypeError,ValueError):
        return False

def _positive(value: Any) -> bool:
    if isinstance(value,dict):
        value=value.get("value")
    try:
        return float(value or 0)>0
    except (TypeError,ValueError):
        return False

def _present(value: Any) -> bool:
    if value is None or value=="":
        return False
    if isinstance(value,(list,tuple,set,dict)):
        return len(value)>0
    return True

def _step_label(step: dict[str, Any]) -> str:
    return str(step.get("step_name") or step.get("id") or "paso")

def _candidate(pain_id: str, steps: list[dict[str, Any]], codes: list[str], rationale: str) -> PainCandidate:
    return PainCandidate(
        pain_id=pain_id,
        step_ids=[str(x.get("id")) for x in steps if x.get("id")],
        signal_codes=codes,
        rationale=rationale,
        review_questions=QUESTIONS.get(pain_id,[]),
    )

class PainCandidateEngine:
    """
    Conservative discovery engine.

    It does NOT implement Pain state detection. It only exposes structured observations that are
    compatible with a canonical RULE_PAIN_ENGINE mechanism and therefore deserve consultant review.
    Absence of a candidate never means NOT_DETECTED.
    """
    def run(self, e: EngagementInput) -> PainCandidateResult:
        steps=_steps(e)
        frictions=_frictions(e)
        existing={str(f.get("derived_pain_id") or f.get("friction_type") or "") for f in frictions}
        out: list[PainCandidate]=[]

        def add(pain_id: str, matched: list[dict[str,Any]], codes: list[str], rationale: str):
            if pain_id in existing or not matched:
                return
            ids=tuple(sorted(str(x.get("id")) for x in matched if x.get("id")))
            if not ids:
                return
            if any(c.pain_id==pain_id and tuple(sorted(c.step_ids))==ids for c in out):
                return
            out.append(_candidate(pain_id,matched,codes,rationale))

        # P01 DIRECT needs >1 uncontrolled channel/format + manual consolidation/reconciliation.
        channel_steps=[s for s in steps if len(s.get("communication_channels") or [])>1 and _actions(s).intersection({"COPY","REKEY","COMPARE"})]
        add("P01",channel_steps,["MULTI_CHANNEL","MANUAL_CONSOLIDATION"],
            "Hay pasos con varios canales y consolidación/reconciliación manual. Revisa si la entrada está fragmentada.")

        # P03 DIRECT: same/equivalent data manually entered in >=2 locations.
        # REKEY is the strongest structured signal; COPY is only raised when the process spans >1 tool.
        tools={str(s.get("tool")) for s in steps if _present(s.get("tool"))}
        reentry=[s for s in steps if "REKEY" in _actions(s) or ("COPY" in _actions(s) and len(tools)>1)]
        add("P03",reentry,["REKEY_OR_CROSS_TOOL_COPY"],
            "El mapa contiene reintroducción/copia manual entre registros o herramientas. Confirma si se repiten los mismos datos.")

        # P05 DIRECT: recurring manual routing + effort/delay. A decision plus manual check/compare and wait is a review signal.
        routing=[s for s in steps if str(s.get("step_type") or "")=="ST04" and _actions(s).intersection({"CHECK","COMPARE"}) and _positive(s.get("wait_time"))]
        add("P05",routing,["MANUAL_DECISION","ROUTING_WAIT"],
            "Hay una decisión manual con comprobación/comparación y espera. Revisa si corresponde a clasificación o routing lento.")

        # P06 DIRECT: SLA/deadline exists + manual surveillance/breach signal.
        sla_present=any(_present(e.questionnaire_answers.get(fid)) for fid in ("DF025","DF026","DF027"))
        deadline=[s for s in steps if sla_present and ("CHASE" in _actions(s) or _positive(s.get("wait_time")))]
        add("P06",deadline,["SLA_PRESENT","MANUAL_SURVEILLANCE_OR_DELAY"],
            "Existe contexto de SLA/plazo y el mapa muestra seguimiento manual o demora. Revisa si hay incumplimiento o vigilancia manual relevante.")

        # P07 DIRECT: approval required + recurring admin/chasing or avoidable delay.
        approval=[s for s in steps if str(s.get("step_type") or "")=="ST05" and ("CHASE" in _actions(s) or _positive(s.get("wait_time")))]
        add("P07",approval,["APPROVAL_STEP","CHASE_OR_WAIT"],
            "Hay una aprobación con seguimiento manual o espera. Revisa si existe un cuello de botella de aprobación.")

        # P08 DIRECT: users cannot reliably retrieve authoritative artifact without search/reconciliation.
        docs=[s for s in steps if _actions(s).intersection({"SEARCH","COMPARE"}) and (_present(s.get("inputs")) or _present(s.get("outputs")))]
        add("P08",docs,["SEARCH_OR_RECONCILE_ARTIFACT"],
            "El mapa contiene búsqueda o reconciliación manual de información/artefactos. Revisa si hay problemas de versión o documento oficial.")

        # P09 DIRECT: recurring manual status collection. UPDATE_STATUS plus REPORT/SEARCH is a structured review signal.
        visibility=[s for s in steps if "UPDATE_STATUS" in _actions(s) and _actions(s).intersection({"REPORT","SEARCH","CHECK"})]
        add("P09",visibility,["MANUAL_STATUS_COLLECTION"],
            "Hay actualización de estado junto con reporting/búsqueda/comprobación manual. Revisa si falta visibilidad operativa mantenida.")

        # P10 DIRECT: recurring exceptions + ad-hoc handling. Exception paths with manual coordination are review signals only.
        exceptions=[s for s in steps if _present(s.get("exception_path")) and _actions(s).intersection({"CHASE","CHECK","COMPARE","SEARCH"})]
        add("P10",exceptions,["EXCEPTION_PATH","MANUAL_COORDINATION"],
            "Hay rutas de excepción con coordinación/comprobación manual. Revisa si las excepciones se gestionan de forma ad hoc.")

        # P11 DIRECT: output error causes correction/repetition. Positive rework/error rate is direct structured evidence to review.
        rework=[s for s in steps if _positive(s.get("rework_time")) or _positive_error(s)]
        add("P11",rework,["REWORK_OR_ERROR_RATE"],
            "El mapa registra retrabajo o errores. Confirma qué defecto obliga a corregir o repetir trabajo.")

        # P12 DIRECT: future action depends on memory/manual checking. CHASE outside SLA/approval is a candidate.
        memory=[s for s in steps if "CHASE" in _actions(s) and str(s.get("step_type") or "")!="ST05" and not sla_present]
        add("P12",memory,["MANUAL_CHASE_WITHOUT_SLA"],
            "Hay seguimiento manual sin una aprobación/SLA que lo explique. Revisa si depende de que una persona recuerde actuar.")

        # P13 DIRECT: recurring validation/correction for violated data requirements.
        data_quality=[s for s in steps if _positive_error(s) and _actions(s).intersection({"FORMAT","CHECK","COMPARE"})]
        add("P13",data_quality,["ERROR_RATE","MANUAL_DATA_VALIDATION"],
            "Hay errores junto con validación/limpieza/comparación manual. Revisa si existe inconsistencia de datos recurrente.")

        # P14 DIRECT: recurring extraction/cleanup/consolidation. REPORT is the canonical structured manual-action signal.
        reporting=[s for s in steps if "REPORT" in _actions(s)]
        add("P14",reporting,["MANUAL_REPORTING"],
            "El mapa incluye consolidación/reporting manual. Revisa si el mismo trabajo preparatorio se repite en cada ciclo.")

        # P15 DIRECT: >=2 tools + manual/unreliable transfer/reconciliation.
        fragmentation=[s for s in steps if _actions(s).intersection({"COPY","REKEY","DOWNLOAD","UPLOAD","COMPARE"})]
        if len(tools)>=2:
            add("P15",fragmentation,["MULTI_TOOL","MANUAL_TRANSFER_OR_RECONCILIATION"],
                "El proceso usa varias herramientas y contiene transferencia/reconciliación manual. Revisa si existe fragmentación de herramientas.")

        # P19 DIRECT: attributable monetary leakage event. EconomicInput can expose a review candidate only when linked to steps.
        loss_steps=defaultdict(list)
        step_by_id={str(s.get("id")):s for s in steps if s.get("id")}
        for x in e.economics:
            if (x.direct_loss_eur_annual or 0)>0:
                for sid in x.step_ids:
                    if str(sid) in step_by_id:
                        loss_steps[str(sid)].append(x)
        loss_matched=[step_by_id[sid] for sid in loss_steps]
        add("P19",loss_matched,["EVIDENCED_DIRECT_LOSS_INPUT"],
            "Existe una pérdida monetaria directa registrada y vinculada a estos pasos. Revisa si representa fuga de coste no atribuida ya a otro Pain.")

        out.sort(key=lambda x:(x.pain_id,x.step_ids))
        return PainCandidateResult(candidates=out,evaluated_step_ids=[str(s.get("id")) for s in steps if s.get("id")])

# [AUNEA-BE-PAIN-CANDIDATE-016] END
