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
