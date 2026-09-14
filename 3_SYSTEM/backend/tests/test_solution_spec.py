import pytest

from aunea_backend.orchestrator import Orchestrator
from aunea_backend.models import EngagementInput, PainSignalInput, EconomicInput, RiskInput, CommercialScope
from aunea_backend.solution_models import (
    SolutionSpecificationRequest, SolutionSpecRole, SolutionSpecDataEntity,
    SolutionSpecIntegration, SolutionSpecRule, SolutionSpecAcceptanceTest,
)


def system_engagement():
    return EngagementInput(
        engagement_id="E-SPEC-1", process_instance_id="P-SPEC-1", process_name="Client Intake",
        pain_signals=[PainSignalInput(pain_id="P05", direct_mechanism_present=True, concrete_evidence_present=True, signal_present=True)],
        economics=[EconomicInput(driver_id="ED01", annual_active_hours=240)],
        risks=[RiskInput(category="ops", likelihood_1_5=2, impact_1_5=2)],
        process_design_preconditions_ok=True,
        commercial_scope=CommercialScope(scope_bounded=True, integrations_known=True, tool_tco_current=True),
        questionnaire_answers={
            "DF012":"Approved request received",
            "DF013":"Project ready for execution",
            "DF016":"Operations",
            "DF046":["Airtable","Google Drive"],
            "DF086":["Create a reliable project kickoff without re-keying"],
            "DF090":["Client data must remain in approved systems"],
            "DF098":"Confirm implementation scope — Operations — 14/09/2026",
            "_process_steps":[{
                "id":"STEP-001","status":"ACTIVE","step_name":"Validate approved request","tool":"Airtable",
                "inputs":["Request form","Client details"],"outputs":["Project record","Tasks","Brief"],
                "decision_criteria":["Request approved"],"exception_path":None,
            }],
        },
    )


def ready_request():
    return SolutionSpecificationRequest(
        target_platform="Airtable + Make + Google Drive",
        roles=[SolutionSpecRole(role_name="Operations Owner", responsibilities=["Own process"], permissions=["Admin"])],
        data_entities=[SolutionSpecDataEntity(entity_name="Request", purpose="Operational intake", key_fields=["request_id"], source_of_truth="Airtable", status="CONFIRMED")],
        integrations=[SolutionSpecIntegration(name="Drive workspace", source_system="Airtable", target_system="Google Drive", purpose="Create project folder", method="Make connector", status="CONFIRMED")],
        business_rules=[SolutionSpecRule(rule_id="BR-001", description="Create project workspace only after the request is approved", trigger_or_condition="Approved request", action="Create project workspace", status="CONFIRMED")],
        acceptance_tests=[SolutionSpecAcceptanceTest(test_id="AT-001", requirement="Approved request creates a single project workspace", given="An approved request exists", when="The workflow runs", then="One project workspace is created and linked to the request", status="APPROVED")],
    )


def test_system_spec_draft_when_implementation_details_missing():
    eng=system_engagement(); orch=Orchestrator(); diag=orch.diagnose(eng)
    spec=orch.generate_solution_specification(eng,diag)
    assert spec.source_action_id in {"ACT03","ACT04","ACT05"}
    assert spec.status == "DRAFT_MISSING_IMPLEMENTATION_INPUTS"
    assert spec.capabilities and spec.acceptance_tests and spec.missing_information
    assert any("Business rules" in x for x in spec.missing_information)
    assert any("APPROVED" in x for x in spec.missing_information)


def test_system_spec_reads_canonical_df_and_process_step_runtime_values():
    eng=system_engagement(); orch=Orchestrator(); diag=orch.diagnose(eng)
    spec=orch.generate_solution_specification(eng,diag)
    assert spec.triggers == ["Approved request received"]
    assert "Request form" in spec.inputs and "Client details" in spec.inputs
    assert "Project record" in spec.outputs and "Brief" in spec.outputs
    assert "Airtable" in spec.as_is_summary["current_tools"]
    assert spec.as_is_summary["owner"] == "Operations"
    assert "Create a reliable project kickoff without re-keying" in str(spec.objective)
    assert spec.source_trace["capture_contract"].startswith("Diagnostic Master v1.1")


def test_system_spec_ready_when_all_build_contract_inputs_are_governed():
    eng=system_engagement(); orch=Orchestrator(); diag=orch.diagnose(eng)
    spec=orch.generate_solution_specification(eng,diag,ready_request())
    assert spec.status == "READY_FOR_BUILD"
    assert spec.deployment["production_readiness"] == "READY"
    assert all(r.status == "CONFIRMED" for r in spec.business_rules)
    assert all(t.status == "APPROVED" for t in spec.acceptance_tests)


def test_system_spec_never_marks_tbd_rules_or_draft_acceptance_as_ready():
    eng=system_engagement(); orch=Orchestrator(); diag=orch.diagnose(eng)
    req=ready_request()
    req.business_rules[0].status="TBD"
    req.acceptance_tests[0].status="DRAFT"
    spec=orch.generate_solution_specification(eng,diag,req)
    assert spec.status == "DRAFT_MISSING_IMPLEMENTATION_INPUTS"
    assert spec.deployment["production_readiness"] == "NOT_READY"
    assert any("CONFIRMED" in x for x in spec.missing_information)
    assert any("APPROVED" in x for x in spec.missing_information)


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


def test_solution_spec_rejects_a_stale_diagnostic_snapshot():
    eng=system_engagement(); orch=Orchestrator(); diag=orch.diagnose(eng)
    eng.questionnaire_answers["DF013"]="Changed outcome"
    with pytest.raises(ValueError, match="stale"):
        orch.generate_solution_specification(eng,diag,ready_request())
