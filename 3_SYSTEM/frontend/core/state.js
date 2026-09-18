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
  ['proceso','⇢','Editor del mapa AS-IS']
];
const INTERNAL_WORK_NAV = [
  HOME_NAV,
  ['diagnostico','◎','Diagnóstico 90 min'],
  ['Trabajo interno'],
  ['resultados','▥','Diagnóstico'],['recomendacion','≋','Solución'],['escenarios','▦','Escenarios'],['quote','▧','Entregables']
];
const SYSTEM_NAV = [
  ['Sistema'],
  ['admin','⚙','Configuración']
];

let schema = null;
function isClientDisplay(){return typeof location!=='undefined'&&['#session','#results'].includes(location.hash)}
let state = isClientDisplay()?blankState():loadState();
state.uiMode='INTERNAL';

function blankState(){
  return {
    version:AUNEA_PRODUCT_VERSION,productVersion:AUNEA_PRODUCT_VERSION,productStatus:AUNEA_PRODUCT_STATUS,storageSchemaVersion:STORAGE_SCHEMA_VERSION,
    activePage:'inicio',activeEngagementId:null,dirty:false,
    backendUrl:API_DEFAULT,backendOnline:false,returnTo:null,
    selectedCompanyId:null,selectedContactId:null,
    companyTab:'Todas',companySearch:'',companyFilters:{sector:'',size:'',status:''},
    contactSearch:'',contactFilters:{role:'',status:'',language:''},
    companyInspectorTab:'Resumen',
    companies:[],contacts:[],interactions:[],opportunities:[],engagements:[],projects:[],audit:[]
  };
}
function loadState(){
  let raw;
  try{raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch(e){return blankState()}
  const s={...blankState(),...raw,productVersion:AUNEA_PRODUCT_VERSION,productStatus:AUNEA_PRODUCT_STATUS,storageSchemaVersion:STORAGE_SCHEMA_VERSION};
  if(!Array.isArray(s.interactions))s.interactions=[];
  if(!Array.isArray(s.opportunities))s.opportunities=[];
  return s;
}
// Records captured before the CRM contracts closed are upgraded in place rather than discarded. This
// cannot run inside loadState: state is built by the first module, and each migration lives with the
// entity that owns its schema, several modules later. Boot calls it once everything is defined.
function migrateLoadedState(){
  const moved={companies:migrateCompaniesToCrmRecord(state.companies),contacts:migrateContactsToDec057(state.contacts),engagements:migrateEngagementsToLifecycle(state.engagements)};
  if(moved.companies||moved.contacts||moved.engagements)audit(`Migración de almacenamiento: ${moved.companies} empresa(s), ${moved.contacts} contacto(s) y ${moved.engagements} estudio(s) actualizados al contrato vigente`);
  return moved;
}
function saveState(reason='Guardado manual'){
  if(isClientDisplay())return false;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));state.dirty=false;
  audit(reason);updateHeader();toast('Guardado localmente en este navegador.');
}
function markDirty(reason){state.dirty=true;if(reason)audit(reason);updateHeader()}
function audit(message){state.audit.unshift({ts:new Date().toISOString(),message});state.audit=state.audit.slice(0,250)}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
function now(){return new Date().toISOString()}
function esc(v){return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function attr(v){return esc(v).replace(/'/g,'&#39;')}
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
function invalidateDerivedState(e,reason='Cambio en inputs del diagnóstico'){
  if(!e)return false;
  const hadDerived=!!e.diagnosticOutput||(Array.isArray(e.scenarioResults)&&e.scenarioResults.length>0)||e.selectedScenario!=null;
  e.diagnosticOutput=null;e.scenarioResults=[];e.selectedScenario=null;e.selectedScenarioIndex=0;e.lastEngineRunAt=null;
  if(hadDerived)audit(`Resultados derivados invalidados: ${reason}`);
  return hadDerived;
}
function setAnswer(fid,value){
  const e=currentEng();if(!e)return;
  e.answers[fid]=value;e.updatedAt=now();
  // A reused value corrected here must reach its owner, not become a second copy (DEC-050). The
  // engagement still keeps the snapshot of the value it used. Guarded because the No-Reask module
  // that owns the mapping loads after this one.
  if(typeof writeThroughToOwner==='function')writeThroughToOwner(fid,value,e);
  // Capturing an answer is what starts Sesión 1 — an action, not a screen being open. The helper is a
  // no-op unless the engagement is exactly one step behind, so this never skips or rewrites a state.
  if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','primera captura de la sesión');
  invalidateDerivedState(e,`respuesta ${fid} actualizada`);markDirty(`Respuesta ${fid} actualizada`);
}
function normalizeArray(v){if(Array.isArray(v))return v;if(v===null||v===undefined||v==='')return [];return [v]}

// Pages that belong to the 90-minute session. On these the top bar shows the private-console marker
// and the step progress instead of the CRM chrome (IMG90-00-02 / IMG90-01).
const SESSION_SURFACE_PAGES=new Set(['diagnostico','proceso']);
const CRM_SURFACE_PAGES=new Set(['inicio','empresas','contactos','interacciones','oportunidades','estudios','proyectos']);

function stageList(){return (schema&&schema.flow)||[]}
function contextualNav(){
  if(SESSION_SURFACE_PAGES.has(state.activePage))return SESSION_CONTEXT_NAV;
  const internal=INTERNAL_WORK_NAV.some(x=>x.length>1&&x[0]===state.activePage&&x!==HOME_NAV);
  return [...(internal?INTERNAL_WORK_NAV:CRM_NAV),...SYSTEM_NAV];
}
function currentStageIndex(){const e=currentEng(),f=stageList();if(!e||!f.length)return -1;return f.findIndex(s=>s.Stage_ID===(e.stageId||'S01'))}
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
  const crumb=document.getElementById('breadcrumb');
  if(crumb){
    // CRM surfaces are titled by where you are (IMG90-00-01 "CRM · Empresas"); session surfaces by the
    // session itself, with the open study identified in the rail rather than repeated in the top bar.
    const navLabel=(contextualNav().find(x=>x.length>1&&x[0]===state.activePage)||[])[2];
    crumb.textContent=inSession
      ? 'Sesión de diagnóstico · 90 min'
      : CRM_SURFACE_PAGES.has(state.activePage)
        ? `CRM · ${navLabel||'Inicio'}`
        : (e?`${c?.name||'Empresa'} · ${e.title||e.processName||'Estudio'}`:'Cockpit de consultoría');
  }
  // The console marker is not decoration: it is the standing reminder that this surface is private and
  // is not what the client is looking at (DEC-048/049).
  const ctx=document.getElementById('topbarContext');
  if(ctx)ctx.innerHTML=inSession?'<span class="console-chip">🔒 Consola interna</span>':'';
  const sp=document.getElementById('stepProgress');
  if(sp){
    const flow=stageList(),i=currentStageIndex();
    sp.innerHTML=(inSession&&flow.length&&i>=0)
      ? `<div class="step-progress"><small>Paso ${i+1} de ${flow.length}</small><div class="step-dots">${flow.map((_,k)=>`<i class="${k<i?'on':k===i?'now':''}"></i>`).join('')}</div></div>`
        +`<span class="stage-clock">◷ ${stageWindow(i)}</span>`
      : '';
  }
  const ss=document.getElementById('saveState');if(ss)ss.textContent=state.dirty?'Cambios sin guardar':'Guardado local';
  const bb=document.getElementById('backendBadge');if(bb){bb.className=`backend-badge ${state.backendOnline?'online':'offline'}`;bb.innerHTML=`<span></span>${state.backendOnline?`Backend ${esc(state.backendVersion||'online')}`:'Backend no conectado'}`}
  renderRailHead();
}

// The rail header is the brand block until a study is open, then the selected-project card (IMG90-01).
function renderRailHead(){
  const host=document.getElementById('railHead');if(!host)return;
  const e=currentEng(),c=e?companyById(e.companyId):null;
  const activeStatus=e?`<div class="rail-context-status">${statusBadge(engagementStatus(e))}</div>`:'';
  const actions=e?`
    <div class="rail-context-actions">
      <button class="btn btn-small btn-primary" data-open-context="${esc(e.id)}">Abrir / Continuar</button>
      <button class="btn btn-small" data-change-context="1">Cambiar</button>
      <button class="btn btn-small" data-clear-context="1">Quitar selección</button>
    </div>`:'';
  host.innerHTML=`<div class="brand"><img class="aunea-brand-logo" src="./assets/brand/Logo.png" alt="AUNEA System"></div>`
    +(e?`<div class="rail-context"><span class="rc-icon">▦</span><div><small>Contexto activo</small><b>${esc(c?.name||'Empresa')}</b><em>${esc(e.title||e.processName||'Diagnóstico')}</em>${activeStatus}</div></div>${actions}`:'');
}

function renderNav(){
  const n=document.getElementById('nav');if(!n)return;
  const e=currentEng(),flow=stageList(),active=currentStageIndex();
  const out=[];
  for(const x of contextualNav()){
    if(x[0]==='__STAGES__'){
      // Nine numbered steps straight from the canonical flow. Without an open study they stay visible
      // but inert, so the session structure is legible before one is selected.
      flow.forEach((s,i)=>{
        const on=e&&state.activePage==='diagnostico'&&i===active;
        out.push(`<button class="nav-item nav-step ${on?'active':''} ${e&&i<active?'done':''}" data-stage-nav="${s.Stage_ID}"><span class="nav-num">${i+1}</span>${esc(s.Stage_ES)}</button>`);
      });
      continue;
    }
    out.push(x.length===1
      ? `<div class="nav-group">${esc(x[0])}</div>`
      : `<button class="nav-item ${state.activePage===x[0]?'active':''}" data-page="${x[0]}"><span class="nav-icon">${x[1]}</span>${esc(x[2])}</button>`);
  }
  n.innerHTML=out.join('');
}
function render(){
  renderNav();updateHeader();
  const fn=pages[state.activePage]||pages.inicio;
  document.getElementById('content').innerHTML=fn();
  bindCommon();postBind();
  // Republish the client-safe projection on every render. Navigating between stages changes what the
  // client should be seeing but never goes through markDirty, so relying on autosave alone left the
  // shared window frozen on whichever stage it was opened at. The spec is explicit that a manual
  // refresh must not be the pattern of use (90MIN UI SPEC §3.3).
  if(typeof publishSessionSnapshot==='function')publishSessionSnapshot(currentEng());
}
function setPage(page){if(['diagnostico','proceso','resultados','tobe','comparacion','revision','modoresultados','implementacion','recomendacion','escenarios','quote'].includes(page)&&!currentEng()){toast('Abre o crea un estudio antes.');state.activePage='estudios';render();return}state.activePage=page;render()}
function goToProcessFromStage(){const e=currentEng();if(e)state.returnTo={page:'diagnostico',stageId:e.stageId};setPage('proceso')}
function returnToStage(){const e=currentEng(),rt=state.returnTo;if(e&&rt)e.stageId=rt.stageId;state.returnTo=null;setPage('diagnostico')}
// screenId is the approved reference a screen must reproduce (e.g. "I90-00-01"). It is internal
// traceability shown above the title, exactly as the references do, and carries no business meaning.
function pageTop(title,subtitle,actions='',screenId=''){return `<div class="page-head"><div>${screenId?`<div class="screen-id">${esc(screenId)}</div>`:''}<h1>${esc(title)}</h1><p class="subtitle">${subtitle}</p></div><div class="head-actions">${actions}</div></div>`}
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
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>setPage(b.dataset.page));
  document.querySelectorAll('[data-stage-nav]').forEach(b=>b.onclick=()=>{const e=currentEng();if(!e){toast('Abre o crea un estudio antes.');setPage('estudios');return}e.stageId=b.dataset.stageNav;setPage('diagnostico')});
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
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{const e=currentEng();e.stageId=b.dataset.stage;markDirty();render()});
  bindForms();
}

function bindForms(){
  document.querySelectorAll('[data-answer]').forEach(el=>{const event=el.type==='text'||el.tagName==='TEXTAREA'?'input':'change';el.addEventListener(event,()=>setAnswer(el.dataset.answer,el.value))});
  document.querySelectorAll('[data-multi]').forEach(el=>el.addEventListener('change',()=>{const fid=el.dataset.multi;const vals=[...document.querySelectorAll(`[data-multi="${fid}"]:checked`)].map(x=>x.value);setAnswer(fid,vals)}));
  document.querySelectorAll('[data-segment]').forEach(b=>b.onclick=()=>{setAnswer(b.dataset.segment,b.dataset.value);render()});
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
}

// addCompany lives in app-no-reask-v1.js: the canonical version drives Sector/País from
// REF_DOMAIN / REF_COUNTRY_ISO3166 instead of free text (PROJECT_RULES: prefer structured controls).
function createStudyFromContact(contactId){const ct=contactById(contactId),cp=companyById(ct.companyId);const e={id:id('ENG'),companyId:cp.id,contactIds:[ct.id],businessAreaId:'',title:`Diagnóstico · ${cp.name}`,processName:'',status:ENGAGEMENT_LIFECYCLE[0],lifecycleLog:[],stageId:'S01',answers:{DF001:cp.name,DF002:cp.sector||'',DF005:cp.country||'',DF006:ct.id},processSteps:[],frictions:[],risks:[],economicInputs:[],processTab:'',confirmedAsIs:false,diagnosticOutput:null,scenarioResults:[],selectedScenario:null,selectedScenarioIndex:0,createdAt:now(),updatedAt:now()};state.engagements.unshift(e);state.activeEngagementId=e.id;state.activePage='diagnostico';markDirty('Engagement creado desde contacto');render()}
// Company, Contact, Interaction and Opportunity records moved to their own domain modules when the
// CRM contracts closed (DEC-051/057/058). addContact, editContact, removeContact, removeCompany and
// contactHistory lived here and are retired: the first three are owned by domain/contact.js, company
// archiving by domain/company.js, and contact history is now derived from domain/interaction.js
// instead of being pattern-matched out of the audit log.
function newStudy(){if(!state.contacts.length)return toast('Crea primero un contacto.');const opts=state.contacts.map(c=>`<option value="${c.id}">${esc(companyById(c.companyId)?.name||'')} · ${esc(contactFullName(c))}</option>`).join('');openModal('Nuevo estudio',`<div class="form-grid"><div class="field full"><label>Contacto principal</label><select id="mStudyContact">${opts}</select></div><div class="field full"><label>Nombre del estudio</label><input id="mStudyTitle" placeholder="Ej. Diagnóstico de intake comercial"></div></div>`,()=>{const ct=contactById(document.getElementById('mStudyContact').value);createStudyFromContact(ct.id);const e=currentEng(),title=document.getElementById('mStudyTitle')?.value?.trim();if(title)e.title=title;closeModal();render()})}

function createProjectFromEngagement(){const e=currentEng();if(!e)return;const result=recordImplementationDecision(e);if(!result.ok){toast(result.error);state.activePage='implementacion';render();return}state.activePage='proyectos';render();toast(result.existing?'Este estudio ya tiene un proyecto vinculado.':'Proyecto creado con referencias a las versiones aprobadas.')}

function openModal(title,body,onSave,saveLabel='Guardar'){const legend=body.includes('required-mark')?REQUIRED_LEGEND_HTML:'';document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" id="modalClose">×</button></div><div class="modal-body">${legend}${body}</div><div class="modal-foot"><button class="btn" id="modalCancel">Cancelar</button><button class="btn btn-primary" id="modalSave">${esc(saveLabel)}</button></div></div></div>`;document.getElementById('modalClose').onclick=closeModal;document.getElementById('modalCancel').onclick=closeModal;document.getElementById('modalSave').onclick=onSave}
function closeModal(){document.getElementById('modalRoot').innerHTML=''}
// [AUNEA-FE-CORE-STATE-020] END
