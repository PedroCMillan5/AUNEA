# [AUNEA-BE-SOLUTION-MODEL-010] START — Solution Specification data contract
# PURPOSE: Pydantic models for the Solution Specification (integrations, roles, data entities, business rules, acceptance tests) that bridges a selected ScenarioResult to buildable engineering requirements.
# SOURCE: DEC-034; L9 System Delivery & Learning.
# INPUTS: n/a (type definitions).
# OUTPUTS: n/a (type definitions).
# SIDE_EFFECTS: none.
# CHANGE_RISK: HIGH.
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field
from .models import ScenarioResult

class SolutionSpecIntegration(BaseModel):
    name: str
    source_system: str | None = None
    target_system: str | None = None
    purpose: str | None = None
    method: str | None = None
    auth_method: str | None = None
    status: Literal["CONFIRMED","ASSUMED","TBD"] = "TBD"

class SolutionSpecRole(BaseModel):
    role_name: str
    responsibilities: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    approval_authority: list[str] = Field(default_factory=list)

class SolutionSpecDataEntity(BaseModel):
    entity_name: str
    purpose: str | None = None
    key_fields: list[str] = Field(default_factory=list)
    source_of_truth: str | None = None
    retention_or_sensitivity: str | None = None
    status: Literal["CONFIRMED","ASSUMED","TBD"] = "TBD"

class SolutionSpecRule(BaseModel):
    rule_id: str
    description: str
    trigger_or_condition: str | None = None
    action: str | None = None
    exception_or_fallback: str | None = None
    status: Literal["CONFIRMED","ASSUMED","TBD"] = "TBD"

class SolutionSpecAcceptanceTest(BaseModel):
    test_id: str
    requirement: str
    given: str
    when: str
    then: str
    source_capability_id: str | None = None
    status: Literal["DRAFT","APPROVED"] = "DRAFT"

class SolutionSpecificationRequest(BaseModel):
    selected_scenario: ScenarioResult | None = None
    target_platform: str | None = None
    integrations: list[SolutionSpecIntegration] = Field(default_factory=list)
    roles: list[SolutionSpecRole] = Field(default_factory=list)
    data_entities: list[SolutionSpecDataEntity] = Field(default_factory=list)
    business_rules: list[SolutionSpecRule] = Field(default_factory=list)
    security_constraints: list[str] = Field(default_factory=list)
    deployment_constraints: list[str] = Field(default_factory=list)
    handover_requirements: list[str] = Field(default_factory=list)
    support_requirements: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)

class SolutionSpecification(BaseModel):
    specification_id: str
    engagement_id: str
    process_name: str
    source_scenario_id: str
    source_action_id: str
    status: Literal[
        "READY_FOR_BUILD",
        "DRAFT_MISSING_IMPLEMENTATION_INPUTS",
        "BLOCKED_NOT_SYSTEM",
        "BLOCKED_SCENARIO"
    ]
    rule_bundle_version: str
    created_at: str
    functional_level_id: str | None = None
    ai_level_id: str | None = None
    product_id: str | None = None
    objective: str | None = None
    as_is_summary: dict[str, Any] = Field(default_factory=dict)
    target_state_summary: dict[str, Any] = Field(default_factory=dict)
    capabilities: list[dict[str, Any]] = Field(default_factory=list)
    triggers: list[str] = Field(default_factory=list)
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    data_entities: list[SolutionSpecDataEntity] = Field(default_factory=list)
    business_rules: list[SolutionSpecRule] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    exceptions: list[str] = Field(default_factory=list)
    integrations: list[SolutionSpecIntegration] = Field(default_factory=list)
    roles: list[SolutionSpecRole] = Field(default_factory=list)
    ai_requirements: dict[str, Any] = Field(default_factory=dict)
    security_logging: dict[str, Any] = Field(default_factory=dict)
    error_handling_idempotency: dict[str, Any] = Field(default_factory=dict)
    acceptance_tests: list[SolutionSpecAcceptanceTest] = Field(default_factory=list)
    deployment: dict[str, Any] = Field(default_factory=dict)
    handover_support: dict[str, Any] = Field(default_factory=dict)
    missing_information: list[str] = Field(default_factory=list)
    source_trace: dict[str, Any] = Field(default_factory=dict)
# [AUNEA-BE-SOLUTION-MODEL-010] END
