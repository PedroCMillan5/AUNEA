from fastapi.testclient import TestClient
from aunea_backend.api import app

def test_health_and_registry():
    c=TestClient(app)
    h=c.get('/health')
    assert h.status_code==200 and h.json()['status']=='ok'
    r=c.get('/registry/status').json()
    assert r['version']=='v0.8' and r['tables']>=10 and r['rows']>=80

def test_cors_allows_local_and_codespaces_frontend_origins():
    c=TestClient(app)
    for origin in (
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://example-codespace-5500.app.github.dev",
    ):
        r=c.get('/health', headers={"Origin": origin})
        assert r.status_code==200
        assert r.headers.get("access-control-allow-origin")==origin


def test_risk_step_ids_round_trip_is_technical_trace_only():
    from aunea_backend.models import RiskInput, EngagementInput
    risk=RiskInput(category='RC05', likelihood_1_5=3, impact_1_5=4, step_ids=['ASIS-S04','ASIS-S05'])
    payload=EngagementInput(engagement_id='TRACE-1', process_instance_id='PROC-TRACE-1', process_name='Factura', risks=[risk])
    out=EngagementInput.model_validate(payload.model_dump())
    assert out.risks[0].step_ids==['ASIS-S04','ASIS-S05']
    # The owner records step references; it does not alter deterministic likelihood/impact.
    assert out.risks[0].likelihood_1_5==3 and out.risks[0].impact_1_5==4


def test_risk_candidates_are_review_only_and_keep_source_steps():
    c=TestClient(app)
    payload={
        "engagement_id":"RISK-CAND-1",
        "process_instance_id":"PROC-RISK-CAND-1",
        "process_name":"Facturas",
        "questionnaire_answers":{
            "_process_steps":[
                {"id":"S1","status":"ACTIVE","step_name":"Validar","step_type":"ST02","decision_criteria":[]},
                {"id":"S2","status":"ACTIVE","step_name":"Aprobar","step_type":"ST05","decision_criteria":["THRESHOLD"]}
            ],
            "_frictions":[{"id":"F1","status":"ACTIVE","friction_type":"P02","affected_steps":["S1"]}],
            "_risks":[]
        }
    }
    r=c.post("/v1/diagnostic/risk-candidates",json=payload)
    assert r.status_code==200
    items=r.json()["candidates"]
    approval=next(x for x in items if x["title"]=="Control de aprobación")
    assert approval["step_ids"]==["S2"]
    assert any(x["title"]=="Error operativo por datos" and x["step_ids"]==["S1"] for x in items)
    assert all("category" not in x and "likelihood_1_5" not in x and "impact_1_5" not in x for x in items)
