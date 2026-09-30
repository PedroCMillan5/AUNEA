# [AUNEA-UAT-ECON-OVERLAP-075] START — B03 conservative economic aggregation acceptance
# SOURCE: Diagnostic Master v1.2 EAR-001/004/006 and DEC-065/068.
from fastapi.testclient import TestClient
import pytest

from aunea_backend.api import app
from aunea_backend.economic_overlap import economic_overlap_issues
from aunea_backend.engines import EconomicsEngine, EngineContext
from aunea_backend.models import EconomicInput, EngagementInput


def record(*inputs: EconomicInput) -> EngagementInput:
    return EngagementInput(
        engagement_id="B03-ECON", process_instance_id="P-B03",
        process_name="Prueba B03", economics=list(inputs),
    )


def econ(driver: str, hours: float | None = None,
         steps: list[str] | None = None, key: str | None = None,
         loss: float | None = None) -> EconomicInput:
    return EconomicInput(
        driver_id=driver, annual_active_hours=hours, step_ids=steps or [],
        deduplication_key=key, direct_loss_eur_annual=loss,
    )


def test_unverified_total_and_components_same_scope_are_held_in_backend():
    engagement = record(econ("ED01", 100, ["S1"]), econ("ED05", 30, ["S1"]))
    issues = economic_overlap_issues(engagement.economics)
    assert len(issues) == 1
    assert "EAR-001/004" in issues[0]
    with pytest.raises(ValueError, match="Revisión económica requerida"):
        EconomicsEngine().run(EngineContext(engagement))


def test_disjoint_steps_allow_verified_separate_driver_records():
    engagement = record(econ("ED01", 100, ["S1"]), econ("ED05", 30, ["S2"]))
    assert economic_overlap_issues(engagement.economics) == []
    result = EconomicsEngine().run(EngineContext(engagement))
    assert result.status == "COMPLETE"
    assert result.annual_active_hours == 130


def test_missing_scope_never_proves_two_totals_disjoint():
    engagement = record(econ("ED01", 100), econ("ED02", 30, ["S2"]))
    assert len(economic_overlap_issues(engagement.economics)) == 1


def test_identical_event_key_counts_once_without_fabricating_a_row_key():
    one = econ("ED02", 10, ["S1"], key="OBSERVED-1")
    result = EconomicsEngine().run(EngineContext(record(one, one.model_copy())))
    assert result.annual_active_hours == 10


def test_same_event_key_with_conflicting_driver_must_be_reconciled():
    rows = [econ("ED09", steps=["S1"], key="OBSERVED-2", loss=100),
            econ("ED11", steps=["S1"], key="OBSERVED-2", loss=100)]
    assert any("EAR-006/012" in x for x in economic_overlap_issues(rows))


def test_two_same_driver_direct_claims_without_event_identity_in_same_scope_are_held():
    inputs = [econ("ED11", steps=["S1"], loss=100),
              econ("ED11", steps=["S1"], loss=100)]
    assert len(economic_overlap_issues(inputs)) == 1
    disjoint = [econ("ED11", steps=["S1"], loss=100),
                econ("ED11", steps=["S2"], loss=100)]
    assert economic_overlap_issues(disjoint) == []


def test_friction_context_is_not_independently_summed_as_an_extra_monetary_row():
    engagement = record(econ("ED11", steps=["S1"], loss=100))
    engagement.questionnaire_answers["_frictions"] = [{
        "id": "F1", "affected_steps": ["S1"], "direct_loss": {"value": 100},
    }]
    result = EconomicsEngine().run(EngineContext(engagement))
    assert result.direct_loss_eur_annual == 100


def test_http_409_preserves_ambiguity_instead_of_publishing_misleading_totals():
    engagement = record(econ("ED01", 120, ["S1"]), econ("ED05", 40, ["S1"]))
    response = TestClient(app).post("/v1/diagnose", json=engagement.model_dump(mode="json"))
    assert response.status_code == 409
    assert "EAR-001/004" in response.json()["detail"]



@pytest.mark.parametrize('left,right', [('ED02','ED02'), ('ED09','ED11')])
def test_api_rejects_unidentified_overlap_already_blocked_by_capture(left, right):
    rows = ([econ(left, 10, ['S1']), econ(right, 10, ['S1'])]
            if left == 'ED02' else
            [econ(left, steps=['S1'], loss=100), econ(right, steps=['S1'], loss=100)])
    response = TestClient(app).post('/v1/diagnose', json=record(*rows).model_dump(mode='json'))
    assert response.status_code == 409

@pytest.mark.parametrize('field,value', [
    ('capacity_cost_rate_eur_hour', 25),
    ('current_tool_cost_eur_annual', 100),
    ('realized_cash_saving_eur_annual', 50),
])
def test_same_key_cannot_silently_drop_conflicting_economic_amounts(field, value):
    one = econ('ED02', 10, ['S1'], key='EVENT-1')
    two = one.model_copy(update={field: value})
    assert economic_overlap_issues([one, two])

def test_three_uat3_economic_claims_are_distinct_declarations_not_fabricated_savings():
    import json
    from pathlib import Path
    directory=Path(__file__).resolve().parents[2]/"frontend"/"uat"/"cases"
    for filename in ("invoices.json","unified-requests.json","email-orders.json"):
        case=json.loads((directory/filename).read_text(encoding="utf-8"))
        cost=case["economics"]["toolAnnual"]
        rate=case["economics"]["rate"]
        rows=[
            EconomicInput(driver_id="ED14", capacity_cost_rate_eur_hour=rate,
                          annual_active_hours=0, annual_wait_hours=0,
                          direct_loss_eur_annual=0, realized_cash_saving_eur_annual=0,
                          evidence_type="CLIENT_DECLARED"),
            EconomicInput(driver_id="ED12",current_tool_cost_eur_annual=cost,
                          annual_active_hours=0, annual_wait_hours=0,
                          direct_loss_eur_annual=0, realized_cash_saving_eur_annual=0,
                          evidence_type="CLIENT_DECLARED"),
        ]
        assert economic_overlap_issues(rows)==[], case["key"]
        assert sum(x.realized_cash_saving_eur_annual or 0 for x in rows)==0
        assert sum(x.direct_loss_eur_annual or 0 for x in rows)==0
        assert sum(x.current_tool_cost_eur_annual or 0 for x in rows)==cost
        # A hypothetical duplicate financial loss with no event key is not published.
        duplicate=econ("ED11",steps=["S1"],loss=100)
        assert economic_overlap_issues([*rows,duplicate,duplicate.model_copy()])

# [AUNEA-UAT-ECON-OVERLAP-075] END
