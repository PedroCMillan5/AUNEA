"""Run every canonical Input_ID in an intentionally empty captured study.

This verifies unsourced coverage, branch resolution and blocking metadata for all 55
contract records. It does NOT certify semantic sufficiency of all alternative groups:
those still require independent positive/negative scenario tests.
"""
import pytest
from aunea_backend.input_coverage import InputCoverageEngine, input_contract
from aunea_backend.models import EngagementInput


CONTRACT=input_contract()


@pytest.mark.parametrize("entry",CONTRACT,ids=lambda row: row["Input_ID"])
def test_every_input_in_empty_study_is_not_falsely_covered(entry):
    e=EngagementInput(engagement_id="COV55-EMPTY",process_instance_id="P-EMPTY",process_name="Empty case",
                      questionnaire_answers={"_process_steps":[]})
    result=InputCoverageEngine().run(e)
    assert len(result.items)==55
    row=next(i for i in result.items if i.input_id==entry["Input_ID"])
    assert row.input_id==entry["Input_ID"]
    assert row.source_fields==entry["Source_Fields"]
    assert row.applicable is not None
    assert row.status in {"NOT_APPLICABLE","GAP"},(row.input_id,row.status)
    assert row.present is False


def test_no_unrecognized_binding_or_blocking_token():
    expected={"YES","NO","YES_IF_RISK","YES_IF_AI","YES_IF_I2"}
    got=[(r["Input_ID"],r["Blocking"]) for r in CONTRACT if r["Blocking"] not in expected]
    assert not got,got
    assert {r["Engine"] for r in CONTRACT}=={
        "PainEngine","EconomicsEngine","RecommendationEngine","RiskEngine","Governance"
    }
    assert all(r.get("Source_Fields") for r in CONTRACT)
