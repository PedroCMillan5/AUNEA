"""PG11 Block 5 deterministic stress matrix (never requires a running model).

Real-model UAT is a separate explicit command: tests/pg11_live_ollama_gate.py.
No client data, commercial assumptions or changes to approved sources.
"""
# [AUNEA-UAT-PG11-MATRIX-299] START
import io
import json
import re

import pytest
from types import SimpleNamespace
from fastapi import HTTPException
from aunea_backend import internal_ai_global as global_ai
from aunea_backend.api import app
from aunea_backend.utils import stable_hash
from aunea_backend.internal_ai_global_review import assess_recommendation
from test_internal_ai_global import sample, candidate, configure


@pytest.mark.parametrize("count", [1, 2, 5])
def test_source_inventory_and_justifications_scale_without_a_global_quota(monkeypatch, count):
    configure(monkeypatch)
    request = sample()
    q = request.engagement.questionnaire_answers
    source = q["_frictions"][0].copy()
    q["_frictions"] = [
        {**source, "id": f"F{i}", "client_label": f"Fricción confirmada {i}"}
        for i in range(1, count + 1)
    ]
    request.diagnostic.input_snapshot_hash = stable_hash(request.engagement.model_dump())
    plan = global_ai.global_plan(request)
    ids = [row["source_id"] for row in plan["focus"]]
    assert ids[:count] == [f"F{i}" for i in range(1, count + 1)]
    observed = []

    def response(req, timeout=0):
        payload = json.loads(req.data)
        user = payload["messages"][1]["content"]
        match = re.search(r'"focus_source_id"\s*:\s*"(F\d+)"', user)
        assert match, "Scoping lost the current confirmed friction"
        focus = match.group(1)
        observed.append(focus)
        raw = candidate(refs=(focus, "S1"))
        raw["opportunities"][0]["objective"] = "Resolver fricción documentada " + focus
        raw["opportunities"][0]["how"] = (
            "Revisar datos de entrada para la fuente " + focus + "."
        )
        return io.BytesIO(json.dumps({
            "done": True, "done_reason": "stop", "prompt_eval_count": 1200,
            "message": {"content": json.dumps(raw)}
        }).encode())

    monkeypatch.setattr(global_ai._LOCAL_HTTP, "open", response)
    proposals = []
    for unit in plan["focus"][:count]:
        p = global_ai.GlobalBatchRequest(
            engagement=request.engagement, diagnostic=request.diagnostic,
            confirmed_as_is=True, snapshot_version=request.snapshot_version,
            focus_source_id=unit["source_id"],
        )
        result = global_ai.analyze_global(p)
        assert result["requires_human_review"] is True
        assert result["status"] == "DRAFT"
        assert result["opportunities"][0]["review"]["capability_status"] == "UNVERIFIED"
        proposals.extend(result["opportunities"])
    assert len(proposals) == count
    assert observed == ids[:count]
    assert len({x["objective"] for x in proposals}) == count


@pytest.mark.parametrize("constraint,action,status,source", [
    ({"DF087": ["HUMAN_DECISION"]},
     "Automatizar la aprobación de facturas sin intervención humana.",
     "INCOMPATIBLE", "DF087"),
    ({"DF087": ["HUMAN_DECISION"]},
     "Enviar avisos a las personas para que revisen la aprobación.",
     "CONDITIONED", ""),
    ({"DF089": ["CRM_NATIVE", "KEEP_EXISTING"]},
     "Proponer nueva plataforma de gestión sujeta a decisión del responsable.",
     "CONDITIONED", ""),
    ({"DF090": ["AUDIT_LOG", "RBAC"]},
     "Desactivar la auditoría y el control de permisos.",
     "INCOMPATIBLE", "DF090"),
    ({"DF091": ["NO_DOWNTIME"]},
     "Mantener la continuidad con una implantación gradual.",
     "CONDITIONED", ""),
    ({"DF091": ["NO_DOWNTIME"]},
     "Interrumpir la operación diaria durante la migración.",
     "INCOMPATIBLE", "DF091"),
])
def test_semantic_review_must_not_promote_preferences_or_unknown_capabilities(
        constraint, action, status, source):
    evaluation = assess_recommendation(action, {"client_constraints": constraint})
    assert evaluation["status"] == status
    assert evaluation["capability_status"] == "UNVERIFIED"
    if source:
        assert evaluation["conflicts"]
        assert source in evaluation["conflicts"][0]["source"].split("/")
    else:
        assert not evaluation["conflicts"]
        assert evaluation["verifications"]


def test_api_refuses_unapproved_inference_and_allows_only_authorized_local_plan(monkeypatch):
    from aunea_backend.api import internal_ai_tobe_global_plan, internal_ai_tobe_global
    request = sample()
    local = SimpleNamespace(client=SimpleNamespace(host="testclient"))
    monkeypatch.delenv("AUNEA_INTERNAL_AI_ENABLED", raising=False)
    monkeypatch.delenv("AUNEA_INTERNAL_AI_DATA_AUTHORIZED", raising=False)
    monkeypatch.setenv("AUNEA_INTERNAL_AI_PROVIDER", "ollama")
    with pytest.raises(HTTPException) as denied_plan:
        internal_ai_tobe_global_plan(request, local)
    assert denied_plan.value.status_code == 503
    with pytest.raises(HTTPException) as denied_inference:
        internal_ai_tobe_global(request, local)
    assert denied_inference.value.status_code == 503
    monkeypatch.setenv("AUNEA_INTERNAL_AI_ENABLED", "1")
    monkeypatch.setenv("AUNEA_INTERNAL_AI_DATA_AUTHORIZED", "1")
    plan = internal_ai_tobe_global_plan(request, local)
    assert plan["snapshot_version"] == request.snapshot_version
    assert plan["focus"]
    assert "_answer_details" not in str(plan)
    # This deterministic plan must not call Ollama, even with authorization.


@pytest.mark.parametrize("fragment", [
    "La propuesta queda sin term",
    "Falta validación por parte del clie",
    "Se generaría un registro adicional si se"
])
def test_cut_outputs_are_rejected_without_approving_or_mutating_the_engagement(fragment):
    raw = candidate()
    raw["opportunities"][0]["why"] = fragment
    original = sample().engagement.model_dump(mode="json")
    with pytest.raises(ValueError, match="texto incompleto"):
        global_ai.validate_global_brief(raw, {"F1", "S1"})
    assert sample().engagement.model_dump(mode="json") == original


def test_invented_and_duplicated_source_refs_are_never_accepted():
    raw = candidate(refs=("F1", "F1"))
    with pytest.raises(ValueError, match="repetido"):
        global_ai.validate_global_brief(raw, {"S1", "F1"})
    raw = candidate(refs=("F1", "MISSING_SOURCE"))
    with pytest.raises(ValueError, match="referencia ajena"):
        global_ai.validate_global_brief(raw, {"S1", "F1"})


def test_no_recommendations_is_valid_when_no_evidence_supports_a_change():
    empty = {
        "summary": "No existen mejoras justificadas con la evidencia disponible.",
        "opportunities": [], "has_more": False
    }
    result = global_ai.validate_global_brief(empty, {"S1"})
    assert len(result.opportunities) == 0
    assert result.has_more is False


def test_recommendation_count_is_determined_by_evidence_not_a_configured_quota():
    schema = global_ai.global_schema()
    assert schema["properties"]["opportunities"]["maxItems"] == 2
    # This limit applies to a single Ollama response, NOT the process or source.
    assert "No existe un máximo por fuente ni global" in global_ai.GLOBAL_PROMPT

# [AUNEA-UAT-PG11-MATRIX-299] END
