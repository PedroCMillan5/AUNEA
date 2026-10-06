// [AUNEA-FE-PROC-LIFECYCLE-030] START — Trazabilidad y confirmación AS-IS
// PURPOSE: Own lifecycle-only actions for Process Steps/Friction records and AS-IS confirmation, separate from editors and engine adapters.
// SOURCE: Process/Friction Models; DEC-033/040.
// INPUTS: current Engagement, step/friction ids and explicit consultant confirmation.
// OUTPUTS: SUPERSEDED lifecycle state and AS-IS confirmation state.
// SIDE_EFFECTS: engagement state mutation, audit/dirty state and DOM re-render.
// CHANGE_RISK: HIGH.
function supersedeStep(stepId){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),x=e.processSteps.find(s=>s.id===stepId);
  if(!x)return;
  if(!confirm('¿Eliminar este paso del flujo? Se retirará inmediatamente del mapa y se limpiarán sus referencias activas.'))return;
  x.status='SUPERSEDED';
  (e.processSteps||[]).filter(s=>s.status!=='SUPERSEDED').forEach(s=>{
    if(s.normal_next_step===stepId)s.normal_next_step='';
    if(s.exception_path?.destination_step===stepId)s.exception_path={...s.exception_path,destination_step:''};
  });
  (e.frictions||[]).filter(fr=>fr.status!=='SUPERSEDED').forEach(fr=>{
    fr.affected_steps=normalizeArray(fr.affected_steps).filter(id=>id!==stepId);
    if(fr.time_attribution?.step_id===stepId)fr.time_attribution={mode:'',step_id:''};
    if(!fr.affected_steps.length)fr.status='SUPERSEDED';
  });
  (e.risks||[]).forEach(r=>r.step_ids=normalizeArray(r.step_ids).filter(id=>id!==stepId));
  (e.economicInputs||[]).forEach(v=>v.step_ids=normalizeArray(v.step_ids).filter(id=>id!==stepId));
  const details=e.answerDetails||(e.answerDetails={});
  Object.keys(details).forEach(k=>{
    if(/^DF\d{3}__step$/.test(k)&&String(details[k])===String(stepId))details[k]='';
    if(/^DF\d{3}__steps$/.test(k))details[k]=normalizeArray(details[k]).filter(id=>String(id)!==String(stepId));
  });
  Object.keys(e.answers||{}).forEach(fid=>{
    const f=(schema?.fields||[]).find(x=>x.Field_ID===fid),control=String(f?.Control_UI||'').toUpperCase(),value=e.answers[fid];
    if(control==='STEP_PAIR_SELECTOR'&&value&&typeof value==='object'&&(String(value.from||'')===String(stepId)||String(value.to||'')===String(stepId)))e.answers[fid]='';
    if(control==='STEP_SYSTEM_PAIR_SELECTOR')e.answers[fid]=normalizeArray(value).filter(token=>!String(token).split(':').includes(String(stepId)));
  });
  invalidateProcessLayers(e,'map');markDirty(`Paso ${stepId} eliminado del flujo y referencias activas conciliadas`);render();
}

function supersedeFriction(frId){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),x=e.frictions.find(s=>s.id===frId);
  if(!x)return;
  if(!confirm('La fricción quedará SUPERSEDED para conservar trazabilidad. ¿Continuar?'))return;
  x.status='SUPERSEDED';if(Array.isArray(e.answers?.DF096))e.answers.DF096=e.answers.DF096.filter(id=>id!==frId);invalidateProcessLayers(e,'frictions');markDirty(`Fricción ${frId} superseded`);render();
}

function processLayerConfirmations(e){
  if(!e.layerConfirmations)e.layerConfirmations={map:false,frictions:false,risks:false,impact:false};
  return e.layerConfirmations;
}
function processLayerKey(tab){return tab==='fricciones'?'frictions':tab==='riesgos'?'risks':tab==='impacto'?'impact':'map'}
function allProcessLayersConfirmed(e){const x=processLayerConfirmations(e);return !!(x.map&&x.frictions&&x.risks&&x.impact)}

function processLayerIntegrityIssues(e,key){
  if(!e)return [{layer:key||'map',message:'No hay un estudio activo.'}];
  const steps=typeof activeSteps==='function'?activeSteps(e):(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
  const stepIds=new Set(steps.map(x=>x.id)),issues=[];
  const push=message=>issues.push({layer:key,message});
  if(key==='map'){
    steps.forEach((s,i)=>{
      if(!s.step_name||String(s.step_name).trim().length<3||!s.step_type||!s.actor)push(`Completa nombre, tipo y responsable del paso ${i+1}.`);
      const checkDest=(dest,label)=>{
        if(dest&&dest!=='__END__'&&!stepIds.has(dest))push(`${label} de "${s.step_name||'Paso '+(i+1)}" apunta a un paso que ya no está activo.`);
      };
      checkDest(s.normal_next_step,'El destino principal');
      if(s.exception_path)checkDest(s.exception_path.destination_step,'El destino alternativo');
      if(typeof processDecisionStep==='function'&&processDecisionStep(s)&&(!s.normal_next_step||!s.exception_path?.destination_step))
        push(`La decisión "${s.step_name||'Paso '+(i+1)}" necesita destino en ambas rutas.`);
      const er=s.error_rate&&typeof s.error_rate==='object'?s.error_rate:null;
      if(er?.mode==='percent'&&Number(er.value)>100)push(`El porcentaje de error de "${s.step_name||'Paso '+(i+1)}" debe estar entre 0 y 100.`);
      if(er?.mode==='count'&&Number(er.value)>0&&!er.period)push(`La frecuencia en casos de "${s.step_name||'Paso '+(i+1)}" necesita periodo.`);
    });
  }
  if(key==='frictions'){
    const frictions=typeof activeFrictions==='function'?activeFrictions(e):(e.frictions||[]).filter(x=>x.status!=='SUPERSEDED');
    frictions.forEach((fr,i)=>{
      const ids=normalizeArray(fr.affected_steps).filter(Boolean);
      if(!fr.friction_type||!ids.length||!normalizeArray(fr.cause).length&&!fr?._details?.cause||!String(fr.observable_signal||'').trim())
        push(`Completa tipo, pasos, causa y señal observable de la fricción ${i+1}.`);
      if(ids.some(id=>!stepIds.has(id)))push(`La fricción "${fr.client_label||fr.friction_type||i+1}" referencia un paso que ya no está activo.`);
      if(Number(fr.active_time_loss?.value||0)>0&&(!['INCLUDED','BREAKDOWN','ADDITIONAL'].includes(fr.time_attribution?.mode)||!ids.includes(fr.time_attribution?.step_id)))
        push(`El tiempo de la fricción "${fr.client_label||fr.friction_type||i+1}" necesita relación y paso responsable válidos.`);
      if(fr.frequency?.mode==='percent'&&(Number(fr.frequency?.value)<0||Number(fr.frequency?.value)>100))push(`La frecuencia porcentual de la fricción "${fr.client_label||fr.friction_type||i+1}" debe estar entre 0 y 100.`);
      if(fr.frequency?.mode==='count'&&Number(fr.frequency?.value)>0&&!fr.frequency?.period)push(`La frecuencia en casos de la fricción "${fr.client_label||fr.friction_type||i+1}" necesita periodo.`);
    });
  }
  if(key==='risks'){
    const risks=e.risks||[],riskBranch=typeof branchActive==='function'?branchActive('BR-RISK',e):risks.length>0;
    if(riskBranch&&!risks.length)push('El contexto activa la revisión de riesgo: registra el riesgo concreto antes de confirmar esta capa.');
    risks.forEach((r,i)=>{
      const like=Number(r.likelihood_1_5),impact=Number(r.impact_1_5);
      if(!r.category||!String(r.description||'').trim()||!Number.isInteger(like)||like<1||like>5||!Number.isInteger(impact)||impact<1||impact>5)
        push(`Completa categoría, descripción, probabilidad e impacto del riesgo ${i+1}.`);
      if(!String(r.reversibility||'').trim())push(`Indica la reversibilidad del riesgo "${r.description||i+1}".`);
      if(typeof r.controls_present!=='boolean')push(`Indica si existen controles actuales para el riesgo "${r.description||i+1}".`);
      if(r.controls_present===true&&!normalizeArray(r.current_control).length)push(`Selecciona los controles actuales del riesgo "${r.description||i+1}".`);
      if(typeof r.sensitive_or_high_impact!=='boolean'||typeof r.material_financial_or_compliance!=='boolean'||typeof r.critical_trigger!=='boolean')
        push(`Completa las condiciones de sensibilidad, materialidad y criticidad del riesgo "${r.description||i+1}".`);
      const riskSteps=normalizeArray(r.step_ids).filter(Boolean);
      if(stepIds.size&&!riskSteps.length)push(`El riesgo "${r.description||i+1}" debe estar vinculado al menos a un paso activo.`);
      if(riskSteps.some(id=>!stepIds.has(id)))push(`El riesgo "${r.description||i+1}" referencia un paso que ya no está activo.`);
    });
  }
  if(key==='impact'){
    (e.economicInputs||[]).forEach((x,i)=>{
      if(!x.driver_id)push(`Selecciona el tipo de impacto del registro ${i+1}.`);
      if(!x.evidence_type)push(`Selecciona la evidencia del impacto ${i+1}.`);
      const impactSteps=normalizeArray(x.step_ids).filter(Boolean);
      if(stepIds.size&&!impactSteps.length)push(`El impacto ${i+1} debe estar vinculado al menos a un paso activo.`);
      if(impactSteps.some(id=>!stepIds.has(id)))push(`El impacto ${i+1} referencia un paso que ya no está activo.`);
      if(x.pain_id){
        const linkedPains=new Set((typeof activeFrictions==='function'?activeFrictions(e):(e.frictions||[]).filter(f=>f.status!=='SUPERSEDED'))
          .filter(fr=>normalizeArray(fr.affected_steps).some(id=>impactSteps.includes(id)))
          .map(fr=>String(fr.derived_pain_id||fr.friction_type||'')));
        if(!linkedPains.has(String(x.pain_id)))push(`El impacto ${i+1} está asociado a un problema que no existe en los pasos seleccionados.`);
      }
    });
    if(typeof economicInputIntegrityIssues==='function')economicInputIntegrityIssues(e).forEach(x=>push(x.message));
  }
  const stageByLayer={map:'S04',frictions:'S05',risks:'S06',impact:'S07'},stageId=stageByLayer[key];
  if(stageId&&typeof canonicalFieldRequiredNow==='function'){
    (schema?.fields||[]).filter(f=>f.Stage_ID===stageId&&canonicalFieldRequiredNow(f,e)).forEach(f=>{
      if(!(typeof canonicalFieldValuePresent==='function'?canonicalFieldValuePresent(f,effectiveValue(f,e),e):valuePresent(effectiveValue(f,e))))
        push(`Completa "${f.Pregunta_o_etiqueta_ES||f.Field_ID}" antes de confirmar esta capa.`);
    });
  }
  if(stageId&&typeof canonicalFieldIntegrityIssues==='function'){
    canonicalFieldIntegrityIssues(e).filter(x=>x.stage===stageId).forEach(x=>push(x.label));
  }
  return issues;
}
function captureIntegrityIssues(e){
  const out=[];
  ['map','frictions','risks','impact'].forEach(k=>out.push(...processLayerIntegrityIssues(e,k)));
  if(typeof canonicalFieldIntegrityIssues==='function')out.push(...canonicalFieldIntegrityIssues(e).map(x=>({...x,layer:'fields',message:x.label})));
  return out;
}

// [AUNEA-FE-ASIS-CONSISTENCY-076] START — Validación de coherencia previa al cierre de PG09
// PURPOSE: Surface already-governed capture/integrity contradictions before sealing DF093, grouped as
//          blockers, review items and information, without creating a second owner or a new diagnostic question.
// SOURCE: Diagnostic Master v1.2; DEC-049/050/052/065/068; PROJECT_RULES single-owner/no-reask.
// INPUTS: current Engagement, existing layer integrity, canonical requiredness/completion and reused values.
// OUTPUTS: ephemeral review items with severity + navigation target; blockers prevent PG09 closure.
// SIDE_EFFECTS: none. No persistence, no engine calculation and no new business field.
// CHANGE_RISK: HIGH.
const CONSISTENCY_LAYER_STAGE=Object.freeze({map:'S04',frictions:'S05',risks:'S06',impact:'S07'});
function consistencyValueSignature(v){
  if(Array.isArray(v))return JSON.stringify(v.map(consistencyValueSignature).sort());
  if(v&&typeof v==='object')return JSON.stringify(Object.keys(v).sort().reduce((o,k)=>(o[k]=consistencyValueSignature(v[k]),o),{}));
  return JSON.stringify(v);
}
function preCloseConsistencyReview(e,completion){
  const items=[],seen=new Set();
  const add=(severity,code,message,stage='',navigationTarget='')=>{
    const text=String(message||'').trim();if(!text)return;
    const key=severity+'|'+text.toLowerCase();if(seen.has(key))return;
    seen.add(key);items.push({severity,code,message:text,stage,navigationTarget:navigationTarget||(stage?'stage':'')});
  };
  if(!e){
    add('BLOCKER','NO_ENGAGEMENT','No hay un estudio activo para validar.');
    return {items,blockers:items,reviews:[],information:[],clear:false};
  }
  const layers=typeof processLayerConfirmations==='function'?processLayerConfirmations(e):(e.layerConfirmations||{});
  Object.entries(CONSISTENCY_LAYER_STAGE).forEach(([layer,stage])=>{
    if(!layers[layer])add('BLOCKER','LAYER_'+layer.toUpperCase(),'Falta confirmar la capa '+({map:'Mapa AS-IS',frictions:'Fricciones',risks:'Riesgos',impact:'Impacto'}[layer]||layer)+'.',stage);
  });
  (typeof captureIntegrityIssues==='function'?captureIntegrityIssues(e):[]).forEach((x,i)=>{
    const stage=x.stage||CONSISTENCY_LAYER_STAGE[x.layer]||'';
    add('BLOCKER','INTEGRITY_'+i,x.message||x.label,stage);
  });

  const comp=completion||(typeof engagementCompletion==='function'?engagementCompletion(e):null);
  (comp?.blockers||[]).filter(b=>b.type!=='GATE'&&b.id!=='Confirmación AS-IS'&&b.id!=='DF093').forEach((b,i)=>{
    add('BLOCKER','COMPLETION_'+i,b.label||b.id||'Queda un dato obligatorio pendiente.',b.stage||'',b.navigationTarget||'');
  });
  if(!comp&&typeof canonicalMissingRequired==='function'){
    canonicalMissingRequired(e).filter(id=>id!=='DF093'&&id!=='Confirmación AS-IS').forEach((id,i)=>{
      const field=(schema?.fields||[]).find(f=>f.Field_ID===id);
      add('BLOCKER','REQUIRED_'+i,'Falta completar "'+(field?.Pregunta_o_etiqueta_ES||id)+'".',field?.Stage_ID||'');
    });
  }

  // Detect stale duplicate answers only where the runtime already owns a reusable/derived source.
  // It is a review item, not an automatic overwrite: the consultant corrects the canonical owner.
  if(typeof reusedValue==='function'&&typeof valuePresent==='function'){
    ['DF017','DF046','DF047','DF049','DF050','DF053','DF066','DF067','DF078','DF079'].forEach(fid=>{
      const explicit=e.answers?.[fid],reuse=reusedValue(fid,e);
      if(valuePresent(explicit)&&valuePresent(reuse)&&consistencyValueSignature(explicit)!==consistencyValueSignature(reuse)){
        const field=(schema?.fields||[]).find(f=>f.Field_ID===fid);
        add('REVIEW','SOURCE_CONFLICT_'+fid,'"' +(field?.Pregunta_o_etiqueta_ES||fid)+ '" no coincide con la información ya capturada en su fuente propietaria. Revisa el dato antes de cerrar.',field?.Stage_ID||'');
      }
    });
  }

  if(e._sessionTimeProjection&&typeof economicTimeRequest==='function'){
    const currentKey=JSON.stringify(economicTimeRequest(e));
    if(e._sessionTimeProjection.requestKey&&e._sessionTimeProjection.requestKey!==currentKey)
      add('REVIEW','STALE_TIME_PROJECTION','La proyección temporal corresponde a una versión anterior del AS-IS. Recalcula el impacto antes del análisis interno.','S07');
  }

  if(typeof effectiveValue==='function'){
    const evidenceField=(schema?.fields||[]).find(f=>f.Field_ID==='DF095');
    const pending=evidenceField?effectiveValue(evidenceField,e):[];
    normalizeArray(pending).filter(Boolean).forEach((label,i)=>
      add('REVIEW','EVIDENCE_'+i,'Evidencia pendiente: '+String(label),'S09'));
  }

  if(!items.length)add('INFO','CONSISTENT','No se detectan incoherencias estructurales ni datos obligatorios pendientes.');
  return {
    items,
    blockers:items.filter(x=>x.severity==='BLOCKER'),
    reviews:items.filter(x=>x.severity==='REVIEW'),
    information:items.filter(x=>x.severity==='INFO'),
    clear:!items.some(x=>x.severity==='BLOCKER')
  };
}
// [AUNEA-FE-ASIS-CONSISTENCY-076] END
function invalidateProcessLayers(e,from='map'){
  const x=processLayerConfirmations(e),order=['map','frictions','risks','impact'],i=Math.max(0,order.indexOf(from));
  order.slice(i).forEach(k=>x[k]=false);
  e.confirmedAsIs=false;e.answers.DF093='';e.asIsConfirmedAt=null;e.confirmedSnapshot=null;
  // Keep immutable snapshot history, but invalidate all outputs derived from the superseded confirmation.
  if(typeof invalidateDerivedState==='function')invalidateDerivedState(e,'cambio en capa AS-IS: '+from);
}
function confirmProcessLayer(tab){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng();if(!e)return;
  const key=processLayerKey(tab);
  if(key==='map'){
    const start=e.answers?.DF014,finish=e.answers?.DF015,hasActive=(e.processSteps||[]).some(x=>x.status!=='SUPERSEDED');
    if((!start||!finish)&&!hasActive)return toast('Define los límites inicial y final o añade al menos un paso antes de confirmar el mapa.');
  }
  const integrity=processLayerIntegrityIssues(e,key);if(integrity.length)return toast('No se puede confirmar: '+integrity[0].message),false;
  const x=processLayerConfirmations(e);
  x[key]=true;x[key+'_at']=now();
  if(allProcessLayersConfirmed(e)){
    e.confirmedAsIs=true;e.answers.DF093='YES';e.asIsConfirmedAt=now();
    const sealed=typeof sealConfirmedSnapshot==='function'?sealConfirmedSnapshot(e,'confirmación de mapa, fricciones, riesgos e impacto'):null;
    markDirty(sealed?`Capas AS-IS confirmadas · snapshot v${sealed.version}`:'Capas AS-IS confirmadas');
    toast('Mapa, fricciones, riesgos e impacto confirmados. Completa el cierre de sesión si quedan datos pendientes.');
  }else{
    markDirty(`Capa ${key} confirmada`);
    toast('Capa confirmada. Puedes continuar con la siguiente.');
  }
  render();
}
function confirmAsIs(){confirmProcessLayer(currentEng()?.processTab||'cliente')}
function invalidateAsIsClosure(e,reason='cambio en cierre de sesión'){
  if(!e||!e.confirmedAsIs)return false;
  e.confirmedAsIs=false;e.answers.DF093='';e.asIsConfirmedAt=null;e.confirmedSnapshot=null;
  if(typeof invalidateDerivedState==='function')invalidateDerivedState(e,reason);
  return true;
}
function confirmClosingAsIs(){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng();if(!e)return;
  const review=preCloseConsistencyReview(e);
  if(review.blockers.length)return toast('No se puede cerrar el AS-IS: '+review.blockers[0].message),false;
  const ts=now();e.confirmedAsIs=true;e.answers.DF093='YES';e.asIsConfirmedAt=ts;
  const sealed=typeof sealConfirmedSnapshot==='function'?sealConfirmedSnapshot(e,'confirmación final S09 del AS-IS enriquecido'):null;
  markDirty(sealed?`AS-IS confirmado en cierre · snapshot v${sealed.version}`:'AS-IS confirmado en cierre');
  toast(review.reviews.length?'AS-IS confirmado. Quedan observaciones no bloqueantes registradas para Trabajo interno.':'AS-IS completo confirmado y snapshot sellado.');
  render();
  return true;
}

// [AUNEA-FE-ASIS-CLIENT-EDITOR-074] START — Independent synchronized client-first editor + single-writer lease.
// PURPOSE: Open the consultant-owned client-first editor in a separate tab over the same Engagement, keep
//          Console and editor synchronized through the existing persistence layer, and prevent simultaneous
//          AS-IS edits from Console while that editor is alive.
// SOURCE: DEC-050/063; Master Index frontend contract; explicit UAT feedback 2026-10-01.
// INPUTS: current Engagement, localStorage lease, #process-editor window.
// OUTPUTS: one editable AS-IS surface at a time; Console remains readable but locked for AS-IS mutation.
// SIDE_EFFECTS: localStorage ephemeral lease, popup/tab lifecycle, DOM lock state.
// CHANGE_RISK: HIGH.
const PROCESS_EDITOR_LEASE_KEY='aunea_process_editor_lease_v1';
const PROCESS_EDITOR_LEASE_MS=6500;
let __auneaProcessEditorWindow=null,__auneaProcessEditorHeartbeat=null,__auneaProcessEditorMonitor=null;

function readProcessEditorLease(){
  try{
    const raw=localStorage.getItem(PROCESS_EDITOR_LEASE_KEY);if(!raw)return null;
    const lease=JSON.parse(raw);
    if(!lease?.engagementId||!lease?.token||Number(lease.expiresAt)<=Date.now())return null;
    return lease;
  }catch(_err){return null}
}
function writeProcessEditorLease(engagementId,token){
  const lease={engagementId,token,expiresAt:Date.now()+PROCESS_EDITOR_LEASE_MS};
  try{localStorage.setItem(PROCESS_EDITOR_LEASE_KEY,JSON.stringify(lease))}catch(_err){}
  return lease;
}
function processEditorToken(){
  const q=new URLSearchParams(location.search);
  return q.get('editorToken')||'';
}
function isAsisConsoleLocked(e=currentEng()){
  if(!e||(typeof isProcessEditorWindow==='function'&&isProcessEditorWindow()))return false;
  return readProcessEditorLease()?.engagementId===e.id;
}
function guardAsisMutation(){
  if(!isAsisConsoleLocked())return false;
  toast('La Vista con cliente está abierta. Edita el AS-IS desde esa pestaña.');
  return true;
}
function asisConsoleLockNotice(){
  return isAsisConsoleLocked()?'<div class="notice info asis-editor-lock-notice"><b>Vista con cliente abierta</b><p>La edición del mapa, fricciones, riesgos e impacto está bloqueada en esta consola. Realiza los cambios en la pestaña del cliente; aquí se sincronizarán automáticamente.</p></div>':'';
}
function applyAsisConsoleEditLock(){
  if(typeof document==='undefined')return;
  const locked=isAsisConsoleLocked();
  document.body.classList.toggle('asis-console-locked',locked);
  const selectors=['#addStep','#addMultipleSteps','#addStepTemplate','#useProcessTemplate','#addFriction','#addRisk','#addEconomic','#confirmAsIs','[data-confirm-process-layer]','[data-edit-step]','[data-delete-step]','[data-move-step-up]','[data-move-step-down]','[data-add-friction-step]','[data-add-risk-step]','[data-add-economic-step]','[data-edit-friction]','[data-delete-friction]','[data-edit-risk-index]','[data-delete-risk-index]','[data-edit-economic-index]','[data-delete-economic-index]','[data-graph-edit-route]','[data-add-after]'];
  document.querySelectorAll(selectors.join(',')).forEach(el=>{
    if(locked){
      if(el.dataset.asisPreviousDisabled===undefined)el.dataset.asisPreviousDisabled=el.disabled?'1':'0';
      el.disabled=true;el.setAttribute('aria-disabled','true');el.title='Edita desde la Vista con cliente abierta';
    }else if(el.dataset.asisPreviousDisabled!==undefined){
      el.disabled=el.dataset.asisPreviousDisabled==='1';delete el.dataset.asisPreviousDisabled;el.removeAttribute('aria-disabled');el.removeAttribute('title');
    }
  });
}
function releaseProcessEditorLease(token=processEditorToken()){
  const lease=readProcessEditorLease();
  if(!lease||!token||lease.token!==token)return;
  try{localStorage.removeItem(PROCESS_EDITOR_LEASE_KEY)}catch(_err){}
}
function startProcessEditorLease(){
  if(!isProcessEditorWindow())return;
  const e=currentEng(),token=processEditorToken();if(!e||!token)return;
  writeProcessEditorLease(e.id,token);
  clearInterval(__auneaProcessEditorHeartbeat);
  __auneaProcessEditorHeartbeat=setInterval(()=>writeProcessEditorLease(e.id,token),2000);
  const release=()=>releaseProcessEditorLease(token);
  window.addEventListener('beforeunload',release,{once:true});
  window.addEventListener('pagehide',release,{once:true});
}
function startProcessEditorLeaseMonitor(){
  if(typeof window==='undefined'||__auneaProcessEditorMonitor)return;
  let lastLocked=isAsisConsoleLocked();
  const refresh=()=>{
    const locked=isAsisConsoleLocked(),asisPage=['proceso','pasos','fricciones','riesgos','impacto'].includes(state.activePage);
    if(locked!==lastLocked&&asisPage){lastLocked=locked;render();return}
    lastLocked=locked;
    if(typeof applyAsisConsoleEditLock==='function')applyAsisConsoleEditLock();
  };
  __auneaProcessEditorMonitor=setInterval(refresh,1800);
  window.addEventListener('storage',ev=>{if(ev.key===PROCESS_EDITOR_LEASE_KEY)refresh()});
}
function openProcessEditorWindow(){
  const e=currentEng();if(!e)return;
  if(typeof persistRecoverySnapshot==='function'&&!persistRecoverySnapshot('abrir vista con cliente'))return toast('Guarda o resuelve el cambio pendiente antes de abrir la Vista con cliente.');
  const current=readProcessEditorLease(),token=current?.engagementId===e.id?current.token:id('EDITOR');
  const url=new URL(location.href);url.hash='process-editor';url.searchParams.set('engagement',e.id);url.searchParams.set('editorToken',token);
  const name='aunea_process_editor_'+String(e.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  const w=__auneaProcessEditorWindow&&!__auneaProcessEditorWindow.closed?__auneaProcessEditorWindow:window.open('',name);
  if(!w)return toast('El navegador ha bloqueado la pestaña. Permite ventanas emergentes para abrir la Vista con cliente.');
  __auneaProcessEditorWindow=w;
  writeProcessEditorLease(e.id,token);
  try{
    const same=w.location.hash==='#process-editor'&&new URLSearchParams(w.location.search).get('engagement')===e.id;
    if(!same)w.location.replace(url.toString());
  }catch(_err){w.location.replace(url.toString())}
  w.focus();
  render();
}
function closeProcessEditorWindow(){
  if(!isProcessEditorWindow())return;
  releaseProcessEditorLease();
  window.close();
}
// [AUNEA-FE-ASIS-CLIENT-EDITOR-074] END

// [AUNEA-FE-PROC-LIFECYCLE-030] END
