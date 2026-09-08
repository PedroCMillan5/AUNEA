from __future__ import annotations
from .system_builder_models import ComponentDefinition

COMPONENT_LIBRARY_VERSION = "v1.1-seed"

# Conservative seed library. Only items actually exercised in the current
# Client Intake demo are marked DEMO_VERIFIED/PARTIAL. DESIGN_SEED means a
# reusable design pattern exists, not that production-ready code exists.
COMPONENTS = [
    ComponentDefinition(component_id="CMP-INTAKE-001", name="Structured intake adapter", capability_ids=["CAP001"], supported_platforms=["Airtable","Web form","Generic"], maturity="DEMO_VERIFIED", description="Structured request capture with stable fields and identifiers.", source_asset_id="ASSET-S-DEMO-001"),
    ComponentDefinition(component_id="CMP-RECORD-001", name="Operational record + state + audit", capability_ids=["CAP004","CAP005","CAP019"], supported_platforms=["Airtable","Generic"], maturity="DEMO_VERIFIED", description="Master record, lifecycle state and execution audit pattern.", source_asset_id="ASSET-S-DEMO-001"),
    ComponentDefinition(component_id="CMP-TASKS-001", name="Task/checklist orchestration", capability_ids=["CAP007"], supported_platforms=["Airtable","Generic"], maturity="DEMO_VERIFIED", description="Generate and track tasks/checklists from a triggering record.", source_asset_id="ASSET-S-DEMO-001"),
    ComponentDefinition(component_id="CMP-COMMS-001", name="Communication draft/notification", capability_ids=["CAP010"], supported_platforms=["Email","Generic"], maturity="DEMO_VERIFIED", description="Prepare contextual initial communication or notification.", source_asset_id="ASSET-S-DEMO-001"),
    ComponentDefinition(component_id="CMP-FILES-001", name="Workspace/folder orchestration", capability_ids=["CAP024"], supported_platforms=["Google Drive","Generic"], maturity="DEMO_VERIFIED", description="Create governed project folders/workspaces and persist links.", source_asset_id="ASSET-S-DEMO-001"),
    ComponentDefinition(component_id="CMP-DOCGEN-001", name="Document generation", capability_ids=["CAP009"], supported_platforms=["Google Docs","Generic"], maturity="DEMO_PARTIAL", description="Generate a document from structured engagement data and persist its URL.", source_asset_id="ASSET-S-DEMO-001", notes=["Real Client Request Brief generation/persistence requires final end-to-end verification."]),
    ComponentDefinition(component_id="CMP-VALIDATE-001", name="Validation/completeness gate", capability_ids=["CAP002","CAP003","CAP021"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Required-field, completeness and release/QA validation pattern."),
    ComponentDefinition(component_id="CMP-ROUTING-001", name="Rules routing + SLA", capability_ids=["CAP006","CAP012"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Deterministic routing, due-date and escalation pattern."),
    ComponentDefinition(component_id="CMP-APPROVAL-001", name="Approval orchestration", capability_ids=["CAP008"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Approval/rejection/reminder/audit pattern."),
    ComponentDefinition(component_id="CMP-EXCEPT-001", name="Exception queue", capability_ids=["CAP011"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Non-normal case queue, ownership, resolution and escalation pattern."),
    ComponentDefinition(component_id="CMP-DASH-001", name="Operational reporting layer", capability_ids=["CAP013","CAP014","CAP025"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Operational consolidation, calculations and management visibility pattern."),
    ComponentDefinition(component_id="CMP-AIASSIST-001", name="Assisted AI service", capability_ids=["CAP015","CAP016"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Bounded retrieval/summarization/classification/drafting with human review."),
    ComponentDefinition(component_id="CMP-AGENT-001", name="Bounded agent controller", capability_ids=["CAP017"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Finite action-space controller with approvals, monitoring, fallback and audit."),
    ComponentDefinition(component_id="CMP-INTEGRATE-001", name="Integration/synchronization adapter", capability_ids=["CAP018"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Idempotent source-to-target synchronization pattern."),
    ComponentDefinition(component_id="CMP-SCHED-001", name="Scheduling/follow-up engine", capability_ids=["CAP020","CAP022"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Capacity-aware scheduling and event/date-driven follow-up pattern."),
    ComponentDefinition(component_id="CMP-RBAC-001", name="Role/permission control", capability_ids=["CAP023"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Role/ownership based access and action control pattern."),
    ComponentDefinition(component_id="CMP-KNOW-001", name="Structured SOP/knowledge repository", capability_ids=["CAP026"], supported_platforms=["Generic"], maturity="DESIGN_SEED", description="Governed procedures/rules/knowledge repository pattern."),
]

def component_library() -> list[ComponentDefinition]:
    return list(COMPONENTS)
