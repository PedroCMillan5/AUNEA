"""PG10: a structured signal needs linked evidence before it becomes confirmed."""
import pytest
from aunea_backend.models import EngagementInput,PainSignalInput,PainObservation,Evidence
from aunea_backend.engines import PainEngine,EngineContext
from aunea_backend.input_coverage import InputCoverageEngine

def study(links=None,evidence=None):
    return EngagementInput(engagement_id='QA-LINK',process_instance_id='P',process_name='Case',
        questionnaire_answers={'_process_steps':[]},
        pain_signals=[PainSignalInput(pain_id='P03',direct_mechanism_present=True,
           concrete_evidence_present=True,signal_present=True,evidence_ids=links or [])],
        evidence=evidence or [])

@pytest.mark.parametrize('links,evidence',[
    ([],[]),(['MISSING'],[]),
    (['MISSING'],[Evidence(evidence_id='OTHER',type='CLIENT_DECLARED')])])
def test_orphaned_evidence_does_not_confirm_pain(links,evidence):
    e=study(links,evidence)
    assert PainEngine().run(EngineContext(e))[0].state.value!='CONFIRMED'
    coverage=next(x for x in InputCoverageEngine().run(e).items if x.input_id=='IN-R-01')
    assert coverage.status=='GAP'

def test_existing_evidence_confirms_pain_and_source_coverage():
    e=study(['E1'],[Evidence(evidence_id='E1',type='MEASURED')])
    assert PainEngine().run(EngineContext(e))[0].state.value=='CONFIRMED'
    assert next(x for x in InputCoverageEngine().run(e).items if x.input_id=='IN-R-01').status=='COVERED'

def test_explicit_client_confirmation_without_measured_evidence_remains_low_confidence():
    e=study()
    e.pain_signals=[]
    e.pains=[PainObservation(pain_id='P03',state='CONFIRMED')]
    result=PainEngine().run(EngineContext(e))[0]
    assert result.state.value=='CONFIRMED'
    assert result.confidence=='LOW'
