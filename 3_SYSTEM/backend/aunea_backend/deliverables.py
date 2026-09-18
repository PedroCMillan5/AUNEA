# [AUNEA-BE-DELIVERABLES-010] START — Deliverables Engine
# PURPOSE: Render a selected ScenarioResult + DiagnosticOutput into client-facing summary/report/proposal
# artifacts, with internal trace artifacts generated only when explicitly requested. Never recomputes engines.
# SOURCE: DEC-034; DEC-041; L8 Client Experience & Deliverables; registry reference labels.
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
from .registry import rule_bundle_version, table
from .utils import stable_hash


def _fmt_eur(value):
    if value is None: return "No calculado"
    return f"{value:,.0f} €".replace(",", ".")

def _fmt_hours(value):
    if value is None: return "No calculado"
    return f"{value:,.1f} h".replace(",", ".")

def _status_value(x: Any) -> str:
    return getattr(x, "value", x) if x is not None else ""

def _ref_label(table_name: str, id_field: str, raw_id: str | None, *label_fields: str, missing: str="No disponible") -> str:
    if not raw_id: return "—"
    for row in table(table_name):
        if str(row.get(id_field)) == str(raw_id):
            for field in label_fields:
                if row.get(field) not in (None, ""):
                    return str(row.get(field))
            return missing
    return missing

def _pain_label(pid):
    return _ref_label("REF_PAIN","Pain_ID",pid,"Pain_Name","Label_ES","Pain_Pattern","Name",missing="Hallazgo")

def _quote_status_es(status):
    return {"READY":"Lista","PROVISIONAL":"Provisional","MANUAL_REVIEW":"Revisión manual","BLOCKED":"Bloqueada"}.get(_status_value(status),"No disponible")

def _risk_level_es(level):
    return {"R0":"Riesgo nulo","R1":"Riesgo bajo","R2":"Riesgo medio","R3":"Riesgo crítico","UNKNOWN":"Sin evaluar"}.get(_status_value(level),"No disponible")

def _coverage_es(value):
    return {"RESOLVED":"Resuelto","PARTIAL":"Parcial","UNRESOLVED":"No resuelto","NOT_APPLICABLE":"No aplica"}.get(_status_value(value),"No disponible")

def _pain_state_es(value):
    return {"CONFIRMED":"Confirmado","INDICATED":"Indicado","INSUFFICIENT_EVIDENCE":"Evidencia insuficiente","NOT_DETECTED":"No detectado"}.get(_status_value(value),"No disponible")

def _confidence_es(value):
    return {"HIGH":"Alta","MEDIUM":"Media","LOW":"Baja","UNKNOWN":"Desconocida"}.get(_status_value(value),"No disponible")

@dataclass
class DeliverablesEngine:
    def _selected_scenario(self, diagnostic: DiagnosticOutput, request: DeliverableRequest) -> ScenarioResult:
        return request.selected_scenario or diagnostic.optimal_scenario

    def _readiness(self, diagnostic: DiagnosticOutput, scenario: ScenarioResult):
        issues=[]
        if scenario.status == "BLOCKED": issues.append("El escenario seleccionado está bloqueado.")
        if scenario.quote.status == QuoteStatus.BLOCKED: issues.append("La cotización seleccionada está bloqueada.")
        if not diagnostic.pain_results: issues.append("No hay hallazgos suficientes para emitir un informe completo.")
        if issues: return "BLOCKED_SCENARIO_NOT_SELECTABLE", issues
        if scenario.quote.status in {QuoteStatus.PROVISIONAL, QuoteStatus.MANUAL_REVIEW}:
            return "DRAFT", [f"La cotización está en estado {_quote_status_es(scenario.quote.status)} y requiere revisión antes de emisión final."]
        return "READY", []

    def _pain_summary_md(self, diagnostic, scenario):
        lines=["| Hallazgo | Estado | Cobertura | Confianza |","|---|---:|---:|---:|"]
        for pain in diagnostic.pain_results:
            lines.append(f"| {_pain_label(pain.pain_id)} | {_pain_state_es(pain.state)} | {_coverage_es(scenario.coverage_by_pain.get(pain.pain_id))} | {_confidence_es(pain.confidence)} |")
        return "\n".join(lines)

    def _economics_md(self, diagnostic, scenario):
        b,s=diagnostic.economic_result,scenario.economics
        return "\n".join([
            "| Métrica | Situación actual | Escenario seleccionado |","|---|---:|---:|",
            f"| Trabajo activo | {_fmt_hours(b.annual_active_hours)} | {_fmt_hours(s.annual_active_hours)} |",
            f"| Espera | {_fmt_hours(b.annual_wait_hours)} | {_fmt_hours(s.annual_wait_hours)} |",
            f"| Valor de capacidad | {_fmt_eur(b.capacity_value_eur_annual)} | {_fmt_eur(s.capacity_value_eur_annual)} |",
            f"| Pérdida directa / evitable | {_fmt_eur(b.direct_loss_eur_annual)} | {_fmt_eur(s.direct_loss_eur_annual)} |",
            f"| Ahorro de caja realizado | {_fmt_eur(b.realized_cash_saving_eur_annual)} | {_fmt_eur(s.realized_cash_saving_eur_annual)} |",
        ])

    def _quote_md(self, scenario):
        q=scenario.quote
        product=_ref_label("REF_PRODUCT","Product_ID",q.product_id,"Product_Name","Name",missing="No disponible") if q.product_id else "Sin producto de implementación"
        option=_ref_label("REF_PRODUCT_OPTION","Product_Option_ID",q.product_option_id,"Option_Name","Name",missing="No disponible") if q.product_option_id else "No aplica"
        return f"""| Concepto | Valor |
|---|---:|
| Producto | {product} |
| Configuración | {option} |
| One-off | {_fmt_eur(q.one_off_eur)} |
| Recurrente mensual | {_fmt_eur(q.recurring_monthly_eur)} |
| Coste de herramientas mensual | {_fmt_eur(q.tool_cost_monthly_eur)} |
| TCO 12 meses | {_fmt_eur(q.tco_12m_eur)} |
| TCO 36 meses | {_fmt_eur(q.tco_36m_eur)} |
| Estado | {_quote_status_es(q.status)} |"""

    def _summary(self, diagnostic, scenario, request, status, issues):
        action=_ref_label("REF_ACTION","Action_ID",diagnostic.recommendation.action_id,"Name")
        n=_ref_label("REF_LEVEL_FUNC","Functional_Level_ID",scenario.functional_level_id,"Name")
        i=_ref_label("REF_LEVEL_AI","AI_Level_ID",scenario.ai_level_id,"Name")
        product=_ref_label("REF_PRODUCT","Product_ID",scenario.quote.product_id,"Product_Name","Name") if scenario.quote.product_id else "Sin producto de implementación"
        return f"""# Resumen de diagnóstico AUNEA — {request.client_name or 'Cliente'}

## Decisión
- Proceso: {request.process_name or 'Proceso analizado'}
- Escenario: {scenario.scenario_name or 'Recomendación'}
- Acción recomendada: {action}
- Nivel funcional: {n}
- Nivel de inteligencia: {i}
- Riesgo residual: {_risk_level_es(scenario.risk.residual_level)}

## Visión comercial
- Producto: {product}
- One-off: **{_fmt_eur(scenario.quote.one_off_eur)}**
- TCO 12 meses: **{_fmt_eur(scenario.quote.tco_12m_eur)}**
- Estado de la cotización: {_quote_status_es(scenario.quote.status)}

## Notas de revisión
{chr(10).join('- '+x for x in issues) if issues else '- Sin bloqueos registrados para este pack.'}"""

    def _report(self, diagnostic, scenario, request):
        action=_ref_label("REF_ACTION","Action_ID",diagnostic.recommendation.action_id,"Name")
        n=_ref_label("REF_LEVEL_FUNC","Functional_Level_ID",diagnostic.recommendation.functional_level_id,"Name")
        i=_ref_label("REF_LEVEL_AI","AI_Level_ID",diagnostic.recommendation.ai_level_id,"Name")
        return f"""# Informe de diagnóstico AUNEA

## 1. Alcance
- Cliente: {request.client_name or 'No indicado'}
- Proceso: {request.process_name or 'Proceso analizado'}

## 2. Hallazgos y cobertura
{self._pain_summary_md(diagnostic, scenario)}

## 3. Visión económica
{self._economics_md(diagnostic, scenario)}

Trabajo activo, espera, valor de capacidad, pérdida directa y ahorro de caja son categorías separadas y no se agregan como un único ahorro universal.

## 4. Riesgo
- Riesgo inherente: {_risk_level_es(diagnostic.risk_result.inherent_level)}
- Riesgo residual: {_risk_level_es(scenario.risk.residual_level)}

## 5. Recomendación
- Acción: {action}
- Nivel funcional: {n}
- Nivel de inteligencia: {i}"""

    def _proposal(self, diagnostic, scenario, request):
        action=_ref_label("REF_ACTION","Action_ID",scenario.action_id,"Name")
        n=_ref_label("REF_LEVEL_FUNC","Functional_Level_ID",scenario.functional_level_id,"Name")
        i=_ref_label("REF_LEVEL_AI","AI_Level_ID",scenario.ai_level_id,"Name")
        return f"""# Propuesta AUNEA — borrador

## Servicio propuesto
{_ref_label('REF_PRODUCT','Product_ID',scenario.quote.product_id,'Product_Name','Name') if scenario.quote.product_id else 'Sin producto de implementación'}

## Base de alcance
- Acción: {action}
- Nivel funcional: {n}
- Nivel de inteligencia: {i}

## Inversión
{self._quote_md(scenario)}

## Siguiente paso
{request.next_step or 'Revisar el escenario seleccionado y confirmar el alcance antes de avanzar.'}"""

    def _appendix(self, diagnostic, scenario):
        return f"""# Apéndice interno AUNEA

- Engagement ID: `{diagnostic.engagement_id}`
- Rule bundle: `{diagnostic.rule_bundle_version}`
- Input snapshot hash: `{diagnostic.input_snapshot_hash}`
- Scenario ID: `{scenario.scenario_id}`
- Action ID: `{scenario.action_id}`
- Functional level ID: `{scenario.functional_level_id or 'n/a'}`
- AI level ID: `{scenario.ai_level_id or 'n/a'}`
- Product ID: `{scenario.quote.product_id or 'n/a'}`
- Product option ID: `{scenario.quote.product_option_id or 'n/a'}`
- Pack source hash: `{stable_hash(diagnostic.model_dump(mode='json'))}`

Este apéndice es de uso interno y no forma parte de la versión cliente."""

    def _html(self,title,md):
        body="\n".join(f"<p>{escape(line)}</p>" for line in md.splitlines())
        return f"<!doctype html><html><head><meta charset='utf-8'><title>{escape(title)}</title></head><body><main>{body}</main></body></html>"

    def generate(self, diagnostic: DiagnosticOutput, request: DeliverableRequest | None=None) -> DeliverablePack:
        request=request or DeliverableRequest(); scenario=self._selected_scenario(diagnostic,request)
        status,issues=self._readiness(diagnostic,scenario)
        summary=self._summary(diagnostic,scenario,request,status,issues)
        report=self._report(diagnostic,scenario,request)
        proposal=self._proposal(diagnostic,scenario,request)
        artifacts=[
            DeliverableArtifact(name="executive_summary.md",media_type="text/markdown",content=summary),
            DeliverableArtifact(name="diagnostic_report.md",media_type="text/markdown",content=report),
            DeliverableArtifact(name="proposal_draft.md",media_type="text/markdown",content=proposal),
            DeliverableArtifact(name="diagnostic_report.html",media_type="text/html",content=self._html("AUNEA — Informe de diagnóstico",report)),
            DeliverableArtifact(name="proposal_draft.html",media_type="text/html",content=self._html("AUNEA — Propuesta",proposal)),
        ]
        if request.include_internal_appendix:
            appendix=self._appendix(diagnostic,scenario)
            snapshot={"diagnostic":diagnostic.model_dump(mode="json"),"selected_scenario":scenario.model_dump(mode="json"),"request":request.model_dump(mode="json"),"pack_status":status,"issues":issues}
            artifacts.extend([
                DeliverableArtifact(name="internal_trace_appendix.md",media_type="text/markdown",content=appendix),
                DeliverableArtifact(name="deliverable_snapshot.json",media_type="application/json",content=__import__('json').dumps(snapshot,ensure_ascii=False,indent=2)),
            ])
        return DeliverablePack(pack_id=f"DEL-{stable_hash({'engagement_id':diagnostic.engagement_id,'scenario_id':scenario.scenario_id,'status':status})[:12]}",engagement_id=diagnostic.engagement_id,selected_scenario_id=scenario.scenario_id,status=status,rule_bundle_version=rule_bundle_version(),created_at=datetime.now(timezone.utc).isoformat(),issues=issues,artifacts=artifacts)
# [AUNEA-BE-DELIVERABLES-010] END
