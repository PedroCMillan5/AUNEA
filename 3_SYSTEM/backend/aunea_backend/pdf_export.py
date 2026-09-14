# [AUNEA-BE-DELIVERABLES-PDF-010] START — Real PDF deliverable export
# PURPOSE: Render a downloadable, AUNEA-branded PDF file (application/pdf) from an already-computed
#   DiagnosticOutput + selected ScenarioResult — the same objects DeliverablesEngine already reads.
#   Never recalculates Pain/Economics/Risk/Recommendation/Pricing/Scenario: pure formatting, identical
#   "never recomputes engine results" contract as DeliverablesEngine (deliverables.py).
# SOURCE: DEC-041 ("Los entregables no recalculan reglas."); DeliverablesEngine content structure
#   (deliverables.py); REF_ACTION/REF_LEVEL_FUNC/REF_LEVEL_AI (registry.py) for the same label
#   resolution the frontend applies (app-results.js actionLabel/funcLevelLabel/aiLevelLabel).
# INPUTS: DiagnosticOutput, optional DeliverableRequest (selected_scenario/client_name/process_name/
#   next_step).
# OUTPUTS: PDF file bytes.
# SIDE_EFFECTS: none (pure rendering, no engine calls, no state writes).
# CHANGE_RISK: HIGH.
from __future__ import annotations
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable,
)

from .models import DiagnosticOutput, ScenarioResult
from .deliverable_models import DeliverableRequest
from .registry import table as registry_table

# AUNEA Solutions identity: charcoal + gold, warm white surfaces — no invented palette.
CHARCOAL = colors.HexColor("#1E1E1E")
GOLD = colors.HexColor("#D4AF37")
WARM_WHITE = colors.HexColor("#FAFAF8")
PEARL = colors.HexColor("#E6E6E6")
MUTED = colors.HexColor("#5D666D")


# Mirrors app-i18n-labels-v1.js's I18N_LABELS_ES exactly — same enums, same already-approved Spanish
# copy, not a new translation. Client-facing deliverable, so state/status enums read in Spanish here too.
_ES_LABELS = {
    "pain_state": {"CONFIRMED": "Confirmado", "INDICATED": "Indicado", "INSUFFICIENT_EVIDENCE": "Evidencia insuficiente", "NOT_DETECTED": "No detectado"},
    "confidence": {"HIGH": "Alta", "MEDIUM": "Media", "LOW": "Baja", "UNKNOWN": "Desconocida"},
    "risk_level": {"R0": "Riesgo nulo", "R1": "Riesgo bajo", "R2": "Riesgo medio", "R3": "Riesgo crítico", "UNKNOWN": "Sin evaluar"},
    "risk_status": {"ASSESSED": "Evaluado", "CONTROL_GAP": "Brecha de control", "RISK_REASSESS_REQUIRED": "Requiere reevaluación", "UNKNOWN": "Sin evaluar"},
    "quote_status": {"READY": "Lista", "PROVISIONAL": "Provisional", "MANUAL_REVIEW": "Revisión manual", "BLOCKED": "Bloqueada"},
    "scenario_status": {"COMPUTED": "Calculado", "BLOCKED": "Bloqueado"},
    "scenario_type": {"OPTIMAL": "Óptimo", "ALTERNATIVE": "Alternativa"},
}


def _es(category: str, raw) -> str:
    value = _status_value(raw)
    return _ES_LABELS.get(category, {}).get(value, value)


def _fmt_eur(value: float | None) -> str:
    if value is None:
        return "No calculado"
    return f"{value:,.0f} €".replace(",", ".")


def _fmt_hours(value: float | None) -> str:
    if value is None:
        return "No calculado"
    return f"{value:,.1f} h".replace(",", ".")


def _status_value(x) -> str:
    if x is None:
        return "—"
    return getattr(x, "value", x)


def _lookup_name(table_name: str, id_field: str, raw_id: str | None) -> str:
    if not raw_id:
        return "—"
    for row in registry_table(table_name):
        if row.get(id_field) == raw_id:
            return row.get("Name", raw_id)
    return raw_id


def _selected_scenario(diagnostic: DiagnosticOutput, request: DeliverableRequest) -> ScenarioResult:
    return request.selected_scenario or diagnostic.optimal_scenario


class PDFExporter:
    """Renders the same content DeliverablesEngine already computes, as a real PDF file."""

    def export(self, diagnostic: DiagnosticOutput, request: DeliverableRequest | None = None) -> bytes:
        request = request or DeliverableRequest()
        scenario = _selected_scenario(diagnostic, request)
        styles = self._styles()
        buf = BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            topMargin=24 * mm, bottomMargin=20 * mm, leftMargin=22 * mm, rightMargin=22 * mm,
            title=f"AUNEA — {request.client_name or diagnostic.engagement_id}",
        )
        story: list = []
        story += self._cover(diagnostic, request, scenario, styles)
        story.append(PageBreak())
        story += self._section_findings(diagnostic, styles)
        story += self._section_economics(diagnostic, scenario, styles)
        story += self._section_risk(diagnostic, scenario, styles)
        story += self._section_recommendation(diagnostic, styles)
        story += self._section_scenario(scenario, styles)
        story += self._section_quote(scenario, styles)
        story += self._section_next_step(request, styles)
        doc.build(story, onFirstPage=self._footer, onLaterPages=self._footer)
        return buf.getvalue()

    def _footer(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(PEARL)
        canvas.setLineWidth(0.5)
        canvas.line(22 * mm, 14 * mm, doc.pagesize[0] - 22 * mm, 14 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(22 * mm, 10 * mm, "AUNEA Internal — documento generado, no editable")
        canvas.drawRightString(doc.pagesize[0] - 22 * mm, 10 * mm, f"Página {doc.page}")
        canvas.restoreState()

    def _styles(self) -> dict:
        return {
            "brand": ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=11, textColor=GOLD,
                                     letterSpacing=1.4, spaceAfter=10),
            "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=25, textColor=CHARCOAL,
                                     spaceAfter=8, leading=30),
            "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=12, textColor=MUTED,
                                        spaceAfter=4, leading=17),
            "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=14, textColor=CHARCOAL,
                                  spaceBefore=18, spaceAfter=8, alignment=TA_LEFT),
            "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, textColor=CHARCOAL,
                                    leading=14),
            "note": ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=8.5, textColor=MUTED,
                                    leading=12, spaceBefore=4),
        }

    def _gold_rule(self):
        return HRFlowable(width="100%", thickness=1.4, color=GOLD, spaceAfter=14)

    def _kv_table(self, rows: list[tuple[str, str]], col_widths=(55 * mm, 105 * mm)):
        data = [[Paragraph(f"<b>{k}</b>", self._styles()["body"]), Paragraph(v, self._styles()["body"])]
                for k, v in rows]
        t = Table(data, colWidths=list(col_widths))
        t.setStyle(TableStyle([
            ("LINEBELOW", (0, 0), (-1, -1), 0.4, PEARL),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        return t

    def _cover(self, diagnostic: DiagnosticOutput, request: DeliverableRequest, scenario: ScenarioResult, styles) -> list:
        return [
            Paragraph("AUNEA", styles["brand"]),
            Paragraph(request.client_name or diagnostic.engagement_id, styles["title"]),
            Paragraph(request.process_name or "Diagnóstico de proceso", styles["subtitle"]),
            Spacer(1, 10 * mm),
            self._gold_rule(),
            self._kv_table([
                ("Engagement", diagnostic.engagement_id),
                ("Paquete de reglas", diagnostic.rule_bundle_version),
                ("Escenario cotizado", scenario.scenario_name),
                ("Estado del escenario", _es("scenario_status", scenario.status)),
            ]),
        ]

    def _section_findings(self, diagnostic: DiagnosticOutput, styles) -> list:
        rows = [
            (p.pain_id, _es("pain_state", p.state), _es("confidence", p.confidence), p.rationale or "—")
            for p in diagnostic.pain_results
        ] or [("—", "—", "—", "Sin hallazgos detectados.")]
        data = [["Ref.", "Estado", "Confianza", "Racional"]] + [list(r) for r in rows]
        t = Table(data, colWidths=[16 * mm, 28 * mm, 24 * mm, 92 * mm])
        t.setStyle(self._table_style())
        return [Paragraph("Hallazgos", styles["h2"]), t]

    def _section_economics(self, diagnostic: DiagnosticOutput, scenario: ScenarioResult, styles) -> list:
        b, s = diagnostic.economic_result, scenario.economics
        data = [
            ["Métrica", "Situación actual", "Escenario cotizado"],
            ["Trabajo activo anual", _fmt_hours(b.annual_active_hours), _fmt_hours(s.annual_active_hours)],
            ["Espera anual", _fmt_hours(b.annual_wait_hours), _fmt_hours(s.annual_wait_hours)],
            ["Valor de capacidad", _fmt_eur(b.capacity_value_eur_annual), _fmt_eur(s.capacity_value_eur_annual)],
            ["Pérdida directa", _fmt_eur(b.direct_loss_eur_annual), _fmt_eur(s.direct_loss_eur_annual)],
            ["Ahorro de caja realizado", _fmt_eur(b.realized_cash_saving_eur_annual), _fmt_eur(s.realized_cash_saving_eur_annual)],
        ]
        t = Table(data, colWidths=[55 * mm, 42.5 * mm, 62.5 * mm])
        t.setStyle(self._table_style())
        return [
            Paragraph("Impacto económico", styles["h2"]), t,
            Paragraph("Trabajo activo, espera, capacidad, pérdida directa y ahorro de caja son categorías separadas; este documento no las combina en un único ahorro universal.", styles["note"]),
        ]

    def _section_risk(self, diagnostic: DiagnosticOutput, scenario: ScenarioResult, styles) -> list:
        return [
            Paragraph("Riesgo", styles["h2"]),
            self._kv_table([
                ("Riesgo inherente", _es("risk_level", diagnostic.risk_result.inherent_level)),
                ("Riesgo residual (escenario)", _es("risk_level", scenario.risk.residual_level)),
                ("Estado", _es("risk_status", scenario.risk.status)),
                ("Racional", diagnostic.risk_result.rationale or "—"),
            ]),
        ]

    def _section_recommendation(self, diagnostic: DiagnosticOutput, styles) -> list:
        r = diagnostic.recommendation
        return [
            Paragraph("Recomendación", styles["h2"]),
            self._kv_table([
                ("Acción", _lookup_name("REF_ACTION", "Action_ID", r.action_id)),
                ("Nivel funcional", _lookup_name("REF_LEVEL_FUNC", "Functional_Level_ID", r.functional_level_id)),
                ("Nivel de inteligencia", _lookup_name("REF_LEVEL_AI", "AI_Level_ID", r.ai_level_id)),
                ("Por qué", " · ".join(r.rationale) or "Sin racional adicional."),
            ]),
        ]

    def _section_scenario(self, scenario: ScenarioResult, styles) -> list:
        return [
            Paragraph("Escenario cotizado", styles["h2"]),
            self._kv_table([
                ("Nombre", scenario.scenario_name),
                ("Tipo", _es("scenario_type", scenario.scenario_type)),
                ("Acción", _lookup_name("REF_ACTION", "Action_ID", scenario.action_id)),
                ("Nivel funcional / IA", f"{_lookup_name('REF_LEVEL_FUNC', 'Functional_Level_ID', scenario.functional_level_id)} / {_lookup_name('REF_LEVEL_AI', 'AI_Level_ID', scenario.ai_level_id)}"),
            ]),
            Paragraph("La recomendación óptima no se sobrescribe al comparar escenarios.", styles["note"]),
        ]

    def _section_quote(self, scenario: ScenarioResult, styles) -> list:
        q = scenario.quote
        return [
            Paragraph("Cotización", styles["h2"]),
            self._kv_table([
                ("Producto", q.product_id or "Sin producto de implementación"),
                ("Opción", q.product_option_id or "n/a"),
                ("One-off", _fmt_eur(q.one_off_eur)),
                ("Recurrente mensual", _fmt_eur(q.recurring_monthly_eur)),
                ("TCO 12 meses", _fmt_eur(q.tco_12m_eur)),
                ("TCO 36 meses", _fmt_eur(q.tco_36m_eur)),
                ("Estado de la cotización", _es("quote_status", q.status)),
            ]),
        ]

    def _section_next_step(self, request: DeliverableRequest, styles) -> list:
        return [
            Paragraph("Siguiente paso", styles["h2"]),
            Paragraph(request.next_step or "Revisar el escenario cotizado y confirmar alcance antes de avanzar.", styles["body"]),
        ]

    def _table_style(self) -> TableStyle:
        return TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), CHARCOAL),
            ("TEXTCOLOR", (0, 0), (-1, 0), WARM_WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("LINEBELOW", (0, 0), (-1, -1), 0.4, PEARL),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
# [AUNEA-BE-DELIVERABLES-PDF-010] END
