"""Negative/positive business-source and graph counterfactuals.

A positive result means data comes from the canonical owner and can flow from the
process start to END. It is NOT an independent business diagnosis validation.
"""
import json
from pathlib import Path
import pytest
from aunea_backend.models import EngagementInput
from aunea_backend.input_coverage import InputCoverageEngine, _source_present

FIXTURE=Path(__file__).parent/'fixtures'/'qa55_positive_owner_sources_v1.json'

def base():
    return json.loads(FIXTURE.read_text(encoding='utf-8'))

def row(record, iid):
    e=EngagementInput.model_validate(record)
    return next(i for i in InputCoverageEngine().run(e).items if i.input_id==iid)

@pytest.mark.parametrize('field,owned_collection,owned_key', [
    ('DF031','_process_steps','step_name'),
    ('DF033','_process_steps','actor'),
    ('DF044','_process_steps','manual_actions'),
    ('DF056','_frictions','friction_type'),
    ('DF058','_frictions','cause'),
    ('DF059','_frictions','affected_steps'),
])
def test_forged_direct_df_cannot_replace_structured_owner(field, owned_collection, owned_key):
    data=base()
    for item in data['questionnaire_answers'][owned_collection]:
        item.pop(owned_key,None)
    data['questionnaire_answers'][field]='FAKE_DIRECT_DF'
    assert not _source_present(field,EngagementInput.model_validate(data)),field

def test_derived_risk_and_economic_fields_ignore_direct_df_answers():
    data=base()
    data['risks']=[]
    for econ in data['economics']:
        econ['evidence_type']=None
    data['questionnaire_answers']['DF074']='EASY'
    data['questionnaire_answers']['DF085']='MEASURED'
    e=EngagementInput.model_validate(data)
    assert not _source_present('DF074',e)
    assert not _source_present('DF085',e)
    assert row(data,'IN-E-09').status=='GAP'

def test_real_owner_wins_over_stale_display_value():
    data=base()
    data['questionnaire_answers']['DF044']='WRONG_DISPLAY_VALUE'
    e=EngagementInput.model_validate(data)
    assert _source_present('DF044',e)
    assert row(data,'IN-P-07').status=='COVERED'

def graph():
    data=base()
    data['questionnaire_answers']['_process_steps']=[
        {'id':'S1','step_name':'Receive','step_type':'ST02','actor':'ADMIN','normal_next_step':'S2'},
        {'id':'S2','step_name':'Validate','step_type':'ST04','actor':'ADMIN','normal_next_step':'S3',
         'exception_path':{'type':'OTHER','condition':'Not valid','destination_step':'S4','owner':'ADMIN'}},
        {'id':'S3','step_name':'Approve','step_type':'ST05','actor':'MANAGER','normal_next_step':'__END__'},
        {'id':'S4','step_name':'Reject','step_type':'ST02','actor':'ADMIN','normal_next_step':'__END__'},
    ]
    return data

def test_valid_branch_graph_is_covered():
    assert row(graph(),'IN-P-03').status=='COVERED'

def test_unreachable_step_does_not_count_as_complete_map():
    data=graph()
    data['questionnaire_answers']['_process_steps'][1]['exception_path']=None
    assert row(data,'IN-P-03').status=='GAP'

def test_closed_cycle_without_exit_does_not_count_as_complete_map():
    data=graph()
    steps=data['questionnaire_answers']['_process_steps']
    steps[2]['normal_next_step']='S2'
    steps[3]['normal_next_step']='S2'
    assert row(data,'IN-P-03').status=='GAP'

def test_cycle_with_exit_path_is_not_false_blocked():
    data=graph()
    steps=data['questionnaire_answers']['_process_steps']
    steps[3]['normal_next_step']='S2'
    assert row(data,'IN-P-03').status=='COVERED'

def test_duplicate_step_ids_fail_coverage():
    data=graph()
    data['questionnaire_answers']['_process_steps'][2]['id']='S2'
    assert row(data,'IN-P-03').status=='GAP'

def test_invalid_exception_destination_does_not_count_as_complete():
    data=graph()
    data['questionnaire_answers']['_process_steps'][1]['exception_path']['destination_step']='S-NONEXISTENT'
    assert row(data,'IN-P-03').status=='GAP'


def test_economic_evidence_types_are_governed():
    from pydantic import ValidationError
    from aunea_backend.models import EconomicInput
    for v in ('MEASURED','CLIENT_DECLARED','AUNEA_ESTIMATE','SPECIFIC_BENCHMARK','HYPOTHESIS'):
        assert EconomicInput(driver_id='ED02',evidence_type=v).evidence_type == v
    for v in ('UNRECOGNIZED','',123):
        try:
            EconomicInput(driver_id='ED02',evidence_type=v)
        except ValidationError:
            continue
        raise AssertionError('Non-canonical economic evidence accepted')
