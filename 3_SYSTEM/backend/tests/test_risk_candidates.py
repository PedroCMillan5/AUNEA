from aunea_backend.engines import RiskCandidateEngine
from aunea_backend.models import EngagementInput


def engagement(risks, df074=None):
    answers = {
        "_process_steps": [
            {"id": "S1", "status": "ACTIVE", "step_name": "Aprobar", "step_type": "ST05"}
        ],
        "_frictions": [],
        "_risks": risks,
    }
    if df074 is not None:
        answers["DF074"] = df074
    return EngagementInput(
        engagement_id="E-RISK-CAND",
        process_instance_id="P-RISK-CAND",
        process_name="Proceso",
        questionnaire_answers=answers,
    )


def test_candidate_reversibility_context_is_sourced_from_riskinput():
    out = RiskCandidateEngine().run(
        engagement([{"description": "Compromiso contractual", "reversibility": "HARD"}])
    )
    assert out["candidates"]
    assert any("RT_RISK.Reversibility" in x["source_signals"] for x in out["candidates"])
    assert all("DF074" not in x["source_signals"] for x in out["candidates"])


def test_stale_manual_df074_cannot_create_reversibility_context():
    out = RiskCandidateEngine().run(
        engagement(
            [{"description": "Corregible", "reversibility": "REVERSIBLE"}],
            df074="texto manual obsoleto que antes activaba el contexto",
        )
    )
    assert out["candidates"]
    assert all("RT_RISK.Reversibility" not in x["source_signals"] for x in out["candidates"])
    assert all("DF074" not in x["source_signals"] for x in out["candidates"])
