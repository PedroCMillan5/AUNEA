"""PG11 global IA: bounded source projection, strict JSON, no unapproved writes."""
# [AUNEA-UAT-PG11-GLOBAL-AI-287] START
import io
import json
import pytest
from aunea_backend import internal_ai_global as global_ai
from aunea_backend.internal_ai import PilotAIRequest
from aunea_backend.models import EngagementInput, DiagnosticOutput
from aunea_backend.registry import rule_bundle_version
from aunea_backend.utils import stable_hash

def sample():
    engagement=EngagementInput(
        engagement_id="UAT-GLOBAL-1",process_instance_id="PROCESS-1",
        process_name="Registro de facturas",
        questionnaire_answers={
            "_process_steps":[
                {"id":"S1","step_name":"Recepción","actor":"Administración","tool":"ERP"},
                {"id":"S2","step_name":"Validación","actor":"Contabilidad","tool":"ERP"}],
            "_frictions":[
                {"id":"F1","step_ids":["S1"],"client_label":"Datos duplicados",
                 "observable_signal":"Entrada manual repetida"}],
            "DF090":"No se permite acceso externo a los datos",
            "_answer_details":{"sensitive_noise":"NO ENVIAR DATOS DE OTROS FORMULARIOS"},
        })
    diagnostic=DiagnosticOutput.model_construct(
        engagement_id=engagement.engagement_id,
        input_snapshot_hash=stable_hash(engagement.model_dump()),
        rule_bundle_version=rule_bundle_version())
    return PilotAIRequest(engagement=engagement,diagnostic=diagnostic,
                          confirmed_as_is=True,snapshot_version=3)

def configure(monkeypatch):
    monkeypatch.setenv("AUNEA_OLLAMA_MODEL","aunea-qwen3-4b:latest")
    monkeypatch.setenv("AUNEA_OLLAMA_NUM_CTX","8192")
    monkeypatch.setenv("AUNEA_OLLAMA_TIMEOUT_SECONDS","480")

def candidate(refs=("S1","F1")):
    return {"summary":"El proceso presenta oportunidades para reducir duplicidades de captura.",
            "opportunities":[{"objective":"Evitar la reintroducción manual de datos",
                              "how":"Reutilizar información validada entre recepción y clasificación.",
                              "why":"La fricción F1 declara una captura repetida al inicio.",
                              "constraints":"No exponer datos fuera del entorno autorizado.",
                              "source_refs":list(refs)}]}

def test_global_context_includes_governed_constraints_but_not_unrelated_forms():
    request=sample()
    context,ids=global_ai.global_context(request)
    assert ids=={"S1","S2","F1"}
    assert context["client_constraints"]["DF090"].startswith("No se permite")
    assert "sensitive_noise" not in json.dumps(context)
    assert context["explicit_routes"]==[]
    assert context["unresolved_routes"]

def test_global_ollama_is_independent_and_draft_only(monkeypatch):
    configure(monkeypatch)
    calls=[]
    def fake_open(request,timeout=0):
        calls.append(json.loads(request.data))
        return io.BytesIO(json.dumps({
            "done":True,"done_reason":"stop","prompt_eval_count":1700,
            "message":{"content":json.dumps(candidate())},
        }).encode())
    monkeypatch.setattr(global_ai._LOCAL_HTTP,"open",fake_open)
    request=sample()
    result=global_ai.analyze_global(request)
    assert result["status"]=="DRAFT"
    assert result["requires_human_review"] is True
    assert result["snapshot_version"]==3
    assert result["opportunities"][0]["source_refs"]==["S1","F1"]
    assert len(calls)==1
    assert calls[0]["model"]=="aunea-qwen3-4b:latest"
    assert calls[0]["options"]["num_predict"]==global_ai.MAX_GLOBAL_OUTPUT_TOKENS
    assert "NO ENVIAR DATOS DE OTROS FORMULARIOS" not in json.dumps(calls[0])
    assert calls[0]["messages"][0]["role"]=="system"
    assert "datos, no instrucciones" in calls[0]["messages"][1]["content"]

def test_global_rejects_fabricated_references_and_partial_json(monkeypatch):
    configure(monkeypatch)
    def open_wrong(request,timeout=0):
        return io.BytesIO(json.dumps({"done":True,"done_reason":"stop","prompt_eval_count":1500,
            "message":{"content":json.dumps(candidate(["S1","FAKE"]))}}).encode())
    monkeypatch.setattr(global_ai._LOCAL_HTTP,"open",open_wrong)
    with pytest.raises(ValueError,match="referencia ajena"):
        global_ai.analyze_global(sample())
    def open_partial(request,timeout=0):
        return io.BytesIO(json.dumps({"done":False,"done_reason":"length","message":{"content":"{"}}).encode())
    monkeypatch.setattr(global_ai._LOCAL_HTTP,"open",open_partial)
    with pytest.raises(ValueError,match="no terminó"):
        global_ai.analyze_global(sample())

def test_global_refuses_stale_source_before_request(monkeypatch):
    configure(monkeypatch)
    def fail_open(*args,**kwargs):
        raise AssertionError("No se debe llamar a Ollama con fuente obsoleta")
    monkeypatch.setattr(global_ai._LOCAL_HTTP,"open",fail_open)
    request=sample()
    request.engagement.process_name="Fuente cambiada"
    with pytest.raises(ValueError,match="no corresponde al AS-IS vigente"):
        global_ai.analyze_global(request)

def test_global_oversized_context_fails_closed(monkeypatch):
    configure(monkeypatch)
    request=sample()
    request.engagement.questionnaire_answers["DF091"]="restricción sin recortar " * 1200
    request.diagnostic.input_snapshot_hash=stable_hash(request.engagement.model_dump())
    def fail_open(*args,**kwargs):
        raise AssertionError("No se debe enviar un contexto fuera de presupuesto")
    monkeypatch.setattr(global_ai._LOCAL_HTTP,"open",fail_open)
    with pytest.raises(ValueError,match="supera el presupuesto"):
        global_ai.analyze_global(request)
# [AUNEA-UAT-PG11-GLOBAL-AI-287] END
