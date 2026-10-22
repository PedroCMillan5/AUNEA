// [AUNEA-FE-CORE-STATE-020] START — Estado, CRM y navegación
// PURPOSE: Estado, CRM y navegación, incluyendo invalidación única de outputs derivados cuando cambia captura.
// SOURCE: v1.0.4 aceptada; Diagnostic Master v1.2; DEC-034/040/041/043/048/051/052; B01 VR-02.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM y almacenamiento local según responsabilidad.
// CHANGE_RISK: HIGH.
const AUNEA_PRODUCT_VERSION='2.0.0';
const AUNEA_PRODUCT_STATUS='REVIEW';
const STORAGE_SCHEMA_VERSION='1';
const STORAGE_KEY = 'aunea_internal_v1'; // clave histórica conservada para no perder snapshots locales existentes
const API_DEFAULT = 'http://localhost:8000';
// VR-02: derive the rail context from the current page, not from a second persisted state or lifecycle.
// Keep the existing destinations and labels. Session steps still come only from Diagnostic Master.
const HOME_NAV = ['inicio','⌂','Inicio'];
const CRM_NAV = [
  HOME_NAV,
  ['CRM'],
  ['empresas','▦','Empresas'],['contactos','◉','Contactos'],['interacciones','◷','Interacciones'],['oportunidades','◈','Oportunidades'],['estudios','▤','Estudios'],['proyectos','▣','Proyectos']
];
// Session navigation is the Console capture context; the client reads a separate projection.
const SESSION_CONTEXT_NAV = [
  HOME_NAV,
  ['Diagnóstico 90 min'],
  ['__STAGES__'],
  ['proceso','⇢','Mapa AS-IS'],
  ['pasos','·','Pasos'],['fricciones','·','Fricciones'],['riesgos','·','Riesgos'],['impacto','·','Impacto'],
  ['__CLOSURE__']
];
const INTERNAL_WORK_NAV = [
  HOME_NAV,
  ['diagnostico','◎','Diagnóstico 90 min'],
  ['Trabajo interno'],
  ['resultados','▥','Diagnóstico'],
  ['tobe','⇢','TO-BE'],
  ['comparacion','⇄','AS-IS vs TO-BE'],
  ['escenarios','▦','Escenarios'],
  ['recomendacion','≋','Recomendación / pricing'],
  ['revision','✓','Revisión humana'],
  ['quote','▧','Cotización / entregables'],
  ['modoresultados','▤','Modo Resultados'],
  ['implementacion','✓','Decisión e implementación']
];
const SYSTEM_NAV = [
  ['Sistema'],
  ['admin','⚙','Configuración']
];

let schema = null;
function isClientDisplay(){return typeof location!=='undefined'&&['#session','#results'].includes(location.hash)}
function isProcessEditorWindow(){return typeof location!=='undefined'&&location.hash==='#process-editor'}
let state = isClientDisplay()?blankState():loadState();
state.uiMode='INTERNAL';

function blankState(){
  return {
    version:AUNEA_PRODUCT_VERSION,productVersion:AUNEA_PRODUCT_VERSION,productStatus:AUNEA_PRODUCT_STATUS,storageSchemaVersion:STORAGE_SCHEMA_VERSION,
    activePage:'inicio',activeEngagementId:null,dirty:false,
    backendUrl:API_DEFAULT,backendOnline:false,returnTo:null,
    selectedCompanyId:null,selectedContactId:null,
    companyTab:'Todas',companySearch:'',companyFilters:{sector:'',size:'',status:''},
    contactSearch:'',contactFilters:{role:'',status:'',includeInactive:false},
    interactionFilters:{companyId:'',contactId:''},opportunityFilters:{companyId:'',contactId:''},
    companyInspectorTab:'Resumen',
    companies:[],contacts:[],interactions:[],opportunities:[],engagements:[],projects:[],audit:[]
  };
}
function loadState(){
  let raw;
  try{raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch(e){return blankState()}
  const defaults=blankState();
  const s={...defaults,...raw,productVersion:AUNEA_PRODUCT_VERSION,productStatus:AUNEA_PRODUCT_STATUS,storageSchemaVersion:STORAGE_SCHEMA_VERSION};
  // UI filters are transient. Inactive contacts are excluded from ordinary lists by default
  // even when a previous browser session was closed with "Incluir inactivos" enabled.
  s.contactFilters={...defaults.contactFilters,...(raw.contactFilters||{}),includeInactive:false};
  if(s.contactFilters.status==='Inactivo')s.contactFilters.status='';
  if(!Array.isArray(s.interactions))s.interactions=[];
  if(!Array.isArray(s.opportunities))s.opportunities=[];
  return s;
}
// Records captured before the CRM contracts closed are upgraded in place rather than discarded. This
// cannot run inside loadState: state is built by the first module, and each migration lives with the
// entity that owns its schema, several modules later. Boot calls it once everything is defined.
function migrateLoadedState(){
  const moved={companies:migrateCompaniesToCrmRecord(state.companies),contacts:migrateContactsToCurrentContract(state.contacts),engagements:migrateEngagementsToLifecycle(state.engagements),process:typeof migrateProcessCaptureIntegrity==='function'?migrateProcessCaptureIntegrity(state.engagements):0,risks:typeof migrateRiskCaptureIntegrity==='function'?migrateRiskCaptureIntegrity(state.engagements):0,df074:typeof migrateDf074ToRiskDerived==='function'?migrateDf074ToRiskDerived(state.engagements):0,economics:typeof migrateEconomicInputsToDriverShape==='function'?migrateEconomicInputsToDriverShape(state.engagements):0,pg09:typeof migrateLegacyPrematureClosures==='function'?migrateLegacyPrematureClosures(state.engagements):0};
  if(moved.companies||moved.contacts||moved.engagements||moved.process||moved.risks||moved.df074||moved.economics||moved.pg09)audit(`Migración de almacenamiento: ${moved.companies} empresa(s), ${moved.contacts} contacto(s), ${moved.engagements} estudio(s), ${moved.process} estudio(s) con fricciones normalizadas, ${moved.risks} estudio(s) con riesgos legacy pendientes de revisión, ${moved.df074} estudio(s) con DF074 convertido en proyección derivada de riesgos, ${moved.economics} estudio(s) con impactos normalizados y ${moved.pg09} cierre(s) PG09 legacy reabiertos para confirmación final explícita`);
  return moved;
}
// [AUNEA-FE-PERSISTENCE-STATUS-138] START — Browser storage acknowledgement, never infer saved from nonempty fields.
// SOURCE: Simulator CANONICAL 24.4; existing localStorage owner and state.dirty.
// INPUTS: current in-memory state; OUTPUTS: saved / pending / error UI. No new business fields.
// SIDE EFFECTS: synchronous localStorage write; no optimistic success on failure. REVIEW.
let saveStateFailure=false;
let __auneaPendingFieldId=null;
function saveState(reason='Guardado manual'){
  if(isClientDisplay())return false;
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify({...state,dirty:false}));
    state.dirty=false;saveStateFailure=false;__auneaPendingFieldId=null;
    audit(reason);updateHeader();toast('Guardado localmente en este navegador.');
    return true;
  }catch(error){
    state.dirty=true;saveStateFailure=true;
    audit('No se pudo guardar localmente el estudio');
    updateHeader();toast('No se pudo guardar. Los cambios siguen pendientes en este navegador.');
    return false;
  }
}
function markDirty(reason){state.dirty=true;saveStateFailure=false;if(reason)audit(reason);updateHeader()}
// [AUNEA-FE-PERSISTENCE-STATUS-138] END
function audit(message){state.audit.unshift({ts:new Date().toISOString(),message});state.audit=state.audit.slice(0,250)}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
function now(){return new Date().toISOString()}
function esc(v){return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function attr(v){return esc(v).replace(/'/g,'&#39;')}
// [AUNEA-FE-FIELD-STATUS-136] START — Compact, accessible saved/reused indicators (visual only).
// Source names are descriptive labels; icons do not change No-Reask, ownership or confirmation.
function fieldSavedPresentation(){
  if(saveStateFailure)return {kind:'error',label:'No se pudo guardar. Hay cambios pendientes.'};
  if(state.dirty)return {kind:'pending',label:'Cambios pendientes de guardar en el estudio'};
  return {kind:'saved',label:'Valor guardado en el estudio'};
}
function fieldStatusDrawing(kind){
  if(kind==='reused')return '<path d="M4 6h10a3 3 0 0 1 3 3v4"/><path d="m13 10 4 4 4-4"/><path d="M4 18h7"/>';
  if(kind==='pending')return '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
  if(kind==='error')return '<circle cx="12" cy="12" r="9"/><path d="M12 7v7"/><path d="M12 17v.01"/>';
  return '<path d="m4.5 12.5 5 5 10-11"/>';
}
function fieldStatusIcon(kind,source=''){
  const status=kind==='reused'?{kind:'reused',label:'Autocompletado desde '+String(source||'la fuente original')}:fieldSavedPresentation();
  return '<span class="field-status-icon field-status-'+status.kind+'" data-field-save-icon="'+(kind==='saved'?'1':'0')+'" role="img" tabindex="0" aria-label="'+attr(status.label)+'" data-tooltip="'+attr(status.label)+'"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+fieldStatusDrawing(status.kind)+'</svg></span>';
}
function refreshFieldSaveIcons(){
  if(typeof document==='undefined'||!document.querySelectorAll)return;
  document.querySelectorAll('[data-field-save-icon="1"]').forEach(icon=>{
    const owner=icon.closest('[data-field]');
    const fieldId=owner?.dataset?.field||'';
    const p=state.dirty&&fieldId&&fieldId!==__auneaPendingFieldId?{kind:'saved',label:'Último valor guardado de este campo; hay cambios pendientes en otro campo'}:fieldSavedPresentation();
    icon.classList.remove('field-status-saved','field-status-pending','field-status-error');
    icon.classList.add('field-status-'+p.kind);
    icon.setAttribute('aria-label',p.label);
    icon.setAttribute('data-tooltip',p.label);
    const svg=icon.querySelector('svg');if(svg)svg.innerHTML=fieldStatusDrawing(p.kind);
  });
}
// [AUNEA-FE-FIELD-STATUS-136] END
function requiredMark(){return '<span class="required-mark" tabindex="0" title="Campo obligatorio" aria-label="Campo obligatorio">*</span>'}
const REQUIRED_LEGEND_HTML='<div class="field-help required-legend">Los campos marcados con '+requiredMark()+' son obligatorios.</div>';
function fmtDate(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}catch{return v}}
function formatDateEs(v){
  if(!v)return '—';
  try{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);const d=m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):new Date(v);return d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'})}catch{return v}
}
function currentEng(){return state.engagements.find(x=>x.id===state.activeEngagementId)||null}
function companyById(id){return state.companies.find(x=>x.id===id)||null}
function contactById(id){return state.contacts.find(x=>x.id===id)||null}
function labelFrom(setId,value){const s=schema?.option_sets?.[setId];return s?.options?.find(o=>String(o.value)===String(value))?.label||value||'—'}
function invalidateDerivedState(e,reason='Cambio en inputs del diagnóstico',sourceFieldId=null){
  if(!e)return false;
  const hadDerived=!!e.diagnosticOutput||(Array.isArray(e.scenarioResults)&&e.scenarioResults.length>0)||e.selectedScenario!=null;
  const fieldMap=schema?.engine_dependency_graph?.field_invalidation_map||{};
  const affected=sourceFieldId&&fieldMap[sourceFieldId]
    ? [...fieldMap[sourceFieldId]]
    : ['Pain','Economics','Risk','Recommendation','ProductPricing','ScenarioComparator','Deliverables'];
  // The official DiagnosticOutput is snapshot-bound, so it must not remain current after any upstream edit.
  // We nevertheless retain the exact dependency plan required by RULE_RECALC_INVALIDATION so backend
  // recomputation and internal review know what actually became stale instead of treating every engine equally.
  e.staleDerivedState={sourceFieldId:sourceFieldId||null,reason,affected,markedAt:now()};
  e.diagnosticOutput=null;e.scenarioResults=[];e.selectedScenario=null;e.selectedScenarioIndex=0;e.lastEngineRunAt=null;
  e.lastEngineSnapshotVersion=null;
  if(hadDerived)audit(`Resultados derivados invalidados: ${reason} · STALE: ${affected.join(' → ')}`);
  return hadDerived;
}
function refreshPendingFieldVisual(fid,e=currentEng()){
  if(typeof document==='undefined'||!fid||!e)return;
  const base=(String(fid).match(/^(DF\d{3})/)||[])[1]||String(fid);
  const host=document.querySelector(`.field[data-field="${base}"]`);
  if(!host||!host.classList?.contains('field-pending'))return;
  const field=(schema?.fields||[]).find(f=>f.Field_ID===base);
  if(!field)return;
  const value=typeof effectiveValue==='function'?effectiveValue(field,e):e.answers?.[base];
  const present=typeof canonicalFieldValuePresent==='function'
    ?canonicalFieldValuePresent(field,value,e)
    :(typeof valuePresent==='function'?valuePresent(value):value!==undefined&&value!==null&&value!=='');
  const issue=typeof canonicalFieldValidationIssue==='function'?canonicalFieldValidationIssue(field,value,e):'';
  const integrity=typeof canonicalFieldIntegrityIssues==='function'
    ?canonicalFieldIntegrityIssues(e).some(x=>x.id===base||x.fieldId===base)
    :false;
  if(present&&!issue&&!integrity)host.classList.remove('field-pending');
}
function setAnswer(fid,value){
  // Map confirmation validates ProcessStep topology and the client-reviewed flow. DF046–DF055
  // are process-level projections/findings reviewed afterwards in Console; their capture is
  // not a new edit of the ProcessStep owner (DEC-050/065). Final PG09 snapshots still go stale.
  function invalidateAsisForCanonicalAnswer(e,fid){
    if(!e||fid==='DF093')return;
    const f=(schema?.fields||[]).find(x=>x.Field_ID===fid);
    const stage=String(f?.Stage_ID||'');
    const hasLayer=Object.values(e.layerConfirmations||{}).some(v=>v===true);
    if(stage==='S09'){
      if(e.confirmedAsIs&&typeof invalidateAsIsClosure==='function')
        invalidateAsIsClosure(e,'dato del cierre '+fid+' modificado');
      return;
    }
    const complementary=stage==='S04'&&/^DF0(?:4[6-9]|5[0-5])$/.test(fid);
    if(complementary){
      // Explicitly invalidate any sealed handoff, never silently change a confirmed snapshot.
      // Unchanged ProcessSteps and client layer confirmations remain valid.
      if(e.confirmedAsIs&&typeof invalidateAsIsClosure==='function')
        invalidateAsIsClosure(e,'dato complementario '+fid+' modificado');
      return;
    }
    if((e.confirmedAsIs||hasLayer)&&typeof invalidateProcessLayers==='function')
      invalidateProcessLayers(e,'map');
  }
  const e=currentEng();if(!e)return;
  const detailMatch=String(fid||'').match(/^(DF\d{3})__(step|steps)$/);
  if(detailMatch){
    const parentFid=detailMatch[1],details=e.answerDetails||(e.answerDetails={});
    if(JSON.stringify(details[fid])===JSON.stringify(value))return;
    invalidateAsisForCanonicalAnswer(e,parentFid);
    details[fid]=value;e.updatedAt=now();
    if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','captura vinculada a paso');
    invalidateDerivedState(e,`detalle ${fid} actualizado`,parentFid);markDirty(`Detalle ${fid} actualizado`);if(typeof refreshCaptureProgress==='function')refreshCaptureProgress();if(typeof refreshPendingFieldVisual==='function')refreshPendingFieldVisual(parentFid,e);
    return;
  }
  // A repeated render/change event is not a new capture version and must not reopen PG09.
  if(JSON.stringify(e.answers?.[fid])===JSON.stringify(value))return;
  // Invalidate the exact owner-dependent confirmation, not the client map when the
  // consultant is only classifying supplementary findings from that already-reviewed map.
  invalidateAsisForCanonicalAnswer(e,fid);
  __auneaPendingFieldId=fid;
  e.answers[fid]=value;e.updatedAt=now();
  // A reused value corrected here must reach its owner, not become a second copy (DEC-050). The
  // engagement still keeps the snapshot of the value it used. Guarded because the No-Reask module
  // that owns the mapping loads after this one.
  if(typeof writeThroughToOwner==='function')writeThroughToOwner(fid,value,e);
  // Capturing an answer is what starts Sesión 1 — an action, not a screen being open. The helper is a
  // no-op unless the engagement is exactly one step behind, so this never skips or rewrites a state.
  if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','primera captura de la sesión');
  invalidateDerivedState(e,`respuesta ${fid} actualizada`,fid);markDirty(`Respuesta ${fid} actualizada`);if(typeof refreshCaptureProgress==='function')refreshCaptureProgress();if(typeof refreshPendingFieldVisual==='function')refreshPendingFieldVisual(fid,e);
  // [AUNEA-FE-DEMAND-SLA-REFRESH-144] START — Display-only refresh after changing the owner fields.
  if((fid==='DF025'||fid==='DF026')&&typeof refreshS03ServiceTimeComparison==='function')refreshS03ServiceTimeComparison(e);
  if(fid==='DF026'&&typeof demandTargetTimeBlock==='function'){
    const host=document.querySelector('[data-demand-target-cycle]');
    if(host){const template=document.createElement('div');template.innerHTML=demandTargetTimeBlock(e);host.replaceWith(template.firstElementChild);bindDemandTargetCycle();}
  }
  // [AUNEA-FE-DEMAND-SLA-REFRESH-144] END
}
function normalizeArray(v){if(Array.isArray(v))return v;if(v===null||v===undefined||v==='')return [];return [v]}

// Pages that belong to the 90-minute session. On these the top bar shows the private-console marker
// and the step progress instead of the CRM chrome (IMG90-00-02 / IMG90-01).
const SESSION_SURFACE_PAGES=new Set(['diagnostico','proceso','pasos','fricciones','riesgos','impacto']);
const CRM_SURFACE_PAGES=new Set(['inicio','empresas','contactos','interacciones','oportunidades','estudios','proyectos']);

function stageList(){return (schema&&schema.flow)||[]}
function contextualNav(){
  if(SESSION_SURFACE_PAGES.has(state.activePage))return SESSION_CONTEXT_NAV;
  const internal=INTERNAL_WORK_NAV.some(x=>x.length>1&&x[0]===state.activePage&&x!==HOME_NAV);
  return [...(internal?INTERNAL_WORK_NAV:CRM_NAV),...SYSTEM_NAV];
}
function currentStageIndex(){const e=currentEng(),f=stageList();if(!e||!f.length)return -1;return f.findIndex(s=>s.Stage_ID===(e.stageId||'S01'))}
// AS-IS progress projection (owner block AUNEA-FE-SHELL-CONTEXT-090): display context only.
// DEC-065: AS-IS owns visual session pages 5–8; the stored stage may still be S08 (PG04).
// The header reads the surface stage; capture navigation and returnTo keep their original owners.
function visibleSessionStageIndex(){
  const surfaceStage={proceso:'S04',pasos:'S04',fricciones:'S05',riesgos:'S06',impacto:'S07'}[state.activePage];
  if(!surfaceStage)return currentStageIndex();
  const index=stageList().findIndex(s=>s.Stage_ID===surfaceStage);
  return index>=0?index:currentStageIndex();
}
// End AS-IS progress projection.
// The stage clock is the cumulative window of the canonical per-stage minutes — derived from the flow,
// never a hardcoded schedule. Stage 1 of the shipped flow yields 00:00 – 06:00, as the references show.
function stageWindow(i){
  const f=stageList();if(i<0||!f.length)return '';
  // Minutes:seconds elapsed within the session, as the references show it: a 6-minute first stage
  // reads 00:00 – 06:00, not 00:06.
  const mins=n=>`${String(n).padStart(2,'0')}:00`;
  let start=0;for(let k=0;k<i;k++)start+=Number(f[k].Minutos_objetivo)||0;
  return `${mins(start)} – ${mins(start+(Number(f[i].Minutos_objetivo)||0))}`;
}

function updateHeader(){
  const e=currentEng(),c=e?companyById(e.companyId):null;
  const inSession=SESSION_SURFACE_PAGES.has(state.activePage)&&!!e;
  document.body.classList.toggle('shell-session',inSession);
  const crumb=document.getElementById('breadcrumb');
  if(crumb){
    // CRM surfaces are titled by where you are (IMG90-00-01 "CRM · Empresas"); session surfaces by the
    // session itself, with the open study identified in the rail rather than repeated in the top bar.
    const navLabel=(contextualNav().find(x=>x.length>1&&x[0]===state.activePage)||[])[2];
    crumb.textContent=inSession
      ? ''
      : CRM_SURFACE_PAGES.has(state.activePage)
        ? `CRM · ${navLabel||'Inicio'}`
        : (e?`${c?.name||'Empresa'} · ${e.title||e.processName||'Estudio'}`:'Cockpit de consultoría');
  }
  // The console marker is not decoration: it is the standing reminder that this surface is private and
  // is not what the client is looking at (DEC-048/049).
  const ctx=document.getElementById('topbarContext');
  if(ctx)ctx.innerHTML='';
  const sp=document.getElementById('stepProgress');
  if(sp){
    const flow=stageList(),i=visibleSessionStageIndex();
    sp.innerHTML=(inSession&&flow.length&&i>=0)
      ? `<div class="step-progress"><small>Paso ${i+1} de ${flow.length}</small><div class="step-dots">${flow.map((_,k)=>`<i class="${k<i?'on':k===i?'now':''}"></i>`).join('')}</div></div>`
        +`<span class="stage-clock">◷ ${stageWindow(i)}</span>`
      : '';
  }
  const ss=document.getElementById('saveState');if(ss)ss.textContent=saveStateFailure?'Error al guardar':state.dirty?'Cambios sin guardar':'Guardado local';
  if(typeof refreshFieldSaveIcons==='function')refreshFieldSaveIcons();
  const bb=document.getElementById('backendBadge');if(bb){bb.className=`backend-badge ${state.backendOnline?'online':'offline'}`;bb.innerHTML=`<span></span>${state.backendOnline?`Backend ${esc(state.backendVersion||'online')}`:'Backend no conectado'}`}
  renderRailHead();
}

// [AUNEA-FE-SHELL-CONTEXT-090] START — Brand stays in rail; existing Engagement owner stays in header.
// Switching/removing/opening a context writes through the existing actions and never duplicates study state.
function renderRailHead(){
  const brand=document.getElementById('railHead');
  if(brand)brand.innerHTML='<div class="brand"><img class="aunea-brand-logo" src="./assets/brand/Logo.png" alt="AUNEA System"></div>';
  const host=document.getElementById('topbarActiveStudy');if(!host)return;
  const e=currentEng(),c=e?companyById(e.companyId):null;
  if(!e){host.innerHTML='<div class="topbar-no-study">Sin estudio seleccionado</div>';return;}
  host.innerHTML=`<div class="topbar-study">
    <div class="topbar-study-main" title="${esc(c?.name||'Empresa')} · ${esc(e.title||e.processName||'Diagnóstico')}">
      <small>Contexto activo</small>
      <b>${esc(c?.name||'Empresa')}</b>
      <span>${esc(e.title||e.processName||'Diagnóstico')}</span>
    </div>
    <details class="topbar-study-disclosure">
      <summary aria-label="Acciones del estudio activo">Gestionar <span aria-hidden="true">⌄</span></summary>
      <div class="topbar-study-menu">
        <div class="topbar-study-menu-status">${statusBadge(engagementStatus(e))}</div>
        <button type="button" class="btn btn-small btn-primary" data-open-context="${esc(e.id)}">Abrir / Continuar</button>
        <button type="button" class="btn btn-small" data-change-context="1">Cambiar estudio</button>
        <button type="button" class="btn btn-small" data-clear-context="1">Quitar selección</button>
      </div>
    </details>
  </div>`;
}
// [AUNEA-FE-SHELL-CONTEXT-090] END

function firstForwardSessionBlocker(e,targetId){
  if(!e)return null;
  const flow=stageList(),from=currentStageIndex(),to=flow.findIndex(x=>x.Stage_ID===targetId);
  if(from<0||to<=from||typeof stageAdvanceProblem!=='function')return null;
  // The sidebar must not bypass an invalid earlier stage merely because a later one
  // was prefilled by an import. Backward navigation remains freely available.
  for(let i=from;i<to;i++){
    const issue=stageAdvanceProblem(e,flow[i].Stage_ID);
    if(issue)return {stageId:flow[i].Stage_ID,...issue};
  }
  return null;
}
function renderNav(){
  const n=document.getElementById('nav');if(!n)return;
  const e=currentEng(),flow=stageList(),active=currentStageIndex();
  const out=[];
  for(const x of contextualNav()){
    if(x[0]==='__STAGES__'||x[0]==='__CLOSURE__'){
      // Keep context and closure in canonical order; AS-IS stages have one shared menu group.
      flow.forEach((s,i)=>{
        if(['S04','S05','S06','S07'].includes(s.Stage_ID))return;
        if((s.Stage_ID==='S09')!==(x[0]==='__CLOSURE__'))return;
        const on=e&&state.activePage==='diagnostico'&&i===active;
        const reviewed=!!e&&typeof completionStageReviewed==='function'&&completionStageReviewed(s,e);
        const available=!!e&&(i<=active||(!firstForwardSessionBlocker(e,s.Stage_ID)&&(reviewed||(s.Stage_ID==='S09'&&((typeof allProcessLayersConfirmed==='function'&&allProcessLayersConfirmed(e))||e.confirmedAsIs)))));
        const locked=!!e&&!available;
        out.push(`<button class="nav-item nav-step ${on?'active':''} ${reviewed?'done':''} ${locked?'locked':''}" data-stage-nav="${s.Stage_ID}" ${locked?'disabled aria-disabled="true"':''}><span class="nav-num">${i+1}</span>${esc(s.Stage_ES)}</button>`);
      });
      continue;
    }
    out.push(x.length===1
      ? `<div class="nav-group">${esc(x[0])}</div>`
      : `<button class="nav-item ${['pasos','fricciones','riesgos','impacto'].includes(x[0])?'asis-private-nav':''} ${state.activePage===x[0]?'active':''}" data-page="${x[0]}"><span class="nav-icon">${x[1]}</span>${esc(x[2])}</button>`);
  }
  n.innerHTML=out.join('');
}
// [AUNEA-FE-PROC-VIEWPORT-052] START — Keep AS-IS viewport through in-place redraws.
function render(){
  // The approved client-first workspace reuses the current Engagement and existing CRUD modals.
  // Its fullscreen chrome is presentation-only; the read-only #session is unaffected.
  document.body.classList.toggle('mode-process-editor',isProcessEditorWindow());
  const previousCanvas=document.querySelector('.flow-canvas');
  const previousProcessMain=document.querySelector('.client-process-main');
  const previousWorkspace=document.querySelector('[data-process-engagement]');
  const sameProcess=state.activePage==='proceso'&&previousCanvas&&previousWorkspace?.dataset.processEngagement===currentEng()?.id;
  const previousViewport=sameProcess?{
    left:previousCanvas.scrollLeft,
    top:previousCanvas.scrollTop,
    mainTop:previousProcessMain?.scrollTop||0,
    windowX:typeof window!=='undefined'?window.scrollX:0,
    windowY:typeof window!=='undefined'?window.scrollY:0
  }:null;
  const companiesViewport=state.activePage==='empresas';
  document.documentElement.classList.toggle('page-companies',companiesViewport);
  document.body.classList.toggle('page-companies',companiesViewport);
  renderNav();updateHeader();
  const fn=pages[state.activePage]||pages.inicio;
  document.getElementById('content').innerHTML=fn();
  bindCommon();postBind();
  // DEC-074: read-only time projection updates only its own node after render.
  if(typeof bindAsisTemporalBars==='function')bindAsisTemporalBars();
  // Defensive runtime guard: each private AS-IS layer must expose exactly one confirmation bar.
  // This removes any duplicate legacy/runtime insertion without changing the layer model or confirmation state.
  if(typeof dedupeProcessLayerConfirmations==='function')dedupeProcessLayerConfirmations();
  if(typeof watchProcessLayerConfirmations==='function')watchProcessLayerConfirmations();
  if(typeof applyAsisConsoleEditLock==='function')applyAsisConsoleEditLock();
  if(previousViewport){
    // The routed graph is measured/drawn in a requestAnimationFrame by process.js.
    // Restoring before that frame can be clamped to x=0 when Impact replaces the layout.
    const restore=()=>{
      if(state.activePage!=='proceso'||currentEng()?.id!==previousWorkspace.dataset.processEngagement)return;
      const canvas=document.querySelector('.flow-canvas');
      const processMain=document.querySelector('.client-process-main');
      if(canvas){
        canvas.scrollLeft=previousViewport.left;
        canvas.scrollTop=previousViewport.top;
      }
      if(processMain)processMain.scrollTop=previousViewport.mainTop;
      if(typeof window!=='undefined'&&typeof window.scrollTo==='function'&&!isProcessEditorWindow()){
        window.scrollTo(previousViewport.windowX,previousViewport.windowY);
      }
    };
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(restore));
    else restore();
  }
  // [AUNEA-FE-PROC-VIEWPORT-052] END
  // Republish the client-safe projection on every render. Navigating between stages changes what the
  // client should be seeing but never goes through markDirty, so relying on autosave alone left the
  // shared window frozen on whichever stage it was opened at. The spec is explicit that a manual
  // refresh must not be the pattern of use (90MIN UI SPEC §3.3).
  if(typeof publishSessionSnapshot==='function')publishSessionSnapshot(currentEng());
}
let __auneaProcessLayerConfirmObserver=null;
function dedupeProcessLayerConfirmations(){
  if(typeof document==='undefined'||!['pasos','fricciones','riesgos','impacto'].includes(state.activePage))return;
  const layer={pasos:'map',fricciones:'frictions',riesgos:'risks',impacto:'impact'}[state.activePage];
  const buttons=[...document.querySelectorAll('[data-confirm-process-layer="'+layer+'"]')];
  buttons.slice(1).forEach(button=>{
    const bar=button.closest('.flow-confirm');
    if(bar)bar.remove();else button.remove();
  });
}
function watchProcessLayerConfirmations(){
  if(typeof MutationObserver==='undefined'||typeof document==='undefined'||!document.body)return;
  if(__auneaProcessLayerConfirmObserver)__auneaProcessLayerConfirmObserver.disconnect();
  __auneaProcessLayerConfirmObserver=new MutationObserver(()=>dedupeProcessLayerConfirmations());
  __auneaProcessLayerConfirmObserver.observe(document.body,{childList:true,subtree:true});
}
function setPage(page){
  // All navigation surfaces obey the same AS-IS layer confirmation gate.
  const asisSequence=['pasos','fricciones','riesgos','impacto'];
  const target=asisSequence.indexOf(page),current=asisSequence.indexOf(state.activePage);
  if(target>0){
    const e=currentEng(),conf=e&&(typeof processLayerState==='function'?processLayerState(e):(e.layerConfirmations||{}));
    const keys=['map','frictions','risks','impact'];
    const firstMissing=keys.slice(0,target).find(key=>!conf?.[key]||(typeof processLayerIntegrityIssues==='function'&&processLayerIntegrityIssues(e,key).length)||(key==='map'&&typeof pg05PendingReviewIssues==='function'&&pg05PendingReviewIssues(e).length));
    if(firstMissing){
      const labels={map:'Pasos',frictions:'Fricciones',risks:'Riesgos'};
      if(typeof toast==='function')toast('Confirma '+(labels[firstMissing]||firstMissing)+' antes de avanzar.');
      return;
    }
  }
  if(['diagnostico','proceso','pasos','fricciones','riesgos','impacto','resultados','tobe','comparacion','revision','modoresultados','implementacion','recomendacion','escenarios','quote'].includes(page)&&!currentEng()){toast('Abre o crea un estudio antes.');state.activePage='estudios';render();return}const e=currentEng(),previousPage=state.activePage;if(page==='diagnostico'&&e&&typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','apertura de la primera sesión');if(page==='proceso'&&e&&!['cliente','fricciones','riesgos','impacto'].includes(e.processTab))e.processTab='cliente';state.activePage=page;render()}
function goToProcessFromStage(){const e=currentEng();if(e){state.returnTo={page:'diagnostico',stageId:e.stageId};e.processTab='cliente'}setPage('proceso')}
function returnToStage(){const e=currentEng(),rt=state.returnTo;if(e&&rt)e.stageId=rt.stageId;state.returnTo=null;setPage('diagnostico')}
// screenId is the approved reference a screen must reproduce (e.g. "I90-00-01"). It is internal
// traceability shown above the title, exactly as the references do, and carries no business meaning.
function pageTop(title,subtitle,actions='',screenId=''){return `<div class="page-head"><div><h1>${esc(title)}</h1><p class="subtitle">${subtitle}</p></div><div class="head-actions">${actions}</div></div>`}
// Main column plus persistent inspector, and the sticky action bar. Both come from the reference set:
// every approved screen is built from these two shapes.
function workspace(main,inspector,opts={}){return `<div class="workspace${opts.wide?' wide-inspector':''}"><div>${main}</div><aside class="inspector">${inspector}</aside></div>`}
function insCard(title,body,opts={}){return `<div class="ins-card${opts.accent?' accent':''}">${title?`<div class="ins-head"><h3>${opts.icon?`${opts.icon} `:''}${esc(title)}</h3>${opts.action||''}</div>`:''}${body}</div>`}
function kvRows(rows){return `<dl class="kv">${rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`}
function actionBar(left,right){return `<div class="action-bar">${left||''}<div class="ab-right">${right||''}</div></div>`}
// Provenance chip for a value that was reused instead of re-asked (DEC-040/050).
function prefillChip(source){return source?`<span class="prefill-chip">Prerrellenado desde ${esc(source)}</span>`:''}
function section(title,sub,body,actions=''){return `<div class="card card-pad section"><div class="section-title"><div><h2>${esc(title)}</h2>${sub?`<p>${sub}</p>`:''}</div><div class="section-actions">${actions}</div></div>${body}</div>`}
function statusClass(s=''){const z=s.toLowerCase();if(z.includes('cerrado')||z.includes('confirm')||z.includes('listo')||z.includes('ganado'))return'green';if(z.includes('sesión')||z.includes('sesion')||z.includes('diagn')||z.includes('reun'))return'amber';if(z.includes('trabajo interno')||z.includes('propuesta')||z.includes('resultado'))return'blue';if(z.includes('perdido')||z.includes('bloq'))return'red';return''}
function statusBadge(s){return `<span class="status ${statusClass(s)}">${esc(s||'Borrador')}</span>`}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2600)}

function bindCommon(){
  // A confirmed AS-IS layer shows its values, never editable controls.
  // Undo triggers a fresh render and restores the original controls.
  document.querySelectorAll('.asis-layer-confirmed').forEach(root=>{
    root.querySelectorAll('input,select,textarea').forEach(control=>{
      control.disabled=true;
      control.setAttribute('aria-disabled','true');
    });
  });
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>setPage(b.dataset.page));
  document.querySelectorAll('[data-stage-nav]').forEach(b=>b.onclick=()=>{
    const e=currentEng();
    if(!e){toast('Abre o crea un estudio antes.');setPage('estudios');return}
    const blocker=firstForwardSessionBlocker(e,b.dataset.stageNav);
    if(blocker){toast(blocker.message);return}
    e.stageId=b.dataset.stageNav;setPage('diagnostico');
  });
  document.getElementById('saveBtn').onclick=()=>saveState();
  const mm=document.getElementById('mobileMenu');if(mm)mm.onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
  document.querySelectorAll('[data-open-eng]').forEach(b=>b.onclick=()=>{state.activeEngagementId=b.dataset.openEng;setPage(b.dataset.openEngPage==='resultados'?'resultados':'diagnostico')});
  document.querySelectorAll('[data-open-context]').forEach(b=>b.onclick=()=>{const e=state.engagements.find(x=>x.id===b.dataset.openContext)||currentEng(); if(!e)return; state.activeEngagementId=e.id; state.activePage='diagnostico'; render();});
  document.querySelectorAll('[data-change-context]').forEach(b=>b.onclick=()=>{state.activeEngagementId=null; state.activePage='estudios'; render();});
  document.querySelectorAll('[data-clear-context]').forEach(b=>b.onclick=()=>{state.activeEngagementId=null; state.activePage='inicio'; render();});
  // P05 is where the Engagement lifecycle is driven by hand. The button only ever offers the one
  // state that legitimately follows, so the UI cannot produce a status the contract does not define.
  document.querySelectorAll('[data-advance-eng]').forEach(b=>b.onclick=()=>{
    const e=state.engagements.find(x=>x.id===b.dataset.advanceEng);
    if(!setEngagementStatus(e,nextEngagementStatus(e),'avance manual desde Estudios'))return toast('Ese estado no es el siguiente del ciclo de vida.');
    render();
  });
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{
    const e=currentEng();if(!e)return;
    const blocker=firstForwardSessionBlocker(e,b.dataset.stage);
    if(blocker){toast(blocker.message);return}
    e.stageId=b.dataset.stage;markDirty();render();
  });
  bindForms();
}

function bindDemandTargetCycle(){
  const valueEl=document.querySelector('[data-demand-target-value]'),unitEl=document.querySelector('[data-demand-target-unit]');
  if(!valueEl||!unitEl)return;
  const update=()=>{
    const e=currentEng();if(!e)return;
    const raw=valueEl.value.trim(),value=raw===''?'':Number(raw),unit=unitEl.value;
    if((raw!==''&&(!Number.isFinite(value)||value<=0))||!['min','h','day','week'].includes(unit))return;
    const next={value,unit};
    const details=e.answerDetails||(e.answerDetails={});
    if(JSON.stringify(details.demand_target_end_to_end)!==JSON.stringify(next)){
      details.demand_target_end_to_end=next;
      e.updatedAt=now();
      if(typeof invalidateDerivedState==='function')invalidateDerivedState(e,'objetivo temporal actualizado','DF026');
      markDirty('Objetivo end-to-end actualizado');
    }
    const current=typeof numberParts==='function'?numberParts(e.answers?.DF026):e.answers?.DF026||{};
    const factors={min:1,h:60,day:1440,week:10080},actual=Number(current.value)*factors[current.unit],target=Number(value)*factors[unit];
    const valid=current.value!==''&&current.value!=null&&Number.isFinite(actual)&&actual>0&&value!==''&&Number.isFinite(target)&&target>0;
    const output=document.querySelector('[data-demand-target-comparison]');
    if(output)output.textContent=valid?'Reducción deseada respecto al tiempo actual: '+((1-target/actual)*100).toLocaleString('es-ES',{maximumFractionDigits:2})+' %.':'Indica un objetivo y un tiempo actual comparable para calcular la reducción deseada.';
  };
  valueEl.addEventListener('input',update);
  unitEl.addEventListener('change',update);
}
function bindForms(){
  bindDemandTargetCycle();
  document.querySelectorAll('[data-answer]').forEach(el=>{const event=el.type==='text'||el.tagName==='TEXTAREA'?'input':'change';el.addEventListener(event,()=>setAnswer(el.dataset.answer,el.value))});
  document.querySelectorAll('[data-multi]').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.multi;
    const chosen=()=>[...document.querySelectorAll(`[data-multi="${fid}"]:checked`)].map(x=>x.value);
    const max=typeof canonicalMultiSelectMaximum==='function'?canonicalMultiSelectMaximum(fid):null;
    if(max&&new Set(chosen()).size>max){
      el.checked=false;
      if(typeof toast==='function')toast(`Selecciona como máximo ${max} opciones.`);
      return;
    }
    setAnswer(fid,chosen());
    if((fid==='DF008'||fid==='DF009')&&typeof refreshPg01DisclosureValidation==='function')refreshPg01DisclosureValidation();
  }));
  document.querySelectorAll('[data-segment]').forEach(b=>b.onclick=()=>{
    const x=typeof window!=='undefined'?window.scrollX:0,y=typeof window!=='undefined'?window.scrollY:0;
    setAnswer(b.dataset.segment,b.dataset.value);render();
    const restore=()=>{if(typeof window!=='undefined'&&typeof window.scrollTo==='function')window.scrollTo(x,y)};
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(restore);else restore();
  });
  document.querySelectorAll('[data-remove-company]').forEach(b=>b.onclick=()=>removeCompany(b.dataset.removeCompany));
  document.querySelectorAll('[data-contact-study]').forEach(b=>b.onclick=()=>createStudyFromContact(b.dataset.contactStudy));
  document.querySelectorAll('[data-crm-tab]').forEach(b=>b.onclick=()=>{state.crmTab=b.dataset.crmTab;render()});
  document.querySelectorAll('[data-crm-status-filter]').forEach(el=>el.addEventListener('change',()=>{state.contactFilters.status=el.value;render()}));
  document.querySelectorAll('[data-crm-hide-lost]').forEach(el=>el.addEventListener('change',()=>{state.contactFilters.hideLost=el.checked;render()}));
  document.querySelectorAll('[data-edit-step]').forEach(b=>b.onclick=()=>openStepModal(b.dataset.editStep));
  document.querySelectorAll('[data-delete-step]').forEach(b=>b.onclick=()=>supersedeStep(b.dataset.deleteStep));
  document.querySelectorAll('[data-edit-friction]').forEach(b=>b.onclick=()=>openFrictionModal(b.dataset.editFriction));
  document.querySelectorAll('[data-delete-friction]').forEach(b=>b.onclick=()=>supersedeFriction(b.dataset.deleteFriction));
  document.querySelectorAll('[data-process-tab]').forEach(b=>b.onclick=()=>{currentEng().processTab=b.dataset.processTab;render()});
  document.querySelectorAll('[data-goto-process]').forEach(b=>b.onclick=()=>goToProcessFromStage());
  document.querySelectorAll('[data-open-process-editor]').forEach(b=>b.onclick=()=>openProcessEditorWindow());
}

// addCompany lives in app-no-reask-v1.js: the canonical version drives Sector/País from
// REF_DOMAIN / REF_COUNTRY_ISO3166 instead of free text (PROJECT_RULES: prefer structured controls).
function createStudyFromContact(contactId){const ct=contactById(contactId),cp=companyById(ct.companyId);const e={id:id('ENG'),companyId:cp.id,contactIds:[ct.id],businessAreaId:'',title:`Diagnóstico · ${cp.name}`,processName:'',status:ENGAGEMENT_LIFECYCLE[0],lifecycleLog:[],stageId:'S01',answers:{DF001:cp.name,DF002:cp.sector||'',DF005:cp.country||'',DF006:ct.id},processSteps:[],frictions:[],risks:[],economicInputs:[],processTab:'',confirmedAsIs:false,diagnosticOutput:null,scenarioResults:[],selectedScenario:null,selectedScenarioIndex:0,createdAt:now(),updatedAt:now()};state.engagements.unshift(e);state.activeEngagementId=e.id;if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','apertura de la primera sesión');state.activePage='diagnostico';markDirty('Engagement creado desde contacto');render()}
// Company, Contact, Interaction and Opportunity records moved to their own domain modules when the
// CRM contracts closed (DEC-051/057/058). addContact, editContact, removeContact, removeCompany and
// contactHistory lived here and are retired: the first three are owned by domain/contact.js, company
// archiving by domain/company.js, and contact history is now derived from domain/interaction.js
// instead of being pattern-matched out of the audit log.
function studyModalSelect(id,label,options,placeholder,disabled=false){
  return `<div class="field full"><label>${esc(label)}</label><input type="hidden" id="${attr(id)}" value=""><details class="aunea-select contact-form-select ${disabled?'is-disabled':''}" data-study-select="${attr(id)}"><summary><span data-study-select-label="${attr(id)}">${esc(placeholder)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="${attr(label)}">${disabled?'':options.map(o=>`<button type="button" role="option" data-study-select-option="${attr(id)}" data-value="${attr(o.value)}">${esc(o.label)}</button>`).join('')}</div></details></div>`;
}
function studyContactOptions(companyId){
  return state.contacts.filter(c=>c.companyId===companyId&&c.status!=='Inactivo').map(c=>({value:c.id,label:contactFullName(c)})).sort((a,b)=>a.label.localeCompare(b.label,'es'));
}
function bindNewStudyNestedSelectors(){
  document.querySelectorAll('[data-study-select-option]').forEach(btn=>btn.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    const id=btn.dataset.studySelectOption,val=btn.dataset.value||'',input=document.getElementById(id);if(!input)return;
    input.value=val;
    const box=btn.closest('details.aunea-select'),label=box?.querySelector(`[data-study-select-label="${id}"]`);
    if(label)label.textContent=btn.textContent.trim();if(box)box.open=false;
    if(id==='mStudyCompany'){
      const wrap=document.getElementById('mStudyContactWrap'),contacts=studyContactOptions(val);
      if(wrap)wrap.innerHTML=studyModalSelect('mStudyContact','Contacto principal',contacts,contacts.length?'Selecciona contacto':'No hay contactos activos',!contacts.length);
      bindNewStudyNestedSelectors();
    }
  });
}
function newStudy(){
  if(!state.companies.length)return toast('Crea primero una empresa.');
  const companies=state.companies.filter(c=>c.status!=='Archivada').map(c=>({value:c.id,label:c.name})).sort((a,b)=>a.label.localeCompare(b.label,'es'));
  if(!companies.length)return toast('No hay empresas activas disponibles.');
  openModal('Nuevo estudio',`<div class="form-grid">
    ${studyModalSelect('mStudyCompany','Empresa',companies,'Selecciona empresa')}
    <div id="mStudyContactWrap">${studyModalSelect('mStudyContact','Contacto principal',[],'Selecciona primero una empresa',true)}</div>
    <div class="field full"><label>Nombre del estudio</label><input id="mStudyTitle" placeholder="Ej. Diagnóstico de intake comercial"></div>
  </div>`,()=>{
    const companyId=document.getElementById('mStudyCompany')?.value||'',contactId=document.getElementById('mStudyContact')?.value||'';
    if(!companyId)return toast('Selecciona una empresa.');
    if(!contactId)return toast('Selecciona un contacto de esa empresa.');
    const ct=contactById(contactId);if(!ct||ct.companyId!==companyId)return toast('El contacto debe pertenecer a la empresa seleccionada.');
    createStudyFromContact(ct.id);
    const e=currentEng(),title=document.getElementById('mStudyTitle')?.value?.trim();if(title)e.title=title;closeModal();render();
  });
  bindNewStudyNestedSelectors();
}

function createProjectFromEngagement(){const e=currentEng();if(!e)return;const result=recordImplementationDecision(e);if(!result.ok){toast(result.error);state.activePage='implementacion';render();return}state.activePage='proyectos';render();toast(result.existing?'Este estudio ya tiene un proyecto vinculado.':'Proyecto creado con referencias a las versiones aprobadas.')}

function openModal(title,body,onSave,saveLabel='Guardar'){const legend=body.includes('required-mark')?REQUIRED_LEGEND_HTML:'';document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" id="modalClose">×</button></div><div class="modal-body">${legend}${body}</div><div class="modal-foot"><button class="btn" id="modalCancel">Cancelar</button><button class="btn btn-primary" id="modalSave">${esc(saveLabel)}</button></div></div></div>`;document.getElementById('modalClose').onclick=closeModal;document.getElementById('modalCancel').onclick=closeModal;document.getElementById('modalSave').onclick=onSave}
function closeModal(){document.getElementById('modalRoot').innerHTML=''}
// [AUNEA-FE-CORE-STATE-020] END
