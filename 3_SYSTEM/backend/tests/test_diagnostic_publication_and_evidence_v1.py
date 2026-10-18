"""PG15 output gates and evidence provenance regression."""
from aunea_backend.models import EngagementInput, EconomicInput, InputCoverageResult
from aunea_backend.input_coverage import InputCoverageEngine
from aunea_backend.deliverables import DeliverablesEngine
from aunea_backend.orchestrator import Orchestrator
from test_deliverables import fixture_engagement


def test_economic_provenance_is_not_silently_assumed():
    assert EconomicInput(driver_id="ED01").evidence_type is None
    e=EngagementInput(engagement_id="E",process_instance_id="P",process_name="P",
        questionnaire_answers={"_process_steps":[], "DF012":"EMAIL", "DF013":"DONE"},
        economics=[EconomicInput(driver_id="ED01", annual_active_hours=12)])
    row=next(x for x in InputCoverageEngine().run(e).items if x.input_id=="IN-E-09")
    assert row.status=="GAP"


def test_explicit_provenance_counts_when_complete():
    e=EngagementInput(engagement_id="E",process_instance_id="P",process_name="P",
        questionnaire_answers={"_process_steps":[]},
        economics=[EconomicInput(driver_id="ED01", evidence_type="CLIENT_DECLARED")])
    row=next(x for x in InputCoverageEngine().run(e).items if x.input_id=="IN-E-09")
    assert row.status=="COVERED"


def test_partial_coverage_can_generate_draft_but_never_ready():
    d=Orchestrator().diagnose(fixture_engagement())
    assert d.input_coverage.status=="NOT_EVALUATED"
    pack=DeliverablesEngine().generate(d)
    if pack.status!="BLOCKED_SCENARIO_NOT_SELECTABLE":
        assert pack.status=="DRAFT"
        assert any("cobertura" in x.lower() for x in pack.issues)


def test_complete_coverage_gate_does_not_override_scenario_blockers():
    d=Orchestrator().diagnose(fixture_engagement())
    d.input_coverage=InputCoverageResult(status="COMPLETE")
    d.optimal_scenario.status="BLOCKED"
    assert DeliverablesEngine().generate(d).status=="BLOCKED_SCENARIO_NOT_SELECTABLE"
