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
# [AUNEA-UAT-PG11-ALTERNATIVES-337] END
