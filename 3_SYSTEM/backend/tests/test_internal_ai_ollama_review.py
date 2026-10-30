"""Ollama provider contract tests. No local daemon or paid API calls required."""
import io
import json
from urllib.request import Request
from urllib.error import HTTPError, URLError
import socket
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
    monkeypatch.delenv("AUNEA_OLLAMA_NUM_CTX", raising=False)
    monkeypatch.delenv("AUNEA_OLLAMA_TIMEOUT_SECONDS", raising=False)

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
            assert body["options"]["num_ctx"] == ollama.context_window(), "El valor de contexto enviado debe coincidir con el configurado"
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

def test_explicit_24k_context_is_sent_to_ollama_and_exposed_in_status(monkeypatch):
    configure(monkeypatch)
    monkeypatch.setenv("AUNEA_OLLAMA_NUM_CTX", "24576")
    monkeypatch.setenv("AUNEA_OLLAMA_TIMEOUT_SECONDS", "900")
    calls = fake_http(monkeypatch)
    status = provider.status()
    assert status["status"] == "AVAILABLE" and status["num_ctx"] == 24576
    result = provider.propose(case())
    assert result.status == "DRAFT"
    chat = next((json.loads(data), timeout) for url,timeout,data in calls
                if url.endswith("/api/chat"))
    assert chat[0]["options"]["num_ctx"] == 24576
    assert chat[0]["options"]["num_predict"] == 2048
    assert chat[1] == 900
    assert chat[0]["model"] == ollama.DEFAULT_MODEL


@pytest.mark.parametrize("value", ["0", "999", "24577", "-1", "banana", ""])
def test_invalid_context_setting_fails_closed_before_network(monkeypatch, value):
    configure(monkeypatch)
    monkeypatch.setenv("AUNEA_OLLAMA_NUM_CTX", value)
    def no_calls(*args, **kwargs):
        raise AssertionError("No debe contactar Ollama con contexto inválido")
    monkeypatch.setattr(ollama._LOCAL_HTTP, "open", no_calls)
    status = provider.status()
    assert status["status"] == "UNAVAILABLE"
    assert "AUNEA_OLLAMA_NUM_CTX" in status["reason"]


def test_default_context_is_4096_and_default_timeout_is_240(monkeypatch):
    configure(monkeypatch)
    calls=fake_http(monkeypatch)
    assert provider.status()["num_ctx"] == 4096
    provider.propose(case())
    chat=next((json.loads(data), timeout) for url,timeout,data in calls
              if url.endswith("/api/chat"))
    assert chat[0]["options"]["num_ctx"] == 4096
    assert chat[1] == 240


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
def test_custom_timeout_reports_selected_limit_without_sensitive_details(monkeypatch):
    configure(monkeypatch)
    monkeypatch.setenv("AUNEA_OLLAMA_NUM_CTX","24576")
    monkeypatch.setenv("AUNEA_OLLAMA_TIMEOUT_SECONDS","900")
    def fake(req,timeout=0):
        if req.full_url.endswith("/api/tags"):
            return io.BytesIO(json.dumps({"models":[{"name":ollama.DEFAULT_MODEL}]}).encode())
        assert timeout == 900
        raise socket.timeout("local private invoice data")
    monkeypatch.setattr(ollama._LOCAL_HTTP, "open", fake)
    with pytest.raises(provider.ProviderUnavailable,match="900 segundos") as ex:
        provider.propose(case())
    assert "private invoice" not in str(ex.value)


def test_ollama_http_out_of_memory_shows_safe_reason(monkeypatch):
    configure(monkeypatch)
    base_open=ollama._LOCAL_HTTP.open
    def fake(req,timeout=0):
        if req.full_url.endswith("/api/tags"):
            return io.BytesIO(json.dumps({"models":[{"name":ollama.DEFAULT_MODEL}]}).encode())
        body=io.BytesIO(json.dumps({"error":
            "llama-server reported out-of-memory; failed to allocate 19327352832 bytes"}).encode())
        raise HTTPError(req.full_url, 500, "failed", {}, body)
    monkeypatch.setattr(ollama._LOCAL_HTTP, "open", fake)
    with pytest.raises(provider.ProviderUnavailable,match="sin memoria"):
        provider.propose(case())


def test_ollama_http_context_overflow_is_not_a_generic_503(monkeypatch):
    configure(monkeypatch)
    def fake(req,timeout=0):
        if req.full_url.endswith("/api/tags"):
            return io.BytesIO(json.dumps({"models":[{"name":ollama.DEFAULT_MODEL}]}).encode())
        raise HTTPError(req.full_url, 400, "bad request", {},
            io.BytesIO(json.dumps({"error":"prompt exceeds context window"}).encode()))
    monkeypatch.setattr(ollama._LOCAL_HTTP, "open", fake)
    with pytest.raises(provider.ProviderUnavailable,match="ventana de contexto"):
        provider.propose(case())


def test_ollama_timeout_is_explained_without_echoing_private_details(monkeypatch):
    configure(monkeypatch)
    def fake(req,timeout=0):
        if req.full_url.endswith("/api/tags"):
            return io.BytesIO(json.dumps({"models":[{"name":ollama.DEFAULT_MODEL}]}).encode())
        raise socket.timeout("private folder C:/client/secret")
    monkeypatch.setattr(ollama._LOCAL_HTTP, "open", fake)
    with pytest.raises(provider.ProviderUnavailable,match="240 segundos") as ex:
        provider.propose(case())
    assert "private folder" not in str(ex.value)


def test_ollama_unclassified_error_does_not_leak_raw_provider_body(monkeypatch):
    configure(monkeypatch)
    def fake(req,timeout=0):
        if req.full_url.endswith("/api/tags"):
            return io.BytesIO(json.dumps({"models":[{"name":ollama.DEFAULT_MODEL}]}).encode())
        raise HTTPError(req.full_url, 500, "secret", {},
            io.BytesIO(json.dumps({"error":"secret customer invoice ABC123"}).encode()))
    monkeypatch.setattr(ollama._LOCAL_HTTP, "open", fake)
    with pytest.raises(provider.ProviderUnavailable,match="HTTP 500") as ex:
        provider.propose(case())
    assert "ABC123" not in str(ex.value)


# [AUNEA-UAT-INTERNAL-AI-OLLAMA-194] END
