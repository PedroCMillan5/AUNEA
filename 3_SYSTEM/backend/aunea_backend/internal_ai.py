# [AUNEA-BE-INTERNAL-AI-190] START — Internal AI pilot, no business-engine mutations
# SOURCE: DEC-034/050/052/055; Simulator CANONICAL PG10/PG11; internal REVIEW 2026-10-23.
# INPUTS: confirmed AS-IS and matching official DiagnosticOutput.
# OUTPUTS: unapproved, traceable candidate TO-BE per existing AS-IS step.
# SIDE_EFFECTS: none. CHANGE_RISK: HIGH.
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field
from .models import EngagementInput, DiagnosticOutput
from .registry import rule_bundle_version
from .utils import stable_hash

class PilotAIRequest(BaseModel):
    engagement: EngagementInput
    diagnostic: DiagnosticOutput
    confirmed_as_is: bool
    snapshot_version: int = Field(ge=1)

class PilotAIItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_step_id: str
    transformation: Literal["Se mantiene", "Se modifica", "Se elimina", "Se automatiza",
        "Se asiste con IA", "Requiere decisión humana", "Se incorpora control"]
    problem_resolved: str
    future_actor: str
    tool: str
    inputs: str
    outputs: str
    automation_ai: str
    human_supervision: str
    controls_risk: str
    rationale: str
    source_refs: list[str]
    limitations: str

class PilotAIResult(BaseModel):
    status: Literal["DRAFT"] = "DRAFT"
    requires_human_review: bool = True
    engagement_id: str
    snapshot_version: int
    input_hash: str
    model: str
    items: list[PilotAIItem]

class PilotAIConsolidationRequest(BaseModel):
    # Transient validation request, not a new business capture or persistence owner.
    request: PilotAIRequest
    items: list[PilotAIItem]


class PilotAIStepRequest(BaseModel):
    # Source still contains the complete confirmed AS-IS for server-side hash validation.
    request: PilotAIRequest
    source_step_id: str = Field(min_length=1, max_length=128)


def validate_pilot_step_result(
    request: PilotAIRequest, source_step_id: str, item: PilotAIItem,
) -> PilotAIItem:
    """One bounded proposal; same source, tool and citation rules as the whole draft."""
    steps = validate_pilot_source(request)
    source = next((s for s in steps if str(s["id"]) == source_step_id), None)
    if source is None or item.source_step_id != source_step_id:
        raise ValueError("La propuesta no corresponde a una actividad vigente del AS-IS.")
    frictions = request.engagement.questionnaire_answers.get("_frictions") or []
    # Source steps may be cited for context, but friction/risk assertions need
    # explicit step linkage. An unlinked ID alone is NOT evidence for this step.
    from .internal_ai_ollama import _related_ids
    allowed = {str(s["id"]) for s in steps}
    allowed.update(str(f["id"]) for f in frictions
                   if isinstance(f, dict) and f.get("id")
                   and source_step_id in _related_ids(f))
    allowed.update(str(r.risk_id) for r in request.engagement.risks
                   if r.risk_id and source_step_id in r.step_ids)
    if (not item.source_refs or source_step_id not in item.source_refs
            or any(ref not in allowed for ref in item.source_refs)):
        raise ValueError("La propuesta contiene referencias inexistentes.")
    if item.tool and item.tool != str(source.get("tool") or ""):
        raise ValueError("Herramienta futura no acreditada.")
    return item


def validate_pilot_source(request: PilotAIRequest) -> list[dict[str, Any]]:
    if not request.confirmed_as_is:
        raise ValueError("Se necesita un AS-IS confirmado.")
    eng, diagnostic = request.engagement, request.diagnostic
    if (diagnostic.engagement_id != eng.engagement_id
            or diagnostic.input_snapshot_hash != stable_hash(eng.model_dump())
            or diagnostic.rule_bundle_version != rule_bundle_version()):
        raise ValueError("El diagnóstico no corresponde al AS-IS vigente.")
    steps = eng.questionnaire_answers.get("_process_steps")
    if not isinstance(steps, list):
        raise ValueError("No hay mapa AS-IS.")
    active = [x for x in steps if isinstance(x, dict) and x.get("status") != "SUPERSEDED"]
    ids = [str(x.get("id") or "") for x in active]
    if not ids or not all(ids) or len(set(ids)) != len(ids):
        raise ValueError("Identificadores de pasos inexistentes o duplicados.")
    return active

def validate_pilot_result(request: PilotAIRequest, model: str, items: list[PilotAIItem]) -> PilotAIResult:
    steps = validate_pilot_source(request)
    source_ids = {str(x["id"]) for x in steps}
    if len(items) != len(steps) or {x.source_step_id for x in items} != source_ids:
        raise ValueError("La propuesta no corresponde a todos los pasos AS-IS.")
    frictions = request.engagement.questionnaire_answers.get("_frictions") or []
    refs = source_ids | {str(x["id"]) for x in frictions if isinstance(x, dict) and x.get("id")}
    refs.update(str(x.risk_id) for x in request.engagement.risks if x.risk_id)
    for item in items:
        if not item.source_refs or item.source_step_id not in item.source_refs or any(r not in refs for r in item.source_refs):
            raise ValueError("La propuesta contiene referencias inexistentes.")
        step = next(s for s in steps if str(s["id"]) == item.source_step_id)
        if item.tool and item.tool != str(step.get("tool") or ""):
            raise ValueError("Herramienta futura no acreditada.")
    return PilotAIResult(engagement_id=request.engagement.engagement_id,
        snapshot_version=request.snapshot_version,
        input_hash=stable_hash(request.engagement.model_dump()), model=model, items=items)
# [AUNEA-BE-INTERNAL-AI-190] END
