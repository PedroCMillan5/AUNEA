"""PG11 bounded global review: no runtime Ollama daemon or real client records."""
import io
import json
import pytest
from aunea_backend import internal_ai_review as review
from aunea_backend import internal_ai_ollama as local
from aunea_backend.internal_ai import PilotAIConsolidationRequest, PilotAIItem
from test_internal_ai_segmented_review import sample, wire

# [AUNEA-UAT-INTERNAL-AI-REVIEW-198] START
def proposal(id, expected=True):
    return PilotAIItem(
        source_step_id=id, transformation="Se modifica",
        problem_resolved="Entrada sin control", future_actor="Administración",
        tool="CRM", inputs="", outputs="", automation_ai="",
        human_supervision="Comprobar responsable", controls_risk="Registrar excepciones",
        rationale=("Acción propuesta: estandarizar la entrada. Resultado esperado: "
                   "menos incidencias. Justificación: el origen presenta una fricción."
                   if expected else "Falta información"),
        source_refs=[id], limitations="Confirmar reglas con el responsable."
    )

def mock_model(monkeypatch, issues=None, prompt_tokens=2600):
    wire(monkeypatch)
    received=[]
    def respond(req,timeout=0):
        assert req.full_url.endswith("/api/chat")
        data=json.loads(req.data)
        received.append(data)
        output={"summary":"Propuestas leídas para verificar coherencia global.",
                "issues":issues if issues is not None else []}
        result={"done":True,"prompt_eval_count":prompt_tokens,
                "message":{"content":json.dumps(output)}}
        return io.BytesIO(json.dumps(result).encode())
    monkeypatch.setattr(local._LOCAL_HTTP,"open",respond)
    return received

def test_review_reports_real_coherence_without_approving(monkeypatch):
    calls=mock_model(monkeypatch)
    payload=PilotAIConsolidationRequest(request=sample(),
        items=[proposal("S1"),proposal("S2")])
    data=review.consolidate(payload)
    assert data["status"]=="CHECKED"
    assert data["requires_human_review"] is True
    assert data["issues"]==[]
    assert data["batches_checked"]==1
    assert len(calls)==1
    assert calls[0]["stream"] is False
    assert calls[0]["options"]["num_predict"]==700
    assert calls[0]["model"]=="aunea-qwen3-4b:latest"
    assert len(json.dumps(calls[0]).encode()) < review.MAX_REVIEW_BYTES

def test_missing_improvement_and_expected_result_are_flagged(monkeypatch):
    mock_model(monkeypatch)
    broken=proposal("S2",expected=False)
    broken.problem_resolved=""
    data=review.consolidate(PilotAIConsolidationRequest(
        request=sample(),items=[proposal("S1"),broken]))
    assert data["status"]=="CHECKED_WITH_NOTES"
    messages=" ".join(i["issue"] for i in data["issues"])
    assert "resultado operativo" in messages and "oportunidad" in messages

def test_crossstep_issue_cited_by_source(monkeypatch):
    mock_model(monkeypatch,issues=[
        {"step_id":"S2","issue":"La decisión futura no define una vía de excepción."}
    ])
    result=review.consolidate(PilotAIConsolidationRequest(
        request=sample(),items=[proposal("S1"),proposal("S2")]))
    assert result["status"]=="CHECKED_WITH_NOTES"
    assert result["issues"][0]["step_id"]=="S2"

def test_unknown_source_rejected_before_model_call(monkeypatch):
    calls=mock_model(monkeypatch)
    wrong=proposal("S2")
    wrong.source_refs=["S2","MADE_UP"]
    with pytest.raises(ValueError, match="referencias"):
        review.consolidate(PilotAIConsolidationRequest(
            request=sample(),items=[proposal("S1"),wrong]))
    assert calls==[]

def test_model_review_unknown_step_fails_closed(monkeypatch):
    mock_model(monkeypatch,issues=[{"step_id":"NOT_IN_ASIS","issue":"No verificable"}])
    with pytest.raises(ValueError,match="fuentes"):
        review.consolidate(PilotAIConsolidationRequest(
            request=sample(),items=[proposal("S1"),proposal("S2")]))

def test_large_review_partitions_without_dropping_proposals(monkeypatch):
    wire(monkeypatch)
    items=[{"source_step_id":f"S{i}","transformation":"Se modifica",
            "problem_resolved":"Oportunidad a comprobar",
            "rationale":"Actuación de diseño con evidencia "*12,
            "source_refs":[f"S{i}"],"limitations":"Validar "*8}
           for i in range(18)]
    ctx={"process_name":"Caso multicapa",
         "activity_order":[{"id":f"S{i}","name":f"Actividad {i}"} for i in range(18)],
         "proposals":items}
    groups=review._batches(ctx)
    assert len(groups)>1
    assert [x["source_step_id"] for b in groups for x in b["proposals"]]==[f"S{i}" for i in range(18)]
    assert all(len(review._request_bytes(b))<=review.MAX_REVIEW_BYTES for b in groups)

def test_all_steps_kept_despite_linked_friction_warrants_review(monkeypatch):
    mock_model(monkeypatch,issues=[])
    a=proposal("S1")
    b=proposal("S2")
    a.transformation=b.transformation="Se mantiene"
    result=review.consolidate(PilotAIConsolidationRequest(request=sample(),items=[a,b]))
    assert result["status"]=="CHECKED_WITH_NOTES"
    assert any("fricciones vinculadas" in i["issue"] for i in result["issues"])

# [AUNEA-UAT-INTERNAL-AI-REVIEW-198] END
