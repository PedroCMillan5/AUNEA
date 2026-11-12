"""PG11 basic coherence review: fast, deterministic and independent of Ollama."""
import pytest
from fastapi.testclient import TestClient
from aunea_backend.api import app
from aunea_backend.internal_ai import PilotAIConsolidationRequest
from aunea_backend.internal_ai_review_basic import basic_review
from aunea_backend.internal_ai_review import source_integrity_issues, _context
from aunea_backend.utils import stable_hash
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


def test_basic_review_enforces_only_fields_required_by_the_chosen_transformation():
    payload=data()
    payload.items[0].transformation="Se automatiza"
    payload.items[0].automation_ai=""
    payload.items[0].human_supervision=""
    payload.items[1].transformation="Se mantiene"
    result=basic_review(payload)
    targeted=[x for x in result["issues"] if x["step_id"]=="S1"
              and "exige describir" in x["issue"]]
    assert {x["evidence"] for x in targeted}=={
        "transformation / automation_ai","transformation / human_supervision"}
    assert "S1" in result["blocking_step_ids"]
    assert not any("exige describir" in x["issue"] and x["step_id"]=="S2"
                   for x in result["issues"])


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

def source_case(evidence_type="EV02"):
    req=data()
    q=req.request.engagement.questionnaire_answers
    q["_process_steps"][0]["outputs"]=["DOCUMENT","RECORD"]
    q["_frictions"]=[{
        "id":"F2","step_ids":["S1"],"client_label":"Falta de visibilidad",
        "frequency":{"mode":"percent","value":30},
        "active_time_loss":{"mode":"VALUE","value":10,"unit":"min"},
        "evidence_type":evidence_type
    }]
    req.items[0].source_refs=["S1","F2"]
    req.items[0].transformation="Se modifica"
    req.items[0].future_actor="Administración"
    req.items[0].limitations=""
    req.items[0].rationale=(
        "Acción propuesta: actualizar el registro existente y revisar la recepción. "
        "Resultado esperado: trazabilidad operativa. "
        "Justificación: 30 % de casos, 10 min de seguimiento por caso afectado."
    )
    req.request.diagnostic.input_snapshot_hash=stable_hash(req.request.engagement.model_dump())
    return req


def test_declared_historical_30_percent_and_10_minutes_are_not_unsourced_forecasts():
    req=source_case()
    assert not source_integrity_issues(req)
    review=basic_review(req)
    assert not any(x.get("origin")=="CONTROL_FUENTE_ASIS" for x in review["issues"])


def test_forecast_number_is_distinct_from_identical_historical_fraction():
    req=source_case()
    req.items[0].rationale=(
        "Acción propuesta: actualizar registro existente. "
        "Resultado esperado: reducir un 30 % los tiempos futuros. "
        "Justificación: el 30 % de casos del AS-IS requiere 10 min."
    )
    rows=source_integrity_issues(req)
    assert any("cifras de resultado futuro" in x["issue"] for x in rows)
    assert not any(x["category"]=="BLOCKING" for x in rows)


def test_friction_evidence_provenance_is_retained_instead_of_downgraded_or_upgraded():
    req=source_case("EV04")
    rows=source_integrity_issues(req)
    assert any("hipótesis" in x["issue"] and x["evidence"]=="F2" for x in rows)
    assert not any(x["category"]=="BLOCKING" for x in rows)
    req.items[0].limitations="La frecuencia y la duración del impacto son hipotéticas."
    assert not any(x["category"]=="BLOCKING" for x in source_integrity_issues(req))
    # The same unsupported statement is contradictory when evidence says declared.
    req.request.engagement.questionnaire_answers["_frictions"][0]["evidence_type"]="EV02"
    assert any(x["category"]=="BLOCKING" and "hipotéticos" in x["issue"]
               for x in source_integrity_issues(req))


def test_unverified_email_capability_and_existing_structured_record_are_not_invented():
    req=source_case()
    req.items[0].rationale=(
        "Acción propuesta: implementar registro automático con los datos recibidos. "
        "Resultado esperado: consulta más sencilla. Justificación: fricción F2."
    )
    req.items[0].limitations="La herramienta EMAIL no permite seguimiento automático."
    rows=source_integrity_issues(req)
    assert any("incapacidad de la herramienta" in x["issue"] and
               x["category"]=="PENDING" for x in rows)
    assert any("ya registra una salida estructurada" in x["issue"] for x in rows)
    assert not any(x["category"]=="BLOCKING" for x in rows)


def test_unlinked_step_numbers_and_unrecorded_numbers_do_not_validate_a_claim():
    req=source_case()
    req.items[0].rationale=(
        "Acción propuesta: adaptar la recepción. Resultado esperado: trazabilidad. "
        "Justificación: afecta al 45 % de casos y requiere 27 min."
    )
    rows=source_integrity_issues(req)
    assert len([x for x in rows if "cifras" in x["issue"]])==2
    assert all(x["category"]=="PENDING" for x in rows)


def test_semantic_reviewer_receives_canonical_measure_and_evidence_type():
    req=source_case()
    review_context=_context(req)
    friction=review_context["frictions"][0]
    assert friction["frequency"]["value"]==30
    assert friction["active_time_loss"]["value"]==10
    assert friction["evidence_type"]=="EV02"
    assert "RECORD" in review_context["activity_order"][0]["outputs"]

# [AUNEA-UAT-PG11-BASIC-REVIEW-222] END
