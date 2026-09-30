# [AUNEA-UAT-SESSION-TIME-070] START — Governed time-normalization acceptance tests
# SOURCE: Diagnostic Master v1.2 RULE_ECON_ANNUALIZE, DF021/022, DF037–040 and NR04/05.
# CHANGE_RISK: HIGH.
from fastapi.testclient import TestClient
from aunea_backend.api import app
from aunea_backend.session_time import TimeProjectionRequest, project_session_time


STEP = {
    "id": "S1", "step_name": "Validar solicitud", "status": "ACTIVE",
    "applies_to": {"mode": "ALL"}, "occurrences_per_case": 1,
    "active_time": 10, "wait_time": 20, "rework_time": 5,
    "error_rate": {"mode": "percent", "value": 10}
}


def test_monthly_volume_and_weighted_rework_are_normalized_once():
    out = project_session_time(TimeProjectionRequest(volume=100, period="MONTH", steps=[STEP]))
    assert out["status"] == "CALCULATED"
    assert out["annual_cases"] == 1200
    assert out["annual_active_hours"] == 200
    assert out["annual_wait_exposure_hours"] == 400
    assert out["annual_rework_hours"] == 10


def test_weekly_volume_requires_operating_calendar_not_assumed_52_weeks():
    incomplete = project_session_time(TimeProjectionRequest(volume=100, period="WEEK", steps=[STEP]))
    assert incomplete["annual_cases"] is None
    assert incomplete["annual_active_hours"] is None
    assert incomplete["active_minutes_per_case"] == 10
    assert any("semanas operativas" in x for x in incomplete["gaps"])
    complete = project_session_time(TimeProjectionRequest(
        volume=100, period="WEEK", operating_weeks_per_year=40, steps=[STEP]))
    assert complete["annual_cases"] == 4000


def test_daily_business_volume_requires_explicit_days_calendar():
    incomplete = project_session_time(TimeProjectionRequest(volume=12, period="DAY", steps=[STEP]))
    assert incomplete["annual_cases"] is None
    complete = project_session_time(TimeProjectionRequest(
        volume=12, period="DAY", operating_days_per_year=230, steps=[STEP]))
    assert complete["annual_cases"] == 2760
    calendar = project_session_time(TimeProjectionRequest(
        volume=12, period="DAY", calendar_day_process=True, calendar_year=2028, steps=[STEP]))
    assert calendar["annual_cases"] == 12 * 366


def test_conditional_route_without_verified_share_blocks_aggregate():
    conditional = dict(STEP, applies_to={"mode": "CONDITION", "condition": "Urgente"})
    out = project_session_time(TimeProjectionRequest(volume=100, period="MONTH", steps=[conditional]))
    assert out["annual_active_hours"] is None
    assert any("proporción de casos" in x for x in out["gaps"])


def test_percent_route_and_normal_repetitions_do_not_confuse_rework():
    partial = dict(STEP, applies_to={"mode": "PERCENT", "value": 25},
                   occurrences_per_case=2, rework_time=0)
    out = project_session_time(TimeProjectionRequest(volume=100, period="MONTH", steps=[partial]))
    assert out["annual_active_hours"] == 100
    assert out["annual_rework_hours"] == 0


def test_unresolved_friction_effort_is_never_added_to_step_rework():
    out = project_session_time(TimeProjectionRequest(
        volume=100, period="MONTH", steps=[STEP],
        frictions=[{"id": "F1", "affected_steps": ["S1"], "active_time_loss": {"value": 7},
                    "frequency": {"mode": "percent", "value": 30}}]))
    assert out["annual_rework_hours"] == 10
    assert out["frictions_pending_overlap_review"] == ["F1"]
    assert out["status"] == "INCOMPLETE"
    assert any("solapamiento" in x for x in out["gaps"])


def test_superseded_steps_do_not_count():
    out = project_session_time(TimeProjectionRequest(
        volume=12, period="MONTH", steps=[STEP, dict(STEP, id="S0", status="SUPERSEDED")]))
    assert out["annual_active_hours"] == 24


def test_api_exposes_same_deterministic_server_projection():
    response = TestClient(app).post("/v1/diagnostic/time-projection", json={
        "volume": 100, "period": "MONTH", "steps": [STEP]
    })
    assert response.status_code == 200
    assert response.json()["annual_rework_hours"] == 10

def test_additional_friction_with_monetary_claim_still_projects_validated_time():
    friction = {
        "id": "F_BOTH", "affected_steps": ["S1"],
        "active_time_loss": {"value": 5},
        "time_attribution": {"mode": "ADDITIONAL", "step_id": "S1"},
        "frequency": {"mode": "percent", "value": 20, "period": "case"},
        "direct_loss": {"value": 250, "period": "month"},
    }
    out = project_session_time(TimeProjectionRequest(
        volume=100, period="MONTH", steps=[STEP], frictions=[friction]))
    assert out["status"] == "CALCULATED"
    assert out["annual_friction_additional_hours"] == 20
    assert out["annual_total_active_hours"] == 220
    assert out["frictions_pending_overlap_review"] == []
    assert out["monetary_reconciliation"][0]["reconciliation_status"] == "PENDING_DF082"
    assert all("DF063" not in gap for gap in out["gaps"])


def test_additional_count_per_calendar_day_uses_only_declared_calendar():
    friction = {
        "id": "F_DAY", "affected_steps": ["S1"],
        "active_time_loss": {"value": 5},
        "time_attribution": {"mode": "additional", "step_id": "S1"},
        "frequency": {"mode": "count", "value": 2, "period": "day"},
    }
    out = project_session_time(TimeProjectionRequest(
        volume=100, period="MONTH", calendar_day_process=True,
        calendar_year=2028, steps=[STEP], frictions=[friction]))
    assert out["status"] == "CALCULATED"
    assert out["annual_friction_additional_hours"] == 61
    assert out["annual_total_active_hours"] == 261


def test_direct_money_without_time_does_not_corrupt_time_projection():
    friction = {
        "id": "F_MONEY", "affected_steps": ["S1"],
        "direct_loss": {"value": 100, "period": "month"},
        "frequency": {"mode": "count", "value": 3, "period": "month"},
    }
    out = project_session_time(TimeProjectionRequest(
        volume=100, period="MONTH", steps=[STEP], frictions=[friction]))
    assert out["status"] == "CALCULATED"
    assert out["annual_friction_additional_hours"] == 0
    assert out["annual_active_hours"] == 200
    assert out["monetary_reconciliation"][0]["friction_id"] == "F_MONEY"

# [AUNEA-UAT-SESSION-TIME-070] END


def test_included_friction_never_adds_existing_rework_twice():
    f={"id":"F1","affected_steps":["S1"],"active_time_loss":{"value":5},
       "frequency":{"mode":"percent","value":10},
       "time_attribution":{"mode":"INCLUDED","step_id":"S1"}}
    out=project_session_time(TimeProjectionRequest(volume=100,period="MONTH",steps=[STEP],frictions=[f]))
    assert out["status"]=="CALCULATED"
    assert out["annual_rework_hours"]==10
    assert out["annual_friction_additional_hours"]==0
    assert out["annual_total_active_hours"]==200
    assert out["frictions_pending_overlap_review"]==[]


def test_breakdown_friction_explains_same_minutes_without_adding():
    f={"id":"F2","affected_steps":["S1"],"active_time_loss":{"value":3},
       "frequency":{"mode":"percent","value":20},
       "time_attribution":{"mode":"BREAKDOWN","step_id":"S1"}}
    out=project_session_time(TimeProjectionRequest(volume=100,period="MONTH",steps=[STEP],frictions=[f]))
    assert out["status"]=="CALCULATED"
    assert out["annual_friction_additional_hours"]==0
    assert out["annual_rework_hours"]==10


def test_additional_friction_counts_once_even_if_linked_to_multiple_steps():
    step_two=dict(STEP,id="S2",active_time=0,wait_time=0,rework_time=0)
    f={"id":"F3","affected_steps":["S1","S2"],"active_time_loss":{"value":5},
       "frequency":{"mode":"percent","value":20},
       "time_attribution":{"mode":"ADDITIONAL","step_id":"S1"}}
    out=project_session_time(TimeProjectionRequest(volume=100,period="MONTH",steps=[STEP,step_two],frictions=[f]))
    assert out["status"]=="CALCULATED"
    assert out["annual_friction_additional_hours"]==20
    assert out["annual_total_active_hours"]==220
    assert out["annual_rework_hours"]==10


def test_unattributed_or_invalid_owner_does_not_leak_into_totals():
    f={"id":"F4","affected_steps":["S1"],"active_time_loss":{"value":5},
       "frequency":{"mode":"percent","value":20},
       "time_attribution":{"mode":"ADDITIONAL","step_id":"S_UNKNOWN"}}
    out=project_session_time(TimeProjectionRequest(volume=100,period="MONTH",steps=[STEP],frictions=[f]))
    assert out["status"]=="INCOMPLETE"
    assert out["annual_friction_additional_hours"] is None
    assert out["annual_total_active_hours"] is None


def test_scoped_projection_preserves_multistep_friction_anchors_and_unique_owner():
    from aunea_backend.session_time import TimeProjectionRequest, project_session_time
    request = TimeProjectionRequest(volume=100, period='MONTH', steps=[
        {'id':'S1','active_time':10,'wait_time':0,'rework_time':0},
        {'id':'S2','active_time':4,'wait_time':0,'rework_time':0},
    ], frictions=[{'id':'F1','affected_steps':['S1','S2'],
        'time_attribution':{'mode':'ADDITIONAL','step_id':'S1'},
        'frequency':{'mode':'percent','value':20},'active_time_loss':{'value':3}}],
        scope_step_ids=['S1'])
    result = project_session_time(request)
    assert result['status'] == 'CALCULATED'
    assert result['annual_active_hours'] == 200
    assert result['annual_friction_additional_hours'] == 12
    request.scope_step_ids = ['S2']
    result = project_session_time(request)
    assert result['annual_active_hours'] == 80
    assert result['annual_friction_additional_hours'] == 0
    request.scope_step_ids = ['MISSING']
    assert project_session_time(request)['status'] == 'INCOMPLETE'


def test_three_uat3_fixtures_project_in_backend_without_double_counting_frictions():
    import json
    from pathlib import Path
    directory = Path(__file__).resolve().parents[2] / "frontend" / "uat" / "cases"
    for filename, expected_cases in [
        ("invoices.json", 1920), ("unified-requests.json", 1320), ("email-orders.json", 3720)
    ]:
        case = json.loads((directory / filename).read_text(encoding="utf-8"))
        ids = [f"{case['key']}-S{i}" for i in range(len(case["steps"]))]
        steps = [
            {"id": ids[i], "step_name": item["name"], "status": "ACTIVE",
             "applies_to": {"mode": "PERCENT", "value": item["share"]} if "share" in item else {"mode": "ALL"},
             "occurrences_per_case": 1, "active_time": item["active"], "wait_time": item["wait"],
             "rework_time": item["rework"], "error_rate": {"mode": "percent", "value": item["error"]}}
            for i, item in enumerate(case["steps"])
        ]
        frictions = [
            {"id": f"{case['key']}-F{i}", "status": "ACTIVE",
             "affected_steps": [ids[n] for n in item["steps"]],
             "time_attribution": {"mode": item["mode"], "step_id": ids[item["owner"]]},
             "active_time_loss": {"value": item["minutes"]},
             "frequency": {"mode": "percent", "value": item["frequency"], "period": "case"}}
            for i, item in enumerate(case["frictions"])
        ]
        response = TestClient(app).post("/v1/diagnostic/time-projection", json={
            "volume": case["answers"]["DF021"], "period": case["answers"]["DF022"],
            "steps": steps, "frictions": frictions
        })
        assert response.status_code == 200, (case["key"], response.text)
        out = response.json()
        assert out["annual_cases"] == expected_cases, case["key"]
        assert out["annual_active_hours"] is not None, (case["key"], out["gaps"])
        assert out["annual_wait_exposure_hours"] is not None, (case["key"], out["gaps"])
        assert out["annual_rework_hours"] is not None, (case["key"], out["gaps"])
        # All nine scenario frictions are INCLUDED or BREAKDOWN; no extra time is invented.
        assert out["annual_friction_additional_hours"] == 0, (case["key"], out["gaps"])
        assert out["frictions_pending_overlap_review"] == [], (case["key"], out["gaps"])
        assert "realized_cash_saving_eur_annual" not in out
        # Independent hand calculation over the *specific* six steps and conditional share.
        # active/rework/wait are separate; waiting is exposure, not labour or elapsed cycle.
        expected = {
            "INVOICE": (848.0, 10560.0, 54.4),
            "INTAKE": (698.5, 5280.0, 27.72),
            "EMAIL": (1485.52, 6435.6, 75.64),
        }
        active, wait, rework = expected[case["key"]]
        assert abs(out["annual_active_hours"]-active)<0.011, (case["key"], out)
        assert abs(out["annual_wait_exposure_hours"]-wait)<0.011, (case["key"], out)
        assert abs(out["annual_rework_hours"]-rework)<0.011, (case["key"], out)
        assert abs(out["annual_total_active_hours"]-active)<0.011, (case["key"], out)  # rework is a separate breakdown, not additive
        # No fabricated end-to-end DF026, ROI, capacity conversion, monetary claims.
        assert "actual_cycle_time_hours" not in out
        assert "roi" not in out

