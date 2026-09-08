from __future__ import annotations
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .models import EngagementInput, ScenarioRequest
from .orchestrator import Orchestrator
from .registry import rule_bundle_version, load_registry
from .store import SQLiteStore

app = FastAPI(title="AUNEA Internal Backend", version="0.8.0")
store = SQLiteStore(os.environ.get("AUNEA_DB_PATH","aunea_runtime.db"))
engine = Orchestrator(store=store)

class ComparePayload(BaseModel):
    engagement: EngagementInput
    scenario: ScenarioRequest

@app.get("/health")
def health():
    return {"status":"ok","backend_version":"0.8.0","rule_bundle_version":rule_bundle_version()}

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
