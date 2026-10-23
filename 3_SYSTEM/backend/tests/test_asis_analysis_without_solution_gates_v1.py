"""Regression: AS-IS analysis is independent of decisions selecting a commercial solution."""
import json
from pathlib import Path
from fastapi.testclient import TestClient
from aunea_backend.api import app
from aunea_backend.models import EngagementInput
from aunea_backend.orchestrator import Orchestrator

FIXTURE=Path(__file__).parent/'fixtures'/'qa55_positive_owner_sources_v1.json'


def test_baseline_backend_does_not_require_five_solution_decisions():
    original=json.loads(FIXTURE.read_text('utf-8'))
    # Deliberately with all five booleans left at default: this endpoint does
    # not interpret those defaults as negative answers or design choices.
    study=EngagementInput.model_validate(original)
    orch=Orchestrator()
    result=orch.analyze_asis(study)
    assert result['status']=='ANALYZED'
    assert result['diagnostic_type']=='ASIS_ONLY'
    assert result['engagement_id']==study.engagement_id
    assert result['input_coverage']['status']=='COMPLETE'
    assert isinstance(result['pain_results'],list)
    assert result['economic_result'] is not None
    assert result['risk_result'] is not None
    assert result['requires_solution_review'] is True
    assert not any(k in result for k in ('quote','recommendation','optimal_scenario'))
    assert not orch.audit.runs, 'read-only exploratory analysis must not store an official run'
    # No hidden mutation of the caller's capture.
    assert study.model_dump()==EngagementInput.model_validate(original).model_dump()


def test_asis_analysis_http_is_read_only_and_has_no_price():
    original=json.loads(FIXTURE.read_text('utf-8'))
    response=TestClient(app).post('/v1/diagnostic/asis-analysis',json=original)
    assert response.status_code==200
    body=response.json()
    assert body['diagnostic_type']=='ASIS_ONLY'
    assert body['status']=='ANALYZED'
    assert 'quote' not in body
    assert 'optimal_scenario' not in body


def test_asis_analysis_never_fabricates_findings_from_missing_sources():
    incomplete=EngagementInput(engagement_id='EMPTY-ASIS',process_instance_id='PROC-EMPTY',process_name='Sin datos')
    out=Orchestrator().analyze_asis(incomplete)
    assert out['status']=='INPUT_GAPS'
    assert out['economic_result'] is None
    assert out['risk_result'] is None
    assert not out['pain_results']
    assert 'recommendation' not in out
