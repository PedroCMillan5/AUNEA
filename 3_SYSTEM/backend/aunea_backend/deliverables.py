# [AUNEA-BE-DELIVERABLES-010] START — Deliverables Engine
# PURPOSE: Render a selected ScenarioResult + DiagnosticOutput into client-facing markdown/HTML/JSON artifacts (summary, report, proposal, appendix) with a readiness/blocking status. Never recomputes engine results, only formats already-computed output.
# SOURCE: DEC-034; L8 Client Experience & Deliverables.
# INPUTS: DiagnosticOutput, DeliverableRequest.
# OUTPUTS: DeliverablePack (artifacts, status, issues).
# SIDE_EFFECTS: none (pure formatting).
# CHANGE_RISK: HIGH.
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
from html import escape
from typing import Any

from .models import DiagnosticOutput, ScenarioResult, QuoteStatus
from .deliverable_models import DeliverablePack, DeliverableArtifact, DeliverableRequest
from .registry import rule_bundle_version
from .utils import stable_hash


def _fmt_eur(value):
    if value is None: return "not calculated"
    return f"€{value:,.0f}".replace(",", ".")

def _fmt_hours(value):
    if value is None: return "not calculated"
    return f"{value:,.1f} h".replace(",", ".")

def _status_value(x: Any) -> str:
    return getattr(x, "value", x) if x is not None else ""

@dataclass
class DeliverablesEngine:
    def _selected_scenario(self, diagnostic: DiagnosticOutput, request: DeliverableRequest) -> ScenarioResult:
        return request.selected_scenario or diagnostic.optimal_scenario

    def _readiness(self, diagnostic: DiagnosticOutput, scenario: ScenarioResult):
        issues=[]
        if scenario.status == "BLOCKED": issues.append("Selected scenario is blocked.")
        if scenario.quote.status == QuoteStatus.BLOCKED: issues.append("Selected quote is blocked.")
        if not diagnostic.pain_results: issues.append("No pain results available; report will be incomplete.")
        if issues: return "BLOCKED_SCENARIO_NOT_SELECTABLE", issues
        if scenario.quote.status in {QuoteStatus.PROVISIONAL, QuoteStatus.MANUAL_REVIEW}:
            return "DRAFT", [f"Quote status is {scenario.quote.status.value}; pack is suitable for internal review, not final issue."]
        return "READY", []

    def _pain_summary_md(self, diagnostic, scenario):
        lines=["| Pain | Detection state | Coverage | Confidence |","|---|---:|---:|---:|"]
        for pain in diagnostic.pain_results:
            lines.append(f"| {pain.pain_id} | {_status_value(pain.state)} | {_status_value(scenario.coverage_by_pain.get(pain.pain_id))} | {pain.confidence} |")
        return "\n".join(lines)

    def _economics_md(self, diagnostic, scenario):
        b,s=diagnostic.economic_result,scenario.economics
        return "\n".join([
            "| Metric | Baseline | Selected scenario |","|---|---:|---:|",
            f"| Active hours | {_fmt_hours(b.annual_active_hours)} | {_fmt_hours(s.annual_active_hours)} |",
            f"| Waiting hours | {_fmt_hours(b.annual_wait_hours)} | {_fmt_hours(s.annual_wait_hours)} |",
            f"| Capacity value | {_fmt_eur(b.capacity_value_eur_annual)} | {_fmt_eur(s.capacity_value_eur_annual)} |",
            f"| Direct loss / avoidable loss | {_fmt_eur(b.direct_loss_eur_annual)} | {_fmt_eur(s.direct_loss_eur_annual)} |",
            f"| Realized cash saving | {_fmt_eur(b.realized_cash_saving_eur_annual)} | {_fmt_eur(s.realized_cash_saving_eur_annual)} |",
        ])

    def _quote_md(self, scenario):
        q=scenario.quote
        return f"""| Item | Value |
|---|---:|
| Product | {q.product_id or 'No implementation product'} |
| Product option | {q.product_option_id or 'n/a'} |
| One-off | {_fmt_eur(q.one_off_eur)} |
| Recurring monthly | {_fmt_eur(q.recurring_monthly_eur)} |
| Tool cost monthly | {_fmt_eur(q.tool_cost_monthly_eur)} |
| TCO 12m | {_fmt_eur(q.tco_12m_eur)} |
| TCO 36m | {_fmt_eur(q.tco_36m_eur)} |
| Quote status | {q.status.value} |"""

    def _summary(self, diagnostic, scenario, request, status, issues):
        return f"""# AUNEA Diagnostic Summary — {request.client_name or diagnostic.engagement_id}

## Decision snapshot
- Engagement: `{diagnostic.engagement_id}`
- Process: `{request.process_name or 'Process captured in engagement'}`
- Pack status: `{status}`
- Rule bundle: `{diagnostic.rule_bundle_version}`
- Selected scenario: `{scenario.scenario_type}` · `{scenario.scenario_id}`

## Recommended direction
- Action: `{diagnostic.recommendation.action_id}`
- Functional level: `{scenario.functional_level_id or 'n/a'}`
- Intelligence level: `{scenario.ai_level_id or 'n/a'}`
- Residual risk: `{scenario.risk.residual_level}`

## Commercial snapshot
- Product: `{scenario.quote.product_id or 'No implementation product'}`
- One-off: **{_fmt_eur(scenario.quote.one_off_eur)}**
- TCO 12m: **{_fmt_eur(scenario.quote.tco_12m_eur)}**
- Quote readiness: `{scenario.quote.status.value}`

## Blocking / review notes
{chr(10).join('- '+i for i in issues) if issues else '- None'}"""

    def _report(self, diagnostic, scenario, request):
        return f"""# AUNEA Diagnostic Report

## 1. Scope
- Engagement: `{diagnostic.engagement_id}`
- Client: `{request.client_name or 'n/a'}`
- Process: `{request.process_name or 'n/a'}`
- Rule bundle: `{diagnostic.rule_bundle_version}`

## 2. Pains and coverage
{self._pain_summary_md(diagnostic, scenario)}

## 3. Economic view
{self._economics_md(diagnostic, scenario)}

Important: capacity value, direct loss and realized cash saving are separate categories. This report does not collapse them into a single universal saving.

## 4. Risk view
- Inherent risk: `{diagnostic.risk_result.inherent_level}`
- Residual risk: `{scenario.risk.residual_level}`
- Risk status: `{scenario.risk.status}`

## 5. Recommendation
- Action: `{diagnostic.recommendation.action_id}`
- Functional level: `{diagnostic.recommendation.functional_level_id or 'n/a'}`
- Intelligence level: `{diagnostic.recommendation.ai_level_id or 'n/a'}`"""

    def _proposal(self, diagnostic, scenario, request):
        return f"""# AUNEA Proposal Draft

## Proposed service
`{scenario.quote.product_id or 'No implementation product'}` · `{scenario.quote.product_option_id or 'n/a'}`

## Scope basis
- Action: `{scenario.action_id}`
- Functional level: `{scenario.functional_level_id or 'n/a'}`
- Intelligence level: `{scenario.ai_level_id or 'n/a'}`
- Scenario status: `{scenario.status}`

## Investment
{self._quote_md(scenario)}

## Next step
{request.next_step or 'Review selected scenario, confirm scope/readiness items, and approve proposal pack for client issue.'}"""

    def _appendix(self, diagnostic, scenario):
        return f"""# Evidence and Assumptions Appendix

- Rule bundle: `{diagnostic.rule_bundle_version}`
- Input snapshot hash: `{diagnostic.input_snapshot_hash}`
- Pack source hash: `{stable_hash(diagnostic.model_dump(mode='json'))}`
- Economics baseline: `{diagnostic.economic_result.status}`
- Scenario economics: `{scenario.economics.status}`
- Risk: `{scenario.risk.status}`
- Quote: `{scenario.quote.status.value}`

Missing evidence remains a follow-up item and is never silently converted into a final claim."""

    def _html(self,title,md):
        body="\n".join(f"<p>{escape(line)}</p>" for line in md.splitlines())
        return f"<!doctype html><html><head><meta charset='utf-8'><title>{escape(title)}</title></head><body><main>{body}</main></body></html>"

    def generate(self, diagnostic: DiagnosticOutput, request: DeliverableRequest | None=None) -> DeliverablePack:
        request=request or DeliverableRequest(); scenario=self._selected_scenario(diagnostic,request)
        status,issues=self._readiness(diagnostic,scenario)
        summary=self._summary(diagnostic,scenario,request,status,issues); report=self._report(diagnostic,scenario,request); proposal=self._proposal(diagnostic,scenario,request); appendix=self._appendix(diagnostic,scenario)
        snapshot={"diagnostic":diagnostic.model_dump(mode="json"),"selected_scenario":scenario.model_dump(mode="json"),"request":request.model_dump(mode="json"),"pack_status":status,"issues":issues}
        artifacts=[
            DeliverableArtifact(name="executive_summary.md",media_type="text/markdown",content=summary),
            DeliverableArtifact(name="diagnostic_report.md",media_type="text/markdown",content=report),
            DeliverableArtifact(name="proposal_draft.md",media_type="text/markdown",content=proposal),
            DeliverableArtifact(name="evidence_appendix.md",media_type="text/markdown",content=appendix),
            DeliverableArtifact(name="diagnostic_report.html",media_type="text/html",content=self._html("AUNEA Diagnostic Report",report)),
            DeliverableArtifact(name="proposal_draft.html",media_type="text/html",content=self._html("AUNEA Proposal Draft",proposal)),
            DeliverableArtifact(name="deliverable_snapshot.json",media_type="application/json",content=__import__('json').dumps(snapshot,ensure_ascii=False,indent=2)),
        ]
        return DeliverablePack(pack_id=f"DEL-{stable_hash({'engagement_id':diagnostic.engagement_id,'scenario_id':scenario.scenario_id,'status':status})[:12]}",engagement_id=diagnostic.engagement_id,selected_scenario_id=scenario.scenario_id,status=status,rule_bundle_version=rule_bundle_version(),created_at=datetime.now(timezone.utc).isoformat(),issues=issues,artifacts=artifacts)
# [AUNEA-BE-DELIVERABLES-010] END
