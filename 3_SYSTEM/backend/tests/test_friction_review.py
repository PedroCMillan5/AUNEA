# [AUNEA-UAT-FRICTION-REVIEW-071] START — Guardrails for unallocated impact
# SOURCE: Diagnostic Master v1.2 DF059–DF063 and RULE_ECON_AGGREGATION.
from aunea_backend.friction_review import review_frictions


STEPS = [{"id": "S1", "status": "ACTIVE"}, {"id": "S2", "status": "ACTIVE"}]


def test_multistep_friction_is_one_observation_never_multiplied():
    out = review_frictions(STEPS, [{
        "id": "F1", "affected_steps": ["S1", "S2"],
        "frequency": {"value": 10, "mode": "percent", "period": "case"},
        "active_time_loss": {"value": 5},
    }])
    assert len(out["findings"]) == 1
    assert out["findings"][0]["step_ids"] == ["S1", "S2"]
    assert sum("DF062" in x for x in out["findings"][0]["issues"]) == 1


def test_friction_cannot_point_to_superseded_or_nonexistent_step():
    out = review_frictions(STEPS + [{"id": "S3", "status": "SUPERSEDED"}], [{
        "id": "F1", "affected_steps": ["S1", "S3", "S9"]
    }])
    assert any("S3" in x and "S9" in x for x in out["findings"][0]["issues"])


def test_duplicate_friction_identifier_is_flagged_without_aggregation():
    out = review_frictions(STEPS, [
        {"id": "F1", "affected_steps": ["S1"]},
        {"id": "F1", "affected_steps": ["S2"]}
    ])
    assert len(out["findings"]) == 1
    assert "repetido" in out["findings"][0]["issues"][0]


def test_frequency_and_direct_loss_remain_conditional():
    out = review_frictions(STEPS, [{
        "id": "F1", "affected_steps": ["S1"],
        "frequency": {"mode": "percent", "value": 120},
        "direct_loss": {"value": 100, "period": "month"}
    }])
    issues = out["findings"][0]["issues"]
    assert any("100 %" in x for x in issues)
    assert any("DF063" in x for x in issues)


def test_without_material_impact_and_valid_anchors_no_additional_questions():
    out = review_frictions(STEPS, [{
        "id": "F1", "affected_steps": ["S1"], "frequency": {"value": 0}
    }])
    assert out["status"] == "NO_FINDINGS"
    assert out["findings"] == []
# [AUNEA-UAT-FRICTION-REVIEW-071] END
