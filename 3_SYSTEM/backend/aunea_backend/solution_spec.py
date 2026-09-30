# [AUNEA-BE-SOLUTION-SPEC-010] START — Solution Specification Engine
# PURPOSE: Turn the selected ScenarioResult + canonical EngagementInput into the structured Solution
# Specification that bridges diagnosis to engineering. Reads canonical DF### capture/runtime entities directly;
# never invents semantic questionnaire aliases and never mutates recommendation/economics/risk/pricing.
# SOURCE: DEC-009; DEC-023; DEC-034; REQ-SPEC-001; Diagnostic Master v1.1 Field_ID/runtime mappings.
# INPUTS: EngagementInput, DiagnosticOutput, SolutionSpecificationRequest.
# OUTPUTS: SolutionSpecification. READY_FOR_BUILD only when implementation inputs/rules/tests are confirmed.
# SIDE_EFFECTS: none.
# CHANGE_RISK: HIGH.
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .models import DiagnosticOutput, EngagementInput, ScenarioResult
from .solution_models import SolutionSpecification, SolutionSpecificationRequest, SolutionSpecAcceptanceTest
from .registry import load_registry, rule_bundle_version
from .utils import stable_hash

SYSTEM_ACTIONS = {"ACT03", "ACT04", "ACT05"}

# Canonical Diagnostic Master v1.1 mappings consumed by Solution Specification. These are Field_IDs,
# not parallel semantic aliases: DF012 Trigger, DF013 Outcome, DF016 Process Owner, DF046 Current Tools,
# DF067 Approval Paths, DF086 Desired Outcome, DF088 Must Not Automate, DF089 Preferred Platforms,
# DF090 Security Constraints, DF098 Next Step. Step-level inputs/outputs/decisions/exceptions live in
# questionnaire_answers['_process_steps'] because the frontend serializes RT_PROCESS_STEP there.
DF_TRIGGER = "DF012"
DF_OUTCOME = "DF013"
DF_PROCESS_OWNER = "DF016"
DF_CURRENT_TOOLS = "DF046"
DF_APPROVAL_PATHS = "DF067"
DF_DESIRED_OUTCOME = "DF086"
DF_MUST_NOT_AUTOMATE = "DF088"
DF_PREFERRED_PLATFORMS = "DF089"
DF_SECURITY_CONSTRAINTS = "DF090"
DF_NEXT_STEP = "DF098"


def _field(engagement: EngagementInput, field_id: str, default=None):
    value = (engagement.questionnaire_answers or {}).get(field_id, default)
    return default if value in (None, "", []) else value


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x) for x in value if x not in (None, "")]
    if isinstance(value, dict):
        return [str(v) for v in value.values() if v not in (None, "", [])]
    if isinstance(value, str):
        return [x.strip() for x in value.split("\n") if x.strip()]
    return [str(value)]


def _process_steps(engagement: EngagementInput) -> list[dict[str, Any]]:
    value = (engagement.questionnaire_answers or {}).get("_process_steps", [])
    return [x for x in value if isinstance(x, dict) and x.get("status") != "SUPERSEDED"] if isinstance(value, list) else []


def _step_values(steps: list[dict[str, Any]], key: str) -> list[str]:
    out: list[str] = []
    for step in steps:
        value = step.get(key)
        if isinstance(value, list):
            out.extend(str(x) for x in value if x not in (None, ""))
        elif isinstance(value, dict):
            # exception_path is a structured canonical runtime object; preserve meaningful values only.
            out.extend(str(x) for x in value.values() if x not in (None, "", [], {}))
        elif value not in (None, ""):
            out.append(str(value))
    # stable de-duplication without reinterpreting values
    return list(dict.fromkeys(out))


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

    def _draft_acceptance_tests(self, caps: list[dict[str, Any]]) -> list[SolutionSpecAcceptanceTest]:
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
                status="DRAFT",
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
        if diagnostic.engagement_id != engagement.engagement_id:
            raise ValueError("diagnostic engagement does not match Solution Specification engagement")
        if diagnostic.input_snapshot_hash != stable_hash(engagement.model_dump()):
            raise ValueError("diagnostic snapshot is stale for Solution Specification")
        if diagnostic.rule_bundle_version != rule_bundle_version():
            raise ValueError("diagnostic rule bundle is stale for Solution Specification")

        scenario = self._scenario(diagnostic, request)
        steps = _process_steps(engagement)
        caps = self._capabilities(diagnostic, scenario)
        rules = list(request.business_rules)
        acceptance_tests = list(request.acceptance_tests) or self._draft_acceptance_tests(caps)
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
            if request.data_entities and any(x.status != "CONFIRMED" for x in request.data_entities):
                missing.append("All operational data entities must be CONFIRMED before build.")
            if engagement.commercial_scope.integrations_known is False and not request.integrations:
                missing.append("Required integrations and connector/API feasibility not confirmed.")
            if request.integrations and any(x.status != "CONFIRMED" for x in request.integrations):
                missing.append("All listed integrations must be CONFIRMED before build.")
            if not rules:
                missing.append("Business rules have not been confirmed.")
            elif any(x.status != "CONFIRMED" for x in rules):
                missing.append("All business rules must be CONFIRMED before build.")
            if not acceptance_tests:
                missing.append("Acceptance tests have not been defined.")
            elif any(x.status != "APPROVED" for x in acceptance_tests):
                missing.append("All acceptance tests must be APPROVED before build.")
            status = "DRAFT_MISSING_IMPLEMENTATION_INPUTS" if missing else "READY_FOR_BUILD"

        security = list(request.security_constraints) + _as_list(_field(engagement, DF_SECURITY_CONSTRAINTS))
        logging_requirements = ["Record state transitions and material automated actions.","Record execution errors and retry/fallback outcomes."]
        if scenario.ai_level_id in {"I1", "I2"}:
            logging_requirements.append("Record AI-assisted/agentic execution metadata required for review and monitoring.")

        desired = _field(engagement, DF_DESIRED_OUTCOME)
        triggers = _as_list(_field(engagement, DF_TRIGGER))
        inputs = _step_values(steps, "inputs")
        outputs = _step_values(steps, "outputs")
        decisions = _step_values(steps, "decision_criteria") + _as_list(_field(engagement, DF_APPROVAL_PATHS))
        exceptions = _step_values(steps, "exception_path")
        current_tools = _as_list(_field(engagement, DF_CURRENT_TOOLS)) or _step_values(steps, "tool")
        owner = _field(engagement, DF_PROCESS_OWNER)
        outcome = _field(engagement, DF_OUTCOME)

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
            objective=str(desired) if desired else str(outcome) if outcome else None,
            as_is_summary={
                "process_name": engagement.process_name,
                "trigger": _field(engagement, DF_TRIGGER),
                "outcome": outcome,
                "current_tools": current_tools,
                "owner": owner,
                "process_steps": steps,
                "pain_results": [p.model_dump(mode="json") for p in diagnostic.pain_results],
            },
            target_state_summary={
                "desired_outcome": desired,
                "must_not_automate": _as_list(_field(engagement, DF_MUST_NOT_AUTOMATE)),
                "preferred_platforms": _as_list(_field(engagement, DF_PREFERRED_PLATFORMS)),
                "selected_action": scenario.action_id,
                "functional_level": scenario.functional_level_id,
                "intelligence_level": scenario.ai_level_id,
                "selected_product": scenario.quote.product_id if scenario.quote else None,
                "target_platform": request.target_platform,
                "next_step": _field(engagement, DF_NEXT_STEP),
            },
            capabilities=caps,
            triggers=triggers,
            inputs=inputs,
            outputs=outputs,
            data_entities=request.data_entities,
            business_rules=rules,
            decisions=list(dict.fromkeys(decisions)),
            exceptions=exceptions,
            integrations=request.integrations,
            roles=request.roles,
            ai_requirements=self._ai_requirements(scenario),
            security_logging={"security_constraints":list(dict.fromkeys(security)),"logging_requirements":logging_requirements,"risk_level":scenario.risk.residual_level,"risk_status":scenario.risk.status},
            error_handling_idempotency={"requirements":[
                "Define idempotency key/event identity for create/update actions that can be retried.",
                "Retries must not create duplicate business records or duplicate external side effects.",
                "Define retryable vs non-retryable error classes.",
                "Define exception queue/manual resolution path for failures that cannot be recovered automatically.",
                "Record correlation identifier across integrations where technically feasible.",
            ]},
            acceptance_tests=acceptance_tests,
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
                "capture_contract":"Diagnostic Master v1.1 Field_ID/runtime mapping",
                "generator_version":"v1.1",
            },
        )
# [AUNEA-BE-SOLUTION-SPEC-010] END
