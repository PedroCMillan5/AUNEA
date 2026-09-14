# [AUNEA-BE-SYSTEM-BUILDER-010] START — System Builder Engine
# PURPOSE: Turn a READY/DRAFT SolutionSpecification into an engineering build plan/package — conservative component reuse/adapt/create decisions against the seed Component Library, phased build tasks, build prompt, runbook and scaffold files.
# SOURCE: DEC-034; L9 System Delivery & Learning; Component Library.
# INPUTS: SolutionSpecification, SystemBuilderRequest.
# OUTPUTS: SystemBuildPlan, SystemBuildPackage.
# SIDE_EFFECTS: none (pure planning/formatting; no filesystem/network writes).
# CHANGE_RISK: HIGH.
from __future__ import annotations
import json
from dataclasses import dataclass

from .solution_models import SolutionSpecification
from .system_builder_models import SystemBuilderRequest, SystemBuildPlan, SystemBuildPackage, ComponentDecision, BuildTask
from .component_library import component_library, COMPONENT_LIBRARY_VERSION
from .utils import stable_hash


def _platform_tokens(platform: str | None) -> set[str]:
    if not platform:
        return set()
    value=platform.lower()
    tokens={value}
    for sep in ["+",",","/","|"]:
        parts=[]
        for t in tokens:
            parts += [x.strip() for x in t.split(sep) if x.strip()]
        tokens.update(parts)
    return tokens


def _platform_match(component_platforms: list[str], target: str | None) -> bool:
    if "Generic" in component_platforms:
        return True
    tokens=_platform_tokens(target)
    return any(p.lower() in tokens or any(p.lower() in t for t in tokens) for p in component_platforms)

@dataclass
class SystemBuilderEngine:
    """Turns a READY/DRAFT System specification into an engineering package.

    It plans reuse conservatively. A component marked DESIGN_SEED is never called
    reusable production code; it is only an adaptation/design candidate.
    """
    def __post_init__(self):
        self.library=component_library()

    def _decide_component(self, capability_id: str, target_platform: str | None) -> ComponentDecision:
        candidates=[c for c in self.library if capability_id in c.capability_ids and _platform_match(c.supported_platforms,target_platform)]
        if not candidates:
            return ComponentDecision(capability_id=capability_id, decision="CREATE_NEW", rationale="No explicit compatible component exists in the current library.")
        rank={"DEMO_VERIFIED":3,"DEMO_PARTIAL":2,"DESIGN_SEED":1}
        c=sorted(candidates,key=lambda x:rank[x.maturity],reverse=True)[0]
        if c.maturity=="DEMO_VERIFIED":
            decision="REUSE_CANDIDATE"; rationale="Explicit capability/platform match to a component exercised in the current demo; engineering validation is still required before production reuse."
        else:
            decision="ADAPT_CANDIDATE"; rationale=("Explicit capability/platform match, but the component is only partially verified." if c.maturity=="DEMO_PARTIAL" else "A reusable design pattern exists, but no verified production component exists yet.")
        return ComponentDecision(capability_id=capability_id,component_id=c.component_id,decision=decision,rationale=rationale,maturity=c.maturity)

    def _tasks(self, spec: SolutionSpecification, decisions: list[ComponentDecision]) -> list[BuildTask]:
        tasks=[]
        tasks.append(BuildTask(task_id="BT-001",phase="DESIGN",title="Freeze implementation contract",description="Resolve remaining TBDs, confirm target platform, roles, data entities, integrations and security constraints before production build.",status="BLOCKED" if spec.status!="READY_FOR_BUILD" else "PLANNED"))
        build_ids=[]
        i=2
        for d in decisions:
            title={"REUSE_CANDIDATE":"Validate and reuse","ADAPT_CANDIDATE":"Adapt component/pattern","CREATE_NEW":"Build new component","TBD":"Resolve component strategy"}[d.decision]
            tid=f"BT-{i:03d}"; i+=1; build_ids.append(tid)
            tasks.append(BuildTask(task_id=tid,phase="BUILD",title=f"{title}: {d.capability_id}",description=d.rationale,source_capability_ids=[d.capability_id],depends_on=["BT-001"]))
        integ=[]
        for integration in spec.integrations:
            tid=f"BT-{i:03d}"; i+=1; integ.append(tid)
            tasks.append(BuildTask(task_id=tid,phase="INTEGRATE",title=f"Implement integration: {integration.name}",description=f"{integration.source_system or 'TBD'} → {integration.target_system or 'TBD'} using {integration.method or 'TBD'}; auth={integration.auth_method or 'TBD'}. Cannot be production-ready while status={integration.status}.",depends_on=build_ids or ["BT-001"],status="BLOCKED" if integration.status=="TBD" else "PLANNED"))
        test_id=f"BT-{i:03d}"; i+=1
        tasks.append(BuildTask(task_id=test_id,phase="TEST",title="Execute acceptance and failure-path tests",description="Implement and execute all Solution Specification acceptance tests plus idempotency, retry, permissions, logging and negative-path tests.",source_capability_ids=[c.get("capability_id") for c in spec.capabilities if c.get("scenario_status")=="INCLUDED"],depends_on=(build_ids+integ) or ["BT-001"]))
        deploy_id=f"BT-{i:03d}"; i+=1
        tasks.append(BuildTask(task_id=deploy_id,phase="DEPLOY",title="Deploy with rollback and observability",description="Deploy only after acceptance, security/risk and ownership checks pass. Record configuration, version and rollback path.",depends_on=[test_id],status="BLOCKED" if spec.status!="READY_FOR_BUILD" else "PLANNED"))
        tasks.append(BuildTask(task_id=f"BT-{i:03d}",phase="HANDOVER",title="Handover and operationalize",description="Deliver runbook, ownership/admin handover, support boundaries and known limitations.",depends_on=[deploy_id]))
        return tasks

    def plan(self, spec: SolutionSpecification, request: SystemBuilderRequest | None=None) -> SystemBuildPlan:
        request=request or SystemBuilderRequest()
        if spec.status=="BLOCKED_NOT_SYSTEM": status="BLOCKED_NOT_SYSTEM"
        elif spec.status!="READY_FOR_BUILD": status="DRAFT_SPEC_NOT_READY"
        else: status="READY_FOR_ENGINEERING"
        included=[c for c in spec.capabilities if c.get("scenario_status")=="INCLUDED"]
        decisions=[self._decide_component(c["capability_id"],spec.deployment.get("target_platform") or spec.target_state_summary.get("target_platform")) for c in included]
        tasks=self._tasks(spec,decisions)
        return SystemBuildPlan(
            build_plan_id=f"BUILD-{stable_hash({'spec':spec.specification_id,'req':request.model_dump(mode='json')})[:12]}",
            specification_id=spec.specification_id,engagement_id=spec.engagement_id,status=status,
            target_platform=spec.deployment.get("target_platform") or spec.target_state_summary.get("target_platform"),
            component_decisions=decisions,tasks=tasks,
            required_new_components=[d.capability_id for d in decisions if d.decision=="CREATE_NEW"],
            reuse_candidates=[d.component_id for d in decisions if d.decision=="REUSE_CANDIDATE" and d.component_id],
            adaptation_candidates=[d.component_id for d in decisions if d.decision=="ADAPT_CANDIDATE" and d.component_id],
            implementation_constraints=list(spec.deployment.get("constraints",[]))+list(request.additional_constraints),
            acceptance_test_ids=[t.test_id for t in spec.acceptance_tests],
            source_trace={"specification_id":spec.specification_id,"spec_status":spec.status,"spec_generator":spec.source_trace.get("generator_version"),"component_library_version":COMPONENT_LIBRARY_VERSION},
        )

    def _build_prompt(self,spec:SolutionSpecification,plan:SystemBuildPlan,request:SystemBuilderRequest)->str:
        return f"""# AUNEA System Build Prompt\n\n## Contract\nImplement **{request.implementation_name or spec.process_name}** strictly from Solution Specification `{spec.specification_id}` and build plan `{plan.build_plan_id}`.\n\n## Non-negotiable rules\n- Do not change recommendation, economics, risk, pricing or scope.\n- Do not invent missing requirements. Preserve unresolved items as TBD and stop when they block safe implementation.\n- Do not embed credentials/secrets. Use environment variables or the target platform secret mechanism.\n- Implement idempotency, retries/fallbacks, logging, permissions and audit behavior defined by the specification.\n- Client retains reasonable ownership of production accounts/data/environment.\n- Every included capability must map to at least one acceptance test.\n\n## Target\n- Platform: {plan.target_platform or 'TBD'}\n- Functional level: {spec.functional_level_id}\n- AI level: {spec.ai_level_id}\n- Product: {spec.product_id}\n\n## Capabilities\n""" + "\n".join(f"- {c.get('capability_id')}: {c.get('name')} [{c.get('scenario_status')}]" for c in spec.capabilities) + "\n\n## Component plan\n" + "\n".join(f"- {d.capability_id}: {d.decision} {d.component_id or ''} — {d.rationale}" for d in plan.component_decisions) + "\n\n## Integrations\n" + ("\n".join(f"- {i.name}: {i.source_system or 'TBD'} -> {i.target_system or 'TBD'} / {i.method or 'TBD'} / {i.status}" for i in spec.integrations) or "- None specified") + "\n\n## Acceptance tests\n" + "\n".join(f"- {t.test_id}: {t.requirement}" for t in spec.acceptance_tests) + "\n"

    def _runbook(self,spec:SolutionSpecification,plan:SystemBuildPlan)->str:
        return "# Operational Runbook\n\n" + f"Specification: `{spec.specification_id}`  \nBuild plan: `{plan.build_plan_id}`  \nTarget platform: {plan.target_platform or 'TBD'}\n\n## Ownership\n" + ("\n".join(f"- {r.role_name}: {', '.join(r.responsibilities) or 'TBD'}" for r in spec.roles) or "- TBD") + "\n\n## Monitoring and logs\n" + "\n".join(f"- {x}" for x in spec.security_logging.get("logging_requirements",[])) + "\n\n## Error handling\n" + "\n".join(f"- {x}" for x in spec.error_handling_idempotency.get("requirements",[])) + "\n\n## Deployment\n" + "\n".join(f"- {x}" for x in spec.deployment.get("constraints",[]) or ["No additional deployment constraints recorded."]) + "\n\n## Support / handover\n" + "\n".join(f"- {x}" for x in spec.handover_support.get("handover_requirements",[]) + spec.handover_support.get("support_requirements",[])) + "\n\n## Known blockers\n" + ("\n".join(f"- {x}" for x in spec.missing_information) or "- None recorded") + "\n"

    def package(self,spec:SolutionSpecification,request:SystemBuilderRequest|None=None)->SystemBuildPackage:
        request=request or SystemBuilderRequest(); plan=self.plan(spec,request)
        prompt=self._build_prompt(spec,plan,request) if request.include_build_prompt else None
        runbook=self._runbook(spec,plan) if request.include_runbook else None
        scaffold={}
        if request.include_scaffold:
            scaffold={
                "README.md": f"# {request.implementation_name or spec.process_name}\n\nGenerated from `{spec.specification_id}` / `{plan.build_plan_id}`.\n\nStatus: **{plan.status}**\n",
                "docs/solution_specification.json": json.dumps(spec.model_dump(mode='json'),ensure_ascii=False,indent=2),
                "docs/build_plan.json": json.dumps(plan.model_dump(mode='json'),ensure_ascii=False,indent=2),
                "docs/build_prompt.md": prompt or "",
                "docs/runbook.md": runbook or "",
                "tests/acceptance.md": "# Acceptance tests\n\n"+"\n".join(f"## {t.test_id}\n- Requirement: {t.requirement}\n- Given: {t.given}\n- When: {t.when}\n- Then: {t.then}\n" for t in spec.acceptance_tests),
                "config/config.example.json": json.dumps({"environments":request.environment_names,"target_platform":plan.target_platform,"secret_values":"DO_NOT_STORE_HERE"},indent=2),
                ".gitignore": ".env\n.env.*\n*.db\n__pycache__/\n.pytest_cache/\n",
            }
        return SystemBuildPackage(package_id=f"PKG-{stable_hash({'plan':plan.build_plan_id,'spec':spec.specification_id})[:12]}",build_plan=plan,build_prompt_markdown=prompt,runbook_markdown=runbook,scaffold_files=scaffold,component_library_version=COMPONENT_LIBRARY_VERSION)
# [AUNEA-BE-SYSTEM-BUILDER-010] END
