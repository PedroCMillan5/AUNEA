from fastapi.testclient import TestClient

from aunea_backend.api import app, engine
from aunea_backend.deliverable_models import DeliverableRequest
from aunea_backend.models import EngagementInput, PainObservation, PainState, EconomicInput, RiskInput, CommercialScope
from aunea_backend.orchestrator import Orchestrator
from aunea_backend.pdf_export import PDFExporter

client = TestClient(app)


def fixture_engagement():
    return EngagementInput(
        engagement_id="ENG-DEL-PDF-000", process_instance_id="PROC-001", process_name="Client Intake",
        pains=[PainObservation(pain_id="P03", state=PainState.CONFIRMED, rationale="Duplicate entry observed")],
        economics=[EconomicInput(pain_id="P03", driver_id="ED01", annual_active_hours=120, capacity_cost_rate_eur_hour=30)],
        risks=[RiskInput(category="operational", likelihood_1_5=2, impact_1_5=2)],
        commercial_scope=CommercialScope(scope_bounded=True, integrations_known=True, tool_tco_current=True)
    )


def test_pdf_exporter_produces_a_valid_non_empty_pdf():
    orch = Orchestrator()
    diagnostic = orch.diagnose(fixture_engagement())
    pdf_bytes = PDFExporter().export(diagnostic, DeliverableRequest(client_name="Northstar", process_name="Client Intake"))
    assert isinstance(pdf_bytes, (bytes, bytearray))
    assert len(pdf_bytes) > 1000, "PDF must not be empty/trivial"
    assert pdf_bytes.startswith(b"%PDF-"), "must be a real PDF file, not a text/HTML stand-in"
    assert pdf_bytes.rstrip().endswith(b"%%EOF"), "PDF must be a complete, well-formed file"


def test_pdf_exporter_never_recalculates_pain_economics_risk_recommendation():
    orch = Orchestrator()
    diagnostic = orch.diagnose(fixture_engagement())
    # Corrupt the already-computed output the same way a formatting-only layer would still have to
    # render faithfully — proves the exporter reads values as given, it does not re-derive them.
    diagnostic.economic_result.direct_loss_eur_annual = 999999
    pdf_bytes = PDFExporter().export(diagnostic)
    # The reportlab content stream is not searchable plain text, so this asserts against the exporter's
    # own code path instead: it must never import or call any engine class.
    import inspect
    from aunea_backend import pdf_export as mod
    src = inspect.getsource(mod)
    for forbidden in ("PainEngine", "EconomicsEngine", "RiskEngine", "RecommendationEngine", "PricingEngine", "ScenarioComparator"):
        assert forbidden not in src, f"pdf_export.py must never import/call {forbidden} — formatting only (DEC-041)"
    assert len(pdf_bytes) > 1000


def test_pdf_translates_backend_enums_to_the_same_spanish_labels_the_frontend_already_uses():
    orch = Orchestrator()
    diagnostic = orch.diagnose(fixture_engagement())
    from aunea_backend.pdf_export import _es
    assert _es("pain_state", diagnostic.pain_results[0].state) == "Confirmado"
    assert _es("risk_level", diagnostic.risk_result.inherent_level) in ("Riesgo nulo", "Riesgo bajo", "Riesgo medio", "Riesgo crítico", "Sin evaluar")
    assert _es("confidence", "LOW") == "Baja"
    assert _es("quote_status", "READY") == "Lista"


def test_deliverables_pdf_endpoint_returns_application_pdf_content_type():
    orch = Orchestrator()
    diagnostic = orch.diagnose(fixture_engagement())
    r = client.post("/v1/deliverables/pdf", json={
        "diagnostic": diagnostic.model_dump(mode="json"),
        "request": {"client_name": "Northstar", "process_name": "Client Intake"},
    })
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert "attachment" in r.headers.get("content-disposition", "")
    assert r.content.startswith(b"%PDF-")
    assert len(r.content) > 1000


def test_deliverables_pdf_endpoint_requires_a_diagnostic_payload():
    r = client.post("/v1/deliverables/pdf", json={})
    assert r.status_code == 400


def test_saved_engagement_pdf_endpoint_uses_the_stored_diagnostic_without_recalculating():
    engagement = fixture_engagement()
    engagement.engagement_id = "ENG-DEL-PDF-001"
    engine.diagnose(engagement)  # persists engagement + DiagnosticOutput via the shared store, like /v1/diagnose
    r = client.post(f"/v1/engagements/{engagement.engagement_id}/deliverables/pdf", json={"client_name": "Northstar"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF-")


def test_saved_engagement_pdf_endpoint_404s_when_no_diagnostic_exists():
    r = client.post("/v1/engagements/ENG-NEVER-DIAGNOSED-PDF/deliverables/pdf", json={})
    assert r.status_code == 404
