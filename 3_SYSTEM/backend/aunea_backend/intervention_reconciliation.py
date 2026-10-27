# [AUNEA-BE-INTERVENTION-RECONCILE-156] START — Economic ownership bridge (REVIEW)
# PURPOSE: Reconcile step hypotheses with unique economic events before preparing Pain assumptions.
# SOURCE: DEC-034/050/068/074; EAR-001/004/009/012; SE-01/02/09; REVIEW contract 2026-10-27.
# INPUTS: Versioned time review, unchanged economic inputs/Pain observations, reviewed event bindings.
# OUTPUTS: Auditable partial components and compatible candidate ScenarioAssumptions, never official results.
# SIDE_EFFECTS: None; no engine/store writes, pricing, publication or optimal scenario mutation.
# CHANGE_RISK: HIGH — candidate contract only; requires canonical promotion for official use.
from __future__ import annotations

from collections import Counter
from math import isclose, isfinite
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .intervention_projection import (
    Dimension, InterventionProjectionRequest, _change_projection, project_interventions_review,
)
from .models import EconomicInput, PainObservation, ScenarioAssumption
from .economic_overlap import economic_overlap_issues
from .utils import stable_hash


class EventBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    intervention_id: str = Field(min_length=1)
    step_id: str = Field(min_length=1)
    dimension: Dimension
    # EconomicInput has no stable record ID in the current engine contract.
    # Index is valid only within the exact fingerprinted input array, never across snapshots.
    economic_input_index: int = Field(ge=0)
    event_key: str = Field(min_length=1)
    basis_fingerprint: str = Field(min_length=1)
    review_status: Literal["DRAFT", "REVIEWED"] = "DRAFT"
    rationale: str | None = None
    source_ref: str | None = None
    scope_equivalence: Literal["EXACT_COMPONENT_SAME_POPULATION_PERIOD"] | None = None


class InterventionReconciliationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    engagement_id: str = Field(min_length=1)
    projection: InterventionProjectionRequest
    economics: list[EconomicInput] = Field(default_factory=list)
    pains: list[PainObservation] = Field(default_factory=list)
    bindings: list[EventBinding] = Field(default_factory=list)

    @model_validator(mode="after")
    def finite_inputs(self):
        def check(value):
            if isinstance(value, float) and not isfinite(value):
                raise ValueError("La conciliación no admite valores no finitos")
            if isinstance(value, dict):
                for v in value.values():
                    check(v)
            if isinstance(value, list):
                for v in value:
                    check(v)
        check(self.model_dump())
        return self


def reconciliation_basis(request: InterventionReconciliationRequest) -> str:
    # Includes hypotheses/provenance: editing a proposal also invalidates ownership review.
    return stable_hash({
        "contract": "INTERVENTION_RECONCILIATION_REVIEW_V1",
        "engagement_id": request.engagement_id,
        "projection": request.projection.model_dump(mode="json"),
        "economics": [e.model_dump(mode="json") for e in request.economics],
        "pains": [p.model_dump(mode="json") for p in request.pains],
    })


def reconcile_interventions_review(request: InterventionReconciliationRequest) -> dict:
    projection = project_interventions_review(request.projection)
    fingerprint = reconciliation_basis(request)
    review_fingerprint = stable_hash(request.model_dump(mode="json"))
    bindings = request.bindings
    key = lambda p: (p.intervention_id, p.step_id, p.dimension)
    binding_counts = Counter(key(b) for b in bindings)
    event_counts = Counter(b.event_key for b in bindings)
    input_counts = Counter(b.economic_input_index for b in bindings)
    proposal_keys = {key(p) for p in request.projection.interventions}
    rows = []
    global_issues = economic_overlap_issues(request.economics)
    if any(key(b) not in proposal_keys for b in bindings):
        global_issues.append("Hay atribuciones sin intervención correspondiente")
    if request.projection.baseline.scope_step_ids is not None:
        global_issues.append("Se requiere el AS-IS completo, sin filtro parcial de pasos")

    for proposal, delta in zip(request.projection.interventions, projection["interventions"]):
        issues = []
        candidates = [b for b in bindings if key(b) == key(proposal)]
        binding = candidates[0] if len(candidates) == 1 else None
        current = future = None
        if delta["status"] != "CALCULATED":
            issues.append(delta["issue"] or "Componente temporal pendiente")
        else:
            step = next(s for s in request.projection.baseline.steps
                        if str(s.get("id")) == proposal.step_id and s.get("status") != "SUPERSEDED")
            current, issue = _change_projection(
                step, proposal.model_copy(update={"future_minutes": 0}), projection["annual_cases"])
            if issue:
                issues.append(issue)
            elif current is not None:
                future = round(current - delta["annual_delta_hours"], 4)
        # Frictions are trace references only; INCLUDED/BREAKDOWN never become new contributions.
        frictions = request.projection.baseline.frictions
        if proposal.affected_risk_ids:
            issues.append("Vínculos a riesgos pendientes de validar contra su owner; no se recalcula riesgo")
        for fid in proposal.affected_friction_ids:
            found = [f for f in frictions if str(f.get("id")) == fid and f.get("status") != "SUPERSEDED"]
            if len(found) != 1:
                issues.append("Fricción inexistente, retirada o duplicada: " + fid)
                continue
            f = found[0]
            attr = f.get("time_attribution") or {}
            if (str(attr.get("step_id")) != proposal.step_id
                    or proposal.step_id not in [str(s) for s in f.get("affected_steps", [])]):
                issues.append("La fricción no pertenece al paso propietario: " + fid)
            expected = "BREAKDOWN" if proposal.dimension == "REWORK" else "INCLUDED"
            if attr.get("mode") != expected:
                issues.append("La atribución de la fricción no corresponde al componente: " + fid)
        if binding_counts[key(proposal)] != 1:
            issues.append("Falta una atribución económica única revisada para este componente")
        economic = None
        if binding:
            if binding.basis_fingerprint != fingerprint:
                issues.append("Atribución obsoleta: cambió el AS-IS, la hipótesis o su base económica")
            if (binding.review_status != "REVIEWED" or not (binding.rationale or "").strip()
                    or not (binding.source_ref or "").strip()):
                issues.append("Atribución sin revisión, fundamento o fuente")
            if binding.scope_equivalence is None:
                issues.append("Falta revisión explícita de componente, población y periodo equivalentes")
            if event_counts[binding.event_key] != 1 or input_counts[binding.economic_input_index] != 1:
                issues.append("El mismo evento o EconomicInput está atribuido más de una vez")
            if binding.economic_input_index >= len(request.economics):
                issues.append("EconomicInput no existe en esta versión")
            else:
                economic = request.economics[binding.economic_input_index]
                if not binding.event_key.strip() or economic.deduplication_key != binding.event_key:
                    issues.append("El evento no coincide con el owner EconomicInput.deduplication_key")
                if sum(e.deduplication_key == binding.event_key for e in request.economics) != 1:
                    issues.append("Evento duplicado entre EconomicInputs; conciliar en el owner")
                if economic.step_ids != [proposal.step_id]:
                    issues.append("El alcance económico no corresponde exclusivamente al paso")
                if not economic.evidence_type:
                    issues.append("EconomicInput carece de clase de evidencia")
                if economic.capacity_cost_rate_eur_hour is not None and economic.capacity_cost_rate_eur_hour < 0:
                    issues.append("La tarifa económica no puede ser negativa")
                matching_pains = [p for p in request.pains if p.pain_id == economic.pain_id]
                if len(matching_pains) != 1 or matching_pains[0].state.value != "CONFIRMED":
                    issues.append("Pain propietario inexistente, ambiguo o no confirmado")
                if sum(e.pain_id == economic.pain_id for e in request.economics) != 1:
                    issues.append("El comparador propagaría la hipótesis a varios EconomicInputs del Pain")
                allowed = {"ED05"} if proposal.dimension == "REWORK" else {
                    "ED01", "ED02", "ED03", "ED04", "ED06", "ED07", "ED08"}
                if proposal.dimension == "WAIT":
                    issues.append("Exposición a espera sin equivalencia acreditada con la espera económica del comparador")
                elif economic.driver_id not in allowed:
                    issues.append("Driver económico incompatible con el componente temporal")
                if proposal.dimension != "WAIT":
                    baseline_hours = economic.annual_active_hours
                    if (baseline_hours is None or current is None or baseline_hours < 0
                            or not isclose(baseline_hours, current, rel_tol=0, abs_tol=0.0001)):
                        issues.append("Horas económicas y componente anual no tienen una línea base equivalente")
                    # Even different event keys cannot prove independence of overlapping active scope.
                    if any(i != binding.economic_input_index and (not e.step_ids or proposal.step_id in e.step_ids)
                           and e.annual_active_hours is not None for i, e in enumerate(request.economics)):
                        issues.append("Otro EconomicInput comparte trabajo del paso; falta descomposición sin solapes")
                if delta["annual_delta_hours"] is not None and delta["annual_delta_hours"] < 0:
                    issues.append("El comparador actual recortaría el empeoramiento a cero")
        issues.extend(global_issues)
        rows.append({
            "intervention_id": proposal.intervention_id, "step_id": proposal.step_id,
            "dimension": proposal.dimension, "event_key": binding.event_key if binding else None,
            "economic_input_index": binding.economic_input_index if binding else None,
            "pain_id": economic.pain_id if economic else None,
            "binding_review": binding.model_dump(mode="json") if binding else None,
            "baseline_component_hours_annual": current, "future_component_hours_annual": future,
            "signed_delta_hours_annual": delta["annual_delta_hours"],
            "status": "PENDING" if issues else "RECONCILED_REVIEW_ONLY",
            "dependencies": list(dict.fromkeys(issues)),
        })

    # All-or-nothing export prevents a partly reconciled global plan looking like a full scenario.
    compatible = bool(rows) and not global_issues and all(r["status"] == "RECONCILED_REVIEW_ONLY" for r in rows)
    assumptions = []
    if compatible:
        for row, proposal in zip(rows, request.projection.interventions):
            assumptions.append(ScenarioAssumption(
                pain_id=row["pain_id"], future_active_hours=row["future_component_hours_annual"],
                rationale=proposal.rationale, confidence_type=proposal.evidence_type,
                source_or_rule_id="INTERVENTION_RECONCILIATION_REVIEW:" + review_fingerprint,
            ).model_dump(mode="json"))
    return {
        "status": "COMPATIBLE_REVIEW_ONLY" if compatible else "PENDING",
        "official": False, "snapshot_seal_verified": False, "publication_allowed": False,
        "engagement_id": request.engagement_id, "review_fingerprint": review_fingerprint,
        "basis_fingerprint": fingerprint, "projection": projection, "attributions": rows,
        "candidate_assumptions": assumptions,
        "comparator_executed": False, "optimal_scenario": None,
        "future_end_to_end_hours": None, "capacity_value_eur_annual": None,
        "cash_saving_eur_annual": None, "quote": None,
        "dependencies": global_issues + [
            "Verificar el snapshot sellado PG09 en backend antes del uso oficial",
            "Promover el contrato de atribución y validar cobertura del mecanismo en el escenario oficial",
            "E2E futuro pendiente de rutas, concurrencias, calendarios y frontera comparable con DF026",
            "Valor de capacidad pendiente de tarifa del recurso coincidente; caja pendiente de mecanismo financiero",
        ],
    }
# [AUNEA-BE-INTERVENTION-RECONCILE-156] END
