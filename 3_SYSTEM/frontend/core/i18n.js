// [AUNEA-FE-I18N-LABELS-010] START — Spanish labels for backend engine enums
// PURPOSE: Translate raw backend enum values (PainState, confidence, RiskResult levels/status, QuoteStatus) into Spanish business language for Bloque J read-only views. Never alters the underlying value, only its display.
// SOURCE: aunea_backend/models.py (PainState, RiskResult, QuoteStatus); aunea_backend/engines.py (RiskEngine.status/RISK_REASSESS_REQUIRED).
// INPUTS: category string, raw backend enum value.
// OUTPUTS: Spanish label string; falls back to the raw value (with a console.warn) when the value is not mapped.
// SIDE_EFFECTS: none.
// CHANGE_RISK: LOW.

const I18N_LABELS_ES = Object.freeze({
  pain_state: {
    CONFIRMED: 'Confirmado',
    INDICATED: 'Indicado',
    INSUFFICIENT_EVIDENCE: 'Evidencia insuficiente',
    NOT_DETECTED: 'No detectado'
  },
  confidence: {
    HIGH: 'Alta',
    MEDIUM: 'Media',
    LOW: 'Baja',
    UNKNOWN: 'Desconocida'
  },
  risk_level: {
    R0: 'Riesgo nulo',
    R1: 'Riesgo bajo',
    R2: 'Riesgo medio',
    R3: 'Riesgo crítico',
    UNKNOWN: 'Sin evaluar'
  },
  risk_status: {
    ASSESSED: 'Evaluado',
    CONTROL_GAP: 'Brecha de control',
    RISK_REASSESS_REQUIRED: 'Requiere reevaluación',
    UNKNOWN: 'Sin evaluar'
  },
  quote_status: {
    READY: 'Lista',
    PROVISIONAL: 'Provisional',
    MANUAL_REVIEW: 'Revisión manual',
    BLOCKED: 'Bloqueada'
  },
  evidence_quality: {
    MEASURED: 'Medido',
    CLIENT_DECLARED: 'Declarado por cliente',
    AUNEA_ESTIMATE: 'Estimación AUNEA',
    SPECIFIC_BENCHMARK: 'Benchmark específico',
    HYPOTHESIS: 'Hipótesis'
  }
});

function engineLabel(category, raw) {
  const value = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw;
  const table = I18N_LABELS_ES[category];
  if (table && Object.prototype.hasOwnProperty.call(table, value)) return table[value];
  if (typeof console !== 'undefined' && console.warn) console.warn(`engineLabel: sin mapa ES para categoría "${category}" valor "${value}"`);
  return value == null ? '' : String(value);
}
// [AUNEA-FE-I18N-LABELS-010] END
