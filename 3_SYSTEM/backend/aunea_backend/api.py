# [AUNEA-BE-API-CORE-010] START — HTTP API surface
# PURPOSE: FastAPI app wiring (CORS, store/orchestrator instances) and all REST endpoints for engagements, diagnose, scenarios, audit, deliverables, solution specifications and system builder.
# SOURCE: REQ-ENGN-001/REC-001/SCEN-001; DEC-034; DEC-041.
# INPUTS: HTTP requests (EngagementInput, DiagnosticOutput, ScenarioRequest, DeliverableRequest, SolutionSpecificationRequest, SystemBuilderRequest payloads).
# OUTPUTS: HTTP responses (DiagnosticOutput, ScenarioResult, DeliverablePack, SolutionSpecification, SystemBuildPlan/Package).
# SIDE_EFFECTS: SQLite persistence via store; in-memory audit runs.
# CHANGE_RISK: CRITICAL.
from __future__ import annotations
import os
from fastapi import FastAPI, HTTPException, Body, Response, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .models import EngagementInput, ScenarioRequest, DiagnosticOutput
from .deliverable_models import DeliverableRequest
from .solution_models import SolutionSpecificationRequest, SolutionSpecification
from .system_builder_models import SystemBuilderRequest
from .orchestrator import Orchestrator
from .registry import rule_bundle_version, load_registry
from .store import SQLiteStore
from .uat import run_canonical_uat
from .session_time import TimeProjectionRequest, TimeReconciliationRequest, project_session_time, reconcile_session_time
from .input_coverage import relational_integrity_issues
from .intervention_projection import InterventionProjectionRequest, project_interventions_review
from .intervention_reconciliation import InterventionReconciliationRequest, reconcile_interventions_review
from .internal_ai import PilotAIRequest, PilotAIStepRequest, PilotAIConsolidationRequest, validate_pilot_source
from .internal_ai_provider import status as internal_ai_status, propose as propose_internal_tobe, ProviderUnavailable

app = FastAPI(title="AUNEA Internal Backend", version="1.1.1")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[A-Za-z0-9.-]+\.app\.github\.dev)$",
    allow_credentials=False,
    allow_methods=["GET","POST","PUT","OPTIONS"],
    allow_headers=["Content-Type"],
)
store = SQLiteStore(os.environ.get("AUNEA_DB_PATH","aunea_runtime.db"))
engine = Orchestrator(store=store)

class ComparePayload(BaseModel):
    engagement: EngagementInput
    diagnostic: DiagnosticOutput
    scenario: ScenarioRequest

class DeliverPayload(BaseModel):
    diagnostic: dict | None = None
    request: DeliverableRequest = Field(default_factory=DeliverableRequest)


# [AUNEA-BE-INTERNAL-AI-API-192] START — explicit local pilot, disabled by default
# SOURCE: DEC-034/050/052/055, Simulator CANONICAL PG10/PG11, pilot REVIEW.
# No provider calls unless three server-side configuration gates are enabled.
@app.get("/v1/internal-ai/status")
def get_internal_ai_status():
    return internal_ai_status()

@app.post("/v1/internal-ai/tobe-draft")
def internal_ai_tobe_draft(payload: PilotAIRequest, request: FastAPIRequest):
    if request.client is None or request.client.host not in ("127.0.0.1", "::1", "testclient"):
        raise HTTPException(403, "Piloto IA limitado a acceso local. Requiere autenticación antes del despliegue.")
    try:
        return propose_internal_tobe(payload)
    except ProviderUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
# [AUNEA-BE-INTERNAL-AI-API-192] END
# [AUNEA-BE-INTERNAL-AI-STEP-API-196] START — one request per source activity.
# SOURCE: same confirmed snapshot and official diagnostic as PG11 pilot, REVIEW.
# SECURITY: local-only, explicit provider and consent; no persistence or approval.
@app.post("/v1/internal-ai/tobe-step")
def internal_ai_tobe_step(payload: PilotAIStepRequest, request: FastAPIRequest):
    if request.client is None or request.client.host not in ("127.0.0.1", "::1", "testclient"):
        raise HTTPException(403, "El piloto IA por actividad sólo admite conexiones locales.")
    from .internal_ai_provider import _schema, _INSTRUCTIONS
    from .internal_ai_ollama import propose_step, OllamaUnavailable, model_name
    from .utils import stable_hash
    # Verify authorization on EVERY step, without a fragile 2-second /api/tags
    # probe between CPU-bound inferences. /api/chat reports actual model failures.
    if os.getenv("AUNEA_INTERNAL_AI_PROVIDER", "").strip().lower() != "ollama":
        raise HTTPException(503, "El proveedor seleccionado ya no es Ollama local.")
    if os.getenv("AUNEA_INTERNAL_AI_ENABLED") != "1":
        raise HTTPException(503, "La función de IA fue desactivada en el backend.")
    if os.getenv("AUNEA_INTERNAL_AI_DATA_AUTHORIZED") != "1":
        raise HTTPException(503, "No hay autorización vigente para tratar datos con IA.")
    try:
        model = model_name()
        steps = validate_pilot_source(payload.request)
        item = propose_step(payload.request, steps, _schema(), _INSTRUCTIONS, payload.source_step_id)
        return {
            "status": "DRAFT", "requires_human_review": True,
            "engagement_id": payload.request.engagement.engagement_id,
            "snapshot_version": payload.request.snapshot_version,
            "input_hash": stable_hash(payload.request.engagement.model_dump()),
            "model": model, "item": item.model_dump(mode="json")
        }
    except OllamaUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
@app.post("/v1/internal-ai/tobe-review")
def internal_ai_tobe_review(payload: PilotAIConsolidationRequest, request: FastAPIRequest):
    # Consolidation never edits proposals or official diagnostic engines.
    if request.client is None or request.client.host not in ("127.0.0.1", "::1", "testclient"):
        raise HTTPException(403, "El piloto IA por actividad sólo admite conexiones locales.")
    if os.getenv("AUNEA_INTERNAL_AI_PROVIDER", "").strip().lower() != "ollama":
        raise HTTPException(503, "La revisión requiere seleccionar Ollama local.")
    if os.getenv("AUNEA_INTERNAL_AI_ENABLED") != "1":
        raise HTTPException(503, "La IA del backend está desactivada.")
    if os.getenv("AUNEA_INTERNAL_AI_DATA_AUTHORIZED") != "1":
        raise HTTPException(503, "No hay autorización vigente para tratar datos con IA.")
    from .internal_ai_review import consolidate
    from .internal_ai_ollama import OllamaUnavailable
    try:
        return consolidate(payload)
    except OllamaUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc

# [AUNEA-BE-INTERNAL-AI-STEP-API-196] END



@app.get("/health")
def health():
    return {"status":"ok","backend_version":"1.1.1","rule_bundle_version":rule_bundle_version()}

@app.get("/registry/status")
def registry_status():
    reg=load_registry()
    return {"version":reg.get("version"),"tables":len(reg.get("tables",{})),"rows":sum(len(x) for x in reg.get("tables",{}).values())}

# [AUNEA-BE-SESSION-TIME-API-070] START — Server-owned diagnostic time projection
# This projection explains captured AS-IS workload, not future recovery or cash savings.
@app.post("/v1/diagnostic/time-projection")
def diagnostic_time_projection(payload: TimeProjectionRequest):
    return project_session_time(payload)

# DEC-074: display-only reconstruction, with explicit non-comparability warnings.
@app.post("/v1/diagnostic/time-reconciliation")
def diagnostic_time_reconciliation(payload: TimeReconciliationRequest):
    return reconcile_session_time(payload)
# [AUNEA-BE-SESSION-TIME-API-070] END

# [AUNEA-UAT-API-010] START — Visible isolated UAT endpoint
@app.post("/v1/uat/run")
def run_uat():
    return run_canonical_uat()
# [AUNEA-UAT-API-010] END

@app.put("/v1/engagements/{engagement_id}")
def save_engagement(engagement_id: str, payload: EngagementInput):
    if engagement_id != payload.engagement_id: raise HTTPException(400,"engagement_id mismatch")
    store.save_engagement(payload)
    return {"status":"saved","engagement_id":engagement_id}

@app.get("/v1/engagements/{engagement_id}")
def get_engagement(engagement_id: str):
    item=store.get_engagement(engagement_id)
    if not item: raise HTTPException(404,"engagement not found")
    return item

@app.post("/v1/diagnostic/pain-candidates")
def diagnostic_pain_candidates(payload: EngagementInput):
    return engine.pain_candidates.run(payload)

@app.post("/v1/diagnostic/risk-candidates")
def diagnostic_risk_candidates(payload: EngagementInput):
    return engine.risk_candidates.run(payload)

@app.post("/v1/diagnostic/coverage")
def diagnostic_coverage(payload: EngagementInput):
    coverage=engine.coverage.run(payload)
    integrity=relational_integrity_issues(payload)
    return {"coverage":coverage,"integrity_issues":integrity}

# [AUNEA-BE-ASIS-ANALYSIS-API-152] START — Baseline before solution selection
# Uses the same canonical EngagementInput, with no invented five-gate answers.
@app.post("/v1/diagnostic/asis-analysis")
def asis_analysis(payload: EngagementInput):
    try:
        return engine.analyze_asis(payload)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
# [AUNEA-BE-ASIS-ANALYSIS-API-152] END

# [AUNEA-BE-INTERVENTION-API-155] START — Isolated review-only simulation endpoint
# SOURCE: DEC-034/050/068/074, REVIEW contract 2026-10-23 (NOT official PG14).
# INPUTS: Explicit reviewed step assumptions + existing time baseline, never a sealed-snapshot claim.
# OUTPUTS: Unsupported official outputs remain null; no write to ScenarioComparator/store/client.
# SIDE_EFFECTS: None. No client publication or pricing from this endpoint.
# CHANGE_RISK: HIGH.
@app.post("/v1/diagnostic/interventions/review")
def review_interventions(payload: InterventionProjectionRequest):
    return project_interventions_review(payload)
# [AUNEA-BE-INTERVENTION-API-155] END

# [AUNEA-BE-INTERVENTION-RECONCILE-API-156] START — Review-only attribution endpoint
# PURPOSE: Validate event ownership and prepare compatible assumptions without executing official scenarios.
# SOURCE: DEC-034/050/068/074; intervention reconciliation contract REVIEW 2026-10-27.
# INPUTS: Version-bound proposals, economic owners, Pain observations and explicit reviewed bindings.
# OUTPUTS: Partial temporal components, attribution dependencies and candidate assumptions.
# SIDE_EFFECTS: None; never writes store or publishes.
# CHANGE_RISK: HIGH.
@app.post("/v1/diagnostic/interventions/reconcile-review")
def reconcile_interventions(payload: InterventionReconciliationRequest):
    # [AUNEA-BE-INTERVENTION-RECONCILE-API-156] Derived arithmetic can overflow
    # even when every supplied float is finite; reject before FastAPI JSON encoding.
    from json import dumps
    try:
        result = reconcile_interventions_review(payload)
        dumps(result, allow_nan=False)
        return result
    except (ArithmeticError, ValueError) as exc:
        raise HTTPException(422, "Los valores de la conciliación producen un resultado numérico no finito") from exc
# [AUNEA-BE-INTERVENTION-RECONCILE-API-156] END

@app.post("/v1/diagnose")
def diagnose(payload: EngagementInput):
    try:
        return engine.diagnose(payload)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc

@app.post("/v1/engagements/{engagement_id}/diagnose")
def diagnose_saved(engagement_id: str):
    item=store.get_engagement(engagement_id)
    if not item: raise HTTPException(404,"engagement not found")
    try:
        return engine.diagnose(item)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc

@app.get("/v1/engagements/{engagement_id}/diagnostic/latest")
def latest_diagnostic(engagement_id: str):
    out=store.latest_output(engagement_id)
    if not out: raise HTTPException(404,"diagnostic not found")
    return out

@app.post("/v1/scenarios/compare")
def compare(payload: ComparePayload):
    try:
        optimal, compared = engine.compare(payload.engagement,payload.scenario,payload.diagnostic)
    except ValueError as exc:
        raise HTTPException(409, str(exc))
    return {"optimal":optimal.optimal_scenario,"compared":compared,"recommendation":optimal.recommendation,"input_snapshot_hash":optimal.input_snapshot_hash,"rule_bundle_version":optimal.rule_bundle_version}

@app.get("/v1/audit/runs")
def audit_runs(engagement_id: str | None=None):
    return store.list_runs(engagement_id)

@app.post("/v1/deliverables/generate")
def generate_deliverables(payload: DeliverPayload):
    if not payload.diagnostic:
        raise HTTPException(400,"diagnostic payload required")
    diagnostic = DiagnosticOutput.model_validate(payload.diagnostic)
    return engine.generate_deliverables(diagnostic, payload.request)

@app.post("/v1/engagements/{engagement_id}/deliverables/generate")
def generate_saved_deliverables(engagement_id: str, request: DeliverableRequest | None = Body(default=None)):
    try:
        return engine.generate_deliverables_for_saved(engagement_id, request or DeliverableRequest())
    except ValueError as exc:
        raise HTTPException(404, str(exc))

# [AUNEA-BE-DELIVERABLES-PDF-API-010] START — Real PDF download endpoints
# Same DEC-041 contract as the JSON deliverables endpoints above: consumes an already-computed
# DiagnosticOutput, never recalculates. Returns a real application/pdf file, never window.print().
@app.post("/v1/deliverables/pdf")
def generate_deliverables_pdf(payload: DeliverPayload):
    if not payload.diagnostic:
        raise HTTPException(400, "diagnostic payload required")
    diagnostic = DiagnosticOutput.model_validate(payload.diagnostic)
    pdf_bytes = engine.export_deliverable_pdf(diagnostic, payload.request)
    filename = f"AUNEA_{diagnostic.engagement_id}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

@app.post("/v1/engagements/{engagement_id}/deliverables/pdf")
def generate_saved_deliverables_pdf(engagement_id: str, request: DeliverableRequest | None = Body(default=None)):
    try:
        pdf_bytes = engine.export_deliverable_pdf_for_saved(engagement_id, request or DeliverableRequest())
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    filename = f"AUNEA_{engagement_id}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
# [AUNEA-BE-DELIVERABLES-PDF-API-010] END

class SolutionSpecPayload(BaseModel):
    engagement: EngagementInput
    diagnostic: DiagnosticOutput
    request: SolutionSpecificationRequest = Field(default_factory=SolutionSpecificationRequest)

@app.post("/v1/solution-specifications/generate")
def generate_solution_specification(payload: SolutionSpecPayload):
    return engine.generate_solution_specification(payload.engagement, payload.diagnostic, payload.request)

@app.post("/v1/engagements/{engagement_id}/solution-specifications/generate")
def generate_saved_solution_specification(engagement_id: str, request: SolutionSpecificationRequest | None = Body(default=None)):
    try:
        return engine.generate_solution_specification_for_saved(engagement_id, request or SolutionSpecificationRequest())
    except ValueError as exc:
        raise HTTPException(404, str(exc))

class SystemBuilderPayload(BaseModel):
    specification: SolutionSpecification
    request: SystemBuilderRequest = Field(default_factory=SystemBuilderRequest)

@app.post("/v1/system-builder/plan")
def generate_system_build_plan(payload: SystemBuilderPayload):
    return engine.generate_system_build_plan(payload.specification, payload.request)

@app.post("/v1/system-builder/package")
def generate_system_build_package(payload: SystemBuilderPayload):
    return engine.generate_system_build_package(payload.specification, payload.request)
# [AUNEA-BE-API-CORE-010] END
