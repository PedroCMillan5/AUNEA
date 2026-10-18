"""Risk capture provenance: missing is not NO/YES; four record-level inputs remain coherent."""
import pytest
from aunea_backend.input_coverage import InputCoverageEngine
from aunea_backend.engines import RiskEngine, EngineContext
from aunea_backend.models import EngagementInput, RiskInput


def risk(description="Possible data loss",controls_present=True,reversible=True):
    return RiskInput(step_ids=["S1"],category="operational",description=description,
        likelihood_1_5=2,impact_1_5=2,controls_present=controls_present,reversible=reversible,sensitive_or_high_impact=False,material_financial_or_compliance=False,critical_trigger=False)


def engagement(risks, agent=False):
    return EngagementInput(engagement_id="RISK-QA",process_instance_id="QA-1",process_name="Example",
        questionnaire_answers={"_process_steps":[
            {"id":"S1","step_name":"Receive","step_type":"ST02","actor":"Operations","normal_next_step":"__END__"}]},
        risks=risks,requires_bounded_agent_action=agent)


def item(e,iid):
    return next(x for x in InputCoverageEngine().run(e).items if x.input_id==iid)


def test_model_never_fabricates_control_or_reversibility():
    r=RiskInput(category="operational",likelihood_1_5=2,impact_1_5=2)
    assert r.reversible is None and r.controls_present is None
    e=engagement([r])
    assert item(e,"IN-K-04").status=="GAP"
    assert item(e,"IN-K-06").status=="GAP"
    result=RiskEngine().run(EngineContext(e),InputCoverageEngine().run(e))
    assert result.status=="INPUT_GAP" and result.residual_level=="UNKNOWN"


@pytest.mark.parametrize("missing,iid",[
    ({"description":""},"IN-K-02"),
    ({"controls_present":None},"IN-K-04"),
    ({"reversible":None},"IN-K-06")
])
def test_one_bad_record_cannot_be_hidden_by_another(missing,iid):
    e=engagement([risk(),risk(**missing)])
    assert item(e,iid).status=="GAP"
    assert iid in InputCoverageEngine().run(e).blocking_gaps if iid!="IN-K-06" else iid not in InputCoverageEngine().run(e).blocking_gaps


def test_irreversibility_becomes_blocking_when_bounded_agent_is_requested():
    e=engagement([risk(reversible=None)],agent=True)
    assert item(e,"IN-K-06").status=="GAP"
    assert item(e,"IN-K-06").blocking is True


def test_two_complete_risks_cover_four_material_risk_source_groups():
    e=engagement([risk(controls_present=False,reversible=False),risk()])
    out=InputCoverageEngine().run(e)
    for iid in ("IN-K-02","IN-K-03","IN-K-04","IN-K-06"):
        assert item(e,iid).status=="COVERED",iid
    risk_result=RiskEngine().run(EngineContext(e),out)
    assert risk_result.inherent_level!="UNKNOWN"
    assert "Falta reversibilidad" not in risk_result.rationale


def test_explicit_no_controls_remains_known_not_missing():
    e=engagement([risk(controls_present=False)])
    assert item(e,"IN-K-04").status=="COVERED"
    assert "controls_present=False" in RiskEngine().run(EngineContext(e),InputCoverageEngine().run(e)).rationale


def test_df074_user_answer_does_not_override_risk_owner():
    e=engagement([risk(reversible=None)])
    e.questionnaire_answers["DF074"]="EASY"
    assert item(e,"IN-K-06").status=="GAP"


def test_all_55_sources_are_present_and_branch_ids_are_known():
    from aunea_backend.input_coverage import input_contract, _branch_applicable
    rows=input_contract()
    assert len(rows)==55 and len({r["Input_ID"] for r in rows})==55
    e=engagement([])
    expected_branches={
        "BR-BASE","BR-STEP","BR-FUTURE","BR-CLOSE","BR-PAIN","BR-ECON","BR-WAIT",
        "BR-FAIL","BR-SLA","BR-APPROVAL","BR-TOOLS","BR-DATA","BR-EXCEPTION",
        "BR-VISIBILITY","BR-KNOWLEDGE","BR-RISK","BR-AI","BR-AGENT","BR-CAPACITY",
        "BR-DIRECTLOSS","BR-TOOLCOST","BR-REVENUE","BR-LOGIC"
    }
    for row in rows:
        assert row["Branch_Rule_ID"] in expected_branches,row["Input_ID"]
        assert _branch_applicable(row["Branch_Rule_ID"],e) is not None,row["Input_ID"]
        assert row["Source_Fields"],row["Input_ID"]
        assert row["Criticality"] in {"CRITICAL","MATERIAL","OPTIONAL"}
        assert row["Blocking"] in {"YES","NO","YES_IF_RISK","YES_IF_AI","YES_IF_I2"}
