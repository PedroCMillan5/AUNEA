import pytest
from aunea_backend.models import EngagementInput, DiagnosticOutput
from aunea_backend.utils import stable_hash
from aunea_backend.registry import rule_bundle_version
from aunea_backend.internal_ai import PilotAIRequest, PilotAIItem, validate_pilot_source, validate_pilot_result
from aunea_backend.internal_ai_provider import status, propose, ProviderUnavailable

def case():
    e=EngagementInput(engagement_id="PILOT", process_instance_id="P1", process_name="Facturas",
        questionnaire_answers={"_process_steps":[{"id":"S1","tool":"ERP"},{"id":"S2","tool":"ERP"}]})
    d=DiagnosticOutput.model_construct(engagement_id=e.engagement_id,
        input_snapshot_hash=stable_hash(e.model_dump()), rule_bundle_version=rule_bundle_version())
    return PilotAIRequest.model_construct(engagement=e,diagnostic=d,confirmed_as_is=True,snapshot_version=1)

def item(s):
    return PilotAIItem(source_step_id=s,transformation="Se mantiene",
        problem_resolved="",future_actor="",tool="ERP",inputs="",outputs="",
        automation_ai="",human_supervision="",controls_risk="",rationale="",
        source_refs=[s],limitations="")

def test_unavailable_by_default(monkeypatch):
    monkeypatch.setenv("AUNEA_INTERNAL_AI_ENABLED","0")
    assert status()["status"]=="UNAVAILABLE"
    with pytest.raises(ProviderUnavailable):
        propose(case())

def test_source_and_ref_gates():
    req=case()
    assert len(validate_pilot_source(req))==2
    result=validate_pilot_result(req,"mock",[item("S1"),item("S2")])
    assert result.status=="DRAFT" and result.requires_human_review
    with pytest.raises(ValueError):
        validate_pilot_result(req,"mock",[item("S1")])
    req.confirmed_as_is=False
    with pytest.raises(ValueError):
        validate_pilot_source(req)
