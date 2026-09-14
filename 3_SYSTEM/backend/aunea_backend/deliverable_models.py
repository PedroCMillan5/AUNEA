# [AUNEA-BE-DELIVERABLES-MODEL-010] START — Deliverable data contract
# PURPOSE: Pydantic models for deliverable generation requests/artifacts/packs (client-facing PPT/report/proposal outputs derived from a selected ScenarioResult).
# SOURCE: DEC-034; L8 Client Experience & Deliverables.
# INPUTS: n/a (type definitions).
# OUTPUTS: n/a (type definitions).
# SIDE_EFFECTS: none.
# CHANGE_RISK: HIGH.
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field
from .models import ScenarioResult

class DeliverableRequest(BaseModel):
    selected_scenario: ScenarioResult | None = None
    client_name: str | None = None
    process_name: str | None = None
    next_step: str | None = None
    include_internal_appendix: bool = True

class DeliverableArtifact(BaseModel):
    name: str
    media_type: str
    content: str

class DeliverablePack(BaseModel):
    pack_id: str
    engagement_id: str
    selected_scenario_id: str
    status: Literal["DRAFT","READY","BLOCKED_MISSING_SELECTED_SCENARIO","BLOCKED_MISSING_QUOTE","BLOCKED_SCENARIO_NOT_SELECTABLE"]
    rule_bundle_version: str
    created_at: str
    issues: list[str] = Field(default_factory=list)
    artifacts: list[DeliverableArtifact] = Field(default_factory=list)
# [AUNEA-BE-DELIVERABLES-MODEL-010] END
