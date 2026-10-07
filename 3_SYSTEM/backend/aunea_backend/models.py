# [AUNEA-BE-MODEL-CORE-010] START — Engine I/O data contract
# PURPOSE: Pydantic models for every engine input/output type (Evidence, PainSignalInput/Observation, EconomicInput/Result, RiskInput/Result, CommercialScope, EngagementInput, Recommendation, Quote, ScenarioRequest, DiagnosticOutput) shared across Pain/Economics/Risk/Recommendation/Pricing/Scenario and the API layer.
# SOURCE: DEC-034; MAP_QUESTION_ENGINE_INPUT.
# INPUTS: n/a (type definitions).
# OUTPUTS: n/a (type definitions).
# SIDE_EFFECTS: none.
# CHANGE_RISK: CRITICAL.
from __future__ import annotations
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, Field

class PainState(str, Enum):
    CONFIRMED = "CONFIRMED"
    INDICATED = "INDICATED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    NOT_DETECTED = "NOT_DETECTED"

class CoverageState(str, Enum):
    RESOLVED = "RESOLVED"
    PARTIAL = "PARTIAL"
    UNRESOLVED = "UNRESOLVED"
    NOT_APPLICABLE = "NOT_APPLICABLE"

class QuoteStatus(str, Enum):
    READY = "READY"
    PROVISIONAL = "PROVISIONAL"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    BLOCKED = "BLOCKED"

class Evidence(BaseModel):
    evidence_id: str
    type: Literal["MEASURED","CLIENT_DECLARED","AUNEA_ESTIMATE","SPECIFIC_BENCHMARK","HYPOTHESIS"]
    description: str | None = None
    source: str | None = None

class PainSignalInput(BaseModel):
    pain_id: str
    direct_mechanism_present: bool | None = None
    concrete_evidence_present: bool = False
    exclusion_condition_present: bool = False
    signal_present: bool = False
    evidence_ids: list[str] = Field(default_factory=list)
    rationale: str | None = None

class PainObservation(BaseModel):
    pain_id: str
    state: PainState
    evidence_ids: list[str] = Field(default_factory=list)
    mechanism: str | None = None
    rationale: str | None = None

class EconomicInput(BaseModel):
    # DEC-065: optional technical references to existing ProcessSteps, not new capture fields.
    step_ids: list[str] = Field(default_factory=list)
    pain_id: str | None = None
    driver_id: str
    annual_active_hours: float | None = None
    annual_wait_hours: float | None = None
    capacity_cost_rate_eur_hour: float | None = None
    role_or_resource: str | None = None
    value: float | None = None
    unit: str | None = None
    period: str | None = None
    direct_loss_eur_annual: float | None = None
    current_tool_cost_eur_annual: float | None = None
    realized_cash_saving_eur_annual: float | None = None
    evidence_type: str = "CLIENT_DECLARED"
    deduplication_key: str | None = None

class RiskInput(BaseModel):
    # DEC-065: traceability only; risk scoring does not derive from these step IDs.
    step_ids: list[str] = Field(default_factory=list)
    category: str
    likelihood_1_5: int = Field(ge=1, le=5)
    impact_1_5: int = Field(ge=1, le=5)
    reversible: bool = True
    sensitive_or_high_impact: bool = False
    material_financial_or_compliance: bool = False
    critical_trigger: bool = False
    controls_present: bool = True
    description: str | None = None

class ScenarioAssumption(BaseModel):
    pain_id: str
    future_active_hours: float | None = None
    future_wait_hours: float | None = None
    explicit_reduction_factor: float | None = Field(default=None, ge=0, le=1)
    preventable_loss_fraction: float | None = Field(default=None, ge=0, le=1)
    realized_cash_saving_eur_annual: float | None = None

class CommercialScope(BaseModel):
    scope_bounded: bool = False
    integrations_known: bool = False
    data_migration_bounded: bool = True
    tool_tco_current: bool = False
    support_monthly_eur: float = 0
    additional_effort_days: float = 0
    ai_effort_days: float = 0
    external_one_off_eur: float = 0
    tool_cost_monthly_eur: float = 0
    discount_or_credit_eur: float = 0

class EngagementInput(BaseModel):
    engagement_id: str
    process_instance_id: str
    process_name: str
    evidence: list[Evidence] = Field(default_factory=list)
    pains: list[PainObservation] = Field(default_factory=list)
    pain_signals: list[PainSignalInput] = Field(default_factory=list)
    questionnaire_answers: dict[str, Any] = Field(default_factory=dict)
    economics: list[EconomicInput] = Field(default_factory=list)
    risks: list[RiskInput] = Field(default_factory=list)
    existing_tool_can_cover: bool = False
    process_design_preconditions_ok: bool = True
    requires_unstructured_ai_assistance: bool = False
    requires_bounded_agent_action: bool = False
    requires_management_visibility: bool = False
    commercial_scope: CommercialScope = Field(default_factory=CommercialScope)

class InputCoverageItem(BaseModel):
    input_id: str
    engine: str
    input_name: str
    criticality: str
    branch_rule_id: str
    applicable: bool | None = None
    present: bool = False
    blocking: bool = False
    status: Literal["COVERED","GAP","NOT_APPLICABLE","UNKNOWN_APPLICABILITY"]
    source_fields: list[str] = Field(default_factory=list)
    present_sources: list[str] = Field(default_factory=list)

class InputCoverageResult(BaseModel):
    status: Literal["COMPLETE","PARTIAL","BLOCKED","NOT_EVALUATED"] = "NOT_EVALUATED"
    items: list[InputCoverageItem] = Field(default_factory=list)
    blocking_gaps: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

class PainCandidate(BaseModel):
    # DERIVE_CANDIDATE only: never becomes RT_PAIN/RT_FRICTION until consultant confirmation.
    pain_id: str
    step_ids: list[str] = Field(default_factory=list)
    signal_codes: list[str] = Field(default_factory=list)
    rationale: str
    review_questions: list[str] = Field(default_factory=list)
    status: Literal["DERIVE_CANDIDATE"] = "DERIVE_CANDIDATE"

class PainCandidateResult(BaseModel):
    candidates: list[PainCandidate] = Field(default_factory=list)
    evaluated_step_ids: list[str] = Field(default_factory=list)
    note: str = "Las señales son candidatas para revisión humana; no confirman una fricción ni un Pain."

class PainResult(BaseModel):
    pain_id: str
    state: PainState
    confidence: Literal["HIGH","MEDIUM","LOW","UNKNOWN"]
    rationale: str | None = None

class EconomicResult(BaseModel):
    annual_active_hours: float = 0
    annual_wait_hours: float = 0
    capacity_value_eur_annual: float | None = None
    direct_loss_eur_annual: float = 0
    current_tool_cost_eur_annual: float = 0
    realized_cash_saving_eur_annual: float = 0
    status: str = "COMPLETE"
    # EO07 / P0-E: baseline evidence completeness is separate from the existence of rows.
    coverage_status: str = "NOT_EVALUATED"
    covered_input_ids: list[str] = Field(default_factory=list)
    missing_input_ids: list[str] = Field(default_factory=list)

class RiskResult(BaseModel):
    inherent_level: Literal["R0","R1","R2","R3","UNKNOWN"]
    residual_level: Literal["R0","R1","R2","R3","UNKNOWN"]
    status: str
    rationale: str
    # P0-D: auditable MAP_QUESTION_ENGINE_INPUT inputs actually available to RiskEngine.
    input_ids_used: list[str] = Field(default_factory=list)

class CapabilityRequirement(BaseModel):
    pain_id: str
    capability_id: str
    role: str
    required: bool = True

class Recommendation(BaseModel):
    action_id: str
    functional_level_id: Literal["N1","N2","N3","N4"] | None = None
    ai_level_id: Literal["I0","I1","I2","I3"] | None = None
    capabilities: list[CapabilityRequirement] = Field(default_factory=list)
    confidence: str = "MEDIUM"
    rationale: list[str] = Field(default_factory=list)
    # RT_RECOMMENDATION canonical contract: retain preconditions and unresolved discovery explicitly.
    preconditions: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    input_ids_used: list[str] = Field(default_factory=list)

class Quote(BaseModel):
    product_id: str | None = None
    product_option_id: str | None = None
    one_off_eur: float = 0
    recurring_monthly_eur: float = 0
    tool_cost_monthly_eur: float = 0
    tco_12m_eur: float = 0
    tco_36m_eur: float = 0
    status: QuoteStatus = QuoteStatus.PROVISIONAL
    pricing_confidence: str = "MEDIUM"
    notes: list[str] = Field(default_factory=list)

class ScenarioRequest(BaseModel):
    scenario_name: str
    action_id: str | None = None
    functional_level_id: Literal["N1","N2","N3","N4"] | None = None
    ai_level_id: Literal["I0","I1","I2","I3"] | None = None
    assumptions: list[ScenarioAssumption] = Field(default_factory=list)
    commercial_scope: CommercialScope | None = None

# [AUNEA-BE-SCEN-MODEL-010] START — Contrato de resultado de escenario
# PURPOSE: Mantener el nombre del escenario en la respuesta tipada.
# SOURCE: RT_SCENARIO.Scenario_Name; baseline aceptada v1.0.4.
# INPUTS: ScenarioComparator.
# OUTPUTS: ScenarioResult.
# SIDE_EFFECTS: ninguna.
# CHANGE_RISK: HIGH.
class ScenarioResult(BaseModel):
    scenario_id: str
    scenario_name: str
    scenario_type: str
    action_id: str
    functional_level_id: str | None
    ai_level_id: str | None
    coverage_by_pain: dict[str, CoverageState]
    capability_delta: dict[str, list[str]]
    economics: EconomicResult
    risk: RiskResult
    quote: Quote
    delta_vs_optimal: dict[str, Any] = Field(default_factory=dict)
    status: str = "COMPUTED"

# [AUNEA-BE-SCEN-MODEL-010] END

class DiagnosticOutput(BaseModel):
    engagement_id: str
    rule_bundle_version: str
    input_snapshot_hash: str
    input_coverage: InputCoverageResult = Field(default_factory=InputCoverageResult)
    pain_results: list[PainResult]
    economic_result: EconomicResult
    risk_result: RiskResult
    recommendation: Recommendation
    quote: Quote
    optimal_scenario: ScenarioResult
# [AUNEA-BE-MODEL-CORE-010] END
