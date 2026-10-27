# [AUNEA-UAT-INTERVENTION-RECONCILE-156] START — Attribution and comparator compatibility QA
import copy

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from aunea_backend.intervention_reconciliation import (
    EventBinding, InterventionReconciliationRequest, reconciliation_basis, reconcile_interventions_review,
)
from aunea_backend.models import EconomicInput, PainObservation, EngagementInput, ScenarioAssumption, ScenarioRequest
from aunea_backend.engines import EngineContext, EconomicsEngine, PainEngine, RiskEngine, RecommendationEngine, PricingEngine, ScenarioComparator
from test_intervention_projection_review_v1 import _request, _hypothesis, INVOICE


def request_for_invoice(*proposals):
    projection = _request(*(proposals or [_hypothesis("S6", "ACTIVE", 3, affected_friction_ids=["F3"])]))
    projection.baseline.frictions = [{
        "id": "F" + str(i + 1), "friction_type": f["type"],
        "affected_steps": ["S" + str(s + 1) for s in f["steps"]],
        "time_attribution": {"mode": f["mode"], "step_id": "S" + str(f["owner"] + 1)},
        "frequency": {"mode": "percent", "value": f["frequency"]},
        "time_lost": f["minutes"],
    } for i, f in enumerate(INVOICE["frictions"])]
    # Additional ownership evidence is synthetic and explicit: NOT present in the original fixture.
    r = InterventionReconciliationRequest(engagement_id="UAT-INVOICE", projection=projection, economics=[EconomicInput(
        pain_id="P03", driver_id="ED02", step_ids=["S6"], annual_active_hours=160,
        deduplication_key="UAT-ERP-REKEY", evidence_type="HYPOTHESIS",
    )], pains=[PainObservation(pain_id="P03", state="CONFIRMED")])
    bind(r)
    return r


def bind(r):
    r.bindings = [EventBinding(
        intervention_id=p.intervention_id, step_id=p.step_id, dimension=p.dimension,
        economic_input_index=i, event_key=r.economics[i].deduplication_key,
        basis_fingerprint=reconciliation_basis(r), review_status="REVIEWED",
        rationale="Ensayo sintético del mismo evento, población y año; no prueba empresarial",
        source_ref="UAT-SYNTHETIC-OWNERSHIP", scope_equivalence="EXACT_COMPONENT_SAME_POPULATION_PERIOD",
    ) for i, p in enumerate(r.projection.interventions) if i < len(r.economics)]


def test_invoice_http_to_candidate_to_existing_comparator_preserves_optimal_and_input():
    from aunea_backend.api import app, engine
    r = request_for_invoice()
    before = copy.deepcopy(r.model_dump())
    audit_before = copy.deepcopy(engine.audit.runs)
    out = TestClient(app).post("/v1/diagnostic/interventions/reconcile-review", json=before)
    assert out.status_code == 200
    body = out.json()
    assert body["status"] == "COMPATIBLE_REVIEW_ONLY"
    row = body["attributions"][0]
    assert (row["baseline_component_hours_annual"], row["future_component_hours_annual"], row["signed_delta_hours_annual"]) == (160, 96, 64)
    assert body["capacity_value_eur_annual"] is body["cash_saving_eur_annual"] is None
    assert not body["official"] and not body["publication_allowed"] and not body["snapshot_seal_verified"]
    assert not body["comparator_executed"]
    assert engine.audit.runs == audit_before
    assert r.model_dump() == before
    # Contract compatibility only, in test: production endpoint never invokes the comparator.
    e = EngagementInput(engagement_id="UAT", process_instance_id="INVOICE", process_name="Facturas",
                        economics=r.economics, pains=r.pains)
    ctx = EngineContext(e)
    pains = PainEngine().run(ctx)
    baseline = EconomicsEngine().run(ctx)
    risk = RiskEngine().run(ctx)
    rec = RecommendationEngine().run(ctx, pains, risk)
    pricing = PricingEngine()
    quote = pricing.run(ctx, rec, risk)
    comparator = ScenarioComparator(pricing, RiskEngine())
    optimal = comparator.create(ctx, pains, baseline, risk, rec, quote)
    optimal_before = optimal.model_dump()
    candidate = comparator.create(ctx, pains, baseline, risk, rec, quote, ScenarioRequest(
        scenario_name="Ensayo", assumptions=[ScenarioAssumption.model_validate(a) for a in body["candidate_assumptions"]]), optimal)
    assert candidate.economics.annual_active_hours == 64
    assert candidate.economics.capacity_value_eur_annual is None
    assert candidate.payback_months is None
    assert optimal.model_dump() == optimal_before


def test_original_fixture_without_economic_owner_stays_pending():
    r = request_for_invoice()
    r.economics = []; r.pains = []; r.bindings = []
    out = reconcile_interventions_review(r)
    assert out["projection"]["annual_active_delta_hours"] == 64
    assert out["status"] == "PENDING" and not out["candidate_assumptions"]


@pytest.mark.parametrize("change", ["minutes", "volume", "rate", "order", "friction", "evidence"])
def test_binding_invalidates_when_any_dependency_changes(change):
    r = request_for_invoice()
    if change == "minutes": r.projection.interventions[0].future_minutes = 2
    if change == "volume": r.projection.baseline.volume = 200
    if change == "rate": r.economics[0].capacity_cost_rate_eur_hour = 32
    if change == "order": r.economics.insert(0, EconomicInput(driver_id="ED12"))
    if change == "friction": r.projection.baseline.frictions[2]["time_attribution"]["mode"] = "ADDITIONAL"
    if change == "evidence": r.projection.interventions[0].source_ref = "DIFFERENT"
    out = reconcile_interventions_review(r)
    assert not out["candidate_assumptions"]
    assert "obsoleta" in " ".join(out["attributions"][0]["dependencies"])


@pytest.mark.parametrize("change", ["pain_fanout", "event_duplicate", "same_step", "unanchored", "wrong_scope", "wrong_baseline", "wrong_driver", "unconfirmed_pain", "no_evidence", "draft", "no_scope", "bad_ref", "unknown_friction", "friction_owner", "friction_additional", "risk_ref", "partial_scope", "orphan"])
def test_unsafe_ownership_never_exports(change):
    r = request_for_invoice()
    if change == "pain_fanout": r.economics.append(EconomicInput(driver_id="ED02", pain_id="P03", step_ids=["S1"], annual_active_hours=40))
    if change == "event_duplicate": r.economics.append(r.economics[0].model_copy(deep=True))
    if change == "same_step": r.economics.append(EconomicInput(driver_id="ED01", pain_id="P01", step_ids=["S6"], annual_active_hours=160))
    if change == "unanchored": r.economics.append(EconomicInput(driver_id="ED02", pain_id="P01", annual_active_hours=160))
    if change == "wrong_scope": r.economics[0].step_ids = ["S1", "S6"]
    if change == "wrong_baseline": r.economics[0].annual_active_hours = 200
    if change == "wrong_driver": r.economics[0].driver_id = "ED13"
    if change == "unconfirmed_pain": r.pains[0].state = type(r.pains[0].state).INDICATED
    if change == "no_evidence": r.economics[0].evidence_type = None
    if change == "unknown_friction": r.projection.interventions[0].affected_friction_ids = ["MISSING"]
    if change == "friction_owner": r.projection.baseline.frictions[2]["time_attribution"]["step_id"] = "S1"
    if change == "friction_additional": r.projection.baseline.frictions[2]["time_attribution"]["mode"] = "ADDITIONAL"
    if change == "risk_ref": r.projection.interventions[0].affected_risk_ids = ["UNKNOWN"]
    if change == "partial_scope": r.projection.baseline.scope_step_ids = ["S6"]
    bind(r)
    if change == "draft": r.bindings[0].review_status = "DRAFT"
    if change == "no_scope": r.bindings[0].scope_equivalence = None
    if change == "bad_ref": r.bindings[0].economic_input_index = 99
    if change == "orphan": r.bindings.append(r.bindings[0].model_copy(update={"intervention_id": "ORPHAN"}))
    out = reconcile_interventions_review(r)
    assert out["status"] == "PENDING" and not out["candidate_assumptions"]


def test_deterioration_is_signed_and_not_silently_clamped_by_comparator():
    r = request_for_invoice(_hypothesis("S6", "ACTIVE", 7))
    out = reconcile_interventions_review(r)
    assert out["attributions"][0]["signed_delta_hours_annual"] == -64
    assert out["attributions"][0]["future_component_hours_annual"] == 224
    assert not out["candidate_assumptions"]


def test_mixed_plan_wait_and_rework_stay_distinct_and_block_partial_export():
    r = request_for_invoice(_hypothesis("S6", "ACTIVE", 3),
                            _hypothesis("S5", "WAIT", 600, intervention="WAIT"),
                            _hypothesis("S2", "REWORK", 6, intervention="REWORK", affected_friction_ids=["F1"]))
    r.economics.extend([
        EconomicInput(pain_id="P07", driver_id="ED13", step_ids=["S5"], annual_wait_hours=5760,
                      deduplication_key="UAT-WAIT", evidence_type="HYPOTHESIS"),
        EconomicInput(pain_id="P02", driver_id="ED05", step_ids=["S2"], annual_active_hours=25.6,
                      deduplication_key="UAT-REWORK", evidence_type="HYPOTHESIS"),
    ])
    r.pains.extend([PainObservation(pain_id="P07", state="CONFIRMED"), PainObservation(pain_id="P02", state="CONFIRMED")])
    bind(r)
    out = reconcile_interventions_review(r)
    assert [x["signed_delta_hours_annual"] for x in out["attributions"]] == [64, 960, 10.24]
    assert out["attributions"][2]["future_component_hours_annual"] == 15.36
    assert out["attributions"][2]["status"] == "RECONCILED_REVIEW_ONLY"
    assert out["future_end_to_end_hours"] is None
    assert not out["candidate_assumptions"]


@pytest.mark.parametrize("future", [0, 5])
def test_explicit_zero_and_no_change_remain_valid(future):
    r = request_for_invoice(_hypothesis("S6", "ACTIVE", future))
    out = reconcile_interventions_review(r)
    assert out["candidate_assumptions"][0]["future_active_hours"] == future * 32


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf")])
def test_nonfinite_nested_owner_rejected(value):
    raw = request_for_invoice().model_dump()
    raw["economics"][0]["annual_active_hours"] = value
    with pytest.raises(ValidationError):
        InterventionReconciliationRequest.model_validate(raw)


def test_duplicate_binding_and_duplicate_step_component_block_export():
    r = request_for_invoice()
    r.bindings.append(r.bindings[0].model_copy(deep=True))
    assert not reconcile_interventions_review(r)["candidate_assumptions"]
    r = request_for_invoice()
    r.projection.interventions.append(_hypothesis("S6", "ACTIVE", 2, intervention="AI"))
    bind(r)
    out = reconcile_interventions_review(r)
    assert not out["candidate_assumptions"]
    assert out["projection"]["annual_active_delta_hours"] is None


def test_review_provenance_and_engagement_are_part_of_identity():
    r = request_for_invoice()
    first = reconcile_interventions_review(r)
    assert first == reconcile_interventions_review(r)
    r.bindings[0].source_ref = "NEW-REVIEW-SOURCE"
    second = reconcile_interventions_review(r)
    assert first["review_fingerprint"] != second["review_fingerprint"]
    assert first["candidate_assumptions"][0]["source_or_rule_id"] != second["candidate_assumptions"][0]["source_or_rule_id"]
    r.engagement_id = "DIFFERENT-ENGAGEMENT"
    assert not reconcile_interventions_review(r)["candidate_assumptions"]
# [AUNEA-UAT-INTERVENTION-RECONCILE-156] END
