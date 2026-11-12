# [AUNEA-UAT-PG11-ALTERNATIVES-337] START — generic source-bound rules, no Ollama.
import pytest
from aunea_backend.models import EngagementInput, DiagnosticOutput, RiskInput
from aunea_backend.internal_ai import PilotAIRequest
from aunea_backend.tobe_optimization import activity_alternatives
from aunea_backend.utils import stable_hash
from aunea_backend.registry import rule_bundle_version


def source(kind):
    names = ['Recibir factura', 'Determinar aprobación', 'Aprobar factura', 'Registrar ERP'] if kind == 'invoice' else ['Recibir mercancía', 'Validar entrega', 'Tratar incidencia', 'Expedir mercancía']
    steps = [dict(id=f'P{i+1}', step_name=name, step_type='ST04' if i == 1 else 'ST02', actor='AR01', tool='ERP', inputs=['DOC'], outputs=['RECORD'], normal_next_step=f'P{i+2}' if i < 3 else '__END__') for i, name in enumerate(names)]
    steps[1]['exception_path'] = dict(destination_step='P4')
    e = EngagementInput(engagement_id=kind, process_instance_id='UAT', process_name=kind,
        questionnaire_answers={'_process_steps': steps, '_frictions': [dict(id='F1', affected_steps=['P1'], client_label='Reintroducción duplicada')], 'DF075': ['P3']},
        risks=[RiskInput(risk_id='R1', step_ids=['P1'], description='Datos incompletos', category='OPERATIONAL', likelihood_1_5=2, impact_1_5=3)], existing_tool_can_cover=True)
    d=DiagnosticOutput.model_construct(engagement_id=e.engagement_id, input_snapshot_hash=stable_hash(e.model_dump()),rule_bundle_version=rule_bundle_version())
    return PilotAIRequest.model_construct(engagement=e,diagnostic=d,confirmed_as_is=True,snapshot_version=1)


@pytest.mark.parametrize('kind', ['invoice', 'logistics'])
def test_source_bound_alternatives_without_ollama(kind, monkeypatch):
    monkeypatch.setenv('AUNEA_INTERNAL_AI_ENABLED', '0')
    req=source(kind);before=req.model_dump()
    result=activity_alternatives(req, 'P1')
    assert result['requires_human_review'] is True
    assert result['engine_contract']=='PG11_FINDING_SPECIFIC_V2'
    assert any(c['id'].startswith('RULED-TRANSFER') for c in result['candidates'])
    assert any(c['operations'] for c in result['candidates'])
    assert all(c['status']=='PENDING' for c in result['candidates'])
    assert not any(c['operations'] for c in activity_alternatives(req,'P2')['candidates'])
    assert req.model_dump()==before
    assert activity_alternatives(req,'P3')['candidates'][0]['fields']['transformation']=='Se mantiene'
    req.confirmed_as_is=False
    with pytest.raises(ValueError):activity_alternatives(req,'P1')


def test_manual_work_does_not_establish_automation():
    req=source('invoice');req.engagement.existing_tool_can_cover=False
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    assert not any(c['id'].startswith('RULED-TRANSFER') for c in activity_alternatives(req,'P1')['candidates'])
    assert len(activity_alternatives(req,'P4')['candidates'])==1
    req.diagnostic.input_snapshot_hash='stale'
    with pytest.raises(ValueError):activity_alternatives(req,'P1')


def test_invoice_visibility_and_traceability_are_distinct_operational_options():
    req=source('invoice')
    q=req.engagement.questionnaire_answers
    q['_process_steps'][0]['tool']='EMAIL'
    q['_process_steps'][0]['inputs']=['EMAIL','PDF']
    q['_process_steps'][0]['outputs']=['DOCUMENT','RECORD']
    q['_frictions']=[dict(id='F2', affected_steps=['P1'],
                         client_label='Falta de visibilidad del estado',
                         observable_signal='30 % de casos, 10 min adicionales',
                         evidence_type='EV04', frequency=dict(mode='percent',value=30),
                         active_time_loss=dict(mode='VALUE',value=10,unit='min'))]
    req.engagement.risks=[RiskInput(risk_id='R1',step_ids=['P1'],
        description='Pérdida de trazabilidad de una factura entre correo y ERP',
        category='OPERATIONAL',likelihood_1_5=2,impact_1_5=3)]
    q['DF075']=['P3'];q['DF088']=['P3'];q['DF089']=['EMAIL'];q['DF090']=['AUDIT']
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    before=req.model_dump()
    c=activity_alternatives(req,'P1')['candidates']
    by_id={x['id'].split(':')[0]:x for x in c}
    assert set(by_id)=={'KEEP','STATUS-F2','CONTROL-R1','CONTROL-STEP-R1'}
    assert not any(x['id'].startswith('HANDOFF') for x in c)
    keep=by_id['KEEP']
    assert keep['combination']=='EXCLUSIVE'
    assert keep['fields']['automationAi']=='', 'preserving AS-IS must retire a superseded future automation proposal'
    assert 'automatización' in ' '.join(keep['conditions']).lower()
    assert 'siguen pendientes' in keep['expectedOutcome']
    visibility=by_id['STATUS-F2']
    assert visibility['sourceRefs']==['P1','F2']
    assert 'estado' in visibility['changeSummary']
    assert 'registro estructurado ya declarado' in ' '.join(visibility['conditions'])
    assert 'DF088' not in visibility['constraints']
    assert 'DF089' not in visibility['constraints']
    assert all(x['sourceId']=='P1' and x['status']=='PENDING' for x in c)
    assert by_id['CONTROL-R1']['combination']=='ALTERNATIVE_TO_CONTROL-R1'
    assert by_id['CONTROL-STEP-R1']['combination']=='ALTERNATIVE_TO_CONTROL-R1'
    assert 'RECORD' not in str(by_id['CONTROL-R1']['fields']).upper(), 'do not invent a new record'
    assert all('ahorro' not in str(x['fields']).lower() for x in c)
    assert req.model_dump()==before


def test_unrelated_friction_does_not_generate_generic_handoff():
    req=source('logistics')
    req.engagement.questionnaire_answers['_frictions']=[
        dict(id='F2',affected_steps=['P1'],client_label='Esperas por validación')]
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    result=activity_alternatives(req,'P1')
    assert len(result['candidates'])==3  # keep + in-step risk + separate risk
    assert all(not x['id'].startswith('HANDOFF') for x in result['candidates'])
    assert result['requires_human_review']


def test_incomplete_handoff_generates_targeted_option_without_automation_assumption():
    req=source('logistics')
    req.engagement.questionnaire_answers['_frictions']=[
        dict(id='F3',affected_steps=['P1'],client_label='Entrega de datos incompletos')]
    req.engagement.existing_tool_can_cover=False
    req.diagnostic.input_snapshot_hash=stable_hash(req.engagement.model_dump())
    c=activity_alternatives(req,'P1')['candidates']
    handoff=next(x for x in c if x['id'].startswith('HANDOFF'))
    assert handoff['fields']['transformation']=='Se modifica'
    assert 'revis' not in handoff['title'].lower()
    assert not any(x['id'].startswith('RULED-TRANSFER') for x in c)


def test_decision_and_terminal_step_never_insert_control_blindly():
    req=source('invoice')
    assert not any(x['operations'] for x in activity_alternatives(req,'P2')['candidates'])
    assert not any(x['operations'] for x in activity_alternatives(req,'P4')['candidates'])

# [AUNEA-UAT-PG11-ALTERNATIVES-337] END
