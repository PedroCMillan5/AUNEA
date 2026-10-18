"""Independent invoice-reference regression: source steps → temporal baseline → client presentation.
All data are synthetic QA only. This does NOT simulate PG09 confirmation or client approval.
"""
from aunea_backend.session_time import TimeProjectionRequest, project_session_time
from aunea_backend.models import (
    EngagementInput, PainObservation, PainState, EconomicInput, RiskInput,
)
from aunea_backend.orchestrator import Orchestrator
from aunea_backend.deliverable_models import DeliverableRequest
from aunea_backend.deliverables import DeliverablesEngine


def invoice_time_case():
    times = (2, 6, 2, 4, 8, 3)
    steps = []
    for i, active in enumerate(times, start=1):
        sid=f"QA-S{i:02}"
        steps.append({
            "id":sid, "status":"ACTIVE", "step_name":f"Paso {i}",
            "applies_to":{"mode":"PERCENT","value":25} if i==4 else {"mode":"ALL","value":100},
            "occurrences_per_case":1, "active_time":active,
            "wait_time":720 if i==4 else 0,
            "rework_time":4 if i==5 else 0,
            "error_rate":{"mode":"percent","value":10 if i==5 else 0,"period":"case"},
        })
    frictions=[
        {"id":"QA-F01","status":"ACTIVE","affected_steps":["QA-S05"],
         "active_time_loss":{"value":3,"unit":"min"},
         "time_attribution":{"mode":"INCLUDED","step_id":"QA-S05"},
         "frequency":{"mode":"percent","value":100,"period":"case"}},
        {"id":"QA-F02","status":"ACTIVE","affected_steps":["QA-S05"],
         "active_time_loss":{"value":4,"unit":"min"},
         "time_attribution":{"mode":"BREAKDOWN","step_id":"QA-S05"},
         "frequency":{"mode":"percent","value":10,"period":"case"}},
        {"id":"QA-F03","status":"ACTIVE","affected_steps":["QA-S04"],
         "active_time_loss":{"value":0,"unit":"min"},
         "time_attribution":{"mode":"INCLUDED","step_id":"QA-S04"},
         "frequency":{"mode":"percent","value":25,"period":"case"}}
    ]
    return TimeProjectionRequest(volume=180,period="MONTH",steps=steps,frictions=frictions)


def test_independent_invoice_oracle_has_no_wait_as_labor_and_no_double_count():
    projected=project_session_time(invoice_time_case())
    assert projected["annual_cases"]==2160
    assert projected["annual_active_hours"]==792
    assert projected["annual_wait_exposure_hours"]==6480
    assert projected["annual_rework_hours"]==14.4
    assert projected["annual_friction_additional_hours"]==0
    assert projected["annual_total_active_hours"]==792


def diagnostic_with_synthetic_reference_baseline():
    observed=[
        PainObservation(pain_id="P03",state=PainState.CONFIRMED,rationale="Reintroducción manual de datos en ERP"),
        PainObservation(pain_id="P11",state=PainState.CONFIRMED,rationale="Errores al copiar datos y retrabajo"),
        PainObservation(pain_id="P07",state=PainState.CONFIRMED,rationale="Espera en aprobación de facturas"),
    ]
    e=EngagementInput(
        engagement_id="QA-REF-FACT-001",process_instance_id="QA-FACT",process_name="Recepción y registro de facturas",
        pains=observed,
        economics=[EconomicInput(driver_id="ED05",annual_active_hours=14.4,annual_wait_hours=0,
                                 evidence_type="CLIENT_DECLARED",deduplication_key="QA-REWORK")],
        risks=[RiskInput(category="RC06",likelihood_1_5=3,impact_1_5=4,
                         reversible=True,controls_present=True,sensitive_or_high_impact=True,
                         material_financial_or_compliance=True,critical_trigger=False)],
    )
    diagnostic=Orchestrator().diagnose(e)
    # This test isolates the production renderer by attaching the separately tested
    # backend projection. It is NOT a genuine PG09/browser confirmation.
    return diagnostic.model_copy(update={"process_time_projection":project_session_time(invoice_time_case())})


def test_three_distinct_findings_and_two_explicitly_separate_time_scopes():
    diagnostic=diagnostic_with_synthetic_reference_baseline()
    pack=DeliverablesEngine().generate(
        diagnostic,DeliverableRequest(client_name="Oficina Delta QA",process_name="Facturas")
    )
    report=next(a.content for a in pack.artifacts if a.name=="diagnostic_report.md")
    for phrase in ("Reintroducción manual de datos en ERP","Errores al copiar datos y retrabajo",
                   "Espera en aprobación de facturas","792,0 h","6.480,0 h","14,4 h"):
        assert phrase in report, phrase
    assert "caso-horas" in report
    assert "Sin hipótesis cuantificada" in report
    assert "| Trabajo activo | 14,4 h | 0,0 h |" not in report
    assert "| Espera | 0,0 h | 0,0 h |" not in report
    assert pack.status != "READY", "A synthetic diagnostic must never become client-approved"


def test_renderer_does_not_mutate_the_engine_output():
    diagnostic=diagnostic_with_synthetic_reference_baseline()
    original=diagnostic.model_dump(mode="json")
    DeliverablesEngine().generate(diagnostic)
    assert diagnostic.model_dump(mode="json")==original
