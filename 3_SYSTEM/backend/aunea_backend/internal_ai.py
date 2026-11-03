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


def related_step_ids(record: dict) -> set[str]:
    """Canonical link extraction used by source validation and Ollama context."""
    keys = ("step_id", "affected_step_id", "step_ids", "affected_steps",
            "affected_step_ids", "linked_step_ids", "related_step_ids")
    ids: set[str] = set()
    for key in keys:
        value = record.get(key)
        if isinstance(value, (str, int)) and not isinstance(value, bool) and str(value):
            ids.add(str(value))
        elif isinstance(value, list):
            ids.update(str(x) for x in value
                       if isinstance(x, (str, int)) and not isinstance(x, bool))
    return ids


def explicit_pilot_process_flow(steps: list[dict[str, Any]]) -> dict[str, Any]:
    """Project only routing owned by confirmed ProcessSteps, never other studies.

    Explicit DF042 normal_next_step and DF043 exception_path.destination_step
    take precedence. The order of activities is a presentation hint, not an
    assertion that one step always leads to the next.
    """
    ids = {str(s["id"]) for s in steps}
    activities: list[dict[str, Any]] = []
    routes: list[dict[str, str]] = []
    unresolved: list[dict[str, str]] = []
    for step in steps:
        step_id = str(step["id"])
        exception = step.get("exception_path")
        exception = exception if isinstance(exception, dict) else {}
        ui = step.get("_ui")
        declared_decision = ui.get("has_decision") if isinstance(ui, dict) else None
        criteria = step.get("decision_criteria")
        if isinstance(criteria, list):
            criteria_list = [str(c) for c in criteria if isinstance(c, (str, int))]
        elif isinstance(criteria, str) and criteria:
            criteria_list = [criteria]
        else:
            criteria_list = []
        decision = (declared_decision if isinstance(declared_decision, bool) else
                    bool(str(step.get("step_type") or "") in ("ST04", "ST05")
                         or criteria_list or exception))
        activity: dict[str, Any] = {
            "id": step_id,
            "name": str(step.get("step_name") or step.get("name") or ""),
            "decision": decision,
        }
        if criteria_list:
            activity["decision_criteria"] = criteria_list
        if exception.get("condition"):
            activity["exception_condition"] = str(exception["condition"])
        if exception.get("owner"):
            activity["exception_owner"] = str(exception["owner"])
        activities.append(activity)

        for route_name, raw_destination in (
            ("normal", step.get("normal_next_step")),
            ("exception", exception.get("destination_step") if decision else None),
        ):
            if raw_destination is None or raw_destination == "":
                if decision or route_name == "normal":
                    unresolved.append({"step_id": step_id, "route": route_name,
                                       "reason": "sin_destino_explicito"})
                continue
            destination = str(raw_destination)
            if destination in ids or destination == "__END__":
                routes.append({"from": step_id, "to": destination, "route": route_name,
                               "source": "ProcessStep"})
            else:
                unresolved.append({"step_id": step_id, "route": route_name,
                                   "reason": "destino_no_vigente"})
    return {
        "activities": activities,
        "explicit_routes": routes,
        "unresolved_routes": unresolved,
        "interpretation": ("Las rutas derivan únicamente del ProcessStep confirmado. "
                           "El orden visual NO acredita una transición ni una regla de aprobación. "
                           "Las rutas no declaradas quedan pendientes, no se inventan."),
    }


def allowed_pilot_step_refs(
    request: PilotAIRequest, steps: list[dict[str, Any]], source_step_id: str
) -> set[str]:
    """Same source-ID allowlist is used by the prompt schema and server validator."""
    frictions = request.engagement.questionnaire_answers.get("_frictions") or []
    allowed = {str(step["id"]) for step in steps}
    allowed.update(str(f["id"]) for f in frictions
                   if isinstance(f, dict) and f.get("id")
                   and source_step_id in related_step_ids(f))
    allowed.update(str(r.risk_id) for r in request.engagement.risks
                   if r.risk_id and source_step_id in r.step_ids)
    return allowed


def validate_pilot_step_result(
    request: PilotAIRequest, source_step_id: str, item: PilotAIItem,
) -> PilotAIItem:
    """One bounded proposal; same source, tool and citation rules as the whole draft."""
    steps = validate_pilot_source(request)
    source = next((s for s in steps if str(s["id"]) == source_step_id), None)
    if source is None or item.source_step_id != source_step_id:
        raise ValueError("La propuesta no corresponde a una actividad vigente del AS-IS.")
    # The source ID belongs in every proposal. Other refs must be linked
    # in the confirmed AS-IS; the model is not allowed to invent relationships.
    allowed = allowed_pilot_step_refs(request, steps, source_step_id)
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
