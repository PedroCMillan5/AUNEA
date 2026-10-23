# [AUNEA-UAT-INTERVENTION-REVIEW-155] START — Approved-only step delta and owner QA
from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from aunea_backend.intervention_projection import (
    InterventionProjectionRequest, StepTimeProposal, project_interventions_review,
)
from aunea_backend.session_time import TimeProjectionRequest


SOURCE = Path(__file__).resolve().parents[2] / "frontend" / "uat" / "cases" / "invoices.json"
INVOICE = json.loads(SOURCE.read_text(encoding="utf-8"))


def _baseline() -> TimeProjectionRequest:
    steps = []
    for idx, item in enumerate(INVOICE["steps"]):
        steps.append({
            "id": "S" + str(idx + 1),
            "step_name": item["name"],
            "status": "ACTIVE",
            "active_time": item["active"],
            "wait_time": item["wait"],
            "rework_time": item["rework"],
            "error_rate": {"mode": "percent", "value": item["error"]},
            "applies_to": (
                {"mode": "PERCENT", "value": item["share"]}
                if "share" in item else {"mode": "ALL"}
            ),
            "occurrences_per_case": 1,
        })
    return TimeProjectionRequest(
        volume=INVOICE["answers"]["DF021"],
        period=INVOICE["answers"]["DF022"],
        steps=steps,
    )


def _hypothesis(step: str, dimension: str, future: float | None, *,
                intervention: str = "A", reviewed: bool = True, **kwargs) -> StepTimeProposal:
    return StepTimeProposal(
        intervention_id=intervention, step_id=step,
        dimension=dimension, future_minutes=future,
        review_status="REVIEWED" if reviewed else "DRAFT",
        rationale="Hipótesis explícita de ensayo; no es resultado client-ready.",
        source_ref="UAT-HYPOTHESIS-TEST", evidence_type="HYPOTHESIS",
        **kwargs,
    )


def _request(*items: StepTimeProposal, baseline: TimeProjectionRequest | None = None):
    return InterventionProjectionRequest(
        scenario_name="Ensayo aislado", source_snapshot_version=1,
        source_snapshot_hash="UAT-synthetic-not-sealed",
        baseline=baseline or _baseline(), interventions=list(items),
    )


def test_no_assumptions_means_unknown_not_zero():
    result = project_interventions_review(_request())
    assert result["status"] == "NO_ASSUMPTIONS"
    assert result["annual_cases"] == 1920
    assert result["annual_active_delta_hours"] is None
    assert result["annual_wait_exposure_delta_case_hours"] is None
    assert result["annual_rework_delta_hours"] is None
    assert result["annual_future_end_to_end_hours"] is None
    assert result["cash_saving_eur_annual"] is None
    assert result["optimal_scenario"] is None


def test_rekey_step_included_five_minutes_cannot_be_added_twice():
    assert INVOICE["frictions"][2]["mode"] == "INCLUDED"
    assert INVOICE["frictions"][2]["minutes"] == INVOICE["steps"][5]["active"] == 5
    result = project_interventions_review(_request(_hypothesis("S6", "ACTIVE", 3)))
    assert result["annual_active_delta_hours"] == 64
    assert result["annual_rework_delta_hours"] is None
    assert result["annual_future_end_to_end_hours"] is None
    assert result["quote"] is None


def test_approval_wait_exposure_respects_conditional_25_percent_path():
    assert INVOICE["steps"][4]["share"] == 25
    assert "FINAL_DECISION" in INVOICE["answers"]["DF088"]
    result = project_interventions_review(_request(_hypothesis("S5", "WAIT", 600)))
    assert result["annual_wait_exposure_delta_case_hours"] == 960
    assert result["annual_active_delta_hours"] is None
    assert result["future_sla_hours"] is None
    assert result["capacity_value_eur_annual"] is None


def test_rework_uses_step_error_rate_not_global_error_without_denominator():
    result = project_interventions_review(_request(_hypothesis("S2", "REWORK", 6)))
    assert result["annual_rework_delta_hours"] == 10.24


def test_overlap_blocks_component_but_keeps_disjoint_wait_visible():
    result = project_interventions_review(_request(
        _hypothesis("S6", "ACTIVE", 3, intervention="integration"),
        _hypothesis("S6", "ACTIVE", 2, intervention="ai"),
        _hypothesis("S5", "WAIT", 600, intervention="approval"),
    ))
    assert result["status"] == "BLOCKED"
    assert result["annual_active_delta_hours"] is None
    assert result["annual_wait_exposure_delta_case_hours"] == 960
    assert sum(x["status"] == "CONFLICT" for x in result["interventions"]) == 2
    assert result["optimal_scenario"] is None


def test_unreviewed_draft_and_missing_provenance_never_count():
    draft = _hypothesis("S6", "ACTIVE", 0, reviewed=False)
    unsigned = _hypothesis("S5", "WAIT", 600, intervention="B")
    unsigned.source_ref = ""
    result = project_interventions_review(_request(draft, unsigned))
    assert result["status"] == "PARTIAL"
    assert result["annual_active_delta_hours"] is None
    assert result["annual_wait_exposure_delta_case_hours"] is None
    assert all(x["annual_delta_hours"] is None for x in result["interventions"])


def test_unknown_route_share_and_weekly_calendar_are_not_guessed():
    base = _baseline()
    base.steps[4]["applies_to"] = {"mode": "UNKNOWN"}
    result = project_interventions_review(_request(_hypothesis("S5", "WAIT", 600), baseline=base))
    assert result["annual_wait_exposure_delta_case_hours"] is None
    assert "proporción" in str(result["warnings"])
    base = _baseline()
    base.period = "WEEK"
    result = project_interventions_review(_request(_hypothesis("S6", "ACTIVE", 3), baseline=base))
    assert result["annual_cases"] is None
    assert result["annual_active_delta_hours"] is None


def test_negative_delta_is_possible_if_intervention_increases_work():
    result = project_interventions_review(_request(_hypothesis("S6", "ACTIVE", 6)))
    assert result["annual_active_delta_hours"] == -32


def test_unapproved_active_step_is_not_inferred_as_improved():
    result = project_interventions_review(_request(_hypothesis("S600", "ACTIVE", 0)))
    assert result["status"] == "PARTIAL"
    assert result["annual_active_delta_hours"] is None
    assert "no existe" in str(result["warnings"])


def test_projection_is_pure_and_does_not_mutate_fixture_or_baseline():
    fixture_before = copy.deepcopy(INVOICE)
    baseline = _baseline()
    original = baseline.model_dump()
    one = project_interventions_review(_request(_hypothesis("S6", "ACTIVE", 3), baseline=baseline))
    two = project_interventions_review(_request(_hypothesis("S5", "WAIT", 600), baseline=baseline))
    three = project_interventions_review(_request(_hypothesis("S2", "REWORK", 6), baseline=baseline))
    assert baseline.model_dump() == original
    assert INVOICE == fixture_before
    assert [one["annual_active_delta_hours"], two["annual_wait_exposure_delta_case_hours"], three["annual_rework_delta_hours"]] == [64, 960, 10.24]


def test_contract_rejects_invalid_negative_minutes_or_dimension():
    with pytest.raises(ValidationError):
        _hypothesis("S6", "ACTIVE", -1)
    with pytest.raises(ValidationError):
        _hypothesis("S6", "ROUTE_CRITICAL_PATH", 5)
    with pytest.raises(ValidationError):
        _hypothesis("S6", "ACTIVE", float('nan'))
    with pytest.raises(ValidationError):
        _hypothesis("S6", "ACTIVE", float('inf'))
# [AUNEA-UAT-INTERVENTION-REVIEW-155] END
