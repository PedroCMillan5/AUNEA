from __future__ import annotations
from typing import Any

from .models import (
    CommercialScope, CoverageState, EconomicInput, EngagementInput, Evidence,
    PainObservation, QuoteStatus, RiskInput, ScenarioRequest,
)
from .orchestrator import Orchestrator

# [AUNEA-UAT-ENGINE-ONECLICK-010] START — UAT canónica aislada
# PURPOSE: Execute the five canonical E2E fixtures as an isolated, visible acceptance suite.
# SOURCE: TEST_E2E; TEST_E2E_ASSERTION; REQ-UAT-001/002/003; DEC-034/040.
# INPUTS: deterministic in-memory fixtures only.
# OUTPUTS: fixture/assertion expected-vs-actual PASS/FAIL records.
# SIDE_EFFECTS: none; Orchestrator is created without SQLiteStore.
# CHANGE_RISK: HIGH.

def _scope(**kw: Any) -> CommercialScope:
    data = dict(scope_bounded=True, integrations_known=True, data_migration_bounded=True, tool_tco_current=True)
    data.update(kw)
    return CommercialScope(**data)


def _ev(eid: str = "E1", typ: str = "MEASURED") -> Evidence:
    return Evidence(evidence_id=eid, type=typ)


def _risk(impact: int = 1, **kw: Any) -> RiskInput:
    return RiskInput(category="operational", likelihood_1_5=2, impact_1_5=impact, **kw)


def _value(v: Any) -> Any:
    return getattr(v, "value", v)


def _assertion(aid: str, expected: Any, actual: Any, refs: list[str]) -> dict[str, Any]:
    ok = expected == actual
    return {
        "assertion_id": aid,
        "expected": expected,
        "actual": actual,
        "pass": ok,
        "diff": None if ok else {"expected": expected, "actual": actual},
        "refs": refs,
    }


def _fixture(fid: str, title: str, input_summary: str, assertions: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "test_id": fid,
        "title": title,
        "input_summary": input_summary,
        "assertions": assertions,
        "pass": all(x["pass"] for x in assertions),
    }


def run_canonical_uat() -> dict[str, Any]:
    fixtures: list[dict[str, Any]] = []

    eng1 = EngagementInput(
        engagement_id="E2E-01", process_instance_id="P1", process_name="Intake",
        evidence=[_ev()],
        pains=[PainObservation(pain_id="P03", state="CONFIRMED", evidence_ids=["E1"]), PainObservation(pain_id="P05", state="CONFIRMED", evidence_ids=["E1"])],
        economics=[EconomicInput(pain_id="P03", driver_id="ED02", annual_active_hours=300, capacity_cost_rate_eur_hour=30, deduplication_key="dup"), EconomicInput(pain_id="P05", driver_id="ED04", annual_active_hours=100, capacity_cost_rate_eur_hour=30, deduplication_key="route")],
        risks=[_risk()], commercial_scope=_scope(),
    )
    o1 = Orchestrator(); a1 = o1.diagnose(eng1); b1 = o1.diagnose(eng1)
    _, alt1 = o1.compare(eng1, ScenarioRequest(scenario_name="N1", functional_level_id="N1", ai_level_id="I0"))
    fixtures.append(_fixture("E2E-01", "Intake determinista N2/I0 + override N1", "P03+P05 confirmados; economics medidos; riesgo bajo; alternativa N1/I0", [
        _assertion("A-001", "ACT03", a1.recommendation.action_id, ["RULE_RECOMMENDATION", "REQ-REC-001"]),
        _assertion("A-002", "N2", a1.recommendation.functional_level_id, ["RULE_LEVEL_FUNC", "REQ-REC-001"]),
        _assertion("A-003", "I0", a1.recommendation.ai_level_id, ["RULE_LEVEL_AI", "REQ-REC-001"]),
        _assertion("A-004", True, a1.input_snapshot_hash == b1.input_snapshot_hash, ["REQ-DET-001"]),
        _assertion("A-005", True, ("CAP006" in alt1.capability_delta["removed"]) or (_value(alt1.coverage_by_pain["P05"]) != _value(CoverageState.RESOLVED)), ["RULE_SCENARIO_COMPARATOR", "REQ-SCEN-001"]),
        _assertion("A-006", True, alt1.delta_vs_optimal["one_off_eur"] <= 0, ["RULE_SCENARIO_ECONOMICS", "REQ-SCEN-001"]),
    ]))

    eng2 = EngagementInput(
        engagement_id="E2E-02", process_instance_id="P2", process_name="Reporting",
        evidence=[_ev()], pains=[PainObservation(pain_id="P14", state="CONFIRMED", evidence_ids=["E1"]), PainObservation(pain_id="P09", state="CONFIRMED", evidence_ids=["E1"])],
        economics=[EconomicInput(pain_id="P14", driver_id="ED06", annual_active_hours=500, capacity_cost_rate_eur_hour=35)],
        risks=[_risk()], requires_management_visibility=True, commercial_scope=_scope(),
    )
    a2 = Orchestrator().diagnose(eng2)
    fixtures.append(_fixture("E2E-02", "Reporting con visibilidad de gestión N4/I0", "P14+P09 confirmados; management visibility=true", [
        _assertion("A-007", "ACT03", a2.recommendation.action_id, ["RULE_RECOMMENDATION"]),
        _assertion("A-008", "N4", a2.recommendation.functional_level_id, ["RULE_LEVEL_FUNC FL-04"]),
        _assertion("A-009", "I0", a2.recommendation.ai_level_id, ["RULE_LEVEL_AI"]),
        _assertion("A-010", True, bool(a2.input_snapshot_hash), ["REQ-AUD-001", "REQ-DET-001"]),
    ]))

    eng3 = EngagementInput(
        engagement_id="E2E-03", process_instance_id="P3", process_name="Triage", evidence=[_ev()],
        pains=[PainObservation(pain_id="P05", state="CONFIRMED", evidence_ids=["E1"])], risks=[_risk()],
        requires_unstructured_ai_assistance=True, commercial_scope=_scope(ai_effort_days=2),
    )
    o3 = Orchestrator(); a3 = o3.diagnose(eng3)
    eng3_no_ai = eng3.model_copy(update={"requires_unstructured_ai_assistance": False, "commercial_scope": _scope(ai_effort_days=0)})
    a3_no_ai = Orchestrator().diagnose(eng3_no_ai)
    fixtures.append(_fixture("E2E-03", "I1 requiere esfuerzo explícito, no uplift porcentual", "P05 confirmado; I1=true; 2 días AI explícitos", [
        _assertion("A-011", "ACT04", a3.recommendation.action_id, ["RULE_RECOMMENDATION", "RULE_LEVEL_AI"]),
        _assertion("A-012", "I1", a3.recommendation.ai_level_id, ["RULE_LEVEL_AI AI-01"]),
        _assertion("A-013", 800.0, round(a3.quote.one_off_eur - a3_no_ai.quote.one_off_eur, 2), ["CFG_PRICING_POLICY", "REQ-REC-001"]),
        _assertion("A-014", True, a3.quote.one_off_eur > a3_no_ai.quote.one_off_eur, ["RULE_PRICING"]),
        _assertion("A-015", "I1", a3.optimal_scenario.ai_level_id, ["RULE_SCENARIO_COMPARATOR"]),
    ]))

    eng4 = EngagementInput(
        engagement_id="E2E-04", process_instance_id="P4", process_name="Exceptions", evidence=[_ev()],
        pains=[PainObservation(pain_id="P10", state="CONFIRMED", evidence_ids=["E1"])],
        risks=[_risk(impact=4, material_financial_or_compliance=True)], requires_bounded_agent_action=True,
        commercial_scope=_scope(additional_effort_days=2),
    )
    o4 = Orchestrator(); a4 = o4.diagnose(eng4); _, alt4 = o4.compare(eng4, ScenarioRequest(scenario_name="I1", ai_level_id="I1"))
    fixtures.append(_fixture("E2E-04", "I2 + R2 exige revisión manual", "P10 confirmado; acción acotada; riesgo material R2", [
        _assertion("A-016", "ACT05", a4.recommendation.action_id, ["RULE_RECOMMENDATION"]),
        _assertion("A-017", "I2", a4.recommendation.ai_level_id, ["RULE_LEVEL_AI AI-02"]),
        _assertion("A-018", "R2", _value(a4.risk_result.residual_level), ["RULE_RISK"]),
        _assertion("A-019", "MANUAL_REVIEW", _value(a4.quote.status), ["RULE_PRICING"]),
        _assertion("A-020", "RISK_REASSESS_REQUIRED", alt4.risk.status, ["RULE_SCENARIO_COMPARATOR"]),
        _assertion("A-021", "ACT05", a4.optimal_scenario.action_id, ["REQ-REC-001", "REQ-SCEN-001"]),
    ]))

    eng5 = EngagementInput(
        engagement_id="E2E-05", process_instance_id="P5", process_name="Broken process", evidence=[_ev()],
        pains=[PainObservation(pain_id="P04", state="CONFIRMED", evidence_ids=["E1"])], risks=[_risk()],
        process_design_preconditions_ok=False, commercial_scope=_scope(),
    )
    o5 = Orchestrator(); a5 = o5.diagnose(eng5); _, alt5 = o5.compare(eng5, ScenarioRequest(scenario_name="Force system", action_id="ACT03", functional_level_id="N2", ai_level_id="I0"))
    fixtures.append(_fixture("E2E-05", "Advisory antes de System", "P04 confirmado; precondiciones de proceso=false; alternativa fuerza System", [
        _assertion("A-022", "ACT01", a5.recommendation.action_id, ["RULE_RECOMMENDATION RR-03"]),
        _assertion("A-023", "ACT01", a5.optimal_scenario.action_id, ["REQ-REC-001"]),
        _assertion("A-024", "ACT03", alt5.action_id, ["REQ-SCEN-001"]),
        _assertion("A-025", None, a5.recommendation.functional_level_id, ["RULE_LEVEL_FUNC"]),
        _assertion("A-026", None, a5.recommendation.ai_level_id, ["RULE_LEVEL_AI"]),
    ]))

    assertions = [a for f in fixtures for a in f["assertions"]]
    return {
        "suite": "AUNEA_INTERNAL_V1_CANONICAL_UAT",
        "isolated": True,
        "fixture_count": len(fixtures),
        "assertion_count": len(assertions),
        "pass_count": sum(1 for a in assertions if a["pass"]),
        "fail_count": sum(1 for a in assertions if not a["pass"]),
        "pass": all(a["pass"] for a in assertions),
        "fixtures": fixtures,
    }
# [AUNEA-UAT-ENGINE-ONECLICK-010] END
