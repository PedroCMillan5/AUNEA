# [AUNEA-BE-SYSBUILD-MODEL-010] START — System Builder data contract
# PURPOSE: Pydantic models for build components, component decisions, build tasks/plan/package (the artifacts System Builder produces from a SolutionSpecification).
# SOURCE: DEC-034; L9 System Delivery & Learning; Component Library.
# INPUTS: n/a (type definitions).
# OUTPUTS: n/a (type definitions).
# SIDE_EFFECTS: none.
# CHANGE_RISK: HIGH.
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field

class ComponentDefinition(BaseModel):
    component_id: str
    name: str
    capability_ids: list[str] = Field(default_factory=list)
    supported_platforms: list[str] = Field(default_factory=list)
    maturity: Literal["DEMO_VERIFIED","DEMO_PARTIAL","DESIGN_SEED"] = "DESIGN_SEED"
    description: str
    source_asset_id: str | None = None
    notes: list[str] = Field(default_factory=list)

class ComponentDecision(BaseModel):
    capability_id: str
    component_id: str | None = None
    decision: Literal["REUSE_CANDIDATE","ADAPT_CANDIDATE","CREATE_NEW","TBD"]
    rationale: str
    maturity: str | None = None

class BuildTask(BaseModel):
    task_id: str
    phase: Literal["DESIGN","BUILD","INTEGRATE","TEST","DEPLOY","HANDOVER"]
    title: str
    description: str
    source_capability_ids: list[str] = Field(default_factory=list)
    depends_on: list[str] = Field(default_factory=list)
    status: Literal["PLANNED","BLOCKED"] = "PLANNED"

class SystemBuilderRequest(BaseModel):
    implementation_name: str | None = None
    repository_name: str | None = None
    include_build_prompt: bool = True
    include_runbook: bool = True
    include_scaffold: bool = True
    environment_names: list[str] = Field(default_factory=lambda: ["development","production"])
    additional_constraints: list[str] = Field(default_factory=list)

class SystemBuildPlan(BaseModel):
    build_plan_id: str
    specification_id: str
    engagement_id: str
    status: Literal["READY_FOR_ENGINEERING","DRAFT_SPEC_NOT_READY","BLOCKED_NOT_SYSTEM"]
    target_platform: str | None = None
    component_decisions: list[ComponentDecision] = Field(default_factory=list)
    tasks: list[BuildTask] = Field(default_factory=list)
    required_new_components: list[str] = Field(default_factory=list)
    reuse_candidates: list[str] = Field(default_factory=list)
    adaptation_candidates: list[str] = Field(default_factory=list)
    implementation_constraints: list[str] = Field(default_factory=list)
    acceptance_test_ids: list[str] = Field(default_factory=list)
    source_trace: dict[str, Any] = Field(default_factory=dict)

class SystemBuildPackage(BaseModel):
    package_id: str
    build_plan: SystemBuildPlan
    build_prompt_markdown: str | None = None
    runbook_markdown: str | None = None
    scaffold_files: dict[str, str] = Field(default_factory=dict)
    component_library_version: str
    generator_version: str = "v1.1"
# [AUNEA-BE-SYSBUILD-MODEL-010] END
