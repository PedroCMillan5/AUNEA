from aunea_backend.models import *
from aunea_backend.orchestrator import Orchestrator
from aunea_backend.engines import EngineContext, EconomicsEngine, RiskEngine, RecommendationEngine


def base_scope(**kw):
    d=dict(scope_bounded=True,integrations_known=True,data_migration_bounded=True,tool_tco_current=True)
    d.update(kw); return CommercialScope(**d)

def ev(eid="E1",typ="MEASURED"):
    return Evidence(evidence_id=eid,type=typ)

def risk(impact=1, **kw):
    return RiskInput(category="operational",likelihood_1_5=2,impact_1_5=impact,**kw)

def test_e2e_01_deterministic_intake_n2_i0_and_override():
    eng=EngagementInput(
        engagement_id="E2E-01",process_instance_id="P1",process_name="Intake",
        evidence=[ev()],
        pains=[PainObservation(pain_id="P03",state="CONFIRMED",evidence_ids=["E1"]),PainObservation(pain_id="P05",state="CONFIRMED",evidence_ids=["E1"])],
        economics=[EconomicInput(pain_id="P03",driver_id="ED02",annual_active_hours=300,capacity_cost_rate_eur_hour=30,deduplication_key="dup"),EconomicInput(pain_id="P05",driver_id="ED04",annual_active_hours=100,capacity_cost_rate_eur_hour=30,deduplication_key="route")],
        risks=[risk()],commercial_scope=base_scope()
    )
    o=Orchestrator(); a=o.diagnose(eng); b=o.diagnose(eng)
    assert a.recommendation.action_id=="ACT03"
    assert a.recommendation.functional_level_id=="N2"
    assert a.recommendation.ai_level_id=="I0"
    assert a.input_snapshot_hash==b.input_snapshot_hash
    _, alt=o.compare(eng,ScenarioRequest(scenario_name="N1",functional_level_id="N1",ai_level_id="I0"))
    assert "CAP006" in alt.capability_delta["removed"] or alt.coverage_by_pain["P05"] != CoverageState.RESOLVED
    assert alt.delta_vs_optimal["one_off_eur"] <= 0


def test_e2e_02_reporting_visibility_n4_without_forced_n3():
    eng=EngagementInput(
        engagement_id="E2E-02",process_instance_id="P2",process_name="Reporting",
        evidence=[ev()],pains=[PainObservation(pain_id="P14",state="CONFIRMED",evidence_ids=["E1"]),PainObservation(pain_id="P09",state="CONFIRMED",evidence_ids=["E1"])],
        economics=[EconomicInput(pain_id="P14",driver_id="ED06",annual_active_hours=500,capacity_cost_rate_eur_hour=35)],
        risks=[risk()],requires_management_visibility=True,commercial_scope=base_scope()
    )
    out=Orchestrator().diagnose(eng)
    assert out.recommendation.functional_level_id=="N4"
    assert out.recommendation.ai_level_id=="I0"


def test_e2e_03_i1_requires_explicit_effort_no_percentage_uplift():
    eng=EngagementInput(
        engagement_id="E2E-03",process_instance_id="P3",process_name="Triage",evidence=[ev()],
        pains=[PainObservation(pain_id="P05",state="CONFIRMED",evidence_ids=["E1"])],risks=[risk()],
        requires_unstructured_ai_assistance=True,commercial_scope=base_scope(ai_effort_days=2)
    )
    out=Orchestrator().diagnose(eng)
    assert out.recommendation.ai_level_id=="I1"
    eng0=eng.model_copy(update={"requires_unstructured_ai_assistance":False,"commercial_scope":base_scope(ai_effort_days=0)})
    out0=Orchestrator().diagnose(eng0)
    assert round(out.quote.one_off_eur-out0.quote.one_off_eur,2)==800


def test_e2e_04_i2_r2_manual_review():
    eng=EngagementInput(
        engagement_id="E2E-04",process_instance_id="P4",process_name="Exceptions",evidence=[ev()],
        pains=[PainObservation(pain_id="P10",state="CONFIRMED",evidence_ids=["E1"])],
        risks=[risk(impact=4,material_financial_or_compliance=True)],requires_bounded_agent_action=True,
        commercial_scope=base_scope(additional_effort_days=2)
    )
    out=Orchestrator().diagnose(eng)
    assert out.recommendation.ai_level_id=="I2"
    assert out.quote.status==QuoteStatus.MANUAL_REVIEW
    _, alt=Orchestrator().compare(eng,ScenarioRequest(scenario_name="I1",ai_level_id="I1"))
    assert alt.risk.status=="RISK_REASSESS_REQUIRED"


def test_e2e_05_advisory_before_system():
    eng=EngagementInput(
        engagement_id="E2E-05",process_instance_id="P5",process_name="Broken process",evidence=[ev()],
        pains=[PainObservation(pain_id="P04",state="CONFIRMED",evidence_ids=["E1"])],risks=[risk()],
        process_design_preconditions_ok=False,commercial_scope=base_scope()
    )
    out=Orchestrator().diagnose(eng)
    assert out.recommendation.action_id=="ACT01"
    _, alt=Orchestrator().compare(eng,ScenarioRequest(scenario_name="Force system",action_id="ACT03",functional_level_id="N2",ai_level_id="I0"))
    assert out.optimal_scenario.action_id=="ACT01"
    assert alt.action_id=="ACT03"


def test_economic_input_preserves_canonical_practical_capacity():
    row=EconomicInput(
        driver_id="ED14", role_or_resource="OPERATIONS", value=125,
        unit="h", period="MONTH", capacity_cost_rate_eur_hour=32,
        evidence_type="CLIENT_DECLARED"
    )
    payload=row.model_dump()
    assert payload["role_or_resource"]=="OPERATIONS"
    assert payload["value"]==125
    assert payload["unit"]=="h"
    assert payload["period"]=="MONTH"
    assert payload["capacity_cost_rate_eur_hour"]==32


def coverage_for(engine, covered=(), gaps=()):
    items=[]
    for iid in covered:
        items.append(InputCoverageItem(input_id=iid,engine=engine,input_name=iid,criticality="MATERIAL",branch_rule_id="BR-BASE",applicable=True,present=True,blocking=False,status="COVERED",source_fields=[],present_sources=[]))
    for iid in gaps:
        items.append(InputCoverageItem(input_id=iid,engine=engine,input_name=iid,criticality="MATERIAL",branch_rule_id="BR-BASE",applicable=True,present=False,blocking=False,status="GAP",source_fields=[],present_sources=[]))
    return InputCoverageResult(status="PARTIAL" if gaps else "COMPLETE",items=items)


def test_economics_complete_means_canonical_coverage_not_row_existence():
    eng=EngagementInput(
        engagement_id="EC-COV",process_instance_id="P",process_name="Economics",
        economics=[EconomicInput(driver_id="ED02",annual_active_hours=100,evidence_type="CLIENT_DECLARED")]
    )
    result=EconomicsEngine().run(EngineContext(eng),coverage_for("EconomicsEngine",covered=["IN-E-01"],gaps=["IN-E-04"]))
    assert result.status=="PARTIAL"
    assert result.coverage_status=="PARTIAL"
    assert result.covered_input_ids==["IN-E-01"]
    assert result.missing_input_ids==["IN-E-04"]


def test_risk_result_retains_canonical_input_trace():
    eng=EngagementInput(
        engagement_id="RISK-COV",process_instance_id="P",process_name="Risk",
        risks=[risk(impact=2)]
    )
    result=RiskEngine().run(EngineContext(eng),coverage_for("RiskEngine",covered=["IN-K-01","IN-K-02","IN-K-03"]))
    assert result.input_ids_used==["IN-K-01","IN-K-02","IN-K-03"]
    assert "Canonical inputs used=" in result.rationale


def test_recommendation_consumes_exception_complexity_and_retains_constraints():
    eng=EngagementInput(
        engagement_id="REC-COV",process_instance_id="P",process_name="Exceptions",
        pains=[PainObservation(pain_id="P03",state="CONFIRMED",evidence_ids=[])],
        questionnaire_answers={
            "DF086":["REDUCE_TIME"],"DF087":["CONTROL"],"DF088":["FINAL_DECISION"],
            "DF089":["CURRENT_STACK"],"DF090":["EU_HOSTING"],"DF091":["TRAINING"],
            "DF075":["S2"],"DF066":["MANUAL_EXCEPTION"],
            "_process_steps":[{"id":"S1","exception_path":"Manual review"}],
        }
    )
    cov=coverage_for("RecommendationEngine",covered=[f"IN-R-{i:02d}" for i in range(1,15)])
    rr=RiskResult(inherent_level="R1",residual_level="R1",status="ASSESSED",rationale="ok")
    out=RecommendationEngine().run(EngineContext(eng),[PainResult(pain_id="P03",state="CONFIRMED",confidence="MEDIUM")],rr,cov)
    assert out.action_id=="ACT03"
    assert out.functional_level_id=="N3"
    assert len(out.preconditions)>=5
    assert out.missing_information==[]
    assert "IN-R-10" in out.input_ids_used
