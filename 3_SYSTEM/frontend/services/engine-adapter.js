// [AUNEA-FE-ENGINE-ADAPTER-020] START — Canonical frontend → backend adapter
// PURPOSE: Convert captured facts and explicit consultant confirmations into EngagementInput; never calculate Pain/Economics/Risk/Recommendation/Pricing/Scenario in the browser.
// SOURCE: MAP_QUESTION_ENGINE_INPUT; RULE_RECOMMENDATION RR-03..RR-07; DEC-034/052/065; REQ-ENGN-001/REC-001/SCEN-001.
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
// [AUNEA-FE-ENGINE-GATE-ASSIST-151] START — Evidence-aware, consultant-owned decisions.
// SOURCE: unchanged ENGINE_GATE_CONTRACT and DEC-034/052/065; DF086–DF089,
// ProcessStep, Friction. Never infer a negative from missing facts.
// A proposal is not an automatic answer, nor a verified client measurement.
const ENGINE_GATE_GUIDE=Object.freeze({
  process_design_first:{
    title:'¿Hay que aclarar las reglas o responsabilidades antes de automatizar?',
    help:'Comprueba si los criterios de decisión, responsables y controles actuales son suficientes para implantar cambios sin rediseñar antes el proceso.',
    missing:'Verificar las reglas reales de aprobación, responsabilidades y controles; identificar cuáles deben cambiar antes de automatizar.'
  },
  existing_tool_can_close:{
    title:'¿Las herramientas actuales pueden resolver el problema?',
    help:'Valora si las capacidades necesarias están disponibles mediante configuración o adopción, sin asumirlo solo porque exista un ERP o correo.',
    missing:'Comprobar las funciones, licencias y posibilidades reales de configuración o integración de las herramientas actuales.'
  },
  unstructured_interpretation_need:{
    title:'¿Se necesita IA para interpretar o elaborar información?',
    help:'Distingue tareas con interpretación de documentos o lenguaje de aquellas que se resuelven mediante reglas conocidas.',
    missing:'Determinar si alguna tarea requiere interpretar contenido variable y por qué las reglas convencionales no serían suficientes.'
  },
  bounded_action_space:{
    title:'¿Hace falta un agente que proponga o ejecute acciones controladas?',
    help:'Una aprobación o bifurcación no implica por sí misma la necesidad de un agente. Comprueba los límites, permisos y decisiones humanas.',
    missing:'Precisar qué acción delegable existe, dentro de qué límites y qué aprobación debe seguir siendo humana.'
  },
  management_visibility_need:{
    title:'¿Hace falta mejorar el seguimiento y control del proceso?',
    help:'Valora si se necesitan estados, alertas o indicadores para controlar carga, esperas, excepciones y rendimiento.',
    missing:'Contrastar con el cliente qué seguimiento necesita y qué problemas concretos pretende resolver.'
  }
});
function engineGateReviewEvidence(contract,e){
  // Only the sealed PG09 version may justify the internal diagnostic decisions.
  const record=typeof engagementOfRecord==='function'?engagementOfRecord(e):e;
  const key=contract.key,steps=activeSteps(record),fr=activeFrictions(record);
  const ans=record.answers||{},sources=[];
  const add=(label,source)=>{if(label&&!sources.some(s=>s.label===label))sources.push({label,source})};
  const stepName=(x)=>String(x.step_name||'Paso del proceso');
  const frName=(f)=>String(f.client_label||f.observable_signal||labelFrom('OS_FRICTION_TYPE',f.friction_type)||'Problema registrado');
  const hasDecision=s=>s.step_type==='ST05'||s.step_type==='ST04'||normalizeArray(s.decision_criteria).length>0||s._ui?.has_decision===true;
  const decisionSteps=steps.filter(hasDecision);
  const tools=[...new Set(steps.map(s=>String(s.tool||'').trim()).filter(Boolean))];
  const citeSteps=(records,why)=>records.slice(0,3).forEach(x=>add(why+': '+stepName(x),'ProcessStep'));
  const listAnswer=(fid,title)=>{
    const vals=normalizeArray(ans[fid]).map(String).filter(Boolean);
    if(vals.length)add(title+': '+vals.slice(0,4).map(v=>String(labelFrom((schema?.fields||[]).find(f=>f.Field_ID===fid)?.Option_Set_ID,v)||v)).join(' · '),fid);
    return vals;
  };
  let suggestion='',status='INSUFFICIENT',reason='';
  switch(key){
    case 'process_design_first':{
      citeSteps(decisionSteps,'Decisión o aprobación registrada');
      const missing=decisionSteps.filter(s=>!normalizeArray(s.decision_criteria).length&&!String(s._details?.decision_criteria||'').trim());
      if(missing.length)add('Hay decisiones sin criterio documentado en '+missing.map(stepName).slice(0,2).join(' · '),'ProcessStep');
      listAnswer('DF087','Condiciones que deben mantenerse');
      listAnswer('DF088','Límites para automatizar');
      const types=new Set(fr.map(f=>String(f.friction_type)));
      if(types.has('P04')||types.has('P10')){
        suggestion='YES';status='REVIEW';
        const matching=fr.filter(f=>['P04','P10'].includes(String(f.friction_type)));
        matching.slice(0,2).forEach(f=>add('Problema relacionado: '+frName(f),'Friction'));
        reason='Hay señales gobernadas de rediseño; no bastan por sí solas para afirmar que sea imprescindible.';
      }else if(sources.length){status='REVIEW';reason='Hay decisiones o restricciones registradas, pero no demuestran por sí solas que haya que rediseñar.';}
      break;
    }
    case 'existing_tool_can_close':{
      if(tools.length)add('Herramientas declaradas en los pasos: '+tools.slice(0,5).map(x=>labelFrom('OS_TOOL_CATEGORY',x)||x).join(' · '),'ProcessStep');
      listAnswer('DF089','Preferencias o restricciones tecnológicas');
      listAnswer('DF050','Integraciones o transferencias manuales');
      if(sources.length){status='REVIEW';reason='Conocemos parte del entorno técnico, pero no se han acreditado sus capacidades para resolver los problemas.';}
      break;
    }
    case 'unstructured_interpretation_need':{
      const doc=steps.filter(x=>normalizeArray(x.inputs).concat(normalizeArray(x.outputs)).some(v=>/PDF|EMAIL|DOCUMENT|TEXT|WORD|FILE/i.test(String(v))));
      citeSteps(doc,'Documentos o información de entrada/salida');
      listAnswer('DF088','Límites para automatizar');
      if(sources.length){status='REVIEW';reason='Tener documentos no demuestra que se necesite IA: antes hay que comprobar si las reglas bastan.';}
      break;
    }
    case 'bounded_action_space':{
      citeSteps(decisionSteps,'Decisión o aprobación en el proceso');
      listAnswer('DF088','Acciones que no deben automatizarse');
      const human=normalizeArray(ans.DF075).map(String).filter(Boolean);
      if(human.length)add('Acciones que requieren intervención humana: '+human.slice(0,4).join(' · '),'DF075');
      if(sources.length){status='REVIEW';reason='Existen decisiones o límites de actuación, pero no una necesidad demostrada de agente.';}
      break;
    }
    case 'management_visibility_need':{
      const types=new Set(fr.map(f=>String(f.friction_type)));
      const targets=normalizeArray(ans.DF086).map(String);
      const signals=fr.filter(f=>['P09','P14','P17'].includes(String(f.friction_type)));
      signals.slice(0,3).forEach(f=>add('Fricción registrada: '+frName(f),'Friction'));
      if(targets.includes('VISIBILITY'))add('El cliente incluyó visibilidad en el resultado deseado','DF086');
      if(signals.length||targets.includes('VISIBILITY')){
        suggestion='YES';status='PROPOSAL';
        reason='El objetivo declarado o las fricciones de visibilidad justifican proponer seguimiento; las cifras conservan la calidad de evidencia original.';
      }else{
        listAnswer('DF086','Resultados esperados');
        if(sources.length){status='REVIEW';reason='Hay resultados deseados, pero no confirman una necesidad específica de seguimiento.';}
      }
      break;
    }
  }
  return {key,status,suggestion,sources,reason,missing:ENGINE_GATE_GUIDE[key].missing};
}
function inferGateSuggestion(contract,e){
  return engineGateReviewEvidence(contract,e).suggestion;
}
function unresolvedEngineGates(e){
  const g=engineGates(e),version=confirmedSnapshot(e)?.version||null;
  const stale=!!(e.engineGateReview?.snapshotVersion&&version!==e.engineGateReview.snapshotVersion);
  return ENGINE_GATE_CONTRACT.filter(c=>stale||!gateResolved(g[c.key]));
}
function engineGateCard(c,e){
  const info=engineGateReviewEvidence(c,e),guide=ENGINE_GATE_GUIDE[c.key];
  const saved=engineGates(e)[c.key]||'';
  const stateText=info.status==='PROPOSAL'?'Propuesta para contrastar'
    :info.status==='REVIEW'?'Información para revisar':'Información insuficiente';
  const chip=info.status==='PROPOSAL'?'candidate':'review';
  const provenance=info.sources.length
    ?'<ul class="engine-review-sources">'+info.sources.map(s=>'<li>'+esc(s.label)+'</li>').join('')+'</ul>'
    :'<p class="engine-review-empty">No hay un dato suficiente en el diagnóstico para resolver esta decisión.</p>';
  const proposed=info.suggestion
    ?'<p><b>Propuesta de AUNEA: '+(info.suggestion==='YES'?'Sí':'No')+'.</b> '+esc(info.reason)+'</p>'
    :'<p><b>Conclusión:</b> '+esc(info.reason||'Los datos disponibles no permiten establecer una respuesta técnica.')+'</p>';
  const savedNote=saved?'<p class="engine-review-saved">Respuesta confirmada previamente: '+(saved==='YES'?'Sí':'No')+'. Puedes revisarla.</p>':'';
  return '<section class="engine-review-card" data-engine-review-card="'+attr(c.key)+'">'
    +'<header class="engine-review-header"><div><h3>'+esc(guide.title)+'</h3><p>'+esc(guide.help)+'</p></div>'
    +'<span class="engine-review-status '+chip+'">'+esc(stateText)+'</span></header>'
    +'<div class="engine-review-detail"><div><b>Información recuperada</b>'+provenance+'</div>'
    +'<div class="engine-review-judgement">'+proposed+'<p><b>Qué comprobar:</b> '+esc(info.missing)+'</p></div></div>'
    +'<div class="engine-review-choice"><label for="engine_gate_'+attr(c.key)+'">Tu decisión</label>'
    +auneaSelectControl('engine_gate_'+c.key,[{value:'',label:'Pendiente de confirmar'},{value:'YES',label:'Sí'},{value:'NO',label:'No'}],saved,
      {extra:'data-engine-gate="'+attr(c.key)+'"',placeholder:'Pendiente de confirmar',searchable:false})
    +savedNote+'<small>Confirma Sí o No solo cuando dispongas de fundamento. Pendiente no equivale a No.</small></div></section>';
}
function openEngineGateReview(){
  const e=currentEng();if(!e)return;
  const body='<div class="engine-review-intro"><p><b>Revisa cinco decisiones técnicas antes de calcular.</b> AUNEA recupera los datos del AS-IS y muestra qué sustentan. Una propuesta no es una respuesta confirmada.</p>'
    +'<p>Si falta información, deja la decisión pendiente. No se ejecutarán los motores ni se guardarán respuestas parciales como confirmadas.</p></div>'
    +'<div class="engine-review-list">'+ENGINE_GATE_CONTRACT.map(c=>engineGateCard(c,e)).join('')+'</div>';
  openModal('Decisiones del consultor',body,()=>{
    const staged={},missing=[];
    document.querySelectorAll('[data-engine-gate]').forEach(x=>{
      const key=x.dataset.engineGate;
      staged[key]=x.value;
    });
    ENGINE_GATE_CONTRACT.forEach(c=>{if(!gateResolved(staged[c.key]))missing.push(c)});
    if(missing.length){
      toast('Quedan '+missing.length+' decisiones pendientes. Revisa su fundamento antes de calcular.');
      const first=document.querySelector('[data-engine-review-card="'+missing[0].key+'"]');
      if(first&&typeof first.scrollIntoView==='function')first.scrollIntoView({block:'center',behavior:'smooth'});
      return;
    }
    const current=confirmedSnapshot(e);
    if(!current){toast('El AS-IS ya no está confirmado. Revisa el diagnóstico antes de calcular.');closeModal();return;}
    const previous={gates:{...e.engineGates},review:e.engineGateReview};
    e.engineGates={...(e.engineGates||{}),...staged};
    e.engineGateReview={
      snapshotVersion:current.version,
      confirmedAt:now(),
      decisions:Object.fromEntries(ENGINE_GATE_CONTRACT.map(c=>{
        const v=engineGateReviewEvidence(c,e);
        return [c.key,{answer:staged[c.key],basis:v.status,sources:v.sources.map(s=>s.source),suggestion:v.suggestion}];
      }))
    };
    e.updatedAt=now();markDirty('Cinco decisiones técnicas confirmadas por el consultor');
    if(typeof persistRecoverySnapshot==='function'&&!persistRecoverySnapshot('inputs internos del diagnóstico')){
      e.engineGates=previous.gates;e.engineGateReview=previous.review;
      toast('No se pudo guardar la confirmación. No se ejecutará el diagnóstico.');render();return;
    }
    closeModal();runDiagnosis();
  },'Confirmar decisiones y calcular');
}
// [AUNEA-FE-ENGINE-GATE-ASSIST-151] END
function evidenceTypeBackend(v){return ({EV01:'MEASURED',EV02:'CLIENT_DECLARED',EV03:'AUNEA_ESTIMATE',EV04:'HYPOTHESIS',EV05:'SPECIFIC_BENCHMARK',EV06:'AUNEA_ESTIMATE',EV07:'AUNEA_ESTIMATE',MEASURED:'MEASURED',CLIENT_DECLARED:'CLIENT_DECLARED',AUNEA_ESTIMATE:'AUNEA_ESTIMATE',SPECIFIC_BENCHMARK:'SPECIFIC_BENCHMARK',HYPOTHESIS:'HYPOTHESIS'})[v]||null}
function normalizeEconomicInputs(e){
  const activeDrivers=new Set(['ED01','ED02','ED03','ED04','ED05','ED06','ED07','ED08']);
  return (e.economicInputs||[]).map(x=>{
    const driver=x.driver_id,active=activeDrivers.has(driver),wait=driver==='ED13';
    const evidence=evidenceTypeBackend(x.evidence_type);
    if(!evidence)throw new Error('Evidencia económica sin tipo reconocido: revisa el input '+(driver||'sin driver')+'.');
    return {
      step_ids:normalizeArray(x.step_ids).filter(Boolean),pain_id:x.pain_id||null,driver_id:driver,
      annual_active_hours:active?(x.annual_active_hours==null?null:Number(x.annual_active_hours)):0,
      annual_wait_hours:wait?(x.annual_wait_hours==null?null:Number(x.annual_wait_hours)):0,
      capacity_cost_rate_eur_hour:x.capacity_cost_rate_eur_hour==null?null:Number(x.capacity_cost_rate_eur_hour),
      role_or_resource:x.role_or_resource||null,value:x.value==null?null:Number(x.value),unit:x.unit||null,period:x.period||null,
      direct_loss_eur_annual:x.direct_loss_eur_annual==null?null:Number(x.direct_loss_eur_annual),
      current_tool_cost_eur_annual:x.current_tool_cost_eur_annual==null?null:Number(x.current_tool_cost_eur_annual),
      realized_cash_saving_eur_annual:x.realized_cash_saving_eur_annual==null?null:Number(x.realized_cash_saving_eur_annual),
      evidence_type:evidence,deduplication_key:x.deduplication_key||null
    };
  }).filter(x=>x.driver_id)
}
function normalizeRiskInputs(e){
  const requireBool=(v,label)=>{if(typeof v!=='boolean')throw new Error('Riesgo incompleto: '+label+' debe revisarse antes del diagnóstico.');return v};
  return (e.risks||[]).map(r=>{
    const likelihood=Number(r.likelihood_1_5),impact=Number(r.impact_1_5);
    if(!r.category)throw new Error('Riesgo incompleto: falta la categoría.');
    if(!Number.isInteger(likelihood)||likelihood<1||likelihood>5||!Number.isInteger(impact)||impact<1||impact>5)throw new Error('Riesgo incompleto: probabilidad e impacto deben estar entre 1 y 5.');
    return {risk_id:r.id||null,step_ids:normalizeArray(r.step_ids).filter(Boolean),category:r.category,likelihood_1_5:likelihood,impact_1_5:impact,
      reversible:requireBool(r.reversible,'reversibilidad'),
      sensitive_or_high_impact:requireBool(r.sensitive_or_high_impact,'sensibilidad'),
      material_financial_or_compliance:requireBool(r.material_financial_or_compliance,'materialidad'),
      critical_trigger:requireBool(r.critical_trigger,'criticidad'),
      controls_present:requireBool(r.controls_present,'controles actuales'),
      description:r.description||null};
  })
}
function buildPainCandidatePayload(engagement){
  const e=typeof engagementOfRecord==='function'?engagementOfRecord(engagement):engagement;
  return {
    engagement_id:e.id,
    process_instance_id:`PROC-${e.id}`,
    process_name:e.answers?.DF011||e.processName||e.title||'',
    questionnaire_answers:{
      ...questionnaireAnswersForEngine(e),
      _business_area_id:e.businessAreaId||null,
      _answer_details:e.answerDetails||{},
      _process_steps:activeSteps(e),
      _frictions:activeFrictions(e)
    }
  };
}
async function fetchPainCandidates(e=currentEng()){
  if(!e)return {candidates:[],evaluated_step_ids:[],note:''};
  if(!state.backendOnline&&!(await checkBackend()))throw new Error('Backend no conectado.');
  const payload=buildPainCandidatePayload(e);
  const r=await fetch(`${state.backendUrl}/v1/diagnostic/pain-candidates`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error(await r.text());
  return await r.json();
}
function buildRiskCandidatePayload(engagement){
  const e=typeof engagementOfRecord==='function'?engagementOfRecord(engagement):engagement;
  return {
    engagement_id:e.id,
    process_instance_id:`PROC-${e.id}`,
    process_name:e.answers?.DF011||e.processName||e.title||'',
    questionnaire_answers:{
      ...questionnaireAnswersForEngine(e),
      _answer_details:e.answerDetails||{},
      _process_steps:activeSteps(e),
      _frictions:activeFrictions(e),
      _risks:e.risks||[]
    }
  };
}
async function fetchRiskCandidates(e=currentEng()){
  if(!e)return {candidates:[]};
  if(!state.backendOnline&&!(await checkBackend()))throw new Error('Backend no conectado.');
  const payload=buildRiskCandidatePayload(e);
  const r=await fetch(`${state.backendUrl}/v1/diagnostic/risk-candidates`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error(await r.text());
  return await r.json();
}
async function diagnosticCoveragePreflight(payload){
  const r=await fetch(`${state.backendUrl}/v1/diagnostic/coverage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error(await r.text());
  return await r.json();
}
function coverageItemLabel(item){
  const fields=normalizeArray(item?.source_fields).map(fid=>(schema?.fields||[]).find(f=>f.Field_ID===fid)?.Pregunta_o_etiqueta_ES).filter(Boolean);
  return fields.length?fields.join(' · '):(item?.input_id||'input diagnóstico');
}
function handleCoveragePreflight(e,result){
  const integrity=normalizeArray(result?.integrity_issues).filter(Boolean);
  if(integrity.length){
    state.activePage='proceso';render();toast('Revisa el AS-IS antes de calcular: '+integrity[0]);
    return false;
  }
  const coverage=result?.coverage||{},items=normalizeArray(coverage.items);
  const blocking=items.filter(x=>x.status==='GAP'&&x.blocking);
  e.lastDiagnosticCoverage=coverage;
  if(blocking.length){
    const first=blocking[0],firstField=normalizeArray(first.source_fields).find(fid=>(schema?.fields||[]).some(f=>f.Field_ID===fid));
    const field=(schema?.fields||[]).find(f=>f.Field_ID===firstField);
    if(field?.Stage_ID)e.stageId=field.Stage_ID;
    state.activePage='diagnostico';render();
    toast('Falta información necesaria para calcular: '+coverageItemLabel(first)+'.');
    return false;
  }
  return true;
}
// [AUNEA-FE-ENGINE-RISKOWNER-079] START — Risk-owned DF074 engine projection
// SOURCE: DEC-072. Never forward a legacy manually stored DF074 when RiskInput has no valid derivation.
function questionnaireAnswersForEngine(e){
  const out={...(e.answers||{})};
  // Live diagnostics use their Company owner; sealed diagnostics use the historical snapshot.
  // The same projection is reused for preflight, candidate engines and final diagnosis.
  for(const fid of ['DF002','DF003']){
    const field=(schema?.fields||[]).find(f=>f.Field_ID===fid);
    const value=fid==='DF002'&&e.confirmedSnapshotVersion
      ?canonicalValueFromLabel('REF_INDUSTRY_CNAE25',out.DF002)
      :(field&&typeof effectiveValue==='function'?effectiveValue(field,e):undefined);
    if(typeof valuePresent==='function'&&valuePresent(value))out[fid]=value;
    else delete out[fid];
  }
  delete out.DF074; // always re-materialize exclusively from current RiskInput.reversibility
  for(const fid of ['DF074','DF085','DF094','DF095']){
    const field=(schema?.fields||[]).find(x=>x.Field_ID===fid);
    const value=field&&typeof effectiveValue==='function'?effectiveValue(field,e):(typeof reusedValue==='function'?reusedValue(fid,e):undefined);
    if(typeof valuePresent==='function'?valuePresent(value):(value!==undefined&&value!==null&&value!==''))out[fid]=value;
  }
  return out;
}
// [AUNEA-FE-ENGINE-RISKOWNER-079] END
function buildBackendPayload(engagement){
  const e=typeof engagementOfRecord==='function'?engagementOfRecord(engagement):engagement;
  const evidence=[],painSignals=[],fmap=Object.fromEntries(schema.friction_pain_map.map(x=>[x.Friction_Type_ID,x.Pain_ID]));
  activeFrictions(e).forEach(f=>{const signal=String(f.observable_signal||'').trim(),evid=`EV-${f.id}`,etype=evidenceTypeBackend(f.evidence_type),hasConcrete=!!signal&&['MEASURED','CLIENT_DECLARED'].includes(etype);if(signal&&etype)evidence.push({evidence_id:evid,type:etype,description:signal,source:'AUNEA Internal · fricción vinculada al AS-IS'});painSignals.push({pain_id:fmap[f.friction_type]||f.derived_pain_id||f.friction_type,direct_mechanism_present:!!f.friction_type,concrete_evidence_present:hasConcrete,signal_present:!!signal,evidence_ids:signal&&etype?[evid]:[],rationale:f.client_label||signal||null})});
  const g=engineGates(e),payload={engagement_id:e.id,process_instance_id:`PROC-${e.id}`,process_name:e.answers?.DF011||e.processName||e.title,evidence,pains:[],pain_signals:painSignals,questionnaire_answers:{...questionnaireAnswersForEngine(e),_business_area_id:e.businessAreaId||null,_answer_details:e.answerDetails||{},_process_steps:activeSteps(e),_frictions:activeFrictions(e),_engine_gate_trace:Object.fromEntries(ENGINE_GATE_CONTRACT.map(c=>[c.id,g[c.key]||'UNRESOLVED']))},economics:normalizeEconomicInputs(e),risks:normalizeRiskInputs(e),existing_tool_can_cover:gateBool(g.existing_tool_can_close),process_design_preconditions_ok:!gateBool(g.process_design_first),requires_unstructured_ai_assistance:gateBool(g.unstructured_interpretation_need),requires_bounded_agent_action:gateBool(g.bounded_action_space),requires_management_visibility:gateBool(g.management_visibility_need)};
  if(e.commercialScope)payload.commercial_scope={...e.commercialScope};
  return payload;
}
async function runDiagnosis(){const e=currentEng();if(!e)return;if(!hasConfirmedSnapshot(e))return toast('Confirma el cierre del proceso actual en Validación y cierre antes de calcular en Trabajo interno.');if(!state.backendOnline&&!(await checkBackend())){state.activePage='resultados';render();toast('Backend no conectado: no se publican resultados oficiales.');return}const gaps=canonicalMissingRequired(e);if(gaps.length){state.activePage='resultados';render();toast(`Captura incompleta: ${gaps.slice(0,5).join(', ')}`);return}const captureIssues=typeof captureIntegrityIssues==='function'?captureIntegrityIssues(engagementOfRecord(e)):[];if(captureIssues.length){state.activePage='resultados';render();toast('No se ha recalculado: '+(captureIssues[0].message||captureIssues[0].label||'hay una inconsistencia de captura pendiente.'));return}if(unresolvedEngineGates(e).length){openEngineGateReview();return}
  const sourceSnapshot=confirmedSnapshot(e);
  if(!sourceSnapshot)return toast('El AS-IS debe estar confirmado antes de calcular.');
  ['runDiag','runDiagHeader'].forEach(bid=>{const b=document.getElementById(bid);if(b){b.disabled=true;b.textContent='Comprobando…'}});
  try{
    const payload=buildBackendPayload(e);
    const preflight=await diagnosticCoveragePreflight(payload);
    if(!handleCoveragePreflight(e,preflight))return;
    ['runDiag','runDiagHeader'].forEach(bid=>{const b=document.getElementById(bid);if(b){b.disabled=true;b.textContent='Calculando…'}});
    const r=await fetch(`${state.backendUrl}/v1/diagnose`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(await r.text());const out=await r.json();if(!out.recommendation||!out.quote||!out.optimal_scenario)throw new Error('Respuesta backend incompleta: faltan Recommendation/Pricing/Scenario');
    // The request may finish after another tab or the consultant changes the AS-IS.
    // Never attach an obsolete result to the newly edited capture.
    const currentSnapshot=confirmedSnapshot(e);
    if(!currentSnapshot||currentSnapshot.version!==sourceSnapshot.version||e.confirmedAsIs!==true)throw new Error('El AS-IS cambió durante el cálculo. Confirma de nuevo antes de generar resultados.');
    e.diagnosticOutput=out;e.lastEngineSnapshotVersion=sourceSnapshot.version;e.economicNormalizationVersion=1;e.scenarioResults=[];e.selectedScenarioIndex=0;e.updatedAt=now();e.lastEngineRunAt=now();markDirty('Pain → Economics → Risk → Recommendation → Pricing → Scenario calculados por backend con métricas económicas normalizadas por driver');state.activePage='resultados';render();toast('Resultados oficiales actualizados por backend.')}catch(err){toast('No se pudo ejecutar el backend: '+err.message);render()}}

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
