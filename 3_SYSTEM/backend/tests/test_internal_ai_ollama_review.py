"""Ollama provider contract tests. No local daemon or paid API calls required."""
import io
import json
from urllib.request import Request
import pytest
from aunea_backend.models import EngagementInput, DiagnosticOutput
from aunea_backend.utils import stable_hash
from aunea_backend.registry import rule_bundle_version
from aunea_backend.internal_ai import PilotAIRequest
from aunea_backend import internal_ai_provider as provider
from aunea_backend import internal_ai_ollama as ollama

# [AUNEA-UAT-INTERNAL-AI-OLLAMA-194] START — local-only provider regression.
# SOURCE: PG10/PG11 review; DEC-034/052/055.
# INPUTS: synthetic snapshots, mocked local HTTP responses.
# OUTPUTS: no network, no writes, no cost and validation assertions.
# SIDE_EFFECTS: test process env and monkeypatch only. CHANGE_RISK: LOW.
def case():
    engagement = EngagementInput(
        engagement_id="LOCAL-TEST", process_instance_id="P1", process_name="Facturas",
        questionnaire_answers={"_process_steps":[
            {"id":"S1","tool":"ERP","status":"ACTIVE","step_name":"Validar"},
            {"id":"S2","tool":"ERP","status":"ACTIVE","step_name":"Aprobar"}]})
    diagnostic = DiagnosticOutput.model_construct(
        engagement_id=engagement.engagement_id,
        input_snapshot_hash=stable_hash(engagement.model_dump()),
        rule_bundle_version=rule_bundle_version())
    return PilotAIRequest.model_construct(engagement=engagement,diagnostic=diagnostic,
                                         confirmed_as_is=True,snapshot_version=1)

def suggestion(step_id):
    return dict(source_step_id=step_id,transformation="Se mantiene",
        problem_resolved="Revisar proceso",future_actor="Administración",tool="ERP",
        inputs="",outputs="",automation_ai="",human_supervision="Mantener aprobación",
        controls_risk="Revisión",rationale="Hipótesis por comprobar",
        source_refs=[step_id],limitations="Pendiente de contrastar")

def configure(monkeypatch):
    monkeypatch.setenv("AUNEA_INTERNAL_AI_PROVIDER", "ollama")
    monkeypatch.setenv("AUNEA_INTERNAL_AI_ENABLED", "1")
    monkeypatch.setenv("AUNEA_INTERNAL_AI_DATA_AUTHORIZED", "1")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

def fake_http(monkeypatch, *, installed=True, malicious=False):
    calls=[]
    def open_local(req,timeout=0):
        assert isinstance(req,Request)
        assert req.full_url.startswith("http://127.0.0.1:11434/api/")
        calls.append((req.full_url,timeout,req.data))
        if req.full_url.endswith("/api/tags"):
            result={"models":[{"name":ollama.DEFAULT_MODEL}]} if installed else {"models":[]}
        else:
            body=json.loads(req.data)
            assert body["model"]==ollama.DEFAULT_MODEL
            assert body["stream"] is False
            assert isinstance(body["format"],dict)
            assert body["options"]["num_ctx"] == 4096, "perfil local 16GB: no reservar contexto masivo"
            assert body["options"]["num_predict"] <= 2048
            items=[suggestion("S1"),suggestion("S2")]
            if malicious:items[0]["source_refs"]=["S1","UNTRUSTED"]
            result={"done":True,"message":{"role":"assistant","content":json.dumps({"items":items})}}
        return io.BytesIO(json.dumps(result).encode())
    monkeypatch.setattr(ollama._LOCAL_HTTP,"open",open_local)
    return calls

def test_ollama_off_by_default_never_probes(monkeypatch):
    configure(monkeypatch)
    monkeypatch.setenv("AUNEA_INTERNAL_AI_ENABLED","0")
    def no_calls(*args,**kwargs):
        raise AssertionError("No debe contactar a Ollama desactivado")
    monkeypatch.setattr(ollama._LOCAL_HTTP,"open",no_calls)
    assert provider.status()["status"]=="UNAVAILABLE"
    with pytest.raises(provider.ProviderUnavailable):
        provider.propose(case())

def test_local_success_without_openai_key_or_fallback(monkeypatch):
    configure(monkeypatch)
    calls=fake_http(monkeypatch)
    assert provider.status()["provider"]=="ollama"
    result=provider.propose(case())
    assert result.status=="DRAFT" and result.requires_human_review is True
    assert {x.source_step_id for x in result.items}=={"S1","S2"}
    assert all(url.startswith("http://127.0.0.1:11434/") for url,_,_ in calls)
    assert any(url.endswith("/api/chat") for url,_,_ in calls)

def test_missing_local_model_fails_closed_no_cloud(monkeypatch):
    configure(monkeypatch)
    calls=fake_http(monkeypatch,installed=False)
    status=provider.status()
    assert status["status"]=="UNAVAILABLE" and "ollama pull" in status["reason"]
    with pytest.raises(provider.ProviderUnavailable):
        provider.propose(case())
    assert all(url.endswith("/api/tags") for url,_,_ in calls)

def test_local_schema_output_still_validated(monkeypatch):
    configure(monkeypatch)
    fake_http(monkeypatch,malicious=True)
    with pytest.raises(ValueError,match="validación"):
        provider.propose(case())

def test_local_cloud_tag_refused(monkeypatch):
    configure(monkeypatch)
    monkeypatch.setenv("AUNEA_OLLAMA_MODEL","qwen3:4b-cloud")
    assert provider.status()["status"]=="UNAVAILABLE"
    with pytest.raises(provider.ProviderUnavailable):
        provider.propose(case())

def test_openai_is_explicit_only_and_unknown_provider_is_unavailable(monkeypatch):
    configure(monkeypatch)
    monkeypatch.setenv("AUNEA_INTERNAL_AI_PROVIDER","unexpected")
    assert provider.status()["status"]=="UNAVAILABLE"
    monkeypatch.setenv("AUNEA_INTERNAL_AI_PROVIDER","openai")
    assert provider.status()["status"]=="UNAVAILABLE"
    assert provider.status()["provider"]=="openai"
# [AUNEA-UAT-INTERNAL-AI-OLLAMA-194] END
