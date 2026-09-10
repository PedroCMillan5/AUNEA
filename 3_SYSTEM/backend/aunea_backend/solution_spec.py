# [AUNEA-BE-SOLUTION-SPEC-010] START — Solution Specification Engine
# PURPOSE: Turn a selected ScenarioResult + EngagementInput into a Solution Specification (capabilities, business rules, integrations, roles, AI/security/error-handling requirements, acceptance tests) bridging diagnosis to buildable engineering requirements. Never mutates recommendation/economics/risk/pricing.
# SOURCE: DEC-034; L9 System Delivery & Learning.
# INPUTS: EngagementInput, DiagnosticOutput, SolutionSpecificationRequest.
# OUTPUTS: SolutionSpecification.
# SIDE_EFFECTS: none.
# CHANGE_RISK: HIGH.
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .models import DiagnosticOutput, EngagementInput, ScenarioResult
from .solution_models import SolutionSpecification, SolutionSpecificationRequest, SolutionSpecAcceptanceTest, SolutionSpecRule
from .registry import load_registry, rule_bundle_version
from .utils import stable_hash

SYSTEM_ACTIONS = {"ACT03", "ACT04", "ACT05"}


def _qa(engagement: EngagementInput, *keys: str, default=None):
    q = engagement.questionnaire_answers or {}
    for key in keys:
        if key in q and q[key] not in (None, "", []):
            return q[key]
    return default


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x) for x in value if x not in (None, "")]
    if isinstance(value, str):
        return [x.strip() for x in value.split("\n") if x.strip()]
    return [str(value)]


@dataclass
class SolutionSpecificationEngine:
    def __post_init__(self):
        reg = load_registry()
        self.capabilities = {r.get("Capability_ID"): r for r in reg.get("tables", {}).get("REF_CAPABILITY", [])}

    def _scenario(self, diagnostic: DiagnosticOutput, request: SolutionSpecificationRequest) -> ScenarioResult:
        return request.selected_scenario or diagnostic.optimal_scenario

    def _capabilities(self, diagnostic: DiagnosticOutput, scenario: ScenarioResult) -> list[dict[str, Any]]:
        removed = set((scenario.capability_delta or {}).get("removed", []) or [])
        blocked = set((scenario.capability_delta or {}).get("blocked", []) or [])
        out, seen = [], set()
        for req in diagnostic.recommendation.capabilities:
            cid = req.capability_id
            if cid in seen:
                continue
            seen.add(cid)
            ref = self.capabilities.get(cid, {})
            out.append({
                "capability_id": cid,
                "name": ref.get("Capability_Name", cid),
                "definition": ref.get("Definition"),
                "requirement_role": req.role,
                "required": bool(req.required),
                "scenario_status": "BLOCKED" if cid in blocked else "REMOVED" if cid in removed else "INCLUDED",
                "source_pain_id": req.pain_id,
            })
        return out

    def _acceptance_tests(self, caps: list[dict[str, Any]]) -> list[SolutionSpecAcceptanceTest]:
        tests = []
        for i, cap in enumerate([c for c in caps if c.get("scenario_status") == "INCLUDED"], 1):
            cid = cap["capability_id"]
            name = cap.get("name") or cid
            tests.append(SolutionSpecAcceptanceTest(
                test_id=f"AT-{i:03d}",
                requirement=f"Provide capability {cid} — {name}",
                given="The agreed process input and required preconditions are available",
                when=f"The workflow reaches the point governed by {name}",
                then=f"The system performs the agreed {name} behavior and records the resulting state/audit evidence",
                source_capability_id=cid,
            ))
        return tests

    def _ai_requirements(self, scenario: ScenarioResult) -> dict[str, Any]:
        level = scenario.ai_level_id or "I0"
        if level == "I0":
            return {"level": "I0", "ai_used": False, "human_review": False, "requirements": []}
        if level == "I1":
            return {"level":"I1","ai_used":True,"mode":"ASSISTED","human_review":True,"requirements":[
                "Define the bounded assistive task and intended use.",
                "Define allowed data boundary and representative evaluation cases.",
                "Human/system retains the final decision and can override output.",
                "Log relevant AI input/output metadata according to privacy/security constraints.",
                "Define fallback behavior when AI is unavailable or confidence is insufficient.",
            ]}
        if level == "I2":
            return {"level":"I2","ai_used":True,"mode":"BOUNDED_AGENT","human_review":True,"requirements":[
                "Define finite allowed and forbidden actions.",
                "Define authority boundaries, approval points and stop/override controls.",
                "Define monitoring, logging, representative evaluation and escalation.",
                "Define deterministic fallback for unavailable/unsafe/uncertain agent behavior.",
                "Risk/control review must be completed before production deployment.",
            ]}
        return {"level":level,"ai_used":True,"mode":"NOT_OFFERED","requirements":["I3 is not an automatically supported AUNEA offer."]}

    def generate(self, engagement: EngagementInput, diagnostic: DiagnosticOutput, request: SolutionSpecificationRequest | None = None) -> SolutionSpecification:
        request = request or SolutionSpecificationRequest()
        scenario = self._scenario(diagnostic, request)
        missing: list[str] = []

        if scenario.status == "BLOCKED":
            status = "BLOCKED_SCENARIO"
        elif scenario.action_id not in SYSTEM_ACTIONS:
            status = "BLOCKED_NOT_SYSTEM"
        else:
            if not request.target_platform:
                missing.append("Target platform / implementation environment not confirmed.")
            if not request.roles:
                missing.append("Implementation roles/permissions not confirmed.")
            if not request.data_entities:
                missing.append("Operational data entities/fields/source-of-truth not confirmed.")
            if engagement.commercial_scope.integrations_known is False and not request.integrations:
                missing.append("Required integrations and connector/API feasibility not confirmed.")
            if scenario.ai_level_id in {"I1", "I2"} and not _qa(engagement, "ai_evaluation_examples", "representative_ai_cases"):
                missing.append("Representative AI evaluation cases are not attached/confirmed.")
            status = "DRAFT_MISSING_IMPLEMENTATION_INPUTS" if missing else "READY_FOR_BUILD"

        caps = self._capabilities(diagnostic, scenario)
        rules = list(request.business_rules)
        if not rules:
            for idx, cap in enumerate([c for c in caps if c["scenario_status"] == "INCLUDED"], 1):
                rules.append(SolutionSpecRule(rule_id=f"BR-{idx:03d}",description=f"Implementation rule required for {cap['capability_id']} — {cap.get('name')}",status="TBD"))

        security = list(request.security_constraints) + _as_list(_qa(engagement, "security_constraints", "security_privacy_constraints"))
        logging_requirements = ["Record state transitions and material automated actions.","Record execution errors and retry/fallback outcomes."]
        if scenario.ai_level_id in {"I1", "I2"}:
            logging_requirements.append("Record AI-assisted/agentic execution metadata required for review and monitoring.")

        desired = _qa(engagement, "desired_outcome", "expected_outcome", "future_state")
        return SolutionSpecification(
            specification_id=f"SPEC-{stable_hash({'engagement': engagement.engagement_id, 'scenario': scenario.scenario_id, 'request': request.model_dump(mode='json')})[:12]}",
            engagement_id=engagement.engagement_id,
            process_name=engagement.process_name,
            source_scenario_id=scenario.scenario_id,
            source_action_id=scenario.action_id,
            status=status,
            rule_bundle_version=rule_bundle_version(),
            created_at=datetime.now(timezone.utc).isoformat(),
            functional_level_id=scenario.functional_level_id,
            ai_level_id=scenario.ai_level_id,
            product_id=scenario.quote.product_id if scenario.quote else None,
            objective=str(desired) if desired else None,
            as_is_summary={
                "process_name": engagement.process_name,
                "problem_or_current_situation": _qa(engagement, "problem", "current_situation", "pain_description"),
                "current_tools": _as_list(_qa(engagement, "current_tools", "tools")),
                "owner": _qa(engagement, "owner", "process_owner"),
                "pain_results": [p.model_dump(mode="json") for p in diagnostic.pain_results],
            },
            target_state_summary={
                "desired_outcome": desired,
                "selected_action": scenario.action_id,
                "functional_level": scenario.functional_level_id,
                "intelligence_level": scenario.ai_level_id,
                "selected_product": scenario.quote.product_id if scenario.quote else None,
                "target_platform": request.target_platform,
            },
            capabilities=caps,
            triggers=_as_list(_qa(engagement, "trigger", "process_trigger")),
            inputs=_as_list(_qa(engagement, "inputs", "input_data", "process_inputs")),
            outputs=_as_list(_qa(engagement, "outputs", "required_outputs", "process_outputs")),
            data_entities=request.data_entities,
            business_rules=rules,
            decisions=_as_list(_qa(engagement, "decisions", "decisions_required")),
            exceptions=_as_list(_qa(engagement, "exceptions", "exception_types", "known_issues")),
            integrations=request.integrations,
            roles=request.roles,
            ai_requirements=self._ai_requirements(scenario),
            security_logging={"security_constraints":security,"logging_requirements":logging_requirements,"risk_level":scenario.risk.residual_level,"risk_status":scenario.risk.status},
            error_handling_idempotency={"requirements":[
                "Define idempotency key/event identity for create/update actions that can be retried.",
                "Retries must not create duplicate business records or duplicate external side effects.",
                "Define retryable vs non-retryable error classes.",
                "Define exception queue/manual resolution path for failures that cannot be recovered automatically.",
                "Record correlation identifier across integrations where technically feasible.",
            ]},
            acceptance_tests=self._acceptance_tests(caps),
            deployment={"target_platform":request.target_platform,"constraints":request.deployment_constraints,"production_readiness":"READY" if status == "READY_FOR_BUILD" else "NOT_READY"},
            handover_support={
                "handover_requirements":request.handover_requirements or ["Architecture/configuration documentation","Operational runbook","Admin/owner handover"],
                "support_requirements":request.support_requirements,
                "client_ownership_principle":"Client should retain reasonable ownership of production accounts, data and environment.",
            },
            missing_information=missing,
            source_trace={
                "diagnostic_input_snapshot_hash":diagnostic.input_snapshot_hash,
                "diagnostic_rule_bundle_version":diagnostic.rule_bundle_version,
                "selected_scenario_id":scenario.scenario_id,
                "selected_quote_status":scenario.quote.status.value if scenario.quote else None,
                "generator_version":"v1.0",
            },
        )
# [AUNEA-BE-SOLUTION-SPEC-010] END
