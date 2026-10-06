from __future__ import annotations
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from .models import EngagementInput, InputCoverageItem, InputCoverageResult

# [AUNEA-BE-INPUT-COVERAGE-015] START — Cobertura diagnóstica e integridad relacional
# PURPOSE: Evaluar server-side la cobertura de MAP_QUESTION_ENGINE_INPUT y rechazar relaciones
#          Step/Friction/Risk/EconomicInput incoherentes antes de ejecutar motores derivados.
# SOURCE: Diagnostic Master v1.2 MAP_QUESTION_ENGINE_INPUT; DEC-034/050/065/068;
#         PROJECT_RULES data→rules→UI and "no critical engine input without source".
# INPUTS: EngagementInput normalizado por el adapter oficial.
# OUTPUTS: InputCoverageResult + lista de errores de integridad relacional.
# SIDE_EFFECTS: none.
# CHANGE_RISK: CRITICAL.

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "data" / "diagnostic_input_contract_v12.json"

@lru_cache(maxsize=1)
def input_contract() -> list[dict[str, Any]]:
    raw=json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
    rows=raw.get("rows",[])
    if len(rows)!=55:
        raise RuntimeError("Diagnostic input contract runtime mirror is incomplete")
    return rows

def _present(v: Any) -> bool:
    if v is None or v == "":
        return False
    if isinstance(v,(list,tuple,set,dict)):
        return len(v)>0 and any(_present(x) for x in (v.values() if isinstance(v,dict) else v))
    return True

def _num(v: Any) -> float:
    if isinstance(v,dict):
        v=v.get("value")
    try:
        return float(v)
    except (TypeError,ValueError):
        return 0.0

def _steps(e: EngagementInput) -> list[dict[str, Any]]:
    rows=e.questionnaire_answers.get("_process_steps") or []
    return [x for x in rows if isinstance(x,dict) and x.get("status")!="SUPERSEDED"]

def _frictions(e: EngagementInput) -> list[dict[str, Any]]:
    rows=e.questionnaire_answers.get("_frictions") or []
    return [x for x in rows if isinstance(x,dict) and x.get("status")!="SUPERSEDED"]

STEP_FIELD = {
    "DF031":"step_name","DF032":"step_type","DF033":"actor","DF034":"tool","DF035":"inputs",
    "DF036":"outputs","DF037":"active_time","DF038":"wait_time","DF039":"rework_time",
    "DF040":"error_rate","DF041":"decision_criteria","DF042":"normal_next_step",
    "DF043":"exception_path","DF044":"manual_actions","DF045":"automation_state",
}
FRICTION_FIELD = {
    "DF056":"friction_type","DF057":"derived_pain_id","DF058":"cause","DF059":"affected_steps",
    "DF060":"frequency","DF061":"severity","DF062":"active_time_loss","DF063":"direct_loss",
    "DF064":"non_time_impact","DF065":"workaround",
}

def _source_present(fid: str, e: EngagementInput) -> bool:
    a=e.questionnaire_answers
    if fid in a and _present(a.get(fid)):
        return True
    steps=_steps(e); frictions=_frictions(e)
    if fid in STEP_FIELD:
        key=STEP_FIELD[fid]
        return bool(steps) and any(_present(s.get(key)) for s in steps)
    if fid=="DF046":
        return any(_present(s.get("tool")) for s in steps)
    if fid=="DF047":
        return any(_present(s.get("inputs")) or _present(s.get("outputs")) for s in steps)
    if fid=="DF049":
        return any(_present(s.get("inputs")) or _present(s.get("outputs")) for s in steps)
    if fid=="DF050":
        return any(_present(s.get("communication_channels")) for s in steps)
    if fid=="DF051":
        return any("REKEY" in (s.get("manual_actions") or []) or "COPY" in (s.get("manual_actions") or []) for s in steps)
    if fid=="DF053":
        return any("SEARCH" in (s.get("manual_actions") or []) for s in steps)
    if fid=="DF054":
        tools=[s.get("tool") for s in steps if _present(s.get("tool"))]
        return len({str(x) for x in tools})>1
    if fid=="DF055":
        return any(str(f.get("friction_type") or "")=="P13" for f in frictions)
    if fid in FRICTION_FIELD:
        key=FRICTION_FIELD[fid]
        return bool(frictions) and any(_present(f.get(key)) for f in frictions)
    if fid=="DF066":
        return any(_present(s.get("exception_path")) for s in steps)
    if fid=="DF067":
        return any(str(s.get("step_type") or "")=="ST05" or _present(s.get("decision_criteria")) for s in steps)
    if fid=="DF068":
        return bool(e.risks) and any(_present(r.description) for r in e.risks)
    if fid=="DF069":
        return bool(e.risks) and any(_present(r.category) for r in e.risks)
    if fid=="DF070":
        return bool(e.risks) and any(r.likelihood_1_5 is not None for r in e.risks)
    if fid=="DF071":
        return bool(e.risks) and any(r.impact_1_5 is not None for r in e.risks)
    if fid=="DF072":
        return bool(e.risks) and any(r.controls_present is not None for r in e.risks)
    if fid=="DF076":
        return any(x.capacity_cost_rate_eur_hour is not None for x in e.economics)
    if fid=="DF078":
        return any(x.annual_active_hours is not None for x in e.economics)
    if fid=="DF079":
        return any(x.driver_id=="ED05" and x.annual_active_hours is not None for x in e.economics)
    if fid=="DF080":
        return any(x.driver_id=="ED04" and x.annual_active_hours is not None for x in e.economics)
    if fid=="DF081":
        return any(x.driver_id=="ED06" and x.annual_active_hours is not None for x in e.economics)
    if fid=="DF082":
        return any(x.direct_loss_eur_annual is not None for x in e.economics)
    if fid=="DF083":
        return any(x.current_tool_cost_eur_annual is not None for x in e.economics)
    if fid=="DF085":
        return any(_present(x.evidence_type) for x in e.economics)
    if fid=="DF093":
        return str(a.get("DF093") or "").upper()=="YES"
    if fid=="DF094":
        return "_coverage_ack" in a or _present(a.get("DF094"))
    if fid=="DF095":
        return "_coverage_ack" in a or _present(a.get("DF095"))
    return False

def _branch_applicable(branch: str, e: EngagementInput) -> bool | None:
    a=e.questionnaire_answers; steps=_steps(e); frictions=_frictions(e)
    pain_ids={str(f.get("derived_pain_id") or f.get("friction_type") or "") for f in frictions}
    gates=a.get("_engine_gate_trace") or {}
    if branch in {"BR-BASE","BR-STEP","BR-FUTURE","BR-CLOSE"}:
        return True
    if branch=="BR-PAIN": return bool(frictions or e.pain_signals or e.pains)
    if branch=="BR-ECON": return bool(e.economics or any(_num(s.get("active_time")) or _num(s.get("rework_time")) for s in steps))
    if branch=="BR-WAIT": return bool(any(_num(s.get("wait_time"))>0 for s in steps) or any(x.driver_id=="ED13" for x in e.economics) or _present(a.get("DF026")))
    if branch=="BR-FAIL": return bool(any(_num(s.get("rework_time"))>0 or _present(s.get("error_rate")) for s in steps) or pain_ids.intersection({"P02","P11","P13"}) or any(x.driver_id in {"ED05","ED09"} for x in e.economics))
    if branch=="BR-SLA": return any(_present(a.get(x)) for x in ("DF025","DF026","DF027"))
    if branch=="BR-APPROVAL": return bool(any(str(s.get("step_type") or "")=="ST05" for s in steps) or "P07" in pain_ids or _present(a.get("DF067")))
    if branch=="BR-TOOLS": return bool(len({str(s.get("tool")) for s in steps if _present(s.get("tool"))})>1 or "P15" in pain_ids or _present(a.get("DF054")))
    if branch=="BR-DATA": return bool("P13" in pain_ids or _present(a.get("DF055")))
    if branch=="BR-EXCEPTION": return bool(any(_present(s.get("exception_path")) for s in steps) or "P10" in pain_ids or _present(a.get("DF066")))
    if branch=="BR-VISIBILITY": return bool(gates.get("IN-R-11")=="YES" or pain_ids.intersection({"P09","P14","P17"}) or any(_present(a.get(x)) for x in ("DF027","DF053","DF081")))
    if branch=="BR-KNOWLEDGE": return bool("P20" in pain_ids or any(_present(a.get(x)) for x in ("DF019","DF035","DF049","DF053")))
    if branch=="BR-RISK": return bool(e.risks or any(_present(a.get(x)) for x in ("DF018","DF073","DF074","DF075","DF090")))
    if branch=="BR-AI": return bool(e.requires_unstructured_ai_assistance or e.requires_bounded_agent_action or gates.get("IN-R-12")=="YES" or gates.get("IN-R-13")=="YES")
    if branch=="BR-AGENT": return bool(e.requires_bounded_agent_action or gates.get("IN-R-13")=="YES")
    if branch=="BR-CAPACITY": return any(x.capacity_cost_rate_eur_hour is not None for x in e.economics)
    if branch=="BR-DIRECTLOSS": return any((x.direct_loss_eur_annual or 0)>0 for x in e.economics) or _present(a.get("DF082"))
    if branch=="BR-TOOLCOST": return any((x.current_tool_cost_eur_annual or 0)>0 for x in e.economics) or _present(a.get("DF083"))
    if branch=="BR-REVENUE": return _present(a.get("DF084"))
    if branch=="BR-LOGIC": return bool(any(_present(s.get("decision_criteria")) for s in steps) or _present(a.get("DF067")))
    return None

def _blocking(row: dict[str, Any], applicable: bool | None, e: EngagementInput) -> bool:
    if applicable is not True:
        return False
    token=str(row.get("Blocking") or "").upper()
    if token=="YES": return True
    if token=="YES_IF_RISK": return _branch_applicable("BR-RISK",e) is True
    if token=="YES_IF_AI": return _branch_applicable("BR-AI",e) is True
    if token=="YES_IF_I2": return _branch_applicable("BR-AGENT",e) is True
    return False

class InputCoverageEngine:
    def run(self, e: EngagementInput) -> InputCoverageResult:
        # Legacy/backend-only callers may not carry the Session-1 trace. Real AUNEA Internal payloads do.
        if "_process_steps" not in e.questionnaire_answers and "_engine_gate_trace" not in e.questionnaire_answers:
            return InputCoverageResult(status="NOT_EVALUATED",items=[],blocking_gaps=[],warnings=["Payload sin trazas de captura de Sesión 1."])
        items=[]; blockers=[]; warnings=[]
        for row in input_contract():
            applicable=_branch_applicable(str(row.get("Branch_Rule_ID") or ""),e)
            present_sources=[s for s in row.get("Source_Fields",[]) if s.startswith("DF") and _source_present(s,e)]
            # DIAG_PAIN_QUESTION sources are represented by the confirmed friction/pain signal path.
            if any(str(s).startswith("DIAG_PAIN_QUESTION:") for s in row.get("Source_Fields",[])) and (e.pain_signals or e.pains):
                present_sources.append("PAIN_SIGNAL")
            present=bool(present_sources) or (row.get("Input_ID")=="IN-R-01" and bool(e.pain_signals or e.pains))
            blocking=_blocking(row,applicable,e)
            if applicable is False:
                status="NOT_APPLICABLE"
            elif applicable is None and not present:
                status="UNKNOWN_APPLICABILITY"
            elif present:
                status="COVERED"
            else:
                status="GAP"
            item=InputCoverageItem(
                input_id=row["Input_ID"],engine=row["Engine"],input_name=row["Input_Name"],
                criticality=row["Criticality"],branch_rule_id=row["Branch_Rule_ID"],
                applicable=applicable,present=present,blocking=blocking,status=status,
                source_fields=list(row.get("Source_Fields",[])),present_sources=present_sources,
            )
            items.append(item)
            if status=="GAP" and blocking:
                blockers.append(row["Input_ID"])
            elif status in {"GAP","UNKNOWN_APPLICABILITY"} and row.get("Criticality") in {"CRITICAL","MATERIAL"}:
                warnings.append(row["Input_ID"])
        overall="BLOCKED" if blockers else ("PARTIAL" if warnings else "COMPLETE")
        return InputCoverageResult(status=overall,items=items,blocking_gaps=blockers,warnings=warnings)

def relational_integrity_issues(e: EngagementInput) -> list[str]:
    steps=_steps(e); frictions=_frictions(e)
    if not steps:
        return []
    step_ids={str(s.get("id")) for s in steps if s.get("id") is not None}
    issues=[]
    for idx,f in enumerate(frictions,1):
        affected=[str(x) for x in (f.get("affected_steps") or [])]
        if not affected:
            issues.append(f"La fricción {idx} no está vinculada a ningún paso activo.")
        stale=[x for x in affected if x not in step_ids]
        if stale:
            issues.append(f"La fricción {idx} referencia pasos que ya no están activos: {', '.join(stale)}.")
        ta=f.get("time_attribution") or {}
        if _num((f.get("active_time_loss") or {}).get("value"))>0:
            owner=str(ta.get("step_id") or "")
            if ta.get("mode") not in {"INCLUDED","BREAKDOWN","ADDITIONAL"} or owner not in affected:
                issues.append(f"La fricción {idx} tiene tiempo activo sin un paso propietario válido.")
    for idx,r in enumerate(e.risks,1):
        ids=[str(x) for x in r.step_ids]
        if not ids:
            issues.append(f"El riesgo {idx} no está vinculado a ningún paso activo.")
        stale=[x for x in ids if x not in step_ids]
        if stale:
            issues.append(f"El riesgo {idx} referencia pasos que ya no están activos: {', '.join(stale)}.")
    friction_by_step={sid:[] for sid in step_ids}
    for f in frictions:
        for sid in f.get("affected_steps") or []:
            if str(sid) in friction_by_step:
                friction_by_step[str(sid)].append(f)
    step_by_id={str(s.get("id")):s for s in steps if s.get("id") is not None}
    for idx,x in enumerate(e.economics,1):
        ids=[str(v) for v in x.step_ids]
        if not ids:
            issues.append(f"El impacto {idx} no está vinculado a ningún paso activo.")
            continue
        stale=[v for v in ids if v not in step_ids]
        if stale:
            issues.append(f"El impacto {idx} referencia pasos que ya no están activos: {', '.join(stale)}.")
            continue
        linked=[f for sid in ids for f in friction_by_step.get(sid,[])]
        linked_pains={str(f.get("derived_pain_id") or f.get("friction_type") or "") for f in linked}
        if x.pain_id and str(x.pain_id) not in linked_pains:
            issues.append(f"El impacto {idx} está asociado a {x.pain_id}, pero esa fricción/Pain no existe en los pasos seleccionados.")
        if x.driver_id=="ED15":
            issues.append(f"El impacto {idx} usa ED15. El volumen pertenece a Demanda y no debe duplicarse como EconomicInput.")
        if x.driver_id=="ED13":
            if (x.annual_active_hours or 0)>0:
                issues.append(f"El impacto {idx} es espera, pero contiene horas activas.")
            supported=any(_num(step_by_id[sid].get("wait_time"))>0 or str(step_by_id[sid].get("step_type") or "") in {"ST05","ST06"} for sid in ids) or any(_num((f.get("wait_time_loss") or {}).get("value"))>0 for f in linked)
            if (x.annual_wait_hours or 0)>0 and not supported:
                issues.append(f"El impacto {idx} cuantifica espera sin una espera registrada en los pasos o fricciones vinculados.")
        if x.driver_id=="ED05":
            if (x.annual_wait_hours or 0)>0:
                issues.append(f"El impacto {idx} es retrabajo, pero contiene horas de espera.")
            supported=any(_num(step_by_id[sid].get("rework_time"))>0 for sid in ids) or any(str(f.get("friction_type") or "") in {"P02","P11","P13"} for f in linked)
            if (x.annual_active_hours or 0)>0 and not supported:
                issues.append(f"El impacto {idx} cuantifica retrabajo sin retrabajo o fricción compatible en los pasos vinculados.")
    return list(dict.fromkeys(issues))
# [AUNEA-BE-INPUT-COVERAGE-015] END
