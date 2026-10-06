from __future__ import annotations
import json
from functools import lru_cache
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field

from .models import EngagementInput

# [AUNEA-BE-PAIN-CANDIDATE-020] START — Pain candidates from governed AS-IS signals
# PURPOSE: Derive neutral, reviewable Friction/Pain candidates from already captured AS-IS signals.
# SOURCE: Diagnostic Master v1.2 RULE_PAIN_ENGINE + DF051/DF054 SYSTEM_SUGGEST_THEN_CONFIRM +
#         PROJECT_RULES templates/candidates rule + DEC-034/050/052.
# GUARDRAIL: candidates never create/confirm Friction/Pain. Human confirmation in the Friction builder remains mandatory.
# CHANGE_RISK: CRITICAL.

ROOT=Path(__file__).resolve().parents[1]
RULES_PATH=ROOT/"data"/"pain_rule_engine_v12.json"

@lru_cache(maxsize=1)
def pain_rules()->dict[str,dict[str,Any]]:
    raw=json.loads(RULES_PATH.read_text(encoding="utf-8"))
    rows=raw.get("rows",[])
    if len(rows)!=20:
        raise RuntimeError("Canonical pain-rule runtime mirror is incomplete")
    return {str(x["pain_id"]):x for x in rows}

class PainCandidate(BaseModel):
    candidate_id: str
    pain_id: str
    step_ids: list[str] = Field(default_factory=list)
    rationale: str
    review_questions: list[str] = Field(default_factory=list)
    source_signals: list[str] = Field(default_factory=list)

class PainCandidateResult(BaseModel):
    candidates: list[PainCandidate] = Field(default_factory=list)

def _steps(e:EngagementInput)->list[dict[str,Any]]:
    return [x for x in (e.questionnaire_answers.get("_process_steps") or []) if isinstance(x,dict) and x.get("status")!="SUPERSEDED"]

def _frictions(e:EngagementInput)->list[dict[str,Any]]:
    return [x for x in (e.questionnaire_answers.get("_frictions") or []) if isinstance(x,dict) and x.get("status")!="SUPERSEDED"]

def _num(v:Any)->float:
    if isinstance(v,dict):
        v=v.get("value")
    try:return float(v or 0)
    except (TypeError,ValueError):return 0.0

def _arr(v:Any)->list[Any]:
    if v in (None,""):return []
    return v if isinstance(v,list) else [v]

def _existing(e:EngagementInput,pain_id:str,step_ids:list[str])->bool:
    target=set(str(x) for x in step_ids)
    for f in _frictions(e):
        pid=str(f.get("derived_pain_id") or f.get("friction_type") or "")
        affected=set(str(x) for x in (f.get("affected_steps") or []))
        if pid==pain_id and (not target or target.intersection(affected)):
            return True
    return False

def _candidate(pain_id:str,steps:list[str],rationale:str,signals:list[str])->PainCandidate:
    rule=pain_rules()[pain_id]
    return PainCandidate(
        candidate_id=f"{pain_id}:{'|'.join(sorted(set(steps)))}:{'|'.join(signals)}",
        pain_id=pain_id,step_ids=list(dict.fromkeys(steps)),rationale=rationale,
        review_questions=list(rule.get("review_questions") or []),
        source_signals=signals
    )

class PainCandidateEngine:
    def run(self,e:EngagementInput)->PainCandidateResult:
        steps=_steps(e); answers=e.questionnaire_answers; out:list[PainCandidate]=[]

        # P03 — RULE_PAIN_ENGINE direct condition requires equivalent data manually entered in >=2 locations.
        # DF051 is the governed confirmation of exactly that finding; REKEY alone is intentionally insufficient.
        dup=answers.get("DF051")
        if isinstance(dup,dict) and dup.get("from") and dup.get("to"):
            sids=[str(dup["from"]),str(dup["to"])]
            if not _existing(e,"P03",sids):
                out.append(_candidate("P03",sids,"El mapa contiene una reintroducción de la misma información confirmada en DF051.",["DF051"]))
        elif isinstance(dup,list):
            for item in dup:
                if isinstance(item,dict) and item.get("from") and item.get("to"):
                    sids=[str(item["from"]),str(item["to"])]
                    if not _existing(e,"P03",sids):
                        out.append(_candidate("P03",sids,"El mapa contiene una reintroducción de la misma información confirmada en DF051.",["DF051"]))

        # P15 — confirmed DF054 means the consultant has identified a manual cross-tool exchange/integration gap.
        for token in _arr(answers.get("DF054")):
            token=str(token)
            sids=[]
            if token.startswith("pair:"):
                parts=token.split(":")
                if len(parts)>=3:sids=[parts[1],parts[2]]
            elif token.startswith(("manual:","channel:")):
                parts=token.split(":")
                if len(parts)>=2:sids=[parts[1]]
            if sids and not _existing(e,"P15",sids):
                out.append(_candidate("P15",sids,"Se ha confirmado un intercambio manual o gap de integración en DF054; revisa si cumple la condición de fragmentación de herramientas.",["DF054"]))

        for s in steps:
            sid=str(s.get("id") or "")
            if not sid:continue
            actions={str(x) for x in (s.get("manual_actions") or [])}
            # P07 — approval gate + recurring administration/chasing or elapsed wait is enough for a candidate, never auto-confirmation.
            if str(s.get("step_type") or "")=="ST05" and (_num(s.get("wait_time"))>0 or "CHASE" in actions):
                if not _existing(e,"P07",[sid]):
                    out.append(_candidate("P07",[sid],"Hay un paso de aprobación con espera o seguimiento manual. Comprueba si el retraso/administración es evitable y atribuible al control de aprobación.",["RT_PROCESS_STEP.step_type=ST05","wait_time/CHASE"]))
            # P11 — recorded rework/error is a direct signal to review a rework/quality pain.
            if _num(s.get("rework_time"))>0 or _num(s.get("error_rate"))>0:
                if not _existing(e,"P11",[sid]):
                    out.append(_candidate("P11",[sid],"El paso registra retrabajo o errores. Comprueba el defecto concreto, frecuencia y esfuerzo de corrección antes de confirmar.",["RT_PROCESS_STEP.rework_time/error_rate"]))
            # P14 — REPORT is a governed manual action; it is a candidate only because periodic/repetitive reporting still needs confirmation.
            if "REPORT" in actions and not _existing(e,"P14",[sid]):
                out.append(_candidate("P14",[sid],"El paso contiene consolidación/reporting manual. Confirma que es preparación repetitiva y no análisis nuevo antes de guardar la fricción.",["RT_PROCESS_STEP.manual_actions=REPORT"]))

        # P13 — DF055 is an explicit process-level data-quality finding; reuse its linked steps if available.
        dq=_arr(answers.get("DF055"))
        dq_steps=[str(x) for x in _arr((answers.get("_answer_details") or {}).get("DF055__steps"))]
        if dq and dq_steps and not _existing(e,"P13",dq_steps):
            out.append(_candidate("P13",dq_steps,"Se han declarado problemas de calidad de datos en DF055 vinculados a estos pasos. Comprueba el problema observable y su impacto antes de confirmar.",["DF055","DF055__steps"]))

        # Deterministic deduplication. Same pain+step set appears once even if several signals point to it.
        dedup={}
        for x in out:
            key=(x.pain_id,tuple(sorted(x.step_ids)))
            dedup[key]=x
        return PainCandidateResult(candidates=list(dedup.values()))
# [AUNEA-BE-PAIN-CANDIDATE-020] END
