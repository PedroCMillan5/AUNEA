from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any

from .models import EngagementInput, DiagnosticOutput, ScenarioRequest, ScenarioResult
from .deliverable_models import DeliverableRequest, DeliverablePack
from .solution_models import SolutionSpecificationRequest, SolutionSpecification
from .system_builder_models import SystemBuilderRequest, SystemBuildPlan, SystemBuildPackage
from .system_builder import SystemBuilderEngine
from .engines import EngineContext, PainEngine, EconomicsEngine, RiskEngine, RecommendationEngine, PricingEngine, ScenarioComparator
from .registry import rule_bundle_version
from .utils import stable_hash
from .store import SQLiteStore
from .deliverables import DeliverablesEngine
from .solution_spec import SolutionSpecificationEngine

# [AUNEA-BE-ORCH-DIAG-010] START — Deterministic diagnostic orchestration
# PURPOSE: Execute Pain → Economics → Risk → Recommendation → Pricing → Scenario in the fixed, deterministic order; record an in-memory/persisted audit run per engine step.
# SOURCE: DEC-034 / runtime contracts.
# INPUTS: EngagementInput; ScenarioRequest for compare().
# OUTPUTS: DiagnosticOutput; (DiagnosticOutput, ScenarioResult) tuple for compare().
# SIDE_EFFECTS: audit/store writes when a SQLiteStore is configured.
# CHANGE_RISK: CRITICAL.
@dataclass
class EngineRun:
    engine: str
    input_hash: str
    output_hash: str
    status: str = "COMPLETED"

@dataclass
class InMemoryAuditStore:
    runs: list[EngineRun] = field(default_factory=list)
    def add(self, engine: str, inp: Any, out: Any):
        self.runs.append(EngineRun(engine=engine,input_hash=stable_hash(inp),output_hash=stable_hash(out)))

class Orchestrator:
    def __init__(self, store: SQLiteStore | None = None):
        self.pain=PainEngine(); self.econ=EconomicsEngine(); self.risk=RiskEngine(); self.rec=RecommendationEngine(); self.price=PricingEngine(); self.scenario=ScenarioComparator(self.price,self.risk)
        self.deliverables=DeliverablesEngine(); self.solution_spec=SolutionSpecificationEngine(); self.system_builder=SystemBuilderEngine(); self.audit=InMemoryAuditStore(); self.store=store

    def _run(self, engagement_id: str, engine: str, inp: Any, out: Any):
        ih,oh=stable_hash(inp),stable_hash(out)
        self.audit.runs.append(EngineRun(engine=engine,input_hash=ih,output_hash=oh))
        if self.store: self.store.add_run(engagement_id,engine,ih,oh)

    def diagnose(self, engagement: EngagementInput) -> DiagnosticOutput:
        if self.store: self.store.save_engagement(engagement)
        ctx=EngineContext(engagement)
        pain=self.pain.run(ctx); self._run(engagement.engagement_id,"PainEngine", engagement.model_dump(), [x.model_dump() for x in pain])
        econ=self.econ.run(ctx); self._run(engagement.engagement_id,"EconomicsEngine", engagement.model_dump(), econ.model_dump())
        risk=self.risk.run(ctx); self._run(engagement.engagement_id,"RiskEngine", engagement.model_dump(), risk.model_dump())
        rec=self.rec.run(ctx,pain,risk); self._run(engagement.engagement_id,"RecommendationEngine", {"pain":[x.model_dump() for x in pain],"risk":risk.model_dump()}, rec.model_dump())
        quote=self.price.run(ctx,rec,risk); self._run(engagement.engagement_id,"ProductPricingEngine", rec.model_dump(), quote.model_dump())
        optimal=self.scenario.create(ctx,pain,econ,risk,rec,quote); self._run(engagement.engagement_id,"ScenarioComparator", rec.model_dump(), optimal.model_dump())
        result=DiagnosticOutput(engagement_id=engagement.engagement_id,rule_bundle_version=rule_bundle_version(),input_snapshot_hash=stable_hash(engagement.model_dump()),pain_results=pain,economic_result=econ,risk_result=risk,recommendation=rec,quote=quote,optimal_scenario=optimal)
        if self.store: self.store.save_output(result)
        return result

    def compare(self, engagement: EngagementInput, request: ScenarioRequest) -> tuple[DiagnosticOutput, ScenarioResult]:
        base=self.diagnose(engagement)
        ctx=EngineContext(engagement)
        compared=self.scenario.create(ctx,base.pain_results,base.economic_result,base.risk_result,base.recommendation,base.quote,request,base.optimal_scenario)
        self._run(engagement.engagement_id,"ScenarioComparator.Override", request.model_dump(), compared.model_dump())
        return base, compared
    # [AUNEA-BE-ORCH-DIAG-010] END

    # [AUNEA-BE-ORCH-DELIVERY-010] START — Downstream generation dispatch
    # PURPOSE: Dispatch a computed DiagnosticOutput/EngagementInput to the Deliverables, Solution Specification and System Builder engines (L8/L9), recording an audit run per call.
    # SOURCE: DEC-034; Deliverables Engine / Solution Specification / System Builder contracts.
    # INPUTS: DiagnosticOutput/EngagementInput/SolutionSpecification plus optional request objects; store-backed variants load saved engagement/diagnostic by id.
    # OUTPUTS: DeliverablePack / SolutionSpecification / SystemBuildPlan / SystemBuildPackage.
    # SIDE_EFFECTS: audit/store writes when a SQLiteStore is configured; raises ValueError if a *_for_saved() call has no store or no saved record.
    # CHANGE_RISK: HIGH.
    def generate_deliverables(self, diagnostic: DiagnosticOutput, request: DeliverableRequest | None = None) -> DeliverablePack:
        pack = self.deliverables.generate(diagnostic, request)
        self._run(diagnostic.engagement_id, "DeliverablesEngine", {"diagnostic": diagnostic.model_dump(mode="json"), "request": request.model_dump(mode="json") if request else None}, pack.model_dump(mode="json"))
        return pack

    def generate_deliverables_for_saved(self, engagement_id: str, request: DeliverableRequest | None = None) -> DeliverablePack:
        if not self.store:
            raise ValueError("Store is required to load saved diagnostics.")
        diagnostic = self.store.latest_output(engagement_id)
        if not diagnostic:
            raise ValueError("diagnostic not found")
        return self.generate_deliverables(diagnostic, request)

    def generate_solution_specification(self, engagement: EngagementInput, diagnostic: DiagnosticOutput, request: SolutionSpecificationRequest | None = None) -> SolutionSpecification:
        spec = self.solution_spec.generate(engagement, diagnostic, request)
        self._run(engagement.engagement_id, "SolutionSpecificationEngine", {"engagement": engagement.model_dump(mode="json"), "diagnostic": diagnostic.model_dump(mode="json"), "request": request.model_dump(mode="json") if request else None}, spec.model_dump(mode="json"))
        return spec

    def generate_solution_specification_for_saved(self, engagement_id: str, request: SolutionSpecificationRequest | None = None) -> SolutionSpecification:
        if not self.store:
            raise ValueError("Store is required to load saved engagement/diagnostic.")
        engagement = self.store.get_engagement(engagement_id)
        diagnostic = self.store.latest_output(engagement_id)
        if not engagement:
            raise ValueError("engagement not found")
        if not diagnostic:
            raise ValueError("diagnostic not found")
        return self.generate_solution_specification(engagement, diagnostic, request)

    def generate_system_build_plan(self, specification: SolutionSpecification, request: SystemBuilderRequest | None = None) -> SystemBuildPlan:
        plan=self.system_builder.plan(specification, request)
        self._run(specification.engagement_id, "SystemBuilder.Plan", {"specification":specification.model_dump(mode="json"),"request":request.model_dump(mode="json") if request else None}, plan.model_dump(mode="json"))
        return plan

    def generate_system_build_package(self, specification: SolutionSpecification, request: SystemBuilderRequest | None = None) -> SystemBuildPackage:
        package=self.system_builder.package(specification, request)
        self._run(specification.engagement_id, "SystemBuilder.Package", {"specification":specification.model_dump(mode="json"),"request":request.model_dump(mode="json") if request else None}, package.model_dump(mode="json"))
        return package
    # [AUNEA-BE-ORCH-DELIVERY-010] END
