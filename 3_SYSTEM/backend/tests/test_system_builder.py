from aunea_backend.orchestrator import Orchestrator
from aunea_backend.models import EngagementInput, PainSignalInput, EconomicInput, RiskInput, CommercialScope
from aunea_backend.solution_models import SolutionSpecificationRequest, SolutionSpecRole, SolutionSpecDataEntity, SolutionSpecIntegration
from aunea_backend.system_builder_models import SystemBuilderRequest


def ready_spec():
    eng=EngagementInput(
        engagement_id="E-BUILD-1",process_instance_id="P-BUILD-1",process_name="Client Intake",
        pain_signals=[PainSignalInput(pain_id="P05",direct_mechanism_present=True,concrete_evidence_present=True,signal_present=True)],
        economics=[EconomicInput(driver_id="ED01",annual_active_hours=200)],
        risks=[RiskInput(category="ops",likelihood_1_5=2,impact_1_5=2)],
        commercial_scope=CommercialScope(scope_bounded=True,integrations_known=True,tool_tco_current=True),
        questionnaire_answers={"trigger":"Approved request","inputs":["Request"],"outputs":["Project","Tasks"],"desired_outcome":"Reliable kickoff"},
    )
    orch=Orchestrator(); diag=orch.diagnose(eng)
    req=SolutionSpecificationRequest(
        target_platform="Airtable + Make + Google Drive",
        roles=[SolutionSpecRole(role_name="Ops",responsibilities=["Own process"],permissions=["Admin"])],
        data_entities=[SolutionSpecDataEntity(entity_name="Request",key_fields=["request_id"],source_of_truth="Airtable",status="CONFIRMED")],
        integrations=[SolutionSpecIntegration(name="Drive",source_system="Airtable",target_system="Google Drive",method="Make connector",status="CONFIRMED")],
    )
    return orch,eng,diag,orch.generate_solution_specification(eng,diag,req)


def test_builder_plan_from_ready_spec():
    orch,eng,diag,spec=ready_spec(); plan=orch.generate_system_build_plan(spec)
    assert plan.status=="READY_FOR_ENGINEERING"
    assert plan.tasks
    assert plan.component_decisions
    assert any(d.decision in {"REUSE_CANDIDATE","ADAPT_CANDIDATE","CREATE_NEW"} for d in plan.component_decisions)


def test_builder_package_contains_prompt_runbook_scaffold():
    orch,eng,diag,spec=ready_spec(); pkg=orch.generate_system_build_package(spec,SystemBuilderRequest(implementation_name="Client Intake OS"))
    assert "Non-negotiable rules" in pkg.build_prompt_markdown
    assert "Operational Runbook" in pkg.runbook_markdown
    assert "docs/solution_specification.json" in pkg.scaffold_files
    assert "secret_values" in pkg.scaffold_files["config/config.example.json"]


def test_builder_never_calls_design_seed_verified_reuse():
    orch,eng,diag,spec=ready_spec(); plan=orch.generate_system_build_plan(spec)
    for d in plan.component_decisions:
        if d.maturity=="DESIGN_SEED": assert d.decision=="ADAPT_CANDIDATE"


def test_draft_spec_yields_draft_build_plan():
    orch,eng,diag,spec=ready_spec(); spec.status="DRAFT_MISSING_IMPLEMENTATION_INPUTS"
    plan=orch.generate_system_build_plan(spec)
    assert plan.status=="DRAFT_SPEC_NOT_READY"
    assert plan.tasks[0].status=="BLOCKED"


def test_system_builder_api_package():
    from fastapi.testclient import TestClient
    from aunea_backend.api import app
    orch,eng,diag,spec=ready_spec()
    c=TestClient(app)
    r=c.post('/v1/system-builder/package',json={'specification':spec.model_dump(mode='json'),'request':{'implementation_name':'Client Intake OS'}})
    assert r.status_code==200
    body=r.json()
    assert body['build_plan']['status']=='READY_FOR_ENGINEERING'
    assert 'docs/build_plan.json' in body['scaffold_files']
