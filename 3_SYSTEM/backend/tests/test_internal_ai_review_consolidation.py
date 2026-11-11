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

def test_nine_fields_have_explicit_presence_without_invented_omission_reason():
    from aunea_backend.internal_ai import PILOT_AI_FIELDS, pilot_field_presence
    candidate = proposal("S1")
    candidate.automation_ai = "N/A"
    candidate.outputs = ""
    status = pilot_field_presence(candidate)
    assert len(PILOT_AI_FIELDS) == 9
    assert set(status) == set(PILOT_AI_FIELDS)
    assert status["automation_ai"] is False
    assert status["outputs"] is False
    assert status["future_actor"] is True
    assert status["transformation"] is True


@pytest.mark.parametrize("transformation,missing_field", [
    ("Se automatiza", "automation_ai"),
    ("Se automatiza", "human_supervision"),
    ("Se asiste con IA", "automation_ai"),
    ("Se asiste con IA", "human_supervision"),
    ("Se incorpora control", "controls_risk"),
    ("Requiere decisión humana", "human_supervision"),
])
def test_cross_field_contract_blocks_only_requirements_of_selected_transformation(transformation,missing_field):
    candidate=proposal("S1")
    candidate.transformation=transformation
    candidate.automation_ai="Registro por reglas; sujeto a comprobación de viabilidad"
    candidate.human_supervision="Finanzas revisa excepciones y rechaza operaciones inválidas"
    candidate.controls_risk="Registrar cada excepción y decisión auditable"
    setattr(candidate,missing_field,"")
    gaps=review._transformation_field_gaps([candidate])
    assert len(gaps)==1
    assert gaps[0]["step_id"]=="S1"
    assert gaps[0]["category"]=="BLOCKING"
    assert missing_field in gaps[0]["evidence"]


def test_consolidation_marks_required_missing_field_as_blocking_without_autoapproval(monkeypatch):
    calls=mock_model(monkeypatch)
    first=proposal("S1")
    first.transformation="Se automatiza"
    first.automation_ai="Registro automático de solicitudes cuando exista capacidad técnica"
    first.human_supervision=""
    data=review.consolidate(PilotAIConsolidationRequest(
        request=sample(),items=[first,proposal("S2")]),repair=False)
    assert data["blocking_step_ids"]==["S1"]
    issue=next(i for i in data["issues"] if i["origin"]=="CONTRATO_CAMPOS_IA")
    assert issue["category"]=="BLOCKING"
    assert issue["step_id"]=="S1"
    assert issue["evidence"]=="transformation / human_supervision"
    assert data["requires_human_review"] is True
    assert len(calls)==1


def test_no_demand_for_nine_filled_fields_when_transformation_is_maintained():
    item=proposal("S1")
    item.transformation="Se mantiene"
    item.inputs=item.outputs=item.automation_ai=item.controls_risk=""
    assert review._transformation_field_gaps([item])==[]


def test_review_reports_real_coherence_without_approving(monkeypatch):
    calls=mock_model(monkeypatch)
    payload=PilotAIConsolidationRequest(request=sample(),
        items=[proposal("S1"),proposal("S2")])
    data=review.consolidate(payload)
    assert data["status"]=="CHECKED_WITH_NOTES"
    assert data["requires_human_review"] is True
    assert all(i["category"] == "PENDING" for i in data["issues"])
    assert data["blocking_step_ids"]==[]
    assert data["protocol_revision"]==review.PG11_REVIEW_PROTOCOL
    assert data["batches_checked"]==1
    assert len(calls)==1
    assert calls[0]["stream"] is False
    assert calls[0]["options"]["num_predict"]==review.MAX_REVIEW_OUTPUT_TOKENS
    assert review.MAX_REVIEW_OUTPUT_TOKENS>700
    assert calls[0]["options"]["num_ctx"]<=8192
    assert calls[0]["format"]["properties"]["summary"]["maxLength"]==review.MAX_REVIEW_SUMMARY_CHARS
    assert calls[0]["format"]["properties"]["issues"]["maxItems"]==review.MAX_REVIEW_ISSUES_PER_BATCH
    assert calls[0]["format"]["properties"]["issues"]["items"]["properties"]["issue"]["maxLength"]==review.MAX_REVIEW_ISSUE_CHARS
    assert calls[0]["model"]=="aunea-qwen3-4b:latest"
    allowed=calls[0]["format"]["properties"]["issues"]["items"]["properties"]["step_id"]["enum"]
    assert allowed==["GLOBAL","S1","S2"]
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
    with pytest.raises(ValueError,match="IA_REVIEW_IDS"):
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

def test_review_contract_errors_categorized_without_unsafe_echo():
    good={"done":True,"message":{"content":json.dumps({
        "summary":"Observaciones verificables","issues":[]})}}
    assert review._parse_review_result(good,{"S1"})==("Observaciones verificables",[])
    cases=[
        ({"done":True,"done_reason":"length","message":{"content":"{}"}},"IA_REVIEW_LENGTH"),
        ({"done":True,"message":{"content":"not json PRIVATE_DATA"}},"IA_REVIEW_JSON"),
        ({"done":True,"message":{"content":""}},"IA_REVIEW_EMPTY"),
        ({"done":True,"message":{"content":json.dumps({"issues":[]})}},"IA_REVIEW_SHAPE"),
        ({"done":True,"message":{"content":json.dumps({
            "summary":"S","issues":[{"step_id":"P1","issue":"PRIVATE_DATA"}]})}},"IA_REVIEW_IDS"),
        ({"done":True,"message":{"content":json.dumps({
            "summary":"S","issues":[{"step_id":"S1","note":"PRIVATE_DATA"}]})}},"IA_REVIEW_ISSUES"),
    ]
    for response,code in cases:
        with pytest.raises(ValueError,match=code) as error:
            review._parse_review_result(response,{"S1"})
        assert "PRIVATE_DATA" not in str(error.value)


def test_review_schema_matches_only_current_batch():
    schema=review._review_schema({"UAT-LIT-P1","UAT-LIT-P2"})
    ids=schema["properties"]["issues"]["items"]["properties"]["step_id"]["enum"]
    assert ids==["GLOBAL","UAT-LIT-P1","UAT-LIT-P2"]
    assert "P1" not in ids
    assert review._REVIEW_SCHEMA["properties"]["issues"]["items"]["properties"]["step_id"]=={"type":"string"}


def test_review_output_bounds_reject_verbose_model_without_losing_sources():
    too_long_summary={"done":True,"message":{"content":json.dumps({
        "summary":"x"*(review.MAX_REVIEW_SUMMARY_CHARS+1),"issues":[]})}}
    with pytest.raises(ValueError,match="IA_REVIEW_SHAPE"):
        review._parse_review_result(too_long_summary,{"S1"})
    too_many={"done":True,"message":{"content":json.dumps({
        "summary":"Resumen","issues":[{"step_id":"S1","issue":"Revisar control"}
                  for _ in range(review.MAX_REVIEW_ISSUES_PER_BATCH+1)]})}}
    with pytest.raises(ValueError,match="IA_REVIEW_COUNT"):
        review._parse_review_result(too_many,{"S1"})
    verbose_issue={"done":True,"message":{"content":json.dumps({
        "summary":"Resumen","issues":[{"step_id":"S1",
            "issue":"x"*(review.MAX_REVIEW_ISSUE_CHARS+1)}]})}}
    with pytest.raises(ValueError,match="IA_REVIEW_ISSUES"):
        review._parse_review_result(verbose_issue,{"S1"})


def test_global_review_consumes_same_explicit_process_map(monkeypatch):
    calls=mock_model(monkeypatch)
    req=sample()
    steps=req.engagement.questionnaire_answers["_process_steps"]
    steps[0]["normal_next_step"]="S2"
    steps[1]["normal_next_step"]="__END__"
    from aunea_backend.utils import stable_hash
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    review.consolidate(PilotAIConsolidationRequest(
        request=req,items=[proposal("S1"),proposal("S2")]))
    assert len(calls)==1
    context=json.loads(calls[0]["messages"][1]["content"].split("\\n",1)[1])
    assert context["process_flow"]["explicit_routes"]==[
        {"from":"S1","to":"S2","route":"normal","source":"ProcessStep"},
        {"from":"S2","to":"__END__","route":"normal","source":"ProcessStep"},
    ]
    assert context["process_flow"]["activities"][0]["id"]=="S1"


def test_new_action_classified_as_kept_is_flagged_for_correction(monkeypatch):
    mock_model(monkeypatch, issues=[])
    changed=proposal("S1")
    changed.transformation="Se mantiene"
    changed.rationale=("Acción propuesta: Establecer un registro compartido. "
                       "Resultado esperado: visibilidad. Justificación: trazabilidad.")
    stable=proposal("S2")
    stable.transformation="Se mantiene"
    stable.rationale=("Acción propuesta: Mantener la revisión actual. "
                      "Resultado esperado: continuidad. Justificación: sin cambio fundado.")
    result=review.consolidate(PilotAIConsolidationRequest(
        request=sample(),items=[changed,stable]))
    assert result["status"]=="CHECKED_WITH_NOTES"
    assert result["blocking_step_ids"]==["S1"]
    assert any(x["step_id"]=="S1" and "Se mantiene" in x["issue"]
               for x in result["issues"])



def test_narrative_automation_requires_field_candidate_and_selective_repair(monkeypatch):
    mock_model(monkeypatch, issues=[])
    a=proposal("S1")
    a.rationale=("Acción propuesta: Implementar un registro automático del estado. "
                 "Resultado esperado: más visibilidad. Justificación: seguimiento manual.")
    a.automation_ai=""
    b=proposal("S2")
    assert review._missing_structured_actions([a,b])==["S1"]
    result=review.consolidate(PilotAIConsolidationRequest(
        request=sample(),items=[a,b]),repair=False)
    assert result["blocking_step_ids"]==["S1"]
    assert any(i["step_id"]=="S1" and i["category"]=="BLOCKING"
               and "Falta estructurar" in i["issue"] for i in result["issues"])
    a.automation_ai="Registro automático de estados sujeto a permisos y controles"
    assert review._missing_structured_actions([a,b])==[]
    a.automation_ai="n/a"
    assert review._missing_structured_actions([a,b])==["S1"]
    a.rationale=("Acción propuesta: Mantener las comprobaciones manuales. "
                 "Resultado esperado: estabilidad. Justificación: controles obligatorios.")
    assert review._missing_structured_actions([a,b])==[]
    a.rationale=("Acción propuesta: Verificar si automatizar es viable. "
                 "Resultado esperado: aclarar opciones. Justificación: restricciones.")
    assert review._missing_structured_actions([a,b])==[]


def test_missing_automation_candidate_repairs_only_affected_source(monkeypatch):
    wire(monkeypatch)
    calls=[]
    def respond(req,timeout=0):
        body=json.loads(req.data)
        calls.append(body)
        if 'current_activity' in body['messages'][1]['content']:
            current=json.loads(body['messages'][1]['content'].splitlines()[1])
            assert current['current_activity']['id']=='S1'
            assert 'targeted_correction' in current
            repaired=proposal("S1")
            repaired.rationale=("Acción propuesta: Implementar registro automático. "
                                "Resultado esperado: trazabilidad. Justificación: seguimiento.")
            repaired.automation_ai="Crear registro automático condicionado a permisos"
            payload={"items":[repaired.model_dump(mode="json")]}
        else:
            payload={"summary":"Revisión trazable", "issues":[]}
        return io.BytesIO(json.dumps({"done":True,"prompt_eval_count":2000,
                                      "message":{"content":json.dumps(payload)}}).encode())
    monkeypatch.setattr(local._LOCAL_HTTP,"open",respond)
    first=proposal("S1")
    first.rationale=("Acción propuesta: Implantar un registro automatizado. "
                     "Resultado esperado: seguimiento. Justificación: estado invisible.")
    initial=[first,proposal("S2")]
    result=review.consolidate(PilotAIConsolidationRequest(
        request=sample(),items=initial))
    assert len(calls)==3
    assert result["blocking_step_ids"]==[]
    assert result["corrected_items"][0]["automation_ai"]=="Crear registro automático condicionado a permisos"
    assert result["corrected_items"][1]==proposal("S2").model_dump(mode="json")
    assert result["initial_review"]["blocking_step_ids"]==["S1"]
    assert initial[0].automation_ai==""  # source proposal remains unchanged

def test_keep_step_without_new_action_does_not_trigger_quality_gate(monkeypatch):
    mock_model(monkeypatch, issues=[])
    a=proposal("S1")
    b=proposal("S2")
    a.transformation=b.transformation="Se mantiene"
    a.rationale=("Acción propuesta: Mantener el flujo original. "
                 "Resultado esperado: continuidad. Justificación: sin mejora respaldada.")
    b.rationale=a.rationale
    result=review.consolidate(PilotAIConsolidationRequest(
        request=sample(),items=[a,b]))
    # Existing global observation about linked frictions remains non-blocking.
    assert result["blocking_step_ids"]==[]
    assert result["status"]=="CHECKED_WITH_NOTES"


def test_status_discloses_backend_review_protocol_without_running_ollama(monkeypatch):
    from aunea_backend import api
    monkeypatch.setattr(api, "internal_ai_status", lambda: {"status":"AVAILABLE", "provider":"ollama"})
    result=api.get_internal_ai_status()
    assert result["pg11_review_protocol"]==review.PG11_REVIEW_PROTOCOL
    assert result["status"]=="AVAILABLE"





def test_selective_semantic_repair_skips_correct_steps_and_preserves_audit(monkeypatch):
    from aunea_backend import internal_ai_provider as provider
    wire(monkeypatch)
    calls=[]
    def respond(req,timeout=0):
        body=json.loads(req.data);calls.append(body)
        if 'current_activity' in body['messages'][1]['content']:
            context=json.loads(body['messages'][1]['content'].split('\n',1)[1])
            assert context['current_activity']['id']=='S1'
            assert 'targeted_correction' in context
            out={'items':[proposal('S1').model_dump(mode='json')]}
        else:
            out={'summary':'Comprobación semántica', 'issues':([
                {'step_id':'S1','issue':'Intervención no resuelve la fricción',
                 'category':'BLOCKING','evidence':'F1: entrada duplicada','action':'Reutilizar los datos de origen'}]
                 if len(calls)==1 else [])}
        return io.BytesIO(json.dumps({'done':True,'prompt_eval_count':2000,'message':{'content':json.dumps(out)}}).encode())
    monkeypatch.setattr(local._LOCAL_HTTP,'open',respond)
    result=review.consolidate(PilotAIConsolidationRequest(request=sample(),items=[proposal('S1'),proposal('S2')]))
    assert len(calls)==3 # review, S1 only, verification; no S2 regeneration
    assert result['blocking_step_ids']==[]
    assert result['corrected_items'][1]==proposal('S2').model_dump(mode='json')
    assert result['correction_traces']['S1']['correction_attempted']
    assert result['initial_review']['issues'][0]['category']=='BLOCKING'
    assert result['audit'][0]['request']==calls[-1]


def test_already_repaired_step_never_gets_second_automatic_attempt(monkeypatch):
    calls=mock_model(monkeypatch,issues=[{'step_id':'S1','issue':'Contradicción persistente',
        'category':'BLOCKING','evidence':'Acción incompatible','action':'Corregir manualmente'}])
    result=review.consolidate(PilotAIConsolidationRequest(request=sample(),items=[proposal('S1'),proposal('S2')],
                                                       correction_attempted_ids=['S1']))
    assert len(calls)==1 and result['blocking_step_ids']==['S1']
    assert 'corrected_items' not in result
# [AUNEA-UAT-INTERNAL-AI-REVIEW-198] END
