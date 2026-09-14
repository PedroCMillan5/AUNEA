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


def test_default_deliverables_pack_contains_only_client_safe_core_artifacts():
    orch=Orchestrator(); diagnostic=orch.diagnose(fixture_engagement())
    pack=orch.generate_deliverables(diagnostic,DeliverableRequest(client_name="Northstar",process_name="Client Intake"))
    names={a.name for a in pack.artifacts}
    assert {"executive_summary.md","diagnostic_report.md","proposal_draft.md","diagnostic_report.html","proposal_draft.html"}.issubset(names)
    assert "deliverable_snapshot.json" not in names
    assert "internal_trace_appendix.md" not in names
    client_text="\n".join(a.content for a in pack.artifacts)
    for internal in (diagnostic.engagement_id, diagnostic.input_snapshot_hash, diagnostic.rule_bundle_version, diagnostic.optimal_scenario.scenario_id):
        assert internal not in client_text


def test_internal_trace_is_explicit_opt_in_only():
    orch=Orchestrator(); diagnostic=orch.diagnose(fixture_engagement())
    pack=orch.generate_deliverables(diagnostic,DeliverableRequest(include_internal_appendix=True))
    names={a.name for a in pack.artifacts}
    assert "deliverable_snapshot.json" in names
    assert "internal_trace_appendix.md" in names
    appendix=next(a.content for a in pack.artifacts if a.name=="internal_trace_appendix.md")
    assert diagnostic.engagement_id in appendix
    assert diagnostic.input_snapshot_hash in appendix


def test_deliverables_do_not_recalculate_economics_from_coverage():
    orch=Orchestrator(); diagnostic=orch.diagnose(fixture_engagement()); before=diagnostic.model_dump(mode="json")
    pack=orch.generate_deliverables(diagnostic)
    report=next(a.content for a in pack.artifacts if a.name=="diagnostic_report.md")
    assert "Valor de capacidad" in report
    assert "no se agregan como un único ahorro universal" in report
    assert diagnostic.model_dump(mode="json") == before


def test_deliverables_with_override_scenario():
    orch=Orchestrator(); engagement=fixture_engagement(); diagnostic=orch.diagnose(engagement)
    optimal,compared=orch.compare(engagement,ScenarioRequest(scenario_name="Lower scope",functional_level_id="N1",ai_level_id="I0"),diagnostic)
    pack=orch.generate_deliverables(optimal,DeliverableRequest(selected_scenario=compared,client_name="Northstar"))
    assert pack.selected_scenario_id==compared.scenario_id
