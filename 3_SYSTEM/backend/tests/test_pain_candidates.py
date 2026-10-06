from aunea_backend.models import EngagementInput, EconomicInput
from aunea_backend.pain_candidates import PainCandidateEngine

def make_engagement(steps, frictions=None, economics=None, answers=None):
    q={"_process_steps":steps,"_frictions":frictions or []}
    q.update(answers or {})
    return EngagementInput(
        engagement_id="E-CAND",process_instance_id="P-CAND",process_name="Proceso",
        questionnaire_answers=q,economics=economics or []
    )

def ids(result):
    return {x.pain_id for x in result.candidates}

def test_invoice_map_suggests_rework_and_approval_bottleneck_without_creating_pains():
    e=make_engagement([
        {"id":"S1","status":"ACTIVE","step_name":"Recibir","step_type":"ST02","tool":"EMAIL","manual_actions":[],"wait_time":0,"rework_time":0},
        {"id":"S2","status":"ACTIVE","step_name":"Validar","step_type":"ST02","tool":"ERP","manual_actions":["CHECK"],"wait_time":90,"rework_time":10,"error_rate":{"mode":"percent","value":8}},
        {"id":"S5","status":"ACTIVE","step_name":"Aprobar","step_type":"ST05","tool":"ERP","manual_actions":["CHASE"],"wait_time":720,"rework_time":0},
    ])
    result=PainCandidateEngine().run(e)
    assert "P11" in ids(result)
    assert "P07" in ids(result)
    assert e.pains==[]
    assert e.pain_signals==[]
    assert all(x.status=="DERIVE_CANDIDATE" for x in result.candidates)

def test_manual_reentry_requires_structured_signal_and_candidate_points_to_real_step():
    e=make_engagement([
        {"id":"S1","status":"ACTIVE","step_name":"Recibir","step_type":"ST02","tool":"EMAIL","manual_actions":["COPY"]},
        {"id":"S2","status":"ACTIVE","step_name":"Registrar","step_type":"ST02","tool":"ERP","manual_actions":["REKEY"]},
    ])
    result=PainCandidateEngine().run(e)
    p03=next(x for x in result.candidates if x.pain_id=="P03")
    assert "S2" in p03.step_ids
    assert len(p03.review_questions)==3

def test_existing_confirmed_friction_suppresses_same_candidate():
    e=make_engagement(
        [{"id":"S1","status":"ACTIVE","step_name":"Registrar","step_type":"ST02","tool":"ERP","manual_actions":["REKEY"],"rework_time":5}],
        frictions=[{"id":"F1","status":"ACTIVE","friction_type":"P03","derived_pain_id":"P03","affected_steps":["S1"]}]
    )
    assert "P03" not in ids(PainCandidateEngine().run(e))

def test_multiple_tools_without_manual_transfer_does_not_invent_tool_fragmentation():
    e=make_engagement([
        {"id":"S1","status":"ACTIVE","step_name":"Leer","step_type":"ST02","tool":"EMAIL","manual_actions":[]},
        {"id":"S2","status":"ACTIVE","step_name":"Analizar","step_type":"ST02","tool":"ERP","manual_actions":[]},
    ])
    assert "P15" not in ids(PainCandidateEngine().run(e))

def test_direct_loss_can_only_raise_cost_leakage_candidate_when_linked_to_real_step():
    e=make_engagement(
        [{"id":"S1","status":"ACTIVE","step_name":"Registrar","step_type":"ST02","tool":"ERP","manual_actions":[]}],
        economics=[EconomicInput(step_ids=["S1"],driver_id="ED11",direct_loss_eur_annual=500,evidence_type="CLIENT_DECLARED")]
    )
    p19=next(x for x in PainCandidateEngine().run(e).candidates if x.pain_id=="P19")
    assert p19.step_ids==["S1"]
