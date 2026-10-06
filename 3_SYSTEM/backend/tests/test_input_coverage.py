from aunea_backend.input_coverage import InputCoverageEngine, relational_integrity_issues
from aunea_backend.models import EngagementInput, EconomicInput, RiskInput

def engagement(**overrides):
    data=dict(
        engagement_id="E-COV",process_instance_id="P-COV",process_name="Proceso",
        questionnaire_answers={
            "DF012":"EVENT","DF013":"OUTCOME","DF021":120,"DF022":"MONTH","DF086":["VISIBILITY"],"DF093":"YES",
            "_process_steps":[
                {"id":"S1","status":"ACTIVE","step_name":"Recibir","step_type":"ST02","actor":"Administración","tool":"EMAIL","active_time":3,"wait_time":0,"rework_time":0,"manual_actions":[]},
                {"id":"S2","status":"ACTIVE","step_name":"Validar","step_type":"ST02","actor":"Administración","tool":"ERP","active_time":8,"wait_time":90,"rework_time":10,"manual_actions":["CHECK"]},
                {"id":"S5","status":"ACTIVE","step_name":"Aprobar","step_type":"ST05","actor":"Dirección","tool":"ERP","active_time":6,"wait_time":720,"rework_time":0,"manual_actions":["CHASE"]},
            ],
            "_frictions":[
                {"id":"F1","status":"ACTIVE","friction_type":"P02","derived_pain_id":"P02","observable_signal":"Faltan datos","affected_steps":["S2"],"cause":["MISSING"],"frequency":{"mode":"percent","value":8},"active_time_loss":{"value":10},"time_attribution":{"mode":"BREAKDOWN","step_id":"S2"}},
                {"id":"F2","status":"ACTIVE","friction_type":"P07","derived_pain_id":"P07","observable_signal":"Aprobación tarda","affected_steps":["S5"],"cause":["APPROVAL"],"frequency":{"mode":"percent","value":25},"wait_time_loss":{"value":720}},
            ],
            "_engine_gate_trace":{"RR-03":"NO","RR-04":"NO","IN-R-12":"NO","IN-R-13":"NO","IN-R-11":"YES"},
        },
        pain_signals=[],
        economics=[],
        risks=[],
        existing_tool_can_cover=False,process_design_preconditions_ok=True,
        requires_unstructured_ai_assistance=False,requires_bounded_agent_action=False,requires_management_visibility=True,
    )
    data.update(overrides)
    return EngagementInput(**data)

def test_contract_engine_evaluates_55_inputs_and_blocks_missing_required_sources():
    out=InputCoverageEngine().run(engagement())
    assert len(out.items)==55
    assert out.status=="BLOCKED"
    assert "IN-G-02" in out.blocking_gaps or "IN-G-03" in out.blocking_gaps

def test_real_capture_without_session_trace_is_not_falsely_blocked_as_legacy_backend_input():
    e=EngagementInput(engagement_id="LEG",process_instance_id="P",process_name="Legacy")
    out=InputCoverageEngine().run(e)
    assert out.status=="NOT_EVALUATED"
    assert out.blocking_gaps==[]

def test_relational_integrity_rejects_risk_and_economic_rows_without_active_step_anchor():
    e=engagement(
        risks=[RiskInput(step_ids=["MISSING"],category="operational",likelihood_1_5=2,impact_1_5=2)],
        economics=[EconomicInput(step_ids=[],driver_id="ED05",annual_active_hours=19.2)]
    )
    issues=relational_integrity_issues(e)
    assert any("riesgo" in x.lower() and "ya no están activos" in x for x in issues)
    assert any("impacto" in x.lower() and "ningún paso activo" in x for x in issues)

def test_wait_and_rework_impacts_must_be_supported_by_the_selected_steps_or_linked_frictions():
    e=engagement(economics=[
        EconomicInput(step_ids=["S1"],driver_id="ED13",annual_wait_hours=100),
        EconomicInput(step_ids=["S1"],driver_id="ED05",annual_active_hours=10),
    ])
    issues=relational_integrity_issues(e)
    assert any("cuantifica espera sin una espera registrada" in x for x in issues)
    assert any("cuantifica retrabajo sin retrabajo o fricción compatible" in x for x in issues)

def test_invoice_wait_and_rework_impacts_are_valid_when_anchored_to_the_real_steps():
    e=engagement(economics=[
        EconomicInput(step_ids=["S2"],pain_id="P02",driver_id="ED05",annual_active_hours=19.2,evidence_type="CLIENT_DECLARED"),
        EconomicInput(step_ids=["S5"],pain_id="P07",driver_id="ED13",annual_wait_hours=4320,evidence_type="CLIENT_DECLARED"),
    ])
    assert relational_integrity_issues(e)==[]
