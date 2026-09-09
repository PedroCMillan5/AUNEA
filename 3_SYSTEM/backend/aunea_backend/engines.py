from __future__ import annotations
from collections import defaultdict
from dataclasses import dataclass
from typing import Iterable
import uuid

from .models import (
    EngagementInput, PainResult, EconomicResult, RiskResult, Recommendation,
    CapabilityRequirement, Quote, QuoteStatus, CoverageState, ScenarioRequest,
    ScenarioResult, ScenarioAssumption
)
from .registry import table, by_id
from .utils import level_rank

CONFIDENCE_ORDER = {
    "MEASURED": "HIGH",
    "CLIENT_DECLARED": "MEDIUM",
    "AUNEA_ESTIMATE": "LOW",
    "SPECIFIC_BENCHMARK": "LOW",
    "HYPOTHESIS": "LOW",
}

@dataclass
class EngineContext:
    engagement: EngagementInput

class PainEngine:
    def run(self, ctx: EngineContext) -> list[PainResult]:
        evidence = {e.evidence_id: e for e in ctx.engagement.evidence}
        out: list[PainResult] = []
        observations = list(ctx.engagement.pains)
        # Structured signals are captured by the diagnostic form; the browser does not decide the pain state.
        for s in ctx.engagement.pain_signals:
            if s.exclusion_condition_present or s.direct_mechanism_present is False:
                state = "NOT_DETECTED"
            elif s.direct_mechanism_present is True and s.concrete_evidence_present:
                state = "CONFIRMED"
            elif s.direct_mechanism_present is True and s.signal_present:
                state = "INDICATED"
            else:
                state = "INSUFFICIENT_EVIDENCE"
            from .models import PainObservation
            observations.append(PainObservation(pain_id=s.pain_id,state=state,evidence_ids=s.evidence_ids,rationale=s.rationale))
        dedup = {}
        for p in observations:
            dedup[p.pain_id] = p
        for p in dedup.values():
            confs = [CONFIDENCE_ORDER.get(evidence[eid].type, "UNKNOWN") for eid in p.evidence_ids if eid in evidence]
            confidence = "UNKNOWN"
            if "HIGH" in confs: confidence = "HIGH"
            elif "MEDIUM" in confs: confidence = "MEDIUM"
            elif "LOW" in confs: confidence = "LOW"
            if p.state.value == "CONFIRMED" and not p.evidence_ids:
                confidence = "LOW"
            out.append(PainResult(pain_id=p.pain_id, state=p.state, confidence=confidence, rationale=p.rationale or p.mechanism))
        return out

class EconomicsEngine:
    def run(self, ctx: EngineContext) -> EconomicResult:
        seen: set[str] = set()
        active = wait = direct = tool = cash = 0.0
        capacity_value = 0.0
        has_capacity = False
        for item in ctx.engagement.economics:
            if item.deduplication_key and item.deduplication_key in seen:
                continue
            if item.deduplication_key:
                seen.add(item.deduplication_key)
            active += item.annual_active_hours or 0
            wait += item.annual_wait_hours or 0
            direct += item.direct_loss_eur_annual or 0
            tool += item.current_tool_cost_eur_annual or 0
            cash += item.realized_cash_saving_eur_annual or 0
            if item.annual_active_hours is not None and item.capacity_cost_rate_eur_hour is not None:
                capacity_value += item.annual_active_hours * item.capacity_cost_rate_eur_hour
                has_capacity = True
        status = "COMPLETE" if ctx.engagement.economics else "INSUFFICIENT"
        return EconomicResult(
            annual_active_hours=round(active, 2), annual_wait_hours=round(wait, 2),
            capacity_value_eur_annual=round(capacity_value, 2) if has_capacity else None,
            direct_loss_eur_annual=round(direct, 2), current_tool_cost_eur_annual=round(tool, 2),
            realized_cash_saving_eur_annual=round(cash, 2), status=status
        )

class RiskEngine:
    def _level(self, r) -> str:
        if r.critical_trigger or (r.sensitive_or_high_impact and r.impact_1_5 >= 4): return "R3"
        if r.impact_1_5 >= 4 or r.material_financial_or_compliance or not r.reversible: return "R2"
        if r.impact_1_5 >= 2: return "R1"
        if r.impact_1_5 == 1 and r.reversible and not r.sensitive_or_high_impact: return "R0"
        return "UNKNOWN"

    def run(self, ctx: EngineContext) -> RiskResult:
        if not ctx.engagement.risks:
            return RiskResult(inherent_level="UNKNOWN", residual_level="UNKNOWN", status="UNKNOWN", rationale="No risk assessment supplied.")
        levels = [self._level(r) for r in ctx.engagement.risks]
        rank = {"UNKNOWN":-1,"R0":0,"R1":1,"R2":2,"R3":3}
        inherent = max(levels, key=lambda x: rank[x])
        controls_ok = all(r.controls_present for r in ctx.engagement.risks)
        residual = inherent if controls_ok else ("R3" if inherent == "R3" else "R2" if rank[inherent] < 2 else inherent)
        return RiskResult(inherent_level=inherent, residual_level=residual, status="ASSESSED" if controls_ok else "CONTROL_GAP", rationale=f"Highest contextual risk={inherent}; controls_present={controls_ok}.")

class RecommendationEngine:
    def __init__(self):
        self.map_rows = table("MAP_PAIN_CAPABILITY")
        self.cap_ref = by_id("REF_CAPABILITY", "Capability_ID")

    def capabilities(self, pain_results: Iterable[PainResult]) -> list[CapabilityRequirement]:
        states = {p.pain_id:p.state.value for p in pain_results}
        out=[]
        for row in self.map_rows:
            pid = str(row.get("Pain_ID"))
            if states.get(pid) not in {"CONFIRMED","INDICATED"}: continue
            cid = row.get("Capability_ID")
            if not cid or str(cid) == "CAUSAL": continue
            role = str(row.get("Requirement_Role") or row.get("Role") or "SUPPORTING")
            out.append(CapabilityRequirement(pain_id=pid, capability_id=str(cid), role=role, required=role.startswith("ESSENTIAL")))
        dedup = {}
        for c in out:
            key=(c.pain_id,c.capability_id,c.role)
            dedup[key]=c
        return list(dedup.values())

    def run(self, ctx: EngineContext, pain_results: list[PainResult], risk: RiskResult) -> Recommendation:
        confirmed = [p for p in pain_results if p.state.value == "CONFIRMED"]
        indicated = [p for p in pain_results if p.state.value == "INDICATED"]
        caps = self.capabilities(pain_results)
        rationale=[]
        if not confirmed:
            if indicated:
                return Recommendation(action_id="ACT06", confidence="LOW", capabilities=caps, rationale=["Only indicated/incomplete evidence is available."])
            return Recommendation(action_id="ACT00", confidence="MEDIUM", capabilities=[], rationale=["No material confirmed pain case."])
        if not ctx.engagement.process_design_preconditions_ok:
            return Recommendation(action_id="ACT01", confidence="HIGH", capabilities=caps, rationale=["Process/role/control preconditions must be redesigned before technology."])
        if ctx.engagement.existing_tool_can_cover:
            action="ACT02"; rationale.append("Required capabilities can be supplied by existing owned tooling/configuration.")
        else:
            action="ACT03"
        ai="I0"
        if ctx.engagement.requires_bounded_agent_action:
            action="ACT05"; ai="I2"; rationale.append("Bounded contextual action is required.")
        elif ctx.engagement.requires_unstructured_ai_assistance:
            action="ACT04"; ai="I1"; rationale.append("Unstructured interpretation/assistance is required while human retains decision authority.")
        if risk.residual_level == "R3" and ai in {"I1","I2"}:
            return Recommendation(action_id="ACT06", confidence="MEDIUM", capabilities=caps, rationale=["High-impact/critical AI risk requires specialist governance before implementation."])

        max_n = 1
        for c in caps:
            if not c.required: continue
            ref=self.cap_ref.get(c.capability_id,{})
            typical=str(ref.get("Typical_Level_Min") or ref.get("Typical_Level") or ref.get("Typical_N") or "N1")
            max_n=max(max_n, level_rank(typical,"N"))
        if ctx.engagement.requires_management_visibility:
            max_n=max(max_n,4)
        n=f"N{min(max_n,4)}"
        if action in {"ACT01","ACT06","ACT00"}: n = None
        if action == "ACT02" and n is None: n = "N1"
        return Recommendation(action_id=action, functional_level_id=n, ai_level_id=ai if action in {"ACT03","ACT04","ACT05","ACT02"} else None, capabilities=caps, confidence="HIGH" if confirmed else "MEDIUM", rationale=rationale)

class PricingEngine:
    def __init__(self):
        self.ref_price = by_id("REF_PRICING", "Pricing_ID")
        self.action_product = {str(r.get("Action_ID")):r for r in table("MAP_ACTION_PRODUCT")}
        self.options = table("REF_PRODUCT_OPTION")
        self.cfg = {str(r.get("Policy_ID")):r for r in table("CFG_PRICING_POLICY")}

    def _cfg_num(self, pid: str, default: float) -> float:
        try: return float(self.cfg.get(pid,{}).get("Value", default))
        except Exception: return default

    def _base(self, n: str | None) -> float:
        mapping={"N1":"PR-S01","N2":"PR-S02","N3":"PR-S03","N4":"PR-S04"}
        rid=mapping.get(n or "")
        if not rid: return 0
        try: return float(self.ref_price.get(rid,{}).get("Reference_Price") or self.ref_price.get(rid,{}).get("Value") or 0)
        except Exception: return 0

    def _option(self, n: str | None, i: str | None) -> str | None:
        for r in self.options:
            if r.get("Product_ID") == "PROD-S-GEN" and r.get("Functional_Level_ID") == n and r.get("AI_Level_ID") == i:
                return str(r.get("Product_Option_ID"))
        return None

    def run(self, ctx: EngineContext, rec: Recommendation, risk: RiskResult, scope_override=None) -> Quote:
        scope=scope_override or ctx.engagement.commercial_scope
        maprow=self.action_product.get(rec.action_id,{})
        product=maprow.get("Primary_Product_ID") or None
        notes=[]
        if rec.action_id == "ACT00":
            return Quote(product_id=None,status=QuoteStatus.READY,notes=["No implementation product required."])
        if rec.action_id == "ACT06":
            product = product or "PROD-A-P0"
        if product == "PROD-A-P0":
            one=self._cfg_num("CFG-P04",900)
        elif product == "PROD-A-P1":
            try: one=float(self.ref_price.get("PR-A02",{}).get("Reference_Price") or 1800)
            except Exception: one=1800
        elif product == "PROD-A-P2":
            one=scope.additional_effort_days*self._cfg_num("CFG-P02",400)
            if one <= 0: notes.append("Optimization effort must be explicitly estimated.")
        else:
            one=self._base(rec.functional_level_id)
        day_rate=self._cfg_num("CFG-P02",400)
        one += scope.additional_effort_days*day_rate + scope.external_one_off_eur
        if rec.ai_level_id == "I1": one += scope.ai_effort_days*day_rate
        one -= scope.discount_or_credit_eur
        one=max(0,one)
        recurring=max(0,scope.support_monthly_eur)
        tools=max(0,scope.tool_cost_monthly_eur)
        status=QuoteStatus.READY
        if not scope.scope_bounded: status=QuoteStatus.PROVISIONAL; notes.append("Scope/Definition of Done not fully bounded.")
        if product == "PROD-S-GEN" and not scope.integrations_known: status=QuoteStatus.PROVISIONAL; notes.append("Integrations are not fully known.")
        if not scope.tool_tco_current and product == "PROD-S-GEN": status=QuoteStatus.PROVISIONAL; notes.append("Tool/vendor TCO must be refreshed at quote date.")
        if risk.residual_level == "R2" and rec.ai_level_id == "I2": status=QuoteStatus.MANUAL_REVIEW; notes.append("I2/R2 requires manual control and pricing review.")
        if risk.residual_level == "R3" or rec.ai_level_id == "I3": status=QuoteStatus.BLOCKED; notes.append("Critical risk or I3 prevents automatic quote readiness.")
        if rec.ai_level_id == "I1" and scope.ai_effort_days <= 0:
            status=QuoteStatus.PROVISIONAL; notes.append("I1 requires explicit AI evaluation/configuration effort; no percentage uplift is used.")
        return Quote(
            product_id=product, product_option_id=self._option(rec.functional_level_id,rec.ai_level_id),
            one_off_eur=round(one,2), recurring_monthly_eur=round(recurring,2), tool_cost_monthly_eur=round(tools,2),
            tco_12m_eur=round(one+12*(recurring+tools),2), tco_36m_eur=round(one+36*(recurring+tools),2),
            status=status, pricing_confidence="HIGH" if status==QuoteStatus.READY else "MEDIUM", notes=notes
        )

class ScenarioComparator:
    def __init__(self, pricing: PricingEngine, risk_engine: RiskEngine):
        self.pricing=pricing; self.risk_engine=risk_engine
        self.cap_ref=by_id("REF_CAPABILITY","Capability_ID")

    def _caps_for(self, rec: Recommendation, n: str | None, i: str | None) -> tuple[set[str], set[str]]:
        included=set(); blocked=set()
        for c in rec.capabilities:
            ref=self.cap_ref.get(c.capability_id,{})
            typical=str(ref.get("Typical_Level_Min") or ref.get("Typical_Level") or ref.get("Typical_N") or "N1")
            if level_rank(typical,"N") > level_rank(n,"N"):
                blocked.add(c.capability_id); continue
            ai_rel=str(ref.get("AI_Relevance") or "")
            if ("I1" in ai_rel or "I2" in ai_rel) and i == "I0" and c.role in {"CONDITIONAL_AI","SUPPORTING_AI"}:
                blocked.add(c.capability_id); continue
            included.add(c.capability_id)
        return included,blocked

    def _coverage(self, pain_results: list[PainResult], rec: Recommendation, included: set[str]) -> dict[str,CoverageState]:
        req=defaultdict(list)
        for c in rec.capabilities:
            if c.required: req[c.pain_id].append(c.capability_id)
        out={}
        for p in pain_results:
            if p.state.value == "NOT_DETECTED": out[p.pain_id]=CoverageState.NOT_APPLICABLE; continue
            if p.state.value in {"INDICATED","INSUFFICIENT_EVIDENCE"}: out[p.pain_id]=CoverageState.PARTIAL; continue
            needed=req.get(p.pain_id,[])
            if not needed: out[p.pain_id]=CoverageState.UNRESOLVED; continue
            present=sum(1 for x in needed if x in included)
            out[p.pain_id]=CoverageState.RESOLVED if present==len(needed) else CoverageState.PARTIAL if present else CoverageState.UNRESOLVED
        return out

    # [AUNEA-BE-SCEN-CALC-020] START — Cálculo y nombre de escenario
    # PURPOSE: Conservar nombre y valorar capacidad por sus horas y tarifa de origen.
    # SOURCE: baseline aceptada v1.0.4/backend v1.1.1; RULE_SCENARIO_ECONOMICS.
    # INPUTS: baseline, assumptions, coverage, EngineContext.
    # OUTPUTS: EconomicResult y ScenarioResult.
    # SIDE_EFFECTS: UUID de escenario; sin escritura persistente.
    # CHANGE_RISK: CRITICAL.
    def _scenario_econ(self, baseline: EconomicResult, assumptions: list[ScenarioAssumption], coverage: dict[str,CoverageState], ctx: EngineContext) -> EconomicResult:
        by_pain={a.pain_id:a for a in assumptions}
        recovered_active=recovered_wait=avoided_loss=cash=0.0
        recovered_capacity_value=0.0
        has_active=False
        has_capacity_rate=False
        pain_econ=defaultdict(list)
        for e in ctx.engagement.economics:
            if e.pain_id: pain_econ[e.pain_id].append(e)
        for pid, cov in coverage.items():
            if cov == CoverageState.UNRESOLVED: continue
            a=by_pain.get(pid)
            if not a: continue
            for e in pain_econ.get(pid,[]):
                if e.annual_active_hours is not None:
                    if a.future_active_hours is not None:
                        recovered = max(0,e.annual_active_hours-a.future_active_hours); recovered_active += recovered; has_active=True
                        if e.capacity_cost_rate_eur_hour is not None:
                            recovered_capacity_value += recovered * e.capacity_cost_rate_eur_hour; has_capacity_rate=True
                    elif a.explicit_reduction_factor is not None:
                        recovered = max(0,e.annual_active_hours*a.explicit_reduction_factor); recovered_active += recovered; has_active=True
                        if e.capacity_cost_rate_eur_hour is not None:
                            recovered_capacity_value += recovered * e.capacity_cost_rate_eur_hour; has_capacity_rate=True
                if e.annual_wait_hours is not None and a.future_wait_hours is not None:
                    recovered_wait += max(0,e.annual_wait_hours-a.future_wait_hours)
                if e.direct_loss_eur_annual is not None and a.preventable_loss_fraction is not None:
                    avoided_loss += max(0,e.direct_loss_eur_annual*a.preventable_loss_fraction)
            cash += a.realized_cash_saving_eur_annual or 0
        # Capacity value is calculated row-by-row using the same recovered hours and rate pair.
        # This keeps scenario arithmetic consistent with baseline EconomicsEngine and never infers cash.
        cap=round(recovered_capacity_value,2) if has_active and has_capacity_rate else None
        status="COMPLETE" if assumptions else "NOT_CALCULATED"
        return EconomicResult(annual_active_hours=round(recovered_active,2),annual_wait_hours=round(recovered_wait,2),capacity_value_eur_annual=cap,direct_loss_eur_annual=round(avoided_loss,2),current_tool_cost_eur_annual=baseline.current_tool_cost_eur_annual,realized_cash_saving_eur_annual=round(cash,2),status=status)

    def create(self, ctx: EngineContext, pain_results: list[PainResult], baseline_econ: EconomicResult, baseline_risk: RiskResult, optimal_rec: Recommendation, optimal_quote: Quote, req: ScenarioRequest | None = None, optimal: ScenarioResult | None = None) -> ScenarioResult:
        if req is None:
            action=optimal_rec.action_id; n=optimal_rec.functional_level_id; i=optimal_rec.ai_level_id; name="Optimal"; stype="OPTIMAL"; assumptions=[]; scope=None
        else:
            action=req.action_id or optimal_rec.action_id; n=req.functional_level_id if req.functional_level_id is not None else optimal_rec.functional_level_id; i=req.ai_level_id if req.ai_level_id is not None else optimal_rec.ai_level_id; name=req.scenario_name; stype="OVERRIDE"; assumptions=req.assumptions; scope=req.commercial_scope
        # Build rec variant but retain capability requirement basis.
        rec=Recommendation(action_id=action,functional_level_id=n,ai_level_id=i,capabilities=optimal_rec.capabilities,confidence=optimal_rec.confidence,rationale=list(optimal_rec.rationale))
        included, blocked=self._caps_for(rec,n,i)
        coverage=self._coverage(pain_results,rec,included)
        econ=self._scenario_econ(baseline_econ, assumptions, coverage, ctx) if req is not None else self._scenario_econ(baseline_econ, [], coverage, ctx)
        # Risk: preserve for identical control/authority; otherwise require reassessment.
        risk=baseline_risk
        status="COMPUTED"
        if req is not None and i != optimal_rec.ai_level_id:
            risk=RiskResult(inherent_level=baseline_risk.inherent_level,residual_level=baseline_risk.residual_level,status="RISK_REASSESS_REQUIRED",rationale="AI authority changed; residual risk cannot be auto-downgraded/upgraded.")
        quote=self.pricing.run(ctx,rec,risk,scope)
        cap_delta={"added":[],"removed":[]}
        delta={}
        if optimal is not None:
            optimal_caps=set(optimal.capability_delta.get("included",[]))
            cap_delta["added"]=sorted(included-optimal_caps)
            cap_delta["removed"]=sorted(optimal_caps-included)
            delta={
                "functional_level": {"optimal":optimal.functional_level_id,"compared":n},
                "ai_level": {"optimal":optimal.ai_level_id,"compared":i},
                "one_off_eur": round(quote.one_off_eur-optimal.quote.one_off_eur,2),
                "tco_12m_eur": round(quote.tco_12m_eur-optimal.quote.tco_12m_eur,2),
                "risk_status": risk.status,
                "removed_capabilities": cap_delta["removed"],
                "coverage_changes": {pid:{"optimal":optimal.coverage_by_pain.get(pid),"compared":coverage.get(pid)} for pid in coverage if optimal.coverage_by_pain.get(pid)!=coverage.get(pid)}
            }
        cap_delta["included"]=sorted(included); cap_delta["blocked"]=sorted(blocked)
        if i == "I3": status="BLOCKED"
        return ScenarioResult(scenario_id=str(uuid.uuid4()),scenario_name=name,scenario_type=stype,action_id=action,functional_level_id=n,ai_level_id=i,coverage_by_pain=coverage,capability_delta=cap_delta,economics=econ,risk=risk,quote=quote,delta_vs_optimal=delta,status=status)
    # [AUNEA-BE-SCEN-CALC-020] END
