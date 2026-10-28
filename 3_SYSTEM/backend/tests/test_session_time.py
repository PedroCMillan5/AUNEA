# [AUNEA-UAT-SESSION-TIME-070] START — Governed time-normalization acceptance tests
# SOURCE: Diagnostic Master v1.2 RULE_ECON_ANNUALIZE, DF021/022, DF037–040 and NR04/05.
# CHANGE_RISK: HIGH.
from fastapi.testclient import TestClient
from aunea_backend.api import app
from aunea_backend.session_time import TimeProjectionRequest, TimeReconciliationRequest, project_session_time, reconcile_session_time


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



def test_dec074_provisional_bar_never_equates_wait_exposure_and_elapsed():
    req=TimeReconciliationRequest(volume=100,period="MONTH",declared_cycle_minutes=250,
        steps=[dict(STEP,active_time=20,wait_time=230,rework_time=0)])
    output=reconcile_session_time(req)
    assert output["identified_minutes"]==250
    assert output["elapsed_reconciled"] is False
    assert output["status"]=="PROVISIONAL"
    assert any("Solapamiento de esperas" in x for x in output["unresolved"])


def test_dec074_partial_conditional_route_no_invented_share():
    conditional=dict(STEP,id="S2",applies_to={"mode":"CONDITION","condition":"Aprobación"},
                     active_time=90,wait_time=0,rework_time=0)
    req=TimeReconciliationRequest(volume=100,period="MONTH",declared_cycle_minutes=250,
        steps=[dict(STEP,active_time=15,wait_time=0,rework_time=0),conditional])
    output=reconcile_session_time(req)
    assert next(x["minutes"] for x in output["segments"] if x["key"]=="active")==15
    assert any("proporción de la ruta" in x for x in output["unresolved"])
    assert output["elapsed_reconciled"] is False


def test_dec074_no_baseline_and_excess_always_pending():
    req=TimeReconciliationRequest(volume=100,period="MONTH",
        steps=[dict(STEP,active_time=300,wait_time=0,rework_time=0)])
    assert reconcile_session_time(req)["status"]=="NO_BASELINE"
    req.declared_cycle_minutes=250
    output=reconcile_session_time(req)
    assert output["exceeds_declared_reference"] is True
    assert output["unreconciled_percent"]==0
    assert output["elapsed_reconciled"] is False
    response=TestClient(app).post("/v1/diagnostic/time-reconciliation",json=req.model_dump())
    assert response.status_code==200
    assert response.json()["identified_minutes"]==300


# [AUNEA-UAT-BE-PG10-TIME-169] START — Breakdown is backend-owned, source-linked and never double-counted.
def test_pg10_per_step_temporal_breakdown_matches_backend_aggregates():
    steps=[
        dict(STEP,id="P1",step_name="Recibir",active_time=3,wait_time=0,rework_time=0),
        dict(STEP,id="P2",step_name="Aprobar",applies_to={"mode":"PERCENT","value":25},
             active_time=6,wait_time=240,rework_time=0),
        dict(STEP,id="P3",step_name="Registrar",active_time=10,wait_time=0,
             rework_time=5,error_rate={"mode":"percent","value":20}),
    ]
    frictions=[{
        "id":"F1","affected_steps":["P1","P3"],
        "time_attribution":{"mode":"ADDITIONAL","step_id":"P3"},
        "active_time_loss":{"value":10},
        "frequency":{"mode":"percent","value":30,"period":"case"},
    }]
    out=project_session_time(TimeProjectionRequest(volume=120,period="MONTH",steps=steps,frictions=frictions))
    assert out["status"]=="CALCULATED"
    b=out["step_breakdown"]
    assert [r["step_id"] for r in b]==["P1","P2","P3"]
    assert b[1]["annual_active_hours"]==36  # 6 min, 25% of 1,440 cases
    assert b[1]["annual_wait_exposure_hours"]==1440  # exposure, NOT elapsed process time
    assert b[2]["annual_rework_hours"]==24
    assert round(sum(r["annual_active_hours"] for r in b),2)==out["annual_active_hours"]
    assert round(sum(r["annual_wait_exposure_hours"] for r in b),2)==out["annual_wait_exposure_hours"]
    assert round(sum(r["annual_rework_hours"] for r in b),2)==out["annual_rework_hours"]
    extras=out["additional_friction_breakdown"]
    assert len(extras)==1
    assert extras[0]["friction_id"]=="F1"
    assert extras[0]["owner_step_id"]=="P3"
    assert extras[0]["annual_additional_hours"]==72
    assert sum(x["annual_additional_hours"] for x in extras)==out["annual_friction_additional_hours"]
    assert out["annual_total_active_hours"]==out["annual_active_hours"]+72


def test_pg10_breakdown_marks_unverified_conditional_route_unquantified():
    condition=dict(STEP,id="P_COND",applies_to={"mode":"CONDITION","condition":"Approval"},
                   active_time=6,wait_time=10,rework_time=0)
    out=project_session_time(TimeProjectionRequest(volume=100,period="MONTH",steps=[condition]))
    assert out["status"]=="INCOMPLETE"
    entry=out["step_breakdown"][0]
    assert entry["annual_active_hours"] is None
    assert entry["annual_wait_exposure_hours"] is None
    assert out["annual_active_hours"] is None
# [AUNEA-UAT-BE-PG10-TIME-169] END


# [AUNEA-UAT-PG10-NUMERIC-171] START — Numeric consistency without elapsed auto-approval.
def test_pg10_numeric_coherence_of_levante_sized_case_uses_existing_review_threshold():
    from aunea_backend.session_time import numeric_time_consistency, TimeProjectionRequest, project_session_time
    steps=[
        dict(STEP,id="P1",active_time=3,wait_time=0,rework_time=0),
        dict(STEP,id="P2",active_time=2,wait_time=0,rework_time=0),
        dict(STEP,id="P3",active_time=6,wait_time=768,rework_time=0,
             applies_to={"mode":"PERCENT","value":30}),
        dict(STEP,id="P4",active_time=10,wait_time=0,rework_time=5,
             error_rate={"mode":"percent","value":8}),
    ]
    frictions=[dict(id="F2",status="ACTIVE",affected_steps=["P2"],active_time_loss={"value":10},
                    time_attribution={"mode":"ADDITIONAL","step_id":"P2"},
                    frequency={"mode":"percent","value":30,"period":"case"})]
    projection=project_session_time(TimeProjectionRequest(volume=120,period="MONTH",
                                                           steps=steps,frictions=frictions))
    assert projection["status"]=="CALCULATED",projection.get("gaps")
    result=numeric_time_consistency(projection,250)
    assert result["status"]=="WITHIN_REVIEW_THRESHOLD"
    assert abs(result["component_minutes"]-250.6)<1e-4
    assert abs(result["difference_minutes"]-0.6)<1e-4
    assert abs(result["difference_percent"]-0.24)<1e-4
    assert result["review_threshold_percent"]==25
    assert result["elapsed_reconciled"] is False


def test_pg10_numeric_consistency_reviews_material_difference_or_missing_evidence():
    from aunea_backend.session_time import numeric_time_consistency
    good={"status":"CALCULATED","active_minutes_per_case":20,
          "wait_exposure_minutes_per_case":230,"rework_minutes_per_case":0,
          "annual_cases":1200,"annual_friction_additional_hours":0}
    assert numeric_time_consistency(good,100)["status"]=="REVIEW_DIFFERENCE"
    assert numeric_time_consistency(good,250)["status"]=="WITHIN_REVIEW_THRESHOLD"
    incomplete={**good,"rework_minutes_per_case":None,"status":"INCOMPLETE"}
    assert numeric_time_consistency(incomplete,250)["status"]=="UNAVAILABLE"
    assert numeric_time_consistency(good,None)["status"]=="UNAVAILABLE"
    assert numeric_time_consistency(good,250)["elapsed_reconciled"] is False
# [AUNEA-UAT-PG10-NUMERIC-171] END


def test_pg10_orchestrator_exposes_numeric_comparison_without_overwriting_df026():
    from aunea_backend.orchestrator import Orchestrator
    from aunea_backend.session_time import TimeProjectionRequest
    req=TimeProjectionRequest(volume=120,period="MONTH",steps=[
        dict(STEP,id="P1",active_time=3,wait_time=0,rework_time=0),
        dict(STEP,id="P2",active_time=2,wait_time=0,rework_time=0),
        dict(STEP,id="P3",active_time=6,wait_time=768,rework_time=0,
             applies_to={"mode":"PERCENT","value":30}),
        dict(STEP,id="P4",active_time=10,wait_time=0,rework_time=5,
             error_rate={"mode":"percent","value":8}),
    ],frictions=[dict(id="F2",affected_steps=["P2"],
        time_attribution={"mode":"ADDITIONAL","step_id":"P2"},
        frequency={"mode":"percent","value":30,"period":"case"},active_time_loss={"value":10})])
    confirmed={"DF026":{"value":250,"unit":"min"}}
    projection=Orchestrator()._time_projection_with_comparison(req,confirmed)
    assert confirmed["DF026"]=={"value":250,"unit":"min"}
    assert projection["numeric_comparison"]["status"]=="WITHIN_REVIEW_THRESHOLD"
    assert projection["numeric_comparison"]["component_minutes"]==250.6
    assert projection["numeric_comparison"]["elapsed_reconciled"] is False
    assert Orchestrator()._time_projection_with_comparison(req,{"DF026":{"value":250,"unit":"h"}})["numeric_comparison"]["declared_minutes"]==15000
    assert Orchestrator()._time_projection_with_comparison(req,{"DF026":{"value":250,"unit":"unsupported"}})["numeric_comparison"]["status"]=="UNAVAILABLE"


# [AUNEA-UAT-PG10-CAPACITY-172] START — Provenance-safe operating labour capacity, not cash.
def test_pg10_source_role_capacity_estimate_levante_sized_case_without_double_counting():
    from aunea_backend.session_time import TimeProjectionRequest, project_session_time, estimate_process_labor_capacity
    steps=[
        {"id":"P1","step_name":"Recibir","actor":"Administración","active_time":3,"wait_time":0,"rework_time":0},
        {"id":"P2","step_name":"Decidir","actor":"Administración","active_time":2,"wait_time":0,"rework_time":0},
        {"id":"P3","step_name":"Aprobar","actor":"Dirección","active_time":6,"wait_time":768,"rework_time":0,
         "applies_to":{"mode":"PERCENT","value":30}},
        {"id":"P4","step_name":"ERP","actor":"Administración","active_time":10,"wait_time":0,"rework_time":5,
         "error_rate":{"mode":"percent","value":8}},
    ]
    frictions=[{"id":"F2","affected_steps":["P2"],
                "time_attribution":{"mode":"ADDITIONAL","step_id":"P2"},
                "active_time_loss":{"value":10},
                "frequency":{"mode":"percent","value":30,"period":"case"}},
               {"id":"F1","affected_steps":["P4"],
                "time_attribution":{"mode":"INCLUDED","step_id":"P4"},
                "active_time_loss":{"value":5},
                "frequency":{"mode":"percent","value":100,"period":"case"}}]
    hours=project_session_time(TimeProjectionRequest(volume=120,period="MONTH",steps=steps,frictions=frictions))
    econ=[{"role_or_resource":"Administración","capacity_cost_rate_eur_hour":32,"evidence_type":"HYPOTHESIS"},
          {"role_or_resource":"Dirección","capacity_cost_rate_eur_hour":40,"evidence_type":"HYPOTHESIS"}]
    result=estimate_process_labor_capacity(hours,steps,econ)
    assert result["status"]=="COMPLETE"
    assert result["annual_labor_capacity_value_eur"]==15552
    roles={entry["role"]:entry for entry in result["role_breakdown"]}
    assert set(roles)=={"Administración","Dirección"}
    assert roles["Administración"]["annual_hours"]==432
    assert roles["Administración"]["hourly_rate"]==32
    assert roles["Administración"]["annual_capacity_value_eur"]==13824
    assert roles["Administración"]["capacity_value_eur_per_case"]==9.6
    assert roles["Administración"]["step_ids"]==["P1","P2","P4"]
    assert roles["Administración"]["evidence"]==["HYPOTHESIS"]
    assert roles["Dirección"]["annual_hours"]==43.2
    assert roles["Dirección"]["hourly_rate"]==40
    assert roles["Dirección"]["annual_capacity_value_eur"]==1728
    assert roles["Dirección"]["capacity_value_eur_per_case"]==1.2
    assert sum(row["annual_hours"] for row in roles.values())==result["covered_hours"]
    assert sum(row["annual_capacity_value_eur"] for row in roles.values())==result["annual_labor_capacity_value_eur"]

    assert result["capacity_value_eur_per_case"]==10.8
    assert result["covered_hours"]==475.2
    assert result["steps_valued"]==4
    assert result["rework_separate_value_eur"]==307.2
    assert result["steps"][1]["annual_hours"]==120  # 48h step + 72h ADDITIONAL
    assert result["steps"][3]["annual_hours"]==240  # INCLUDED does not increase cost
    assert all("HYPOTHESIS" in x["evidence"] for x in result["steps"])
    assert not any(key in result for key in ("cash_savings","annual_tool_cost","cost_accounting_total"))


def test_pg10_operating_cost_is_unavailable_if_rate_missing_or_conflicts():
    from aunea_backend.session_time import estimate_process_labor_capacity
    projection={"status":"CALCULATED","step_breakdown":[{"step_id":"P1","annual_active_hours":10,
                "annual_rework_hours":0}],"additional_friction_breakdown":[]}
    steps=[{"id":"P1","step_name":"Registrar","actor":"Administración"}]
    assert estimate_process_labor_capacity(projection,steps,[])["annual_labor_capacity_value_eur"] is None
    conflicting=[{"role_or_resource":"Administración","capacity_cost_rate_eur_hour":32},
                 {"role_or_resource":"Administración","capacity_cost_rate_eur_hour":45}]
    r=estimate_process_labor_capacity(projection,steps,conflicting)
    assert r["status"]=="PARTIAL"
    assert r["annual_labor_capacity_value_eur"] is None
    assert r["steps_valued"]==0
    assert r["role_breakdown"][0]["annual_capacity_value_eur"] is None
    assert r["role_breakdown"][0]["annual_hours"] is None
    assert r["role_breakdown"][0]["valued_step_count"]==0

# [AUNEA-UAT-PG10-CAPACITY-172] END
