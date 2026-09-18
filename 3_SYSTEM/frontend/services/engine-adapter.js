// [AUNEA-FE-ENGINE-ADAPTER-020] START — Canonical frontend → backend adapter
// PURPOSE: Convert captured facts and explicit consultant confirmations into EngagementInput; never calculate Pain/Economics/Risk/Recommendation/Pricing/Scenario in the browser.
// SOURCE: MAP_QUESTION_ENGINE_INPUT; RULE_RECOMMENDATION RR-03..RR-07; DEC-034/052; REQ-ENGN-001/REC-001/SCEN-001.
// INPUTS: Engagement capture, Process Steps, Frictions, evidence/economic/risk inputs and canonical internal gates.
// OUTPUTS: EngagementInput JSON for /v1/diagnose and /v1/scenarios/compare; optional AI orchestration contract.
// SIDE_EFFECTS: HTTP to AUNEA backend; stores returned structured outputs only.
// CHANGE_RISK: CRITICAL.

const ENGINE_GATE_CONTRACT=Object.freeze([
  {id:'RR-03',key:'process_design_first',label:'¿El proceso necesita rediseño de responsabilidades/reglas/controles antes de automatizar?',source:'RULE_RECOMMENDATION RR-03 / IN-R-09',maps:'process_design_preconditions_ok',invert:true},
  {id:'RR-04',key:'existing_tool_can_close',label:'¿Está evidenciado que herramientas ya disponibles cubren las capacidades esenciales mediante configuración/adopción?',source:'RULE_RECOMMENDATION RR-04 / IN-R-02',maps:'existing_tool_can_cover'},
  {id:'IN-R-12',key:'unstructured_interpretation_need',label:'¿Existe una necesidad material de interpretar/resumir/clasificar/recuperar/redactar contenido no estructurado?',source:'MAP_QUESTION_ENGINE_INPUT IN-R-12 / RULE_LEVEL_AI AI-01',maps:'requires_unstructured_ai_assistance'},
  {id:'IN-R-13',key:'bounded_action_space',label:'¿La tarea requiere seleccionar/proponer/ejecutar una acción dentro de un espacio explícitamente acotado?',source:'MAP_QUESTION_ENGINE_INPUT IN-R-13 / RULE_LEVEL_AI AI-02',maps:'requires_bounded_agent_action'},
  {id:'IN-R-11',key:'management_visibility_need',label:'¿El resultado requiere una capa de gestión de carga, aging, cuellos de botella, excepciones o rendimiento?',source:'MAP_QUESTION_ENGINE_INPUT IN-R-11 / RULE_LEVEL_FUNC FL-04',maps:'requires_management_visibility'}
]);
function engineGates(e){e.engineGates=e.engineGates||{};return e.engineGates}
function gateResolved(g){return g==='YES'||g==='NO'}
function gateBool(g){return g==='YES'}
function inferGateSuggestion(contract,e){const fr=new Set(activeFrictions(e).map(x=>x.friction_type)),out=new Set(normalizeArray(e.answers?.DF086));if(contract.key==='process_design_first'&&(fr.has('P04')||fr.has('P10')))return'YES';if(contract.key==='management_visibility_need'&&(out.has('VISIBILITY')||fr.has('P09')||fr.has('P14')||fr.has('P17')))return'YES';return''}
function unresolvedEngineGates(e){const g=engineGates(e);return ENGINE_GATE_CONTRACT.filter(c=>!gateResolved(g[c.key]))}
function openEngineGateReview(){const e=currentEng(),g=engineGates(e);const body=`<div class="notice info"><strong>Confirmación del consultor antes de calcular</strong><br>Estas respuestas son inputs del contrato canónico ya gobernado; no son preguntas al cliente ni resultados calculados por el navegador.</div><div class="form-grid">${ENGINE_GATE_CONTRACT.map(c=>{const suggested=inferGateSuggestion(c,e);return `<div class="field full"><label>${esc(c.label)}</label><select data-engine-gate="${c.key}"><option value="">Pendiente de confirmar</option><option value="YES" ${(g[c.key]||suggested)==='YES'?'selected':''}>Sí</option><option value="NO" ${(g[c.key]||suggested)==='NO'?'selected':''}>No</option></select><div class="field-help"><span class="canonical-id">${c.id}</span> ${esc(c.source)}${suggested&&!g[c.key]?' · sugerencia desde captura; requiere confirmación':''}</div></div>`}).join('')}</div>`;openModal('Confirmación del consultor antes de calcular',body,()=>{document.querySelectorAll('[data-engine-gate]').forEach(x=>g[x.dataset.engineGate]=x.value);if(unresolvedEngineGates(e).length)return toast('Confirma los cinco inputs canónicos antes de calcular.');e.updatedAt=now();markDirty('Inputs canónicos de Recommendation confirmados por el consultor');closeModal();runDiagnosis();},'Confirmar y calcular')}
function evidenceTypeBackend(v){return ({EV01:'MEASURED',EV02:'CLIENT_DECLARED',EV03:'AUNEA_ESTIMATE',EV04:'HYPOTHESIS',EV05:'SPECIFIC_BENCHMARK',EV06:'AUNEA_ESTIMATE',EV07:'AUNEA_ESTIMATE',MEASURED:'MEASURED',CLIENT_DECLARED:'CLIENT_DECLARED',AUNEA_ESTIMATE:'AUNEA_ESTIMATE',SPECIFIC_BENCHMARK:'SPECIFIC_BENCHMARK',HYPOTHESIS:'HYPOTHESIS'})[v]||'CLIENT_DECLARED'}
function normalizeEconomicInputs(e){return (e.economicInputs||[]).map(x=>({pain_id:x.pain_id||null,driver_id:x.driver_id,annual_active_hours:x.annual_active_hours==null?null:Number(x.annual_active_hours),annual_wait_hours:x.annual_wait_hours==null?null:Number(x.annual_wait_hours),capacity_cost_rate_eur_hour:x.capacity_cost_rate_eur_hour==null?null:Number(x.capacity_cost_rate_eur_hour),direct_loss_eur_annual:x.direct_loss_eur_annual==null?null:Number(x.direct_loss_eur_annual),current_tool_cost_eur_annual:x.current_tool_cost_eur_annual==null?null:Number(x.current_tool_cost_eur_annual),realized_cash_saving_eur_annual:x.realized_cash_saving_eur_annual==null?null:Number(x.realized_cash_saving_eur_annual),evidence_type:evidenceTypeBackend(x.evidence_type),deduplication_key:x.deduplication_key||null})).filter(x=>x.driver_id)}
function normalizeRiskInputs(e){return (e.risks||[]).map(r=>({category:r.category||'RC01',likelihood_1_5:Math.max(1,Math.min(5,Number(r.likelihood_1_5||1))),impact_1_5:Math.max(1,Math.min(5,Number(r.impact_1_5||1))),reversible:r.reversible!==false,sensitive_or_high_impact:!!r.sensitive_or_high_impact,material_financial_or_compliance:!!r.material_financial_or_compliance,critical_trigger:!!r.critical_trigger,controls_present:r.controls_present!==false,description:r.description||null}))}
function buildBackendPayload(engagement){
  const e=typeof engagementOfRecord==='function'?engagementOfRecord(engagement):engagement;
  const evidence=[],painSignals=[],fmap=Object.fromEntries(schema.friction_pain_map.map(x=>[x.Friction_Type_ID,x.Pain_ID]));
  activeFrictions(e).forEach(f=>{const signal=String(f.observable_signal||'').trim(),evid=`EV-${f.id}`,etype=evidenceTypeBackend(f.evidence_type),hasConcrete=!!signal&&['MEASURED','CLIENT_DECLARED'].includes(etype);if(signal)evidence.push({evidence_id:evid,type:etype,description:signal,source:'AUNEA Internal · fricción vinculada al AS-IS'});painSignals.push({pain_id:fmap[f.friction_type]||f.derived_pain_id||f.friction_type,direct_mechanism_present:!!f.friction_type,concrete_evidence_present:hasConcrete,signal_present:!!signal,evidence_ids:signal?[evid]:[],rationale:f.client_label||signal||null})});
  const g=engineGates(e),payload={engagement_id:e.id,process_instance_id:`PROC-${e.id}`,process_name:e.answers?.DF011||e.processName||e.title,evidence,pains:[],pain_signals:painSignals,questionnaire_answers:{...(e.answers||{}),_answer_details:e.answerDetails||{},_process_steps:activeSteps(e),_frictions:activeFrictions(e),_engine_gate_trace:Object.fromEntries(ENGINE_GATE_CONTRACT.map(c=>[c.id,g[c.key]||'UNRESOLVED']))},economics:normalizeEconomicInputs(e),risks:normalizeRiskInputs(e),existing_tool_can_cover:gateBool(g.existing_tool_can_close),process_design_preconditions_ok:!gateBool(g.process_design_first),requires_unstructured_ai_assistance:gateBool(g.unstructured_interpretation_need),requires_bounded_agent_action:gateBool(g.bounded_action_space),requires_management_visibility:gateBool(g.management_visibility_need)};
  if(e.commercialScope)payload.commercial_scope={...e.commercialScope};
  return payload;
}
async function runDiagnosis(){const e=currentEng();if(!e)return;if(!hasConfirmedSnapshot(e))return toast('Confirma el AS-IS en PG09 antes de calcular en Trabajo interno.');if(!state.backendOnline&&!(await checkBackend())){state.activePage='resultados';render();toast('Backend no conectado: no se publican resultados oficiales.');return}const gaps=canonicalMissingRequired(e);if(gaps.length){state.activePage='resultados';render();toast(`Captura incompleta: ${gaps.slice(0,5).join(', ')}`);return}if(unresolvedEngineGates(e).length){openEngineGateReview();return}
  ['runDiag','runDiagHeader'].forEach(bid=>{const b=document.getElementById(bid);if(b){b.disabled=true;b.textContent='Calculando…'}});
  try{const r=await fetch(`${state.backendUrl}/v1/diagnose`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(buildBackendPayload(e))});if(!r.ok)throw new Error(await r.text());const out=await r.json();if(!out.recommendation||!out.quote||!out.optimal_scenario)throw new Error('Respuesta backend incompleta: faltan Recommendation/Pricing/Scenario');e.diagnosticOutput=out;e.lastEngineSnapshotVersion=confirmedSnapshot(e).version;e.scenarioResults=[];e.selectedScenarioIndex=0;e.updatedAt=now();e.lastEngineRunAt=now();markDirty('Pain → Economics → Risk → Recommendation → Pricing → Scenario calculados por backend');state.activePage='resultados';render();toast('Resultados oficiales actualizados por backend.')}catch(err){toast('No se pudo ejecutar el backend: '+err.message);render()}}

// C05 · Optional internal AI orchestration. No provider is configured by canonical source today, so
// the default capability is explicitly UNAVAILABLE. This service never falls back to templates/rules
// presented as AI and never owns deterministic Pain/Economics/Risk/Recommendation/Pricing/Scenario.
let __aiAgentProvider=null;
const AiAgentService=Object.freeze({
  status(){return __aiAgentProvider?'AVAILABLE':'UNAVAILABLE'},
  available(){return !!__aiAgentProvider},
  provider(){return __aiAgentProvider?.name||null},
  register(provider){if(!provider||typeof provider.propose!=='function')throw new Error('Proveedor IA inválido: debe implementar propose(request).');__aiAgentProvider=provider;return this.status()},
  clear(){__aiAgentProvider=null;return this.status()},
  async propose(kind,engagement=currentEng(),context={}){
    if(!__aiAgentProvider)return {status:'UNAVAILABLE',kind,proposal:null,reason:'No hay proveedor IA gobernado/configurado.'};
    const record=typeof engagementOfRecord==='function'?engagementOfRecord(engagement):engagement;
    const allowed=new Set(['SUMMARY','EVIDENCE_ORGANIZATION','EXPLANATION','TOBE_DRAFT','MISSING_INFORMATION','DRAFT_TEXT']);
    if(!allowed.has(kind))throw new Error('Capacidad IA fuera del contrato de AUNEA Internal.');
    const response=await __aiAgentProvider.propose({kind,engagement:record,context});
    return {status:'DRAFT',kind,proposal:response,provider:this.provider(),requiresHumanReview:true};
  }
});
// [AUNEA-FE-ENGINE-ADAPTER-020] END
