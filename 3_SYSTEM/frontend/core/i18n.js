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


const BUSINESS_LABELS_ES = Object.freeze({
  pain: Object.freeze({
    P01:'Entrada fragmentada', P02:'Información faltante o incompleta', P03:'Reintroducción manual de datos',
    P04:'Responsabilidad poco clara', P05:'Enrutado o triaje lento', P06:'Incumplimiento de plazos o SLA',
    P07:'Cuellos de botella en aprobaciones', P08:'Caos de versiones o documentos', P09:'Baja visibilidad',
    P10:'Gestión débil de excepciones', P11:'Retrabajo o defectos de calidad', P12:'Seguimiento dependiente de la memoria',
    P13:'Inconsistencia en la calidad de los datos', P14:'Esfuerzo de consolidación de reporting',
    P15:'Fragmentación de herramientas', P16:'Falta de trazabilidad', P17:'Desequilibrio de capacidad o carga',
    P18:'Brechas de comunicación con cliente', P19:'Fuga de costes', P20:'Conocimiento concentrado en personas'
  }),
  action: Object.freeze({
    ACT00:'Sin intervención', ACT01:'Rediseño Advisory', ACT02:'Optimización de herramientas existentes',
    ACT03:'Construcción de sistema', ACT04:'Sistema + IA asistida', ACT05:'Sistema + agente acotado',
    ACT06:'Profundizar diagnóstico'
  }),
  functional_level: Object.freeze({
    N1:'Registro y trazabilidad', N2:'Automatización del flujo normal',
    N3:'Gestión de excepciones', N4:'Visibilidad y control'
  }),
  ai_level: Object.freeze({
    I0:'Reglas / sin IA', I1:'IA asistida', I2:'Agente acotado', I3:'Autonomía avanzada'
  })
});

function businessEngineLabel(category,id,fallback=''){
  const key=id==null?'':String(id),table=BUSINESS_LABELS_ES[category];
  if(table&&Object.prototype.hasOwnProperty.call(table,key))return table[key];
  return fallback||key;
}

function engineRationaleEs(kind,text){
  const raw=String(text||'').trim();
  if(!raw)return '';
  if(kind==='risk'){
    if(raw==='No risk assessment supplied.')return 'No se ha aportado una evaluación de riesgos.';
    const m=raw.match(/^Highest contextual risk=(R[0-3]|UNKNOWN); controls_present=(True|False)\.$/);
    if(m){
      const level=engineLabel('risk_level',m[1]);
      return m[2]==='True'
        ?`El nivel de riesgo contextual más alto es ${level}. Todos los riesgos evaluados tienen controles declarados.`
        :`El nivel de riesgo contextual más alto es ${level}. Hay riesgos evaluados sin controles declarados.`;
    }
  }
  if(kind==='recommendation'){
    const map={
      'Only indicated/incomplete evidence is available.':'Solo existe evidencia indicada o incompleta; hace falta profundizar antes de prescribir una solución.',
      'No material confirmed pain case.':'No hay un problema material confirmado que justifique una intervención.',
      'Process/role/control preconditions must be redesigned before technology.':'Antes de introducir tecnología deben rediseñarse proceso, responsabilidades o controles.',
      'Required capabilities can be supplied by existing owned tooling/configuration.':'Las capacidades necesarias pueden cubrirse mediante configuración o mejor uso de herramientas que el cliente ya posee.',
      'Bounded contextual action is required.':'Se requiere actuar sobre contexto dentro de un espacio de acciones explícitamente acotado.',
      'Unstructured interpretation/assistance is required while human retains decision authority.':'Se necesita interpretación o asistencia sobre información no estructurada, manteniendo la decisión en una persona.',
      'High-impact/critical AI risk requires specialist governance before implementation.':'El riesgo crítico o de alto impacto asociado a IA exige gobierno especializado antes de implementar.'
    };
    if(map[raw])return map[raw];
  }
  return raw;
}

// [AUNEA-FE-I18N-LABELS-010] END
