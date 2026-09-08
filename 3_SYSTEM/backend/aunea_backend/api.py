from __future__ import annotations
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .models import EngagementInput, ScenarioRequest, DiagnosticOutput
from .deliverable_models import DeliverableRequest
from .solution_models import SolutionSpecificationRequest, SolutionSpecification
from .system_builder_models import SystemBuilderRequest
from .orchestrator import Orchestrator
from .registry import rule_bundle_version, load_registry
from .store import SQLiteStore

app = FastAPI(title="AUNEA Internal Backend", version="1.1.0")
store = SQLiteStore(os.environ.get("AUNEA_DB_PATH","aunea_runtime.db"))
engine = Orchestrator(store=store)

class ComparePayload(BaseModel):
    engagement: EngagementInput
    scenario: ScenarioRequest

class DeliverPayload(BaseModel):
    diagnostic: dict | None = None
    request: DeliverableRequest = DeliverableRequest()

@app.get("/health")
def health():
    return {"status":"ok","backend_version":"1.1.0","rule_bundle_version":rule_bundle_version()}

@app.get("/registry/status")
def registry_status():
    reg=load_registry()
    return {"version":reg.get("version"),"tables":len(reg.get("tables",{})),"rows":sum(len(x) for x in reg.get("tables",{}).values())}

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

@app.post("/v1/diagnose")
def diagnose(payload: EngagementInput):
    return engine.diagnose(payload)

@app.post("/v1/engagements/{engagement_id}/diagnose")
def diagnose_saved(engagement_id: str):
    item=store.get_engagement(engagement_id)
    if not item: raise HTTPException(404,"engagement not found")
    return engine.diagnose(item)

@app.get("/v1/engagements/{engagement_id}/diagnostic/latest")
def latest_diagnostic(engagement_id: str):
    out=store.latest_output(engagement_id)
    if not out: raise HTTPException(404,"diagnostic not found")
    return out

@app.post("/v1/scenarios/compare")
def compare(payload: ComparePayload):
    optimal, compared = engine.compare(payload.engagement,payload.scenario)
    return {"optimal":optimal.optimal_scenario,"compared":compared,"recommendation":optimal.recommendation}

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
def generate_saved_deliverables(engagement_id: str, request: DeliverableRequest = DeliverableRequest()):
    try:
        return engine.generate_deliverables_for_saved(engagement_id, request)
    except ValueError as exc:
        raise HTTPException(404, str(exc))

class SolutionSpecPayload(BaseModel):
    engagement: EngagementInput
    diagnostic: DiagnosticOutput
    request: SolutionSpecificationRequest = SolutionSpecificationRequest()

@app.post("/v1/solution-specifications/generate")
def generate_solution_specification(payload: SolutionSpecPayload):
    return engine.generate_solution_specification(payload.engagement, payload.diagnostic, payload.request)

@app.post("/v1/engagements/{engagement_id}/solution-specifications/generate")
def generate_saved_solution_specification(engagement_id: str, request: SolutionSpecificationRequest = SolutionSpecificationRequest()):
    try:
        return engine.generate_solution_specification_for_saved(engagement_id, request)
    except ValueError as exc:
        raise HTTPException(404, str(exc))

class SystemBuilderPayload(BaseModel):
    specification: SolutionSpecification
    request: SystemBuilderRequest = SystemBuilderRequest()

@app.post("/v1/system-builder/plan")
def generate_system_build_plan(payload: SystemBuilderPayload):
    return engine.generate_system_build_plan(payload.specification, payload.request)

@app.post("/v1/system-builder/package")
def generate_system_build_package(payload: SystemBuilderPayload):
    return engine.generate_system_build_package(payload.specification, payload.request)
