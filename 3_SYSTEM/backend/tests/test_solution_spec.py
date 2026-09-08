from aunea_backend.orchestrator import Orchestrator
from aunea_backend.models import EngagementInput, PainSignalInput, EconomicInput, RiskInput, CommercialScope
from aunea_backend.solution_models import SolutionSpecificationRequest, SolutionSpecRole, SolutionSpecDataEntity, SolutionSpecIntegration


def system_engagement():
    return EngagementInput(
        engagement_id="E-SPEC-1", process_instance_id="P-SPEC-1", process_name="Client Intake",
        pain_signals=[PainSignalInput(pain_id="P05", direct_mechanism_present=True, concrete_evidence_present=True, signal_present=True)],
        economics=[EconomicInput(driver_id="ED01", annual_active_hours=240)],
        risks=[RiskInput(category="ops", likelihood_1_5=2, impact_1_5=2)],
        process_design_preconditions_ok=True,
        commercial_scope=CommercialScope(scope_bounded=True, integrations_known=True, tool_tco_current=True),
        questionnaire_answers={"trigger":"Approved request received","inputs":["Request form","Client details"],"outputs":["Project record","Tasks","Brief"],"desired_outcome":"Create a reliable project kickoff without re-keying","current_tools":["Airtable","Google Drive"],"owner":"Operations"},
    )


def test_system_spec_draft_when_implementation_details_missing():
    eng=system_engagement(); orch=Orchestrator(); diag=orch.diagnose(eng)
    spec=orch.generate_solution_specification(eng,diag)
    assert spec.source_action_id in {"ACT03","ACT04","ACT05"}
    assert spec.status == "DRAFT_MISSING_IMPLEMENTATION_INPUTS"
    assert spec.capabilities and spec.acceptance_tests and spec.missing_information


def test_system_spec_ready_when_details_supplied():
    eng=system_engagement(); orch=Orchestrator(); diag=orch.diagnose(eng)
    req=SolutionSpecificationRequest(
        target_platform="Airtable + Make + Google Drive",
        roles=[SolutionSpecRole(role_name="Operations Owner", responsibilities=["Own process"], permissions=["Admin"])],
        data_entities=[SolutionSpecDataEntity(entity_name="Request", purpose="Operational intake", key_fields=["request_id"], source_of_truth="Airtable", status="CONFIRMED")],
        integrations=[SolutionSpecIntegration(name="Drive workspace", source_system="Airtable", target_system="Google Drive", purpose="Create project folder", method="Make connector", status="CONFIRMED")],
    )
    spec=orch.generate_solution_specification(eng,diag,req)
    assert spec.status == "READY_FOR_BUILD"
    assert spec.deployment["production_readiness"] == "READY"


def test_non_system_recommendation_is_blocked():
    eng=system_engagement(); eng.process_design_preconditions_ok=False
    orch=Orchestrator(); diag=orch.diagnose(eng)
    spec=orch.generate_solution_specification(eng,diag)
    assert diag.recommendation.action_id == "ACT01"
    assert spec.status == "BLOCKED_NOT_SYSTEM"


def test_solution_spec_does_not_recalculate_diagnostic():
    eng=system_engagement(); orch=Orchestrator(); diag=orch.diagnose(eng); before=diag.model_dump(mode="json")
    orch.generate_solution_specification(eng,diag)
    assert diag.model_dump(mode="json") == before
