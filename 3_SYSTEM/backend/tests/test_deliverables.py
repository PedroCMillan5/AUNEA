from aunea_backend.models import EngagementInput, PainObservation, PainState, EconomicInput, RiskInput, CommercialScope, ScenarioRequest
from aunea_backend.deliverable_models import DeliverableRequest
from aunea_backend.orchestrator import Orchestrator


def fixture_engagement():
    return EngagementInput(
        engagement_id="ENG-DEL-001", process_instance_id="PROC-001", process_name="Client Intake",
        pains=[PainObservation(pain_id="P03", state=PainState.CONFIRMED, rationale="Duplicate entry observed")],
        economics=[EconomicInput(pain_id="P03", driver_id="ED01", annual_active_hours=120, capacity_cost_rate_eur_hour=30)],
        risks=[RiskInput(category="operational", likelihood_1_5=2, impact_1_5=2)],
        commercial_scope=CommercialScope(scope_bounded=True, integrations_known=True, tool_tco_current=True)
    )


def test_deliverables_pack_contains_core_artifacts():
    orch=Orchestrator(); diagnostic=orch.diagnose(fixture_engagement())
    pack=orch.generate_deliverables(diagnostic,DeliverableRequest(client_name="Northstar",process_name="Client Intake"))
    names={a.name for a in pack.artifacts}
    assert {"executive_summary.md","diagnostic_report.md","proposal_draft.md","deliverable_snapshot.json"}.issubset(names)


def test_deliverables_do_not_recalculate_economics_from_coverage():
    orch=Orchestrator(); diagnostic=orch.diagnose(fixture_engagement()); pack=orch.generate_deliverables(diagnostic)
    report=next(a.content for a in pack.artifacts if a.name=="diagnostic_report.md")
    assert "capacity value" in report.lower() and "single universal saving" in report.lower()


def test_deliverables_with_override_scenario():
    orch=Orchestrator(); engagement=fixture_engagement()
    optimal,compared=orch.compare(engagement,ScenarioRequest(scenario_name="Lower scope",functional_level_id="N1",ai_level_id="I0"))
    pack=orch.generate_deliverables(optimal,DeliverableRequest(selected_scenario=compared,client_name="Northstar"))
    assert pack.selected_scenario_id==compared.scenario_id
