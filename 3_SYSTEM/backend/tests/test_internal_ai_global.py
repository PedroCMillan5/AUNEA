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
            "DF008":"Identificar retrasos en la recepción",
            "DF009":["Explicar cuellos de botella"],
            "DF086":["Reducir reprocesos sin perder controles"],
            "DF090":"No se permite acceso externo a los datos",
            "DF092":"Presupuesto declarado: limitado",
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
    assert context["client_constraints"]["DF092"].startswith("Presupuesto declarado")
    assert context["client_goals"]["DF008"].startswith("Identificar")
    assert "DF086" in context["client_goals"]
    assert "DF086" not in context["client_constraints"]
    assert "DF008" not in context["client_constraints"]
    assert "sensitive_noise" not in json.dumps(context)
    assert context.get("explicit_routes", [])==[]  # Compact projection omits empty values
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

@pytest.mark.parametrize(("field", "value", "error"), [
    ("why", "F1: 100 % de los casos requieren 5 minutos adicionales.", "fuentes vinculadas"),
    ("how", "Configurar un máximo de 24 horas para la aprobación.", "fuentes vinculadas"),
    ("why", "La espera dura dos días sin intervención.", "fuentes vinculadas"),
    ("constraints", "DF089: KEEP_EXISTING; DF090: RBAC, AUDIT_LOG.", "códigos"),
    ("how", "Este paso debe a", "incompleta"),
    ("summary", "Las intervenciones prop", "incompleta"),
])
def test_global_language_quality_rejects_unsupported_claims_and_cut_sentences(field, value, error):
    raw=candidate()
    target=raw if field=="summary" else raw["opportunities"][0]
    target[field]=value
    with pytest.raises(ValueError, match=error):
        global_ai.validate_global_brief(raw, {"S1", "F1"})


def test_global_quality_accepts_compact_conditional_advice_without_metrics():
    raw=candidate()
    raw["opportunities"][0]["how"]=(
        "Evaluar la reutilización de datos existentes, "
        "confirmando permisos y aprobaciones antes de cambiar el proceso."
    )
    result=global_ai.validate_global_brief(raw, {"S1", "F1"})
    assert result.opportunities[0].source_refs==["S1", "F1"]


def test_global_includes_actual_friction_metrics_and_time_attribution():
    request=sample()
    record=request.engagement.questionnaire_answers["_frictions"][0]
    record.update({
        "frequency":{"value":100,"mode":"percent","period":"case"},
        "active_time_loss":{"value":5,"unit":"min","source_unit":"min"},
        "time_attribution":{"mode":"INCLUDED","step_id":"S1"},
        "evidence_type":"EV02",
    })
    request.diagnostic.input_snapshot_hash=stable_hash(request.engagement.model_dump())
    context,ids=global_ai.global_context(request)
    assert ids=={"S1","S2","F1"}
    source=context["frictions"][0]
    assert source["frequency"]["value"]==100
    assert source["active_time_loss"]["value"]==5
    assert source["active_time_loss"]["unit"]=="min"
    assert source["time_attribution"]["mode"]=="INCLUDED"
    assert source["evidence_type"]=="EV02"


def test_global_accepts_exact_quantities_from_linked_friction_not_other_steps():
    request=sample()
    friction=request.engagement.questionnaire_answers["_frictions"][0]
    friction.update({
        "frequency":{"value":100,"mode":"percent","period":"case"},
        "active_time_loss":{"value":5,"unit":"min"},
        "time_attribution":{"mode":"INCLUDED","step_id":"S1"},
        "evidence_type":"EV02",
    })
    request.engagement.questionnaire_answers["_frictions"].append({
        "id":"F2","step_ids":["S2"],"client_label":"Aprobaciones retrasadas",
        "frequency":{"value":25,"mode":"percent","period":"case"},
        "wait_time_loss":{"value":720,"unit":"min"},
        "time_attribution":{"mode":"INCLUDED","step_id":"S2"},
        "evidence_type":"EV02",
    })
    request.diagnostic.input_snapshot_hash=stable_hash(request.engagement.model_dump())
    context,ids=global_ai.global_context(request)
    raw=candidate(refs=["F1","S1"])
    raw["opportunities"][0]["why"]=(
        "F1 afecta al 100 % de los casos, con 5 minutos de reintroducción "
        "ya incluidos en el paso."
    )
    raw["summary"]="F1 presenta un problema declarado de 100 % de casos afectados."
    result=global_ai.validate_global_brief(raw,ids,context)
    assert "100 %" in result.opportunities[0].why
    assert "5 minutos" in result.opportunities[0].why
    assert "INCLUDED" not in result.opportunities[0].why
    raw["opportunities"][0]["why"]=(
        "F1 afecta al 25 % de los casos, con 5 minutos de reintroducción."
    )
    with pytest.raises(ValueError,match="fuentes vinculadas"):
        global_ai.validate_global_brief(raw,ids,context)
    raw["opportunities"][0]["why"]=(
        "F1 afecta al 100 % de los casos, con 24 horas de espera."
    )
    with pytest.raises(ValueError,match="fuentes vinculadas"):
        global_ai.validate_global_brief(raw,ids,context)


def test_global_accepts_confirmed_signal_quantities_and_equivalent_units():
    request=sample()
    record=request.engagement.questionnaire_answers["_frictions"][0]
    record["observable_signal"]="En el 8 % de los casos se retrabaja durante 10 minutos."
    request.diagnostic.input_snapshot_hash=stable_hash(request.engagement.model_dump())
    context,ids=global_ai.global_context(request)
    raw=candidate(refs=["F1"])
    raw["opportunities"][0]["why"]=(
        "La fricción F1 afecta al 8 % de los casos y añade 10 minutos."
    )
    assert global_ai.validate_global_brief(raw,ids,context).opportunities
    record["wait_time_loss"]={"value":720,"unit":"min"}
    request.diagnostic.input_snapshot_hash=stable_hash(request.engagement.model_dump())
    context,ids=global_ai.global_context(request)
    raw["opportunities"][0]["why"]="La espera documentada es de 12 horas."
    assert global_ai.validate_global_brief(raw,ids,context).opportunities


def test_global_preserves_existing_approval_threshold_from_confirmed_map():
    request=sample()
    step=request.engagement.questionnaire_answers["_process_steps"][1]
    step["decision_criteria"]="La dirección aprueba si el importe supera 1.500 €."
    step["exception_path"]={
        "type":"OTHER","condition":"Importe superior a 1.500 euros",
        "destination_step":"S1"
    }
    request.diagnostic.input_snapshot_hash=stable_hash(request.engagement.model_dump())
    context,ids=global_ai.global_context(request)
    assert "1.500" in context["steps"][1]["decision_criteria"]
    raw=candidate(refs=["S2"])
    raw["opportunities"][0]["why"]=(
        "La aprobación superior a 1.500 euros requiere supervisión humana."
    )
    assert global_ai.validate_global_brief(raw,ids,context).opportunities
    raw["opportunities"][0]["why"]=(
        "La aprobación superior a 2.500 euros requiere supervisión humana."
    )
    with pytest.raises(ValueError, match="fuentes vinculadas"):
        global_ai.validate_global_brief(raw,ids,context)


def test_global_rejects_fabricated_metric_through_full_ollama_flow(monkeypatch):
    configure(monkeypatch)
    request=sample()
    f=request.engagement.questionnaire_answers["_frictions"][0]
    f["frequency"]={"value":100,"mode":"percent","period":"case"}
    f["active_time_loss"]={"value":5,"unit":"min"}
    request.diagnostic.input_snapshot_hash=stable_hash(request.engagement.model_dump())
    model=candidate(refs=["F1"])
    model["opportunities"][0]["why"]="La fricción implica 30 % de casos."
    def fake_open(_request,timeout=0):
        return io.BytesIO(json.dumps({
            "done":True,"done_reason":"stop","prompt_eval_count":1600,
            "message":{"content":json.dumps(model)}
        }).encode())
    monkeypatch.setattr(global_ai._LOCAL_HTTP,"open",fake_open)
    with pytest.raises(ValueError,match="fuentes vinculadas"):
        global_ai.analyze_global(request)


def test_global_schema_allows_complete_text_beyond_old_240_character_ceiling():
    schema=global_ai.global_schema()
    opportunity=schema["properties"]["opportunities"]["items"]["properties"]
    assert schema["properties"]["summary"]["maxLength"] >= 450
    assert opportunity["how"]["maxLength"] >= 500
    assert global_ai.MAX_GLOBAL_OUTPUT_TOKENS >= 1500
    raw=candidate()
    raw["summary"]=("Las fricciones confirmadas permiten identificar mejoras operativas. " * 5).strip()
    raw["opportunities"][0]["how"]=(
        "Se propone revisar la reutilización de los datos ya capturados, "
        "sin cambiar los permisos actuales ni eliminar la aprobación humana. "
        "Después debe validarse la compatibilidad de las herramientas existentes "
        "y definir una implantación gradual para evitar interrupciones."
    )
    assert len(raw["summary"]) > 240
    assert len(raw["opportunities"][0]["how"]) > 240
    result=global_ai.validate_global_brief(raw, {"S1", "F1"})
    assert result.summary == raw["summary"]
    assert result.opportunities[0].how == raw["opportunities"][0]["how"]


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
