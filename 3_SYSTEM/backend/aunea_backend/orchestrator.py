from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any

from .models import EngagementInput, DiagnosticOutput, ScenarioRequest, ScenarioResult
from .engines import EngineContext, PainEngine, EconomicsEngine, RiskEngine, RecommendationEngine, PricingEngine, ScenarioComparator
from .registry import rule_bundle_version
from .utils import stable_hash
from .store import SQLiteStore

@dataclass
class EngineRun:
    engine: str
    input_hash: str
    output_hash: str
    status: str = "COMPLETED"

@dataclass
class InMemoryAuditStore:
    runs: list[EngineRun] = field(default_factory=list)

class Orchestrator:
    def __init__(self, store: SQLiteStore | None = None):
        self.pain=PainEngine(); self.econ=EconomicsEngine(); self.risk=RiskEngine(); self.rec=RecommendationEngine(); self.price=PricingEngine(); self.scenario=ScenarioComparator(self.price,self.risk)
        self.audit=InMemoryAuditStore(); self.store=store

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
