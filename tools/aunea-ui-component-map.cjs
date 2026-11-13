// [AUNEA-UI-COMPONENT-MAP-394] START — Technical correspondence for DS-001..DS-020
// SOURCE: CATALOGO_COMPONENTES_AUNEA v1.0; DESIGN_SYSTEM_AUNEA v1.0.
// PURPOSE: One mapping of documented component names to existing live CSS candidates.
// NOTE: This metadata is not a business source or a runtime module; consumer analysis is heuristic.
'use strict';
const catalogs={
  'DS-001':{name:'Hero / portada',selector:['page-head','hero','hero-actions']},
  'DS-002':{name:'Encabezado de sección',selector:['page-head','section-head','aunea-ui-section-title','tobe-stage-heading']},
  'DS-003':{name:'Texto',selector:['field-help','aunea-ui-section-caption','tobe-muted','notice']},
  'DS-004':{name:'Card estándar',selector:['card','result-item','aunea-ui-work-surface','tobe-global-card']},
  'DS-005':{name:'KPI',selector:['metric','scenario-kpi','kpi']},
  'DS-006':{name:'Callout',selector:['notice','tobe-alert']},
  'DS-007':{name:'Riesgo / warning',selector:['warn','danger-text','notice']},
  'DS-008':{name:'Tabla',selector:['data-table','table-wrap','table-foot']},
  'DS-009':{name:'Gráfico',selector:['chart','bar-chart','graph']},
  'DS-010':{name:'Comparativa',selector:['scenario','compare','comparison']},
  'DS-011':{name:'Before / after',selector:['before-after','asis','tobe']},
  'DS-012':{name:'Proceso',selector:['flow-canvas','flow-step','process-layout']},
  'DS-013':{name:'Timeline / roadmap',selector:['timeline','stage-nav','stage-step']},
  'DS-014':{name:'Diagrama',selector:['process-map','flow-canvas','tobe-graph']},
  'DS-015':{name:'Testimonial',selector:['quote','testimonial']},
  'DS-016':{name:'Pricing',selector:['pricing','quote','price']},
  'DS-017':{name:'Acción / CTA',selector:['btn','btn-primary','btn-outline','aunea-ui-button-row']},
  'DS-018':{name:'Metadata / footer',selector:['page-meta','sidebar-foot','table-foot']},
  'DS-019':{name:'Estado / chip',selector:['badge','chip','status','tag']},
  'DS-020':{name:'Formulario y controles',selector:['field','form-grid','aunea-select','input','compound-control']}
};
module.exports=Object.freeze(catalogs);
// [AUNEA-UI-COMPONENT-MAP-394] END
