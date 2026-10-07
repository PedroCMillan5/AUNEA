from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field
from .models import EngagementInput

# [AUNEA-BE-RISK-CANDIDATE-025] START — Reviewable risk candidates from confirmed AS-IS signals
# PURPOSE: Surface neutral scenarios that a consultant should validate; never classify, score or confirm a RiskInput.
# SOURCE: Diagnostic Master v1.2 S06/DF066-DF075; DEC-034/050/065; PROJECT_RULES candidate/confirmation rules.
# INPUTS: EngagementInput questionnaire snapshot with _process_steps/_frictions/_risks.
# OUTPUTS: review-only candidate cards with step references and interview questions.
# SIDE_EFFECTS: none.
# CHANGE_RISK: HIGH.

class RiskCandidate(BaseModel):
    candidate_id: str
    title: str
    step_ids: list[str] = Field(default_factory=list)
    suggested_description: str
    rationale: str
    review_questions: list[str] = Field(default_factory=list)
    source_signals: list[str] = Field(default_factory=list)

class RiskCandidateResult(BaseModel):
    candidates: list[RiskCandidate] = Field(default_factory=list)

def _arr(v: Any) -> list[Any]:
    if v in (None, ""): return []
    return v if isinstance(v, list) else [v]

def _steps(e: EngagementInput) -> list[dict[str, Any]]:
    return [x for x in _arr(e.questionnaire_answers.get("_process_steps")) if isinstance(x, dict) and x.get("status") != "SUPERSEDED"]

def _frictions(e: EngagementInput) -> list[dict[str, Any]]:
    return [x for x in _arr(e.questionnaire_answers.get("_frictions")) if isinstance(x, dict) and x.get("status") != "SUPERSEDED"]

def _risks(e: EngagementInput) -> list[dict[str, Any]]:
    return [x for x in _arr(e.questionnaire_answers.get("_risks")) if isinstance(x, dict)]

def _existing_candidate_ids(e: EngagementInput) -> set[str]:
    return {str(x.get("_candidate_id")) for x in _risks(e) if x.get("_candidate_id")}

def _candidate(cid: str, title: str, step_ids: list[str], description: str, rationale: str, questions: list[str], signals: list[str]) -> RiskCandidate:
    return RiskCandidate(candidate_id=cid,title=title,step_ids=list(dict.fromkeys(step_ids)),
        suggested_description=description,rationale=rationale,review_questions=questions,source_signals=signals)

class RiskCandidateEngine:
    def run(self, e: EngagementInput) -> RiskCandidateResult:
        steps=_steps(e); frictions=_frictions(e); existing=_existing_candidate_ids(e); out:list[RiskCandidate]=[]

        # Approval gates are a canonical S06 trigger. This is only a scenario to validate:
        # category, probability, impact, reversibility and controls remain explicit consultant choices.
        for s in steps:
            sid=str(s.get("id") or "")
            if not sid: continue
            if str(s.get("step_type") or "")=="ST05":
                cid=f"APPROVAL:{sid}"
                if cid not in existing:
                    out.append(_candidate(
                        cid,"Control de aprobación",[sid],
                        "Una operación podría continuar sin la aprobación requerida o sin que quede correctamente acreditada.",
                        "El flujo contiene un paso de aprobación. Conviene validar qué ocurriría si la autorización faltara, llegara tarde o no quedara trazada.",
                        ["¿Qué condición obliga a aprobar?","¿Quién debe aprobar?","¿Qué impide continuar sin aprobación?","¿Qué evidencia queda de la autorización?"],
                        ["RT_PROCESS_STEP.step_type=ST05"]
                    ))

        # Confirmed data/rework/manual-entry frictions justify asking about an operational error scenario,
        # but do not justify auto-selecting a risk category or score.
        data_types={"P02","P03","P11","P13"}
        by_step:dict[str,list[str]]={}
        for f in frictions:
            if str(f.get("friction_type") or "") not in data_types: continue
            for sid in _arr(f.get("affected_steps")):
                by_step.setdefault(str(sid),[]).append(str(f.get("friction_type")))
        for sid,types in by_step.items():
            cid=f"DATA:{sid}"
            if cid in existing: continue
            out.append(_candidate(
                cid,"Error operativo por datos",[sid],
                "Un dato incompleto, incorrecto o reintroducido manualmente podría provocar una operación o registro incorrecto.",
                "En este paso ya hay una fricción confirmada relacionada con información, errores o reintroducción manual. Conviene validar si puede materializarse en una consecuencia de riesgo.",
                ["¿Qué error concreto podría producirse?","¿Cómo se detectaría?","¿Qué consecuencia tendría si no se detecta?","¿Qué control existe hoy para impedirlo?"],
                sorted(set(types))
            ))

        for f in frictions:
            if str(f.get("friction_type") or "")!="P15": continue
            ids=[str(x) for x in _arr(f.get("affected_steps")) if x]
            if not ids: continue
            cid="HANDOFF:"+"|".join(sorted(ids))
            if cid in existing: continue
            out.append(_candidate(
                cid,"Pérdida de información entre herramientas",ids,
                "La información podría perderse, quedar desactualizada o no coincidir al pasar manualmente entre herramientas.",
                "Existe una fricción confirmada de herramientas fragmentadas. Conviene validar si el traspaso manual puede generar una consecuencia material.",
                ["¿Qué información cambia de herramienta?","¿Cómo se comprueba que ambos sistemas coinciden?","¿Qué ocurre si el traspaso falla o queda incompleto?"],
                ["P15"]
            ))

        dedup={}
        for x in out:
            dedup[(x.title,tuple(sorted(x.step_ids)))]=x
        return RiskCandidateResult(candidates=list(dedup.values()))
# [AUNEA-BE-RISK-CANDIDATE-025] END
