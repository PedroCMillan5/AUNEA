// [AUNEA-FE-CORE-STATE-020] START — Estado, CRM y navegación
// PURPOSE: Estado, CRM y navegación, incluyendo invalidación única de outputs derivados cuando cambia captura.
// SOURCE: v1.0.4 aceptada; Diagnostic Master v1.1; DEC-034/040/041/043/048/051/052/056; B01 VR-02.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM y almacenamiento local según responsabilidad.
// CHANGE_RISK: HIGH.
const AUNEA_PRODUCT_VERSION='2.0.0';
const AUNEA_PRODUCT_STATUS='REVIEW';
const STORAGE_SCHEMA_VERSION='1';
const STORAGE_KEY = 'aunea_internal_v1';
const API_DEFAULT = 'http://localhost:8000';
const AUNEA_USER={name:'Pedro Carrasco',role:'Consultor',initials:'PC'};
const AUNEA_DEFAULT_OWNER='Pedro Carrasco';
const HOME_NAV = ['inicio','⌂','Inicio'];
const CRM_NAV = [
  HOME_NAV,
  ['CRM'],
  ['empresas','▦','Empresas'],['contactos','◉','Contactos'],['interacciones','◷','Interacciones'],['oportunidades','◈','Oportunidades'],['estudios','▤','Estudios'],['proyectos','▣','Proyectos']
];
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
const SYSTEM_NAV = [['Sistema'],['admin','⚙','Configuración']];
let schema = null;
function isClientDisplay(){return typeof location!=='undefined'&&['#session','#results'].includes(location.hash)}
let state = isClientDisplay()?blankState():loadState();
state.uiMode='INTERNAL';
function blankState(){return {version:AUNEA_PRODUCT_VERSION,productVersion:AUNEA_PRODUCT_VERSION,productStatus:AUNEA_PRODUCT_STATUS,storageSchemaVersion:STORAGE_SCHEMA_VERSION,activePage:'inicio',activeEngagementId:null,dirty:false,backendUrl:API_DEFAULT,backendOnline:false,returnTo:null,selectedCompanyId:null,selectedContactId:null,companyTab:'Todas',companySearch:'',companyFilters:{sector:'',size:'',status:'',country:''},contactSearch:'',contactFilters:{role:'',status:'',language:''},companyInspectorTab:'Resumen',companies:[],contacts:[],interactions:[],opportunities:[],engagements:[],projects:[],audit:[]}}
function loadState(){let raw;try{raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch(e){return blankState()}const s={...blankState(),...raw,productVersion:AUNEA_PRODUCT_VERSION,productStatus:AUNEA_PRODUCT_STATUS,storageSchemaVersion:STORAGE_SCHEMA_VERSION};if(!Array.isArray(s.interactions))s.interactions=[];if(!Array.isArray(s.opportunities))s.opportunities=[];return s}
function migrateLoadedState(){const moved={companies:migrateCompaniesToCrmRecord(state.companies),contacts:migrateContactsToDec057(state.contacts),engagements:migrateEngagementsToLifecycle(state.engagements)};if(moved.companies||moved.contacts||moved.engagements)audit(`Migración de almacenamiento: ${moved.companies} empresa(s), ${moved.contacts} contacto(s) y ${moved.engagements} estudio(s) actualizados al contrato vigente`);return moved}
function saveState(reason='Guardado manual'){if(isClientDisplay())return false;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));state.dirty=false;audit(reason);updateHeader();toast('Guardado localmente en este navegador.')}
function markDirty(reason){state.dirty=true;if(reason)audit(reason);updateHeader()}
function audit(message){state.audit.unshift({ts:new Date().toISOString(),message});state.audit=state.audit.slice(0,250)}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
function now(){return new Date().toISOString()}
function esc(v){return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function attr(v){return esc(v).replace(/'/g,'&#39;')}
function requiredMark(){return '<span class="required-mark" tabindex="0" title="Campo obligatorio" aria-label="Campo obligatorio">*</span>'}
const REQUIRED_LEGEND_HTML='<div class="field-help required-legend">Los campos marcados con '+requiredMark()+' son obligatorios.</div>';
function fmtDate(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}catch{return v}}
function formatDateEs(v){if(!v)return '—';try{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);const d=m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):new Date(v);return d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'})}catch{return v}}
function currentEng(){return state.engagements.find(x=>x.id===state.activeEngagementId)||null}
function companyById(id){return state.companies.find(x=>x.id===id)||null}
function contactById(id){return state.contacts.find(x=>x.id===id)||null}
function labelFrom(setId,value){const s=schema?.option_sets?.[setId];return s?.options?.find(o=>String(o.value)===String(value))?.label||value||'—'}
function invalidateDerivedState(e,reason='Cambio en inputs del diagnóstico'){if(!e)return false;const hadDerived=!!e.diagnosticOutput||(Array.isArray(e.scenarioResults)&&e.scenarioResults.length>0)||e.selectedScenario!=null;e.diagnosticOutput=null;e.scenarioResults=[];e.selectedScenario=null;e.selectedScenarioIndex=0;e.lastEngineRunAt=null;if(hadDerived)audit(`Resultados derivados invalidados: ${reason}`);return hadDerived}
function setAnswer(fid,value){const e=currentEng();if(!e)return;e.answers[fid]=value;e.updatedAt=now();if(typeof writeThroughToOwner==='function')writeThroughToOwner(fid,value,e);if(typeof advanceEngagementTo==='function')advanceEngagementTo(e,'Sesión 1','primera captura de la sesión');invalidateDerivedState(e,`respuesta ${fid} actualizada`);markDirty(`Respuesta ${fid} actualizada`)}
function normalizeArray(v){if(Array.isArray(v))return v;if(v===null||v===undefined||v==='')return [];return [v]}
const SESSION_SURFACE_PAGES=new Set(['diagnostico','proceso']);
const CRM_SURFACE_PAGES=new Set(['inicio','empresas','contactos','interacciones','oportunidades','estudios','proyectos']);
function stageList(){return (schema&&schema.flow)||[]}
function contextualNav(){if(SESSION_SURFACE_PAGES.has(state.activePage))return SESSION_CONTEXT_NAV;const internal=INTERNAL_WORK_NAV.some(x=>x.length>1&&x[0]===state.activePage&&x!==HOME_NAV);return [...(internal?INTERNAL_WORK_NAV:CRM_NAV),...SYSTEM_NAV]}
function currentStageIndex(){const e=currentEng(),f=stageList();if(!e||!f.length)return -1;return f.findIndex(s=>s.Stage_ID===(e.stageId||'S01'))}
function stageWindow(i){const f=stageList();if(i<0||!f.length)return '';const mins=n=>`${String(n).padStart(2,'0')}:00`;let start=0;for(let k=0;k<i;k++)start+=Number(f[k].Minutos_objetivo)||0;return `${mins(start)} – ${mins(start+(Number(f[i].Minutos_objetivo)||0))}`}
function updateHeader(){const e=currentEng(),c=e?companyById(e.companyId):null;const inSession=SESSION_SURFACE_PAGES.has(state.activePage)&&!!e;const crumb=document.getElementById('breadcrumb');if(crumb){const navLabel=(contextualNav().find(x=>x.length>1&&x[0]===state.activePage)||[])[2];crumb.textContent=inSession?'Sesión de diagnóstico · 90 min':CRM_SURFACE_PAGES.has(state.activePage)?`CRM · ${navLabel||'Inicio'}`:(e?`${c?.name||'Empresa'} · ${e.title||e.processName||'Estudio'}`:'Cockpit de consultoría')}const ctx=document.getElementById('topbarContext');if(ctx)ctx.innerHTML=inSession?'<span class="console-chip">🔒 Consola interna</span>':'';const sp=document.getElementById('stepProgress');if(sp){const flow=stageList(),i=currentStageIndex();sp.innerHTML=(inSession&&flow.length&&i>=0)?`<div class="step-progress"><small>Paso ${i+1} de ${flow.length}</small><div class="step-dots">${flow.map((_,k)=>`<i class="${k<i?'on':k===i?'now':''}"></i>`).join('')}</div></div><span class="stage-clock">◷ ${stageWindow(i)}</span>`:''}const ss=document.getElementById('saveState');if(ss)ss.textContent=state.dirty?'Cambios sin guardar':'Guardado local';const bb=document.getElementById('backendBadge');if(bb){bb.className=`backend-badge ${state.backendOnline?'online':'offline'}`;bb.innerHTML=`<span></span>${state.backendOnline?`Backend ${esc(state.backendVersion||'online')}`:'Backend no conectado'}`}renderRailHead()}
function renderRailHead(){const host=document.getElementById('railHead');if(!host)return;const e=currentEng(),c=e?companyById(e.companyId):null;const activeStatus=e?`<div class="rail-context-status">${statusBadge(engagementStatus(e))}</div>`:'';const actions=e?`<div class="rail-context-actions"><button class="btn btn-small btn-primary" data-open-context="${esc(e.id)}">Abrir / Continuar</button><button class="btn btn-small" data-change-context="1">Cambiar</button><button class="btn btn-small" data-clear-context="1">Quitar selección</button></div>`:'';host.innerHTML=`<div class="brand"><img class="aunea-brand-logo" src="./assets/brand/AUNEA_SYSTEM_05_FONDO_OSCURO.png" alt="AUNEA System"></div>`+(e?`<div class="rail-context"><span class="rc-icon">▦</span><div><small>Contexto activo</small><b>${esc(c?.name||'Empresa')}</b><em>${esc(e.title||e.processName||'Diagnóstico')}</em>${activeStatus}</div></div>${actions}`:'')}
function renderNav(){const n=document.getElementById('nav');if(!n)return;const e=currentEng(),flow=stageList(),active=currentStageIndex();const out=[];for(const x of contextualNav()){if(x[0]==='__STAGES__'){flow.forEach((s,i)=>{const on=e&&state.activePage==='diagnostico'&&i===active;out.push(`<button class="nav-item nav-step ${on?'active':''} ${e&&i<active?'done':''}" data-stage-nav="${s.Stage_ID}"><span class="nav-num">${i+1}</span>${esc(s.Stage_ES)}</button>`)});continue}out.push(x.length===1?`<div class="nav-group">${esc(x[0])}</div>`:`<button class="nav-item ${state.activePage===x[0]?'active':''}" data-page="${x[0]}"><span class="nav-icon">${x[1]}</span>${esc(x[2])}</button>`)}n.innerHTML=out.join('')}
function render(){renderNav();updateHeader();const fn=pages[state.activePage]||pages.inicio;document.getElementById('content').innerHTML=fn();bindCommon();postBind();if(typeof publishSessionSnapshot==='function')publishSessionSnapshot(currentEng())}
function setPage(page){if(['diagnostico','proceso','resultados','tobe','comparacion','revision','modoresultados','implementacion','recomendacion','escenarios','quote'].includes(page)&&!currentEng()){toast('Abre o crea un estudio antes.');state.activePage='estudios';render();return}state.activePage=page;render()}
function goToProcessFromStage(){const e=currentEng();if(e)state.returnTo={page:'diagnostico',stageId:e.stageId};setPage('proceso')}
function returnToStage(){const e=currentEng(),rt=state.returnTo;if(e&&rt)e.stageId=rt.stageId;state.returnTo=null;setPage('diagnostico')}
function pageTop(title,subtitle,actions='',screenId=''){return `<div class="page-head"><div>${screenId?`<div class="screen-id">${esc(screenId)}</div>`:''}<h1>${esc(title)}</h1><p class="subtitle">${subtitle}</p></div><div class="head-actions">${actions}</div></div>`}
// [AUNEA-FE-CORE-STATE-020] END