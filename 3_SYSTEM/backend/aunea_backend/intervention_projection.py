# [AUNEA-BE-INTERVENTION-REVIEW-155] START — Read-only intervention time sensitivity (REVIEW)
# PURPOSE: Quantify only consultant-reviewed, source-attributed step-level time hypotheses;
#          prevent overlapping contribution and preserve nulls for unsupported quantities.
# SOURCE: DEC-034/050/052/068/074; Simulator CANONICAL PG11/12/14; technical contract REVIEW 2026-10-23.
# INPUTS: An immutable AS-IS TimeProjectionRequest and separate proposed step/dimension changes.
# OUTPUTS: Partial deltas for ACTIVE, WAIT exposure and REWORK; no future E2E, cash, ROI or ScenarioResult.
# SIDE_EFFECTS: None. Does not write to Engagement, Scenario Comparator or saved engine results.
# CHANGE_RISK: HIGH — cannot be promoted to an official scenario without canonical approval.
from __future__ import annotations

from collections import Counter
from typing import Any, Literal

from pydantic import BaseModel, Field

from .session_time import (
    TimeProjectionRequest, _error_share, _number, _step_share,
    _volume_per_year, project_session_time,
)

EvidenceType = Literal[
    "MEASURED", "CLIENT_DECLARED", "AUNEA_ESTIMATE",
    "SPECIFIC_BENCHMARK", "HYPOTHESIS",
]
Dimension = Literal["ACTIVE", "WAIT", "REWORK"]


class StepTimeProposal(BaseModel):
    intervention_id: str = Field(min_length=1)
    step_id: str = Field(min_length=1)
    dimension: Dimension
    future_minutes: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    rationale: str | None = None
    source_ref: str | None = None
    evidence_type: EvidenceType | None = None
    review_status: Literal["DRAFT", "REVIEWED"] = "DRAFT"
    affected_friction_ids: list[str] = Field(default_factory=list)
    affected_risk_ids: list[str] = Field(default_factory=list)


class InterventionProjectionRequest(BaseModel):
    scenario_name: str = Field(min_length=1)
    source_snapshot_version: int = Field(ge=1)
    source_snapshot_hash: str = Field(min_length=1)
    baseline: TimeProjectionRequest
    interventions: list[StepTimeProposal] = Field(default_factory=list)


def _change_projection(step: dict[str, Any], proposal: StepTimeProposal, annual_cases: float | None) -> tuple[float | None, str | None]:
    label = str(step.get("step_name") or step.get("id") or "?")
    field = {"ACTIVE": "active_time", "WAIT": "wait_time", "REWORK": "rework_time"}[proposal.dimension]
    current = _number(step.get(field))
    if current is None:
        return None, f"{label}: no existe tiempo AS-IS acreditado para {proposal.dimension}"
    if proposal.future_minutes is None:
        return None, f"{label}: tiempo futuro pendiente"
    share_gaps: list[str] = []
    share = _step_share(step, share_gaps)
    reps = _number(step.get("occurrences_per_case", 1))
    if reps is None:
        share_gaps.append(f"{label}: número de ejecuciones no acreditado")
    if proposal.dimension == "REWORK" and current != proposal.future_minutes:
        error_share = _error_share(step, share_gaps)
    else:
        error_share = 1.0
    if share_gaps:
        return None, "; ".join(share_gaps)
    if annual_cases is None:
        return None, "Sin universo anual comparable: DF021/DF022/calendario"
    if share is None or error_share is None or reps is None:
        return None, f"{label}: denominador de tiempo no acreditado"
    # Signed delta: negative changes expose extra workload, never silently clamp to zero.
    return round((current - proposal.future_minutes) * share * reps * error_share * annual_cases / 60, 4), None


def project_interventions_review(request: InterventionProjectionRequest) -> dict[str, Any]:
    """Experimental/read-only partial calculation, not a governed ScenarioResult."""
    baseline = project_session_time(request.baseline)
    volume_gaps: list[str] = []
    annual_cases = _volume_per_year(request.baseline, volume_gaps)
    active_steps = [s for s in request.baseline.steps if s.get("status") != "SUPERSEDED"]
    index: dict[str, list[dict[str, Any]]] = {}
    for step in active_steps:
        index.setdefault(str(step.get("id") or ""), []).append(step)
    keys = Counter((p.step_id, p.dimension) for p in request.interventions)
    rows: list[dict[str, Any]] = []
    notes: list[str] = []
    conflicts = False
    dims: dict[str, list[dict[str, Any]]] = {"ACTIVE": [], "WAIT": [], "REWORK": []}

    for proposal in request.interventions:
        key = (proposal.step_id, proposal.dimension)
        issue: str | None = None
        delta: float | None = None
        status = "PENDING"
        if keys[key] > 1:
            status, issue = "CONFLICT", "Dos o más intervenciones atribuyen el mismo componente a un único paso. Conciliar primero la hipótesis final."
            conflicts = True
        elif len(index.get(proposal.step_id, [])) != 1:
            issue = "El paso AS-IS no existe, está retirado o tiene identificador duplicado"
        elif proposal.review_status != "REVIEWED":
            issue = "La hipótesis sigue en borrador y no ha sido aprobada por el consultor"
        elif not str(proposal.rationale or "").strip() or not str(proposal.source_ref or "").strip() or not proposal.evidence_type:
            issue = "Faltan fundamento, evidencia/fuente o clase de evidencia de la hipótesis"
        else:
            delta, issue = _change_projection(index[proposal.step_id][0], proposal, annual_cases)
            if issue is None:
                status = "CALCULATED"
        row = {
            "intervention_id": proposal.intervention_id,
            "step_id": proposal.step_id,
            "dimension": proposal.dimension,
            "review_status": proposal.review_status,
            "evidence_type": proposal.evidence_type,
            "source_ref": proposal.source_ref,
            "status": status,
            "annual_delta_hours": delta if status == "CALCULATED" else None,
            "issue": issue,
        }
        rows.append(row)
        dims[proposal.dimension].append(row)
        if issue:
            notes.append(f"{proposal.intervention_id} / {proposal.step_id} / {proposal.dimension}: {issue}")

    # An absent dimension has no asserted improvement, not a zero value.
    # A pending/overlapping contributor makes the whole dimension non-comparable.
    totals = {
        dimension: round(sum(r["annual_delta_hours"] for r in grouped), 4)
        if grouped and all(r["status"] == "CALCULATED" for r in grouped) else None
        for dimension, grouped in dims.items()
    }
    pending = any(row["status"] != "CALCULATED" for row in rows)
    result_status = "BLOCKED" if conflicts else "NO_ASSUMPTIONS" if not rows else "PARTIAL" if pending else "REVIEW_ONLY"
    return {
        "status": result_status,
        "diagnostic_type": "INTERVENTION_REVIEW_ONLY",
        "scenario_name": request.scenario_name,
        "official": False,
        "snapshot_seal_verified": False,
        "source_snapshot_version": request.source_snapshot_version,
        "source_snapshot_hash": request.source_snapshot_hash,
        "annual_cases": baseline["annual_cases"],
        "baseline_projection": baseline,
        "interventions": rows,
        "annual_active_delta_hours": totals["ACTIVE"],
        "annual_wait_exposure_delta_case_hours": totals["WAIT"],
        "annual_rework_delta_hours": totals["REWORK"],
        "annual_future_end_to_end_hours": None,
        "future_sla_hours": None,
        "capacity_value_eur_annual": None,
        "cash_saving_eur_annual": None,
        "quote": None,
        "optimal_scenario": None,
        "warnings": list(dict.fromkeys(baseline["gaps"] + volume_gaps + notes)),
        "note": "Proyección parcial de hipótesis revisadas, no business case ni escenario oficial. La espera no equivale a duración E2E, capacidad o ahorro de caja.",
    }
# [AUNEA-BE-INTERVENTION-REVIEW-155] END
