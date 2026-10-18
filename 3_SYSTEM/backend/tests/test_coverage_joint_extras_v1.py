"""Regression of required ProcessStep routing and risk-classification input completeness.

Source: Diagnostic Master v1.2 ProcessStep.normal_next_step REQUIRED;
RiskInput and RiskEngine sources for IN-P-03/IN-K-03.
"""
import pytest
from aunea_backend.models import EngagementInput, RiskInput
from aunea_backend.input_coverage import InputCoverageEngine
from aunea_backend.engines import EngineContext, RiskEngine


def steps():
    return [
        {"id":"S1","step_name":"Receive invoice","step_type":"ST02","actor":"Admin","normal_next_step":"S2"},
        {"id":"S2","step_name":"Approve invoice","step_type":"ST05","actor":"Manager","normal_next_step":"S3"},
        {"id":"S3","step_name":"Archive invoice","step_type":"ST02","actor":"Admin","normal_next_step":"__END__"},
    ]


def engagement(step_rows=None,risk=None):
    return EngagementInput(
        engagement_id="QA-JOINT-01",process_instance_id="QA-P",process_name="Supplier invoices",
        questionnaire_answers={"_process_steps":step_rows if step_rows is not None else steps()},
        risks=[risk] if risk else [])


def result(e,iid):
    return next(r for r in InputCoverageEngine().run(e).items if r.input_id==iid)


@pytest.mark.parametrize("missing_step",[0,1,2])
def test_each_step_needs_its_own_explicit_next_or_end(missing_step):
    rows=steps()
    assert result(engagement(rows),"IN-P-03").status=="COVERED"
    rows[missing_step].pop("normal_next_step")
    assert result(engagement(rows),"IN-P-03").status=="GAP"


def complete_risk():
    return RiskInput(
        risk_id="R-01",step_ids=["S2"],category="operational",
        description="Invoice authorization error",likelihood_1_5=3,impact_1_5=4,
        reversible=True,controls_present=True,sensitive_or_high_impact=False,
        material_financial_or_compliance=False,critical_trigger=False)


@pytest.mark.parametrize("missing_flag",[
    "sensitive_or_high_impact","material_financial_or_compliance","critical_trigger"])
def test_coverage_and_risk_engine_agree_when_classification_flag_is_unknown(missing_flag):
    risk=complete_risk()
    setattr(risk,missing_flag,None)
    e=engagement(risk=risk)
    coverage=InputCoverageEngine().run(e)
    assert result(e,"IN-K-03").status=="GAP"
    assert coverage.status!="COMPLETE"
    score=RiskEngine().run(EngineContext(e),coverage)
    assert score.status=="INPUT_GAP" and score.residual_level=="UNKNOWN"


def test_full_risk_classification_has_no_spurious_k03_gap():
    e=engagement(risk=complete_risk())
    assert result(e,"IN-K-03").status=="COVERED"
    # Other coverage groups remain intentionally incomplete in this isolated fixture.
    assert RiskEngine().run(EngineContext(e),InputCoverageEngine().run(e)).inherent_level!="UNKNOWN"
