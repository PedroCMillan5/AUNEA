"""An unconfirmed governance acknowledgement cannot cover missing/evidence inputs."""
import pytest
from aunea_backend.models import EngagementInput
from aunea_backend.input_coverage import InputCoverageEngine

@pytest.mark.parametrize('ack',[False,None,0])
def test_false_ack_does_not_cover_governance_inputs(ack):
    e=EngagementInput(engagement_id='G',process_instance_id='P',process_name='G',
        questionnaire_answers={'_process_steps':[],'_coverage_ack':ack})
    items={x.input_id:x.status for x in InputCoverageEngine().run(e).items}
    assert items['IN-G-02']=='GAP'
    assert items['IN-G-03']=='GAP'

def test_affirmative_ack_remains_valid():
    e=EngagementInput(engagement_id='G',process_instance_id='P',process_name='G',
        questionnaire_answers={'_process_steps':[],'_coverage_ack':True})
    items={x.input_id:x.status for x in InputCoverageEngine().run(e).items}
    assert items['IN-G-02']=='COVERED'
    assert items['IN-G-03']=='COVERED'
