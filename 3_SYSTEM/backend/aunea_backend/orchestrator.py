from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any

from .models import EngagementInput, DiagnosticOutput, ScenarioRequest, ScenarioResult
from .session_time import TimeProjectionRequest, project_session_time, numeric_time_consistency, estimate_process_labor_capacity
from .deliverable_models import DeliverableRequest, DeliverablePack
from .solution_models import SolutionSpecificationRequest, SolutionSpecification
from .system_builder_models import SystemBuilderRequest, SystemBuildPlan, SystemBuildPackage
from .system_builder import SystemBuilderEngine
from .engines import EngineContext, PainEngine, EconomicsEngine, RiskEngine, RiskCandidateEngine, RecommendationEngine, PricingEngine, ScenarioComparator
from .input_coverage import InputCoverageEngine, relational_integrity_issues
from .pain_candidates import PainCandidateEngine
from .registry import rule_bundle_version
from .utils import stable_hash
from .store import SQLiteStore
from .deliverables import DeliverablesEngine
from .pdf_export import PDFExporter
from .solution_spec import SolutionSpecificationEngine

# [AUNEA-BE-ORCH-DIAG-010] START — Deterministic diagnostic orchestration
# PURPOSE: Execute Pain → Economics → Risk → Recommendation → Pricing → Scenario in the fixed,
# deterministic order; compare governed alternatives against an explicit immutable DiagnosticOutput snapshot.
# SOURCE: DEC-034; DEC-041; runtime contracts.
# INPUTS: EngagementInput; ScenarioRequest; optional explicit DiagnosticOutput for compare().
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
        self.coverage=InputCoverageEngine(); self.pain_candidates=PainCandidateEngine(); self.risk_candidates=RiskCandidateEngine(); self.pain=PainEngine(); self.econ=EconomicsEngine(); self.risk=RiskEngine(); self.rec=RecommendationEngine(); self.price=PricingEngine(); self.scenario=ScenarioComparator(self.price,self.risk)
        self.deliverables=DeliverablesEngine(); self.deliverables_pdf=PDFExporter(); self.solution_spec=SolutionSpecificationEngine(); self.system_builder=SystemBuilderEngine(); self.audit=InMemoryAuditStore(); self.store=store

    def _run(self, engagement_id: str, engine: str, inp: Any, out: Any):
        ih,oh=stable_hash(inp),stable_hash(out)
        self.audit.runs.append(EngineRun(engine=engine,input_hash=ih,output_hash=oh))
        if self.store: self.store.add_run(engagement_id,engine,ih,oh)

    def _time_projection_with_comparison(self, request: TimeProjectionRequest, answers: dict[str, Any], economic_inputs: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        # [AUNEA-BE-ASIS-TIME-COMPARISON-171] START — Derive read-only numeric comparison from sealed DF026.
        # SOURCE: DEC-074 and existing ±25% AS-IS review trigger; no elapsed reconciliation or changes to DF026.
        projection = project_session_time(request)
        declared = answers.get("DF026")
        if isinstance(declared, dict):
            value, unit = declared.get("value"), str(declared.get("unit") or "min").lower()
        else:
            value, unit = declared, "min"
        try:
            amount = float(value) if value is not None and not isinstance(value, bool) else None
        except (ValueError, TypeError):
            amount = None
        factors = {"min": 1, "minute": 1, "minutes": 1, "h": 60, "hour": 60, "hours": 60,
                   "day": 1440, "days": 1440}
        minutes = amount * factors[unit] if amount is not None and unit in factors else None
        projection["numeric_comparison"] = numeric_time_consistency(projection, minutes)
        projection["process_labor_capacity"] = estimate_process_labor_capacity(projection, request.steps, economic_inputs or [])
        return projection
        # [AUNEA-BE-ASIS-TIME-COMPARISON-171] END

    # [AUNEA-BE-ASIS-ANALYSIS-152] START — Source-only PG10 analysis without sales decisions
    # SOURCE: Diagnostic Master v1.2 / MAP_QUESTION_ENGINE_INPUT; DEC-034/052; Simulator PG10.
    # No Recommendation, Pricing, optimal scenario, synthetic gates, mutation or store writes.
    def analyze_asis(self, engagement: EngagementInput) -> dict[str, Any]:
        source=engagement.model_dump()
        integrity=relational_integrity_issues(engagement)
        coverage=self.coverage.run(engagement)
        facts=engagement.questionnaire_answers
        has_source=bool(engagement.evidence or engagement.pain_signals or engagement.pains
            or engagement.economics or engagement.risks
            or (isinstance(facts.get("_process_steps"),list) and facts["_process_steps"])
            or any(str(k).startswith("DF") and v is not None and v != "" and v != [] and v != {}
                for k,v in facts.items()))
        out: dict[str, Any]={
            "status":"INPUT_GAPS" if integrity or coverage.status=="BLOCKED" or not has_source else "ANALYZED",
            "engagement_id":engagement.engagement_id,
            "input_snapshot_hash":stable_hash(source),
            "rule_bundle_version":rule_bundle_version(),
            "integrity_issues":integrity,
            "input_coverage":coverage.model_dump(),
            "pain_results":[],
            "economic_result":None,
            "risk_result":None,
            "process_time_projection":None,
            "diagnostic_type":"ASIS_ONLY",
            "requires_solution_review":True,
        }
        # An invalid source is never silently accepted to manufacture findings.
        if not has_source:
            out["source_warnings"]=["No existen hechos del AS-IS suficientes para iniciar un análisis."]
        if integrity or coverage.status=="BLOCKED" or not has_source:
            return out
        ctx=EngineContext(engagement)
        out["pain_results"]=[p.model_dump() for p in self.pain.run(ctx)]
        out["economic_result"]=self.econ.run(ctx,coverage).model_dump()
        out["risk_result"]=self.risk.run(ctx,coverage).model_dump()
        answers=engagement.questionnaire_answers
        steps=answers.get("_process_steps")
        frictions=answers.get("_frictions")
        if isinstance(steps,list) and steps:
            raw_volume=answers.get("DF021")
            volume=raw_volume.get("value") if isinstance(raw_volume,dict) else raw_volume
            if isinstance(volume,bool) or not isinstance(volume,(float,int)):
                volume=None
            request=TimeProjectionRequest(
                volume=volume,period=answers.get("DF022"),
                steps=steps,frictions=frictions if isinstance(frictions,list) else []
            )
            out["process_time_projection"]=self._time_projection_with_comparison(request, answers, [x.model_dump() for x in engagement.economics])
        return out
    # [AUNEA-BE-ASIS-ANALYSIS-152] END

    def diagnose(self, engagement: EngagementInput) -> DiagnosticOutput:
        if self.store: self.store.save_engagement(engagement)
        integrity=relational_integrity_issues(engagement)
        if integrity:
            raise ValueError("Revisión de trazabilidad requerida: " + " ".join(integrity))
        coverage=self.coverage.run(engagement)
        self._run(engagement.engagement_id,"InputCoverageEngine", engagement.model_dump(), coverage.model_dump())
        if coverage.status == "BLOCKED":
            raise ValueError("Cobertura diagnóstica incompleta. Inputs críticos pendientes: " + ", ".join(coverage.blocking_gaps))
        ctx=EngineContext(engagement)
        pain=self.pain.run(ctx); self._run(engagement.engagement_id,"PainEngine", engagement.model_dump(), [x.model_dump() for x in pain])
        econ=self.econ.run(ctx,coverage); self._run(engagement.engagement_id,"EconomicsEngine", {"engagement":engagement.model_dump(),"coverage":coverage.model_dump()}, econ.model_dump())
        risk=self.risk.run(ctx,coverage); self._run(engagement.engagement_id,"RiskEngine", {"engagement":engagement.model_dump(),"coverage":coverage.model_dump()}, risk.model_dump())
        rec=self.rec.run(ctx,pain,risk,coverage); self._run(engagement.engagement_id,"RecommendationEngine", {"engagement":engagement.model_dump(),"coverage":coverage.model_dump(),"pain":[x.model_dump() for x in pain],"risk":risk.model_dump()}, rec.model_dump())
        quote=self.price.run(ctx,rec,risk); self._run(engagement.engagement_id,"ProductPricingEngine", rec.model_dump(), quote.model_dump())
        optimal=self.scenario.create(ctx,pain,econ,risk,rec,quote); self._run(engagement.engagement_id,"ScenarioComparator", rec.model_dump(), optimal.model_dump())
        # [AUNEA-BE-ORCH-PROCESS-TIME-090] START — Proyección AS-IS ya gobernada, separada de Economics.
        # SOURCE: Diagnostic Master RULE_ECON_ANNUALIZE; DEC-034/041/068; Simulator PG10–PG15.
        # Reuses the exact captured process owner carried in questionnaire_answers; no new questions,
        # no future-state assumptions, no mutation of economic inputs or scenario arithmetic.
        answers=engagement.questionnaire_answers
        steps=answers.get("_process_steps")
        frictions=answers.get("_frictions")
        process_time=None
        if isinstance(steps,list) and steps:
            raw_volume=answers.get("DF021")
            volume=raw_volume.get("value") if isinstance(raw_volume,dict) else raw_volume
            if isinstance(volume,bool) or not isinstance(volume,(float,int)):
                volume=None
            projection_input=TimeProjectionRequest(
                volume=volume,period=answers.get("DF022"),
                steps=steps,frictions=frictions if isinstance(frictions,list) else []
            )
            process_time=self._time_projection_with_comparison(projection_input, answers, [x.model_dump() for x in engagement.economics])
            self._run(engagement.engagement_id,"SessionTimeProjection",projection_input.model_dump(),process_time)
        # [AUNEA-BE-ORCH-PROCESS-TIME-090] END
        result=DiagnosticOutput(engagement_id=engagement.engagement_id,rule_bundle_version=rule_bundle_version(),input_snapshot_hash=stable_hash(engagement.model_dump()),input_coverage=coverage,pain_results=pain,economic_result=econ,risk_result=risk,recommendation=rec,quote=quote,optimal_scenario=optimal,process_time_projection=process_time)
        if self.store: self.store.save_output(result)
        return result

    def compare(self, engagement: EngagementInput, request: ScenarioRequest, base: DiagnosticOutput | None = None) -> tuple[DiagnosticOutput, ScenarioResult]:
        # Legacy/internal callers may omit base and obtain a fresh deterministic diagnostic. External API
        # callers pass the already-shown DiagnosticOutput so an alternative can never silently shift the
        # optimal baseline. The hash + rule-bundle checks make stale inputs explicit.
        if base is None:
            base=self.diagnose(engagement)
        else:
            expected_hash=stable_hash(engagement.model_dump())
            if base.engagement_id != engagement.engagement_id:
                raise ValueError("diagnostic engagement does not match scenario engagement")
            if base.input_snapshot_hash != expected_hash:
                raise ValueError("diagnostic snapshot is stale for the current engagement input")
            if base.rule_bundle_version != rule_bundle_version():
                raise ValueError("diagnostic rule bundle is stale")
        ctx=EngineContext(engagement)
        compared=self.scenario.create(ctx,base.pain_results,base.economic_result,base.risk_result,base.recommendation,base.quote,request,base.optimal_scenario)
        self._run(engagement.engagement_id,"ScenarioComparator.Override", {"scenario":request.model_dump(),"base_input_snapshot_hash":base.input_snapshot_hash,"base_rule_bundle_version":base.rule_bundle_version}, compared.model_dump())
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

    def export_deliverable_pdf(self, diagnostic: DiagnosticOutput, request: DeliverableRequest | None = None) -> bytes:
        pdf_bytes = self.deliverables_pdf.export(diagnostic, request)
        self._run(diagnostic.engagement_id, "PDFExporter", {"diagnostic": diagnostic.model_dump(mode="json"), "request": request.model_dump(mode="json") if request else None}, {"bytes": len(pdf_bytes)})
        return pdf_bytes

    def export_deliverable_pdf_for_saved(self, engagement_id: str, request: DeliverableRequest | None = None) -> bytes:
        if not self.store:
            raise ValueError("Store is required to load saved diagnostics.")
        diagnostic = self.store.latest_output(engagement_id)
        if not diagnostic:
            raise ValueError("diagnostic not found")
        return self.export_deliverable_pdf(diagnostic, request)

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
