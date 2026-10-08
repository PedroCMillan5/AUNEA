// [AUNEA-DATA-PROCESS-SUGGESTIONS-010] START — Technical projection of Drive canonical v1.0
// SOURCE: AUNEA_PROCESS_SUGGESTION_RULES_CANONICAL v1.0, Drive ID 1vBnltfnWSwmZsE6Um3lBnocTKKXcJM4XIGWbKtRHz1A.
// UI/runtime code consumes these governed definitions; it must not invent additional inference rules.
const PROCESS_SUGGESTION_RULES=Object.freeze([
  {id:'PSR-001',type:'REUSE',target:'actor',source:['DF017','DF016','RT_PROCESS_STEP.Actor'],confidence:'HIGH'},
  {id:'PSR-002',type:'REUSE',target:'tool',source:['RT_PROCESS_STEP.Tool'],confidence:'HIGH'},
  {id:'PSR-003',type:'DERIVED',target:'inputs',source:['RT_PROCESS_STEP.Outputs'],confidence:'HIGH'},
  {id:'PSR-004',type:'DERIVED',target:'inputs',source:['DF014'],confidence:'HIGH'},
  {id:'PSR-005',type:'DERIVED',target:'communication_channels',source:['DF014'],confidence:'HIGH'},
  {id:'PSR-006',type:'DERIVED',target:'tool',source:['DF014'],confidence:'HIGH'},
  {id:'PSR-007',type:'INFERRED',target:'manual_actions',source:['DF014'],confidence:'MEDIUM',evidence:'EV07'},
  {id:'PSR-008',type:'DERIVED',target:'applies_to',source:['RT_PROCESS_STEP.Routing'],confidence:'HIGH'},
  {id:'PSR-009',type:'DERIVED',target:'applies_to',source:['RT_PROCESS_STEP.Exception_Path'],confidence:'HIGH'},
  {id:'PSR-010',type:'DERIVED',target:'decision_criteria',source:['DF020'],confidence:'HIGH'},
  {id:'PSR-011',type:'COHERENCE',target:'automation_state',source:['DF044','DF045'],confidence:'HIGH'},
  {id:'PSR-012',type:'COHERENCE',target:'outputs',source:['DF032','DF036'],confidence:'HIGH'},
  {id:'PSR-013',type:'DERIVED',target:'evidence',source:['UAT_CONTEXT'],confidence:'HIGH',evidence:'EV04'},
  {id:'PSR-014',type:'INFERRED',target:'evidence',source:['PROCESS_SUGGESTION_TRACE'],confidence:'HIGH',evidence:'EV07'}
]);
// [AUNEA-DATA-PROCESS-SUGGESTIONS-010] END
