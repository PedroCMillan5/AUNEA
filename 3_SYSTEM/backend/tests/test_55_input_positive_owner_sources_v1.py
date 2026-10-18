"""55/55 positive oracles using a synthetic fixture with real field owners.

This checks coverage source recognition. It does not mean 55 diagnostic business
conclusions are valid, or that the test input is a real client's record.
"""
import json
from pathlib import Path
import pytest
from aunea_backend.input_coverage import InputCoverageEngine, input_contract
from aunea_backend.models import EngagementInput

CASES=Path(__file__).parent/"fixtures"/"qa55_positive_owner_sources_v1.json"


@pytest.mark.parametrize("entry",input_contract(),ids=lambda row:row["Input_ID"])
def test_all_55_genuine_owner_sources_are_covered_when_full(entry):
    e=EngagementInput.model_validate(json.loads(CASES.read_text(encoding="utf-8")))
    result=InputCoverageEngine().run(e)
    assert len(result.items)==55
    row=next(item for item in result.items if item.input_id==entry["Input_ID"])
    assert row.applicable is True,entry["Input_ID"]
    assert row.status=="COVERED",(row.input_id,row.status,row.present_sources)


def test_fixture_has_no_direct_fake_values_for_owner_derived_fields():
    e=EngagementInput.model_validate(json.loads(CASES.read_text(encoding="utf-8")))
    derived={"DF031","DF032","DF033","DF042","DF056","DF058","DF059",
             "DF068","DF069","DF070","DF071","DF072","DF074","DF085"}
    assert not derived.intersection(e.questionnaire_answers)
    assert all("id" in s and "normal_next_step" in s
               for s in e.questionnaire_answers["_process_steps"])
    assert all(f.get("affected_steps") for f in e.questionnaire_answers["_frictions"])
    assert all(r.risk_id for r in e.risks)
    assert all(x.evidence_type for x in e.economics)
