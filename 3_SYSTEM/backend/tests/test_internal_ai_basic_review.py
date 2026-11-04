"""PG11 basic coherence review: fast, deterministic and independent of Ollama."""
import pytest
from fastapi.testclient import TestClient
from aunea_backend.api import app
from aunea_backend.internal_ai import PilotAIConsolidationRequest
from aunea_backend.internal_ai_review_basic import basic_review
from aunea_backend import internal_ai_ollama as local
from test_internal_ai_segmented_review import sample
from test_internal_ai_review_consolidation import proposal

# [AUNEA-UAT-PG11-BASIC-REVIEW-222] START
def data():
    req=sample()
    first=proposal("S1")
    first.transformation="Se mantiene"
    first.future_actor=""
    first.rationale=("Acción propuesta: implantar registro automático. Resultado esperado: "
                     "mejor seguimiento de incidencias. Justificación: 30 % estimado.")
    second=proposal("S2")
    second.limitations="Confirmar quién autoriza excepciones"
    return PilotAIConsolidationRequest(request=req,items=[first,second])


def api_payload():
    """The API accepts a full DiagnosticOutput; model_construct() is test-only."""
    payload=data().model_dump(mode="json")
    payload["request"]["diagnostic"].update({
        "pain_results":[],
        "economic_result":{},
        "risk_result":{"inherent_level":"UNKNOWN","residual_level":"UNKNOWN",
                       "status":"NOT_EVALUATED","rationale":"Fixture sin datos reales"},
        "recommendation":{"action_id":"NONE"},
        "quote":{},
        "optimal_scenario":{
            "scenario_id":"FIXTURE","scenario_name":"Fixture",
            "scenario_type":"TEST","action_id":"NONE",
            "functional_level_id":None,"ai_level_id":None,
            "coverage_by_pain":{},"capability_delta":{},
            "economics":{},"risk":{"inherent_level":"UNKNOWN",
              "residual_level":"UNKNOWN","status":"NOT_EVALUATED","rationale":"Fixture"},
            "quote":{}
        }
    })
    from aunea_backend.models import EngagementInput
    from aunea_backend.utils import stable_hash
    engagement=EngagementInput.model_validate(payload["request"]["engagement"])
    payload["request"]["diagnostic"]["input_snapshot_hash"]=stable_hash(engagement.model_dump())
    return payload


def test_rules_flag_explicit_conflicts_and_uncertain_claims_without_inference(monkeypatch):
    def blocked(*args,**kwargs):
        raise AssertionError("The basic reviewer must never request Ollama")
    monkeypatch.setattr(local._LOCAL_HTTP,"open",blocked)
    result=basic_review(data())
    assert result["review_mode"]=="RULES_ONLY"
    assert result["status"]=="CHECKED_WITH_NOTES"
    assert result["requires_human_review"] is True
    assert result["batches_checked"]==0
    assert "S1" in result["blocking_step_ids"]
    assert "S2" not in result["blocking_step_ids"]
    assert any(i["step_id"]=="S1" and i["category"]=="BLOCKING" for i in result["issues"])
    assert any(i["step_id"]=="S1" and "cifras" in i["issue"] for i in result["issues"])
    assert any(i["step_id"]=="S2" and i["category"]=="PENDING" for i in result["issues"])
    assert len(result["issues"])<15


def test_local_api_is_immediate_even_when_ai_flags_off(monkeypatch):
    def blocked(*args,**kwargs):
        raise AssertionError("No external provider call allowed")
    monkeypatch.setattr(local._LOCAL_HTTP,"open",blocked)
    monkeypatch.setenv("AUNEA_INTERNAL_AI_ENABLED","0")
    monkeypatch.setenv("AUNEA_INTERNAL_AI_PROVIDER","")
    payload=api_payload()
    response=TestClient(app).post("/v1/internal-ai/tobe-review-basic",json=payload)
    assert response.status_code==200,response.text
    body=response.json()
    assert body["review_mode"]=="RULES_ONLY"
    assert body["requires_human_review"] is True
    assert body["blocking_step_ids"]==["S1"]


def test_stale_source_or_fabricated_reference_is_rejected():
    payload=data()
    payload.items[1].source_refs=["S2","MADE_UP"]
    body=api_payload()
    body["items"][1]["source_refs"]=["S2","MADE_UP"]
    response=TestClient(app).post("/v1/internal-ai/tobe-review-basic",json=body)
    assert response.status_code==409
    assert "referencias" in str(response.json()).lower()


def test_clean_suggestions_are_checked_but_not_approved():
    payload=data()
    for item in payload.items:
        item.transformation="Se modifica"
        item.future_actor="Administración"
        item.limitations=""
        item.rationale="Acción propuesta: mejorar entrada. Resultado esperado: trazabilidad. Justificación: dato del origen."
    result=basic_review(payload)
    assert result["status"]=="CHECKED"
    assert result["issues"]==[]
    assert result["blocking_step_ids"]==[]
    assert result["requires_human_review"]
# [AUNEA-UAT-PG11-BASIC-REVIEW-222] END
