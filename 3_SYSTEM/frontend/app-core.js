// [AUNEA-FE-CORE-STATE-020] START — Estado, CRM y navegación
// PURPOSE: Estado, CRM y navegación.
// SOURCE: v1.0.4 aceptada, SHA256 a9fb7400b000d6289224610c88d4b7dc51f75f8ae97e20e4c3873a3a8e01d6e7; Diagnostic Master v1; DEC-034/038/040.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM, almacenamiento local y solicitudes HTTP según responsabilidad.
// CHANGE_RISK: HIGH.
const STORAGE_KEY = 'aunea_internal_v1';
const API_DEFAULT = 'http://localhost:8000';
const NAV = [
  ['GENERAL'],
  ['inicio','⌂','Inicio'],['contactos','◉','Contactos'],['estudios','▤','Estudios'],['proyectos','▣','Proyectos'],
  ['CONSULTORÍA'],
  ['diagnostico','◎','Diagnóstico 90m'],['proceso','⇢','Proceso y fricciones'],['resultados','▥','Resultados'],['recomendacion','≋','Recomendación'],['escenarios','▦','Escenarios'],['quote','▧','Cotización'],
  ['SISTEMA'],
  ['admin','⚙','Admin / Auditoría']
];

let schema = null;
let state = loadState();

function blankState(){
  return {
    version:'1.0.1',activePage:'inicio',activeEngagementId:null,dirty:false,
    backendUrl:API_DEFAULT,backendOnline:false,returnTo:null,
    crmTab:'contactos',contactFilters:{status:'',hideLost:true},
    companies:[],contacts:[],opportunities:[],engagements:[],projects:[],audit:[]
  };
}
function loadState(){
  try{return {...blankState(),...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch(e){return blankState()}
}
function saveState(reason='Guardado manual'){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));state.dirty=false;
  audit(reason);updateHeader();toast('Guardado localmente en este navegador.');
}
function markDirty(reason){state.dirty=true;if(reason)audit(reason);updateHeader()}
function audit(message){state.audit.unshift({ts:new Date().toISOString(),message});state.audit=state.audit.slice(0,250)}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
function now(){return new Date().toISOString()}
function esc(v){return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function attr(v){return esc(v).replace(/'/g,'&#39;')}
function fmtDate(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}catch{return v}}
function currentEng(){return state.engagements.find(x=>x.id===state.activeEngagementId)||null}
function companyById(id){return state.companies.find(x=>x.id===id)||null}
function contactById(id){return state.contacts.find(x=>x.id===id)||null}
function labelFrom(setId,value){const s=schema?.option_sets?.[setId];return s?.options?.find(o=>String(o.value)===String(value))?.label||value||'—'}
function getAnswer(fid){return currentEng()?.answers?.[fid]}
function setAnswer(fid,value){const e=currentEng();if(!e)return;e.answers[fid]=value;e.updatedAt=now();markDirty(`Respuesta ${fid} actualizada`)}
function normalizeArray(v){if(Array.isArray(v))return v;if(v===null||v===undefined||v==='')return [];return [v]}

async function init(){
  try{
      const res=await fetch('data/diagnostic-master.min.json',{cache:'no-store'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      schema=await res.json();
    if(!schema || !schema.flow || !schema.option_sets) throw new Error('Diagnostic Master v1 incompleto o no válido');
    render();
    checkBackend();
  }catch(err){
    const node=document.getElementById('content');
    if(node) node.innerHTML=`<div class="card card-pad"><h2>No se ha podido iniciar AUNEA Internal v1.0.4</h2><p class="subtitle">${esc(err.message||err)}</p><p>Esta release incorpora el Diagnostic Master dentro del propio HTML. Si ves este mensaje, copia el texto exacto para diagnóstico.</p></div>`;
    console.error('AUNEA_INIT_ERROR',err);
  }
}
async function checkBackend(){
  try{
    const ctl=new AbortController();setTimeout(()=>ctl.abort(),1800);
    const r=await fetch(`${state.backendUrl}/health`,{signal:ctl.signal});
    if(!r.ok)throw new Error();const j=await r.json();state.backendOnline=true;state.backendVersion=j.backend_version||'online';
  }catch{state.backendOnline=false}
  updateHeader();
}

function updateHeader(){
  const e=currentEng(),c=e?companyById(e.companyId):null;
  const crumb=document.getElementById('breadcrumb');if(crumb)crumb.textContent=e?`${c?.name||'Empresa'} · ${e.title||e.processName||'Estudio'}`:'Cockpit de consultoría';
  const ss=document.getElementById('saveState');if(ss)ss.textContent=state.dirty?'Cambios sin guardar':'Guardado local';
  const bb=document.getElementById('backendBadge');if(bb){bb.className=`backend-badge ${state.backendOnline?'online':'offline'}`;bb.innerHTML=`<span></span>${state.backendOnline?`Backend ${esc(state.backendVersion||'online')}`:'Backend no conectado'}`}
}
function renderNav(){
  const n=document.getElementById('nav');n.innerHTML=NAV.map(x=>x.length===1?`<div class="nav-group">${x[0]}</div>`:`<button class="nav-item ${state.activePage===x[0]?'active':''}" data-page="${x[0]}"><span class="nav-icon">${x[1]}</span>${x[2]}</button>`).join('')
}
function render(){renderNav();updateHeader();const fn=pages[state.activePage]||pages.inicio;document.getElementById('content').innerHTML=fn();bindCommon();postBind()}
function setPage(page){
  if(['diagnostico','proceso','resultados','recomendacion','escenarios','quote'].includes(page)&&!currentEng()){toast('Abre o crea un estudio antes.');state.activePage='estudios';render();return}
  state.activePage=page;render()
}
function goToProcessFromStage(){
  const e=currentEng();if(e)state.returnTo={page:'diagnostico',stageId:e.stageId};
  setPage('proceso');
}
function returnToStage(){
  const e=currentEng(),rt=state.returnTo;
  if(e&&rt)e.stageId=rt.stageId;
  state.returnTo=null;setPage('diagnostico');
}
function pageTop(title,subtitle,actions=''){return `<div class="page-head"><div><div class="eyebrow">AUNEA INTERNAL · V1.0.4</div><h1>${esc(title)}</h1><p class="subtitle">${subtitle}</p></div><div class="head-actions">${actions}</div></div>`}
function section(title,sub,body,actions=''){return `<div class="card card-pad section"><div class="section-title"><div><h2>${esc(title)}</h2>${sub?`<p>${sub}</p>`:''}</div><div class="section-actions">${actions}</div></div>${body}</div>`}
function statusClass(s=''){const z=s.toLowerCase();if(z.includes('confirm')||z.includes('listo')||z.includes('ganado'))return'green';if(z.includes('diagn')||z.includes('reun'))return'amber';if(z.includes('propuesta')||z.includes('resultado'))return'blue';if(z.includes('perdido')||z.includes('bloq'))return'red';return''}
function statusBadge(s){return `<span class="status ${statusClass(s)}">${esc(s||'Borrador')}</span>`}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2600)}

function bindCommon(){
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>setPage(b.dataset.page));
  document.getElementById('saveBtn').onclick=()=>saveState();
  const mm=document.getElementById('mobileMenu');if(mm)mm.onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
  document.querySelectorAll('[data-open-eng]').forEach(b=>b.onclick=()=>{state.activeEngagementId=b.dataset.openEng;state.activePage='diagnostico';render()});
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{const e=currentEng();e.stageId=b.dataset.stage;markDirty();render()});
  bindForms();
}

function bindForms(){
  document.querySelectorAll('[data-answer]').forEach(el=>{
    const event=el.type==='text'||el.tagName==='TEXTAREA'?'input':'change';
    el.addEventListener(event,()=>setAnswer(el.dataset.answer,el.value));
  });
  document.querySelectorAll('[data-multi]').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.multi;const vals=[...document.querySelectorAll(`[data-multi="${fid}"]:checked`)].map(x=>x.value);setAnswer(fid,vals)
  }));
  document.querySelectorAll('[data-segment]').forEach(b=>b.onclick=()=>{setAnswer(b.dataset.segment,b.dataset.value);render()});
  document.querySelectorAll('[data-remove-company]').forEach(b=>b.onclick=()=>removeCompany(b.dataset.removeCompany));
  document.querySelectorAll('[data-remove-contact]').forEach(b=>b.onclick=()=>removeContact(b.dataset.removeContact));
  document.querySelectorAll('[data-edit-contact]').forEach(b=>b.onclick=()=>editContact(b.dataset.editContact));
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

function addCompany(){
  openModal('Nueva empresa',`<div class="form-grid"><div class="field"><label>Empresa</label><input id="mCompany" placeholder="Ej. ACME Servicios"></div><div class="field"><label>Sector</label><input id="mSector" placeholder="Servicios profesionales"></div><div class="field"><label>País</label><input id="mCountry" value="España"></div><div class="field"><label>Notas</label><input id="mCompanyNotes" placeholder="Opcional"></div></div>`,()=>{
    const name=document.getElementById('mCompany').value.trim();if(!name)return toast('Indica la empresa.');state.companies.push({id:id('CMP'),name,sector:document.getElementById('mSector').value,country:document.getElementById('mCountry').value,notes:document.getElementById('mCompanyNotes').value,createdAt:now()});markDirty('Empresa creada');closeModal();render()
  })
}
function addContact(){
  if(!state.companies.length)return toast('Crea primero una empresa.');
  const opts=state.companies.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  openModal('Nuevo contacto',`<div class="form-grid"><div class="field"><label>Empresa</label><select id="mContactCompany">${opts}</select></div><div class="field"><label>Nombre</label><input id="mContactName"></div><div class="field"><label>Cargo / rol</label><input id="mContactRole"></div><div class="field"><label>Email</label><input id="mContactEmail" type="email"></div><div class="field"><label>Teléfono</label><input id="mContactPhone"></div><div class="field"><label>Estado del contacto</label><select id="mContactStatus"><option>Nuevo</option><option>Contactado</option><option>Reunión</option><option>Oportunidad</option><option>Diagnóstico</option><option>Propuesta</option><option>Ganado</option><option>Perdido</option><option>En pausa</option></select></div><div class="field"><label>Origen</label><select id="mContactSource"><option>Red personal</option><option>Referido</option><option>Inbound</option><option>Cliente existente</option><option>Otro</option></select></div><div class="field"><label>Próxima acción</label><input id="mNextAction" placeholder="Ej. Agendar llamada"></div></div>`,()=>{
    const name=document.getElementById('mContactName').value.trim();if(!name)return toast('Indica el nombre.');state.contacts.push({id:id('CON'),companyId:document.getElementById('mContactCompany').value,name,role:document.getElementById('mContactRole').value,email:document.getElementById('mContactEmail').value,phone:document.getElementById('mContactPhone').value,status:document.getElementById('mContactStatus').value,source:document.getElementById('mContactSource').value,nextAction:document.getElementById('mNextAction').value,lastInteraction:now(),createdAt:now()});markDirty('Contacto creado');closeModal();render()
  })
}
function removeCompany(idv){if(!confirm('¿Archivar esta empresa del prototipo local?'))return;state.companies=state.companies.filter(x=>x.id!==idv);state.contacts=state.contacts.filter(x=>x.companyId!==idv);markDirty('Empresa archivada');render()}
function removeContact(idv){if(!confirm('¿Archivar este contacto del prototipo local?'))return;state.contacts=state.contacts.filter(x=>x.id!==idv);markDirty('Contacto archivado');render()}
function contactHistory(ct){return state.audit.filter(a=>a.message.includes(ct.id)||a.message.includes(ct.name)).slice(0,20)}
function editContact(contactId){
  const ct=contactById(contactId);if(!ct)return;
  const statuses=['Nuevo','Contactado','Reunión','Oportunidad','Diagnóstico','Propuesta','Ganado','Perdido','En pausa'];
  const sources=['Red personal','Referido','Inbound','Cliente existente','Otro'];
  const companyOpts=state.companies.map(c=>`<option value="${c.id}" ${c.id===ct.companyId?'selected':''}>${esc(c.name)}</option>`).join('');
  const history=contactHistory(ct);
  const body=`<div class="form-grid"><div class="field"><label>Empresa</label><select id="mContactCompany">${companyOpts}</select></div><div class="field"><label>Nombre</label><input id="mContactName" value="${attr(ct.name)}"></div><div class="field"><label>Cargo / rol</label><input id="mContactRole" value="${attr(ct.role||'')}"></div><div class="field"><label>Email</label><input id="mContactEmail" type="email" value="${attr(ct.email||'')}"></div><div class="field"><label>Teléfono</label><input id="mContactPhone" value="${attr(ct.phone||'')}"></div><div class="field"><label>Estado del contacto</label><select id="mContactStatus">${statuses.map(s=>`<option ${s===ct.status?'selected':''}>${s}</option>`).join('')}</select></div><div class="field"><label>Origen</label><select id="mContactSource">${sources.map(s=>`<option ${s===ct.source?'selected':''}>${s}</option>`).join('')}</select></div><div class="field full"><label>Próxima acción</label><input id="mNextAction" value="${attr(ct.nextAction||'')}" placeholder="Ej. Agendar llamada"></div></div><div class="field-help" style="margin-top:10px"><b>Histórico</b></div>${history.length?history.map(a=>`<div class="audit-line"><b>${fmtDate(a.ts)}</b> · ${esc(a.message)}</div>`).join(''):'<div class="empty"><p>Sin cambios registrados todavía para este contacto.</p></div>'}`;
  openModal('Editar contacto',body,()=>{
    const before={...ct};
    ct.companyId=document.getElementById('mContactCompany').value;
    ct.name=document.getElementById('mContactName').value.trim()||ct.name;
    ct.role=document.getElementById('mContactRole').value;
    ct.email=document.getElementById('mContactEmail').value;
    ct.phone=document.getElementById('mContactPhone').value;
    ct.status=document.getElementById('mContactStatus').value;
    ct.source=document.getElementById('mContactSource').value;
    ct.nextAction=document.getElementById('mNextAction').value;
    [['name','Nombre'],['role','Cargo'],['email','Email'],['phone','Teléfono'],['status','Estado'],['source','Origen'],['nextAction','Próxima acción']].forEach(([k,label])=>{
      if((before[k]||'')!==(ct[k]||''))audit(`Contacto ${ct.name} editado: ${label} "${before[k]||'—'}"→"${ct[k]||'—'}"`);
    });
    markDirty();closeModal();render();
  },'Guardar cambios');
}
function createStudyFromContact(contactId){
  const ct=contactById(contactId),cp=companyById(ct.companyId);const e={id:id('ENG'),companyId:cp.id,contactIds:[ct.id],title:`Diagnóstico · ${cp.name}`,processName:'',status:'En preparación',stageId:'S01',answers:{DF001:cp.name,DF002:cp.sector||'',DF005:cp.country||'',DF006:ct.id},processSteps:[],frictions:[],risks:[],economicInputs:[],processTab:'',confirmedAsIs:false,diagnosticOutput:null,scenarioResults:[],selectedScenario:null,createdAt:now(),updatedAt:now()};state.engagements.unshift(e);ct.lastInteraction=now();state.activeEngagementId=e.id;state.activePage='diagnostico';markDirty('Engagement creado desde contacto');render()
}
function newStudy(){
  if(!state.contacts.length)return toast('Crea primero un contacto.');
  const opts=state.contacts.map(c=>`<option value="${c.id}">${esc(companyById(c.companyId)?.name||'')} · ${esc(c.name)}</option>`).join('');
  openModal('Nuevo estudio',`<div class="form-grid"><div class="field full"><label>Contacto principal</label><select id="mStudyContact">${opts}</select></div><div class="field full"><label>Nombre del estudio</label><input id="mStudyTitle" placeholder="Ej. Diagnóstico de intake comercial"></div></div>`,()=>{const ct=contactById(document.getElementById('mStudyContact').value);createStudyFromContact(ct.id);const e=currentEng(),title=document.getElementById('mStudyTitle')?.value?.trim();if(title)e.title=title;closeModal();render()})
}


function createProjectFromEngagement(){
  const e=currentEng(); if(!e)return;
  const existing=state.projects.find(p=>p.engagementId===e.id);
  if(existing){toast('Este estudio ya tiene un proyecto vinculado.');state.activePage='proyectos';render();return}
  const p={id:id('PRJ'),engagementId:e.id,companyId:e.companyId,contactIds:[...(e.contactIds||[])],name:e.answers.DF011||e.title,status:'Preparación',selectedScenarioIndex:e.selectedScenarioIndex??0,createdAt:now(),updatedAt:now()};
  state.projects.unshift(p);e.projectId=p.id;e.status='Convertido en proyecto';markDirty('Proyecto creado desde engagement');state.activePage='proyectos';render();toast('Proyecto creado y vinculado al histórico del contacto.')
}

function openModal(title,body,onSave,saveLabel='Guardar'){
  document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" id="modalClose">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" id="modalCancel">Cancelar</button><button class="btn btn-primary" id="modalSave">${esc(saveLabel)}</button></div></div></div>`;
  document.getElementById('modalClose').onclick=closeModal;document.getElementById('modalCancel').onclick=closeModal;document.getElementById('modalSave').onclick=onSave
}
function closeModal(){document.getElementById('modalRoot').innerHTML=''}
// [AUNEA-FE-CORE-STATE-020] END
