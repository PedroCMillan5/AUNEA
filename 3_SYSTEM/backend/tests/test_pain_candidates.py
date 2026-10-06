from aunea_backend.models import EngagementInput
from aunea_backend.pain_candidates import PainCandidateEngine

def engagement():
    return EngagementInput(
        engagement_id="E-PC",process_instance_id="P-PC",process_name="Facturas",
        questionnaire_answers={
            "DF051":{"from":"S1","to":"S2"},
            "DF054":["pair:S2:S3"],
            "DF055":["INVALID"],
            "_answer_details":{"DF055__steps":["S2"]},
            "_process_steps":[
                {"id":"S1","status":"ACTIVE","step_name":"Recibir","step_type":"ST02","tool":"EMAIL","manual_actions":[],"rework_time":0,"wait_time":0},
                {"id":"S2","status":"ACTIVE","step_name":"Validar","step_type":"ST02","tool":"ERP","manual_actions":["REPORT"],"rework_time":10,"error_rate":{"mode":"percent","value":8},"wait_time":90},
                {"id":"S3","status":"ACTIVE","step_name":"Aprobar","step_type":"ST05","tool":"ERP","manual_actions":["CHASE"],"rework_time":0,"wait_time":720},
            ],
            "_frictions":[]
        }
    )

def test_candidates_are_reviewable_signals_not_pain_results():
    out=PainCandidateEngine().run(engagement())
    ids={x.pain_id for x in out.candidates}
    assert {"P03","P07","P11","P13","P14","P15"}.issubset(ids)
    assert all(x.review_questions for x in out.candidates)
    assert all(x.rationale for x in out.candidates)

def test_existing_friction_suppresses_same_candidate_on_same_step():
    e=engagement()
    e.questionnaire_answers["_frictions"]=[{
        "id":"F7","status":"ACTIVE","friction_type":"P07","derived_pain_id":"P07",
        "affected_steps":["S3"],"observable_signal":"Aprobación lenta"
    }]
    out=PainCandidateEngine().run(e)
    assert not any(x.pain_id=="P07" and "S3" in x.step_ids for x in out.candidates)

def test_rekey_action_alone_does_not_auto_infer_manual_reentry():
    e=engagement()
    e.questionnaire_answers.pop("DF051",None)
    e.questionnaire_answers["_process_steps"][0]["manual_actions"]=["REKEY"]
    out=PainCandidateEngine().run(e)
    assert not any(x.pain_id=="P03" for x in out.candidates), "P03 requires governed DF051 confirmation of duplicate entry"

def test_approval_step_without_wait_or_chasing_is_not_suggested():
    e=engagement()
    s=e.questionnaire_answers["_process_steps"][2]
    s["wait_time"]=0;s["manual_actions"]=[]
    out=PainCandidateEngine().run(e)
    assert not any(x.pain_id=="P07" and "S3" in x.step_ids for x in out.candidates)
