"""Bounded PG11 Ollama step generator regression, no paid or real local inference."""
import io
import json
import pytest
from aunea_backend import internal_ai_ollama as local
from aunea_backend import internal_ai_provider as provider
from aunea_backend.internal_ai import PilotAIRequest, validate_pilot_source
from aunea_backend.models import EngagementInput, DiagnosticOutput
from aunea_backend.registry import rule_bundle_version
from aunea_backend.utils import stable_hash

# [AUNEA-UAT-INTERNAL-AI-STEP-195] START
def sample():
    e=EngagementInput(engagement_id="TEST-STEP",process_instance_id="PROC-1",
        process_name="Gestión de solicitudes",
        questionnaire_answers={
          "_process_steps":[{"id":"S1","step_name":"Registrar","tool":"CRM"},
                            {"id":"S2","step_name":"Aprobar","tool":"CRM"}],
          "_frictions":[{"id":"F1","step_ids":["S1"],"observable_signal":"Entrada duplicada"}],
          "_answer_details":{"notes":"large private data marker " * 1600},
        })
    d=DiagnosticOutput.model_construct(engagement_id=e.engagement_id,
        input_snapshot_hash=stable_hash(e.model_dump()),
        rule_bundle_version=rule_bundle_version())
    return PilotAIRequest.model_construct(
        engagement=e, diagnostic=d, confirmed_as_is=True, snapshot_version=2)

def wire(monkeypatch):
    monkeypatch.setenv("AUNEA_OLLAMA_MODEL","aunea-qwen3-4b:latest")
    monkeypatch.setenv("AUNEA_INTERNAL_AI_PROVIDER","ollama")
    monkeypatch.setenv("AUNEA_INTERNAL_AI_ENABLED","1")
    monkeypatch.setenv("AUNEA_INTERNAL_AI_DATA_AUTHORIZED","1")
    monkeypatch.setenv("AUNEA_OLLAMA_NUM_CTX","8192")
    monkeypatch.setenv("AUNEA_OLLAMA_TIMEOUT_SECONDS","480")
    log=[]
    def open(req,timeout=0):
        log.append((req.full_url,timeout,req.data))
        if req.full_url.endswith("/api/tags"):
            result={"models":[{"name":"aunea-qwen3-4b:latest"}]}
        else:
            body=json.loads(req.data)
            user=json.loads(body["messages"][1]["content"].split("\n",1)[1])
            id=user["current_activity"]["id"]
            item={"source_step_id":id,"transformation":"Se mantiene",
                  "problem_resolved":"","future_actor":"",
                  "tool":"CRM","inputs":"","outputs":"","automation_ai":"",
                  "human_supervision":"","controls_risk":"",
                  "rationale":"Revisión basada en la fuente","source_refs":[id],
                  "limitations":"Análisis segmentado; revisar relaciones"}
            result={"done":True,"prompt_eval_count":2200,
                    "message":{"content":json.dumps({"items":[item]})}}
        return io.BytesIO(json.dumps(result).encode())
    monkeypatch.setattr(local._LOCAL_HTTP,"open",open)
    return log

def test_independent_steps_and_explicit_links(monkeypatch):
    calls=wire(monkeypatch)
    request=sample()
    steps=validate_pilot_source(request)
    schema=provider._schema()
    a=local.propose_step(request,steps,schema,provider._INSTRUCTIONS,"S1")
    b=local.propose_step(request,steps,schema,provider._INSTRUCTIONS,"S2")
    assert [a.source_step_id,b.source_step_id]==["S1","S2"]
    chat=[json.loads(data) for url,timeout,data in calls if url.endswith("/api/chat")]
    assert len(chat)==2
    assert all(url.endswith("/api/chat") for url,_,_ in calls), "No repeated /api/tags between inference steps"
    assert all(x["keep_alive"]=="5m" for x in chat)
    assert all(x["format"]["properties"]["items"]["items"]["properties"]["source_step_id"]["enum"]==[sid] for x,sid in zip(chat,("S1","S2")))
    assert all(set(x["format"]["properties"]["items"]["items"]["properties"]["tool"]["enum"])=={"","CRM"} for x in chat)
    assert "F1" not in chat[1]["format"]["properties"]["items"]["items"]["properties"]["source_refs"]["items"]["enum"]
    assert all(x["options"]["num_predict"]<=1024 and x["options"]["num_ctx"]==8192 for x in chat)
    one=chat[0]["messages"][1]["content"]
    two=chat[1]["messages"][1]["content"]
    assert "Entrada duplicada" in one
    assert "Entrada duplicada" not in two
    assert "large private data marker" not in one
    assert len(json.dumps(chat[0]).encode()) < local.STEP_MAX_PROMPT_BYTES

def test_no_silent_truncation_of_oversized_current_step(monkeypatch):
    calls=wire(monkeypatch)
    req=sample()
    req.engagement.questionnaire_answers["_process_steps"][0]["notes"]="large step value " * 2500
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    steps=validate_pilot_source(req)
    with pytest.raises(ValueError,match="excede el presupuesto"):
        local.propose_step(req,steps,provider._schema(),provider._INSTRUCTIONS,"S1")
    assert not any(url.endswith("/api/chat") for url,_,_ in calls)

def test_unknown_step_rejected_without_inference(monkeypatch):
    calls=wire(monkeypatch)
    req=sample()
    with pytest.raises(ValueError,match="no encontrada"):
        local.propose_step(req,validate_pilot_source(req),provider._schema(),
                           provider._INSTRUCTIONS,"UNLINKED")
    assert not any(url.endswith("/api/chat") for url,_,_ in calls)

def test_measured_over_budget_refused(monkeypatch):
    log=wire(monkeypatch)
    base=local._LOCAL_HTTP.open
    def higher(req,timeout=0):
        if req.full_url.endswith("/api/tags"):
            return base(req,timeout)
        data=json.loads(base(req,timeout).read())
        data["prompt_eval_count"]=4001
        return io.BytesIO(json.dumps(data).encode())
    monkeypatch.setattr(local._LOCAL_HTTP,"open",higher)
    req=sample()
    with pytest.raises(ValueError,match="4000 tokens"):
        local.propose_step(req,validate_pilot_source(req),
                           provider._schema(),provider._INSTRUCTIONS,"S1")

def test_unlinked_friction_cannot_be_cited_as_step_evidence(monkeypatch):
    wire(monkeypatch)
    previous=local._LOCAL_HTTP.open
    def poisoned(req,timeout=0):
        response=previous(req,timeout)
        if req.full_url.endswith("/api/tags"):
            return response
        result=json.loads(response.read())
        item=json.loads(result["message"]["content"])["items"][0]
        item["source_refs"]=[item["source_step_id"],"F1"]
        result["message"]["content"]=json.dumps({"items":[item]})
        return io.BytesIO(json.dumps(result).encode())
    monkeypatch.setattr(local._LOCAL_HTTP,"open",poisoned)
    req=sample()
    with pytest.raises(ValueError,match="IA_STEP_REFS"):
        local.propose_step(req,validate_pilot_source(req),
                           provider._schema(),provider._INSTRUCTIONS,"S2")

def test_step_output_diagnostic_codes_are_safe_and_specific():
    request=sample()
    record={"source_step_id":"S1","transformation":"Se modifica",
        "problem_resolved":"Estandarizar entrada","future_actor":"",
        "tool":"CRM","inputs":"","outputs":"","automation_ai":"",
        "human_supervision":"","controls_risk":"",
        "rationale":"Acción propuesta: registrar entradas. Resultado esperado: trazabilidad. Justificación: paso S1.",
        "source_refs":["S1"],"limitations":"Validar alcance."}
    def response(record):
        return {"done":True,"message":{"content":json.dumps({"items":[record]})}}
    assert local._validated_step_json(request,"S1",response(record)).source_step_id=="S1"
    cases=[
        ({"message":{"content":"{"}}, "IA_STEP_JSON"),
        ({"done_reason":"length","message":{"content":"{}"}}, "IA_STEP_LENGTH"),
        (response({**record,"tool":"Herramienta inventada"}), "IA_STEP_TOOL"),
        (response({**record,"source_refs":["S1","FALSO"]}), "IA_STEP_REFS"),
        (response({**record,"source_step_id":"S2"}), "IA_STEP_ORIGIN"),
        (response({**record,"transformation":"Transformación inventada"}), "IA_STEP_FIELD"),
    ]
    for payload,code in cases:
        with pytest.raises(ValueError,match=code) as error:
            local._validated_step_json(request,"S1",payload)
        assert "Herramienta inventada" not in str(error.value)
        assert "FALSO" not in str(error.value)


def test_confirmed_process_routes_shared_with_each_step_without_inventing_links(monkeypatch):
    calls=wire(monkeypatch)
    req=sample()
    steps=req.engagement.questionnaire_answers["_process_steps"]
    steps[0]["normal_next_step"]="S2"
    steps[1]["step_type"]="ST04"
    steps[1]["decision_criteria"]=["Control documental"]
    steps[1]["normal_next_step"]="__END__"
    steps[1]["exception_path"]={"condition":"Excepción validada","destination_step":"S1",
                                 "owner":"Responsable"}
    req.engagement.questionnaire_answers["_unrelated_study"]={"client":"NO_OTHER_STUDY"}
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    active=validate_pilot_source(req)
    for sid in ("S1","S2"):
        local.propose_step(req,active,provider._schema(),provider._INSTRUCTIONS,sid)
    contexts=[json.loads(json.loads(data)["messages"][1]["content"].split("\n",1)[1])
              for url,_,data in calls if url.endswith("/api/chat")]
    assert len(contexts)==2
    routes=contexts[0]["process_flow"]["explicit_routes"]
    assert routes==[
        {"from":"S1","to":"S2","route":"normal","source":"ProcessStep"},
        {"from":"S2","to":"__END__","route":"normal","source":"ProcessStep"},
        {"from":"S2","to":"S1","route":"exception","source":"ProcessStep"},
    ]
    assert contexts[0]["process_flow"]==contexts[1]["process_flow"]
    assert contexts[1]["process_flow"]["activities"][1]["decision_criteria"]==["Control documental"]
    assert "NO_OTHER_STUDY" not in json.dumps(contexts)


def test_missing_routes_do_not_become_confirmed_links():
    req=sample()
    active=validate_pilot_source(req)
    routes=local.explicit_pilot_process_flow(active)
    assert routes["explicit_routes"]==[]
    assert {x["step_id"] for x in routes["unresolved_routes"]}=={"S1","S2"}
    active[0]["normal_next_step"]="DOES_NOT_EXIST"
    routes=local.explicit_pilot_process_flow(active)
    assert routes["explicit_routes"]==[]
    assert any(x["reason"]=="destino_no_vigente" for x in routes["unresolved_routes"])


def test_step_trace_lists_actual_inputs_not_other_studies():
    req=sample()
    steps=validate_pilot_source(req)
    trace=local.step_context_trace(req,steps,"S1")
    assert trace["source_step_id"]=="S1"
    assert trace["friction_ids"]==["F1"]
    assert trace["risk_ids"]==[]
    assert trace["evidence_ids"]==[]
    assert trace["explicit_routes"]==[]
    assert trace["context_scope"]=="SOLO_ESTUDIO_ACTIVO_CONFIRMADO"
    assert trace["diagnostic_mode"]=="REFERENCIA_HASH_SIN_DIAGNOSTICO_COMPLETO"
    assert "large private data marker" not in json.dumps(trace)




@pytest.mark.parametrize('process,names,ids', [
    ('Levante QA — Facturas', ['Recepción','Condiciones de aprobación','Aprobación humana','Registro ERP'],
     ['UAT-LIT-P1','UAT-LIT-P2','UAT-LIT-P3','UAT-LIT-P4']),
    ('QA — Planificación de turnos', ['Recoger disponibilidad','Asignar turnos','Confirmar calendario'],
     ['TURN-1','TURN-2','TURN-3']),
])
def test_actual_wire_audit_and_diagnostic_projection_two_processes(monkeypatch, process, names, ids):
    from aunea_backend.models import PainResult, Evidence
    calls=wire(monkeypatch)
    req=sample()
    req.engagement.process_name=process
    req.engagement.questionnaire_answers['_process_steps']=[
        {'id':sid,'step_name':name,'tool':'CRM','normal_next_step':ids[i+1] if i+1<len(ids) else '__END__'}
        for i,(sid,name) in enumerate(zip(ids,names))]
    req.engagement.questionnaire_answers['_frictions']=[
        {'id':'F1','step_ids':[ids[0]],'derived_pain_id':'P01','observable_signal':'Registro duplicado QA'}]
    req.engagement.evidence=[Evidence(evidence_id='EV-F1',type='HYPOTHESIS',description='Premisa sintética')]
    req.diagnostic.pain_results=[PainResult(pain_id='P01',state='INDICATED',confidence='LOW',rationale='Hipótesis QA'),
                                 PainResult(pain_id='P02',state='NOT_DETECTED',confidence='UNKNOWN')]
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    steps=validate_pilot_source(req)
    for sid in ids:
        item,trace,error=local.audited_step(req,steps,provider._schema(),provider._INSTRUCTIONS,sid)
        assert error is None and item.source_step_id==sid
        attempt=trace['attempts'][0]
        wire_body=json.loads(calls[-1][2])
        assert attempt['request']==wire_body # with no sensitive data, view equals exact transmitted request
        assert attempt['request_bytes']==len(calls[-1][2])
        assert attempt['original_response']['items'][0]==item.model_dump(mode='json')
        assert attempt['prompt_eval_count']==2200
        context=json.loads(wire_body['messages'][1]['content'].split('\n',1)[1])
        findings=context['official_diagnostic_findings'].get('linked_pain_results', [])
        assert [x['pain_id'] for x in findings]==(['P01'] if sid==ids[0] else [])
        assert context['process_flow']['explicit_routes'][0]['to']==ids[1]
    assert len(calls)==len(ids)


def test_output_contract_repair_is_once_and_audits_both_real_responses(monkeypatch):
    calls=wire(monkeypatch)
    original=local._LOCAL_HTTP.open
    def invalid(req,timeout=0):
        response=json.loads(original(req,timeout).read())
        payload=json.loads(response['message']['content'])
        payload['items'][0]['source_refs']=['UNRELATED']
        response['message']['content']=json.dumps(payload)
        response['message']['thinking']='HIDDEN REASONING'
        return io.BytesIO(json.dumps(response).encode())
    monkeypatch.setattr(local._LOCAL_HTTP,'open',invalid)
    req=sample()
    item,trace,error=local.audited_step(req,validate_pilot_source(req),provider._schema(),provider._INSTRUCTIONS,'S1')
    assert item is None and 'IA_STEP_REFS' in error
    assert len(calls)==2 and len(trace['attempts'])==2 and trace['correction_attempted']
    assert 'HIDDEN REASONING' not in json.dumps(trace)
    assert trace['attempts'][0]['original_response']['items'][0]['source_refs']==['UNRELATED']
    correction=json.loads(calls[1][2])['messages'][1]['content']
    assert 'targeted_correction' in correction and 'IA_STEP_REFS' in correction


def test_audit_redacts_nested_secrets_and_email_without_modifying_wire(monkeypatch):
    calls=wire(monkeypatch)
    req=sample()
    req.engagement.questionnaire_answers['_process_steps'][0]['metadata']={
        'password':'PRIVATE-SECRET', 'contact':'private@example.test'}
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    item,trace,error=local.audited_step(req,validate_pilot_source(req),provider._schema(),provider._INSTRUCTIONS,'S1')
    assert item and not error and trace['redacted']
    assert 'PRIVATE-SECRET' in calls[0][2].decode()
    assert 'PRIVATE-SECRET' not in json.dumps(trace) and 'private@example.test' not in json.dumps(trace)
    assert trace['attempts'][0]['request_bytes']==len(calls[0][2])


def test_oversize_audit_identifies_component_without_call_or_retry(monkeypatch):
    calls=wire(monkeypatch)
    req=sample()
    req.engagement.questionnaire_answers['_process_steps'][0]['notes']='X'*20000
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    item,trace,error=local.audited_step(req,validate_pilot_source(req),provider._schema(),provider._INSTRUCTIONS,'S1')
    assert item is None and 'current_activity' in error and not calls
    assert len(trace['attempts'])==1 and not trace['attempts'][0]['sent']


def test_step_endpoint_auth_and_snapshot_isolation_before_inference(monkeypatch):
    from fastapi import HTTPException
    from starlette.requests import Request
    from aunea_backend.api import internal_ai_tobe_step
    from aunea_backend.internal_ai import PilotAIStepRequest
    calls=wire(monkeypatch)
    source=sample()
    payload=PilotAIStepRequest.model_construct(request=source,source_step_id='S1')
    remote=Request({'type':'http','client':('203.0.113.1',1234)})
    with pytest.raises(HTTPException) as err:
        internal_ai_tobe_step(payload,remote)
    assert err.value.status_code==403 and not calls
    localhost=Request({'type':'http','client':('127.0.0.1',1234)})
    monkeypatch.setenv('AUNEA_INTERNAL_AI_DATA_AUTHORIZED','0')
    with pytest.raises(HTTPException) as err:
        internal_ai_tobe_step(payload,localhost)
    assert err.value.status_code==503 and not calls
    monkeypatch.setenv('AUNEA_INTERNAL_AI_DATA_AUTHORIZED','1')
    source.diagnostic.engagement_id='ANOTHER-STUDY'
    with pytest.raises(HTTPException) as err:
        internal_ai_tobe_step(payload,localhost)
    assert err.value.status_code==409 and not calls
    source.diagnostic.engagement_id=source.engagement.engagement_id
    response=internal_ai_tobe_step(payload,localhost)
    assert response['engagement_id']==source.engagement.engagement_id
    assert response['context_trace']['attempts'][0]['request']==json.loads(calls[0][2])
# [AUNEA-UAT-INTERNAL-AI-STEP-195] END
