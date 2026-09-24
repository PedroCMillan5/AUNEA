// [AUNEA-FE-SHELL-NAV-010] START — Pantallas y eventos
// PURPOSE: Pantallas y eventos.
// SOURCE: v1.0.4 aceptada como baseline técnica; Diagnostic Master v1.2; DEC-034/038/040/043.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM, almacenamiento local y solicitudes HTTP según responsabilidad.
// CHANGE_RISK: HIGH.

// [AUNEA-FE-PAGE-STUDIES-010] START — P05 Estudios
// PURPOSE: List Engagement records with 10-row paging and the same floating three-dot action menu used by the finalized CRM pages.
// SOURCE: DEC-042/050/051/055/066; Architecture Contract P05; user review 2026-09-22.
// INPUTS: state.engagements plus referenced Company/Contact masters.
// OUTPUTS: Estudios page markup; existing governed actions remain data-open-eng / data-advance-eng.
// SIDE_EFFECTS: studyPage navigation state plus temporary floating menu DOM; lifecycle/navigation actions remain governed.
// CHANGE_RISK: CRITICAL once FROZEN.
const STUDY_PAGE_SIZE=10;
function studyPagination(rows){
  const totalPages=Math.max(1,Math.ceil(rows.length/STUDY_PAGE_SIZE));
  const page=Math.min(Math.max(1,Number(state.studyPage)||1),totalPages);
  state.studyPage=page;
  const start=(page-1)*STUDY_PAGE_SIZE;
  return {page,totalPages,rows:rows.slice(start,start+STUDY_PAGE_SIZE)};
}
function closeStudyFloatingMenu(){document.getElementById('studyFloatingMenu')?.remove()}
function openStudyActionMenu(button,engagementId){
  closeStudyFloatingMenu();
  const eng=(state.engagements||[]).find(x=>x.id===engagementId);if(!eng)return;
  const next=nextEngagementStatus(eng);
  const menu=document.createElement('div');menu.id='studyFloatingMenu';menu.className='row-menu-popover company-floating-menu';
  menu.innerHTML=`<button type="button" data-study-menu-open="${attr(eng.id)}">Abrir estudio</button>
    <button type="button" data-study-menu-work="${attr(eng.id)}">Trabajo interno</button>
    ${next?`<button type="button" data-study-menu-advance="${attr(eng.id)}">Avanzar a ${esc(next)}</button>`:''}`;
  document.body.appendChild(menu);
  const r=button.getBoundingClientRect(),gap=6;
  let left=Math.min(window.innerWidth-menu.offsetWidth-8,Math.max(8,r.right-menu.offsetWidth));
  let top=r.bottom+gap;
  if(top+menu.offsetHeight>window.innerHeight-8)top=Math.max(8,r.top-menu.offsetHeight-gap);
  menu.style.left=`${left}px`;menu.style.top=`${top}px`;
}
function studyActionMenu(e){
  const next=nextEngagementStatus(e);
  return `<div class="study-action-cell"><button type="button" class="kebab-btn" data-study-actions="${attr(e.id)}" aria-label="Acciones de ${attr(e.title||'estudio')}">•••</button><span class="hidden" aria-hidden="true"><button type="button" data-open-eng="${attr(e.id)}">Abrir estudio</button><button type="button" data-open-eng="${attr(e.id)}" data-open-eng-page="resultados">Trabajo interno</button>${next?`<button type="button" data-advance-eng="${e.id}">Avanzar a ${esc(next)}</button>`:''}</span></div>`;
}

if(!window.__auneaStudyActionsBound){
  window.__auneaStudyActionsBound=true;
  document.addEventListener('click',ev=>{
    const trigger=ev.target.closest('[data-study-actions]');
    if(trigger){ev.preventDefault();ev.stopPropagation();openStudyActionMenu(trigger,trigger.dataset.studyActions);return}
    if(!ev.target.closest('#studyFloatingMenu'))closeStudyFloatingMenu();
    const action=ev.target.closest('[data-study-menu-open],[data-study-menu-work],[data-study-menu-advance]');if(!action)return;
    ev.preventDefault();ev.stopPropagation();closeStudyFloatingMenu();
    const eid=action.dataset.studyMenuOpen||action.dataset.studyMenuWork||action.dataset.studyMenuAdvance;
    const eng=(state.engagements||[]).find(x=>x.id===eid);if(!eng)return;
    state.activeEngagementId=eng.id;
    if(action.dataset.studyMenuOpen!==undefined){state.activePage='diagnostico';render();return}
    if(action.dataset.studyMenuWork!==undefined){state.activePage='resultados';render();return}
    const next=nextEngagementStatus(eng);
    if(next&&advanceEngagementTo(eng,next,'avance manual desde Estudios'))render();
  },true);
}
function studiesPage(){
  const all=state.engagements||[],paged=studyPagination(all),rows=paged.rows;
  const body=all.length?`<div class="table-wrap"><table class="data-table studies-table"><thead><tr><th>Empresa</th><th>Estudio</th><th>Área</th><th>Contacto</th><th>Proceso</th><th>Ciclo de vida</th><th>Actualizado</th><th>Acciones</th></tr></thead><tbody>${rows.map(e=>`<tr><td>${esc(companyById(e.companyId)?.name||'—')}</td><td><b>${esc(e.title)}</b></td><td>${esc(labelFrom('REF_DOMAIN',e.businessAreaId)||'—')}</td><td>${esc(e.contactIds.map(x=>contactById(x)?.name).filter(Boolean).join(', '))}</td><td>${esc(e.answers?.DF011||'Pendiente')}</td><td>${statusBadge(engagementStatus(e))}</td><td>${fmtDate(e.updatedAt)}</td><td>${studyActionMenu(e)}</td></tr>`).join('')}</tbody></table></div>
    <div class="table-foot studies-table-foot"><span>Mostrando ${rows.length} de ${all.length} estudios</span>${paged.totalPages>1?`<nav class="crm-pagination studies-pagination" aria-label="Páginas de estudios"><button type="button" data-study-page="${paged.page-1}" ${paged.page<=1?'disabled':''} aria-label="Página anterior">‹</button>${Array.from({length:paged.totalPages},(_,i)=>i+1).map(n=>`<button type="button" class="${n===paged.page?'active':''}" data-study-page="${n}" aria-current="${n===paged.page?'page':'false'}">${n}</button>`).join('')}<button type="button" data-study-page="${paged.page+1}" ${paged.page>=paged.totalPages?'disabled':''} aria-label="Página siguiente">›</button></nav>`:''}</div>`
    :'<div class="empty"><h2>No hay estudios</h2><p>Crea uno desde un contacto para mantener trazabilidad de la relación.</p></div>';
  return `<span class="studies-screen-marker" hidden></span>`+pageTop('Estudios','Biblioteca histórica de engagements. Un contacto puede tener varios estudios y proyectos.',`<button class="btn btn-primary" id="newStudy">Nuevo estudio</button>`)+section('Histórico',`${all.length} estudio(s) guardados en este navegador.`,body);
}
// [AUNEA-FE-PAGE-STUDIES-010] END

// [AUNEA-FE-PAGE-HOME-010] START — CRM Inicio
// PURPOSE: Render the CRM landing page without introducing its own business rules.
// SOURCE: CRM shell baseline; DEC-050/051/066; explicit user closure 2026-09-22.
// INPUTS: CRM/Engagement/Project collection counts and current Engagement context.
// OUTPUTS: Inicio page markup only.
// SIDE_EFFECTS: none; existing navigation handlers own all actions.
// CHANGE_RISK: CRITICAL once FROZEN.
function homePage(){
  const active=currentEng();
  return `<span class="home-screen-marker" hidden></span>`+pageTop('Cockpit de consultoría','Punto de entrada limpio a CRM, estudios y diagnóstico. No se cargan datos ficticios automáticamente.',`<button class="btn btn-primary" id="newStudy">+ Nuevo estudio</button>`) + `<div class="hero-actions"><button class="hero-action primary" id="homeNewContact"><b>Nuevo contacto</b><p>Registra persona + empresa y conserva la relación a lo largo del tiempo.</p><span class="arrow">→</span></button><button class="hero-action" data-page="estudios"><b>Abrir estudios</b><p>Consulta diagnósticos históricos y continúa desde el punto guardado.</p><span class="arrow">→</span></button><button class="hero-action" data-page="diagnostico"><b>${active?'Retomar contexto activo':'Continuar diagnóstico'}</b><p>${active?'Retoma '+esc(active.title)+'. Continúa desde el contexto activo.':'Abre primero un estudio.'}</p><span class="arrow">→</span></button></div><div class="grid g4 section"><div class="card metric"><small>Empresas</small><strong>${state.companies.length}</strong></div><div class="card metric"><small>Contactos</small><strong>${state.contacts.length}</strong></div><div class="card metric"><small>Estudios</small><strong>${state.engagements.length}</strong></div><div class="card metric"><small>Proyectos</small><strong>${state.projects.length}</strong></div></div>`+section('Cómo funciona','El mismo Engagement Record acompaña todo el recorrido.',`<div class="grid g4"><div class="notice"><b>1. Relación</b><br>Empresa → contacto → oportunidad</div><div class="notice"><b>2. Diagnóstico</b><br>Contexto → AS-IS → fricciones → evidencia</div><div class="notice"><b>3. Decisión</b><br>Economics → riesgo → recomendación → escenarios</div><div class="notice"><b>4. Salida</b><br>Quote → entregables → proyecto</div></div>`);
}
// [AUNEA-FE-PAGE-HOME-010] END

const pages={
  inicio:homePage,
  empresas:companiesPage,contactos:contactsPage,interacciones:interactionsPage,oportunidades:opportunitiesPage,
  estudios:studiesPage,
  proyectos:projectsPage,implementacion:implementationPage,
  diagnostico:stagePage,proceso:processPage,resultados:resultsPage,recomendacion:recommendationPage,escenarios:scenariosPage,quote:quotePage,
  admin(){const e=currentEng();return pageTop('Admin / Auditoría','Estado del frontend, fuente canónica, persistencia y trazabilidad de cambios.',`<button class="btn" id="checkBackend">Comprobar backend</button><button class="btn btn-danger" id="clearLocal">Limpiar datos locales</button>`) + `<div class="grid g4"><div class="card metric"><small>Frontend</small><strong>v${esc(AUNEA_PRODUCT_VERSION)}</strong><span>${esc(AUNEA_PRODUCT_STATUS)}</span></div><div class="card metric"><small>Diagnostic Master</small><strong>100</strong><span>campos canónicos</span></div><div class="card metric"><small>Option sets</small><strong>${Object.keys(schema.option_sets).length}</strong><span>${Object.values(schema.option_sets).reduce((n,s)=>n+(s.options?.length||0),0)} opciones</span></div><div class="card metric"><small>Backend</small><strong>${state.backendOnline?'OK':'—'}</strong><span>${esc(state.backendVersion||'no conectado')}</span></div></div>`+section('Fuente canónica','La UI no gobierna reglas.',`<div class="notice good"><strong>Diagnostic Master v1.2:</strong> ${esc(schema.source)}<br>100/100 campos con control UI, objetivo, validación, ejemplo, Source_ID y mapping a engine.</div>`)+section('Auditoría local','Últimos cambios en esta sesión.',state.audit.length?state.audit.slice(0,40).map(a=>`<div class="audit-line"><b>${fmtDate(a.ts)}</b> · ${esc(a.message)}</div>`).join(''):'<div class="empty"><p>Sin cambios registrados todavía.</p></div>')}
};

if(typeof document!=='undefined'&&typeof document.addEventListener==='function'&&!document.__auneaContextDelegatedBound){
  document.__auneaContextDelegatedBound=true;
  document.addEventListener('click',ev=>{
    const open=ev.target.closest?.('[data-open-context]');
    if(open){
      ev.preventDefault();ev.stopPropagation();
      const e=state.engagements.find(x=>x.id===open.dataset.openContext)||currentEng();
      if(!e)return;
      state.activeEngagementId=e.id;setPage('diagnostico');return;
    }
    const change=ev.target.closest?.('[data-change-context]');
    if(change){ev.preventDefault();ev.stopPropagation();state.activeEngagementId=null;setPage('estudios');return}
    const clear=ev.target.closest?.('[data-clear-context]');
    if(clear){ev.preventDefault();ev.stopPropagation();state.activeEngagementId=null;setPage('inicio')}
  });
}

function bindRailContextActions(){
  document.querySelectorAll('[data-open-context]').forEach(b=>b.onclick=()=>{const e=state.engagements.find(x=>x.id===b.dataset.openContext)||currentEng();if(!e)return;state.activeEngagementId=e.id;state.activePage='diagnostico';render()});
  document.querySelectorAll('[data-change-context]').forEach(b=>b.onclick=()=>{state.activeEngagementId=null;state.activePage='estudios';render()});
  document.querySelectorAll('[data-clear-context]').forEach(b=>b.onclick=()=>{state.activeEngagementId=null;state.activePage='inicio';render()});
}
function postBind(){
  bindRailContextActions();
  bindProjectPages();
  const by=id=>document.getElementById(id);
  if(by('newStudy'))by('newStudy').onclick=newStudy;if(by('homeNewContact'))by('homeNewContact').onclick=addContact;
  document.querySelectorAll('[data-study-page]').forEach(el=>el.onclick=e=>{e.preventDefault();e.stopPropagation();if(el.disabled)return;state.studyPage=Math.max(1,Number(el.dataset.studyPage)||1);render()});
  if(by('addCompanyBtn'))by('addCompanyBtn').onclick=addCompany;if(by('addContactBtn'))by('addContactBtn').onclick=addContact;
  if(by('openSessionDisplay'))by('openSessionDisplay').onclick=openSessionDisplay;
  if(by('addInteractionBtn'))by('addInteractionBtn').onclick=addInteraction;if(by('addOpportunityBtn'))by('addOpportunityBtn').onclick=addOpportunity;
  bindCrm();
  if(by('addStep'))by('addStep').onclick=()=>openStepModal();if(by('addMultipleSteps'))by('addMultipleSteps').onclick=addMultipleSteps;if(by('addFriction'))by('addFriction').onclick=()=>openFrictionModal();if(by('confirmAsIs'))by('confirmAsIs').onclick=confirmAsIs;
  if(by('addRisk'))by('addRisk').onclick=addRisk;if(by('addEconomic'))by('addEconomic').onclick=addEconomic;if(by('runDiag'))by('runDiag').onclick=runDiagnosis;if(by('runDiagHeader'))by('runDiagHeader').onclick=runDiagnosis;
  if(by('prevStage'))by('prevStage').onclick=()=>{const e=currentEng(),i=schema.flow.findIndex(x=>x.Stage_ID===e.stageId);if(i>0){e.stageId=schema.flow[i-1].Stage_ID;markDirty();render()}};
  if(by('nextStage'))by('nextStage').onclick=()=>{const e=currentEng(),i=schema.flow.findIndex(x=>x.Stage_ID===e.stageId);if(typeof blockStageAdvance==='function'&&blockStageAdvance(e))return;if(i<schema.flow.length-1){e.stageId=schema.flow[i+1].Stage_ID;markDirty();render()}};
  if(by('saveRecap'))by('saveRecap').onclick=()=>{currentEng().meetingRecap=by('meetingRecap').value;markDirty('Resumen final de reunión actualizado');toast('Resumen guardado en el estudio.')};
  if(by('newScenario'))by('newScenario').onclick=createScenario;
  if(by('quoteScenario'))by('quoteScenario').onchange=()=>{currentEng().selectedScenarioIndex=+by('quoteScenario').value;markDirty('Escenario de cotización seleccionado');render()};
  if(by('printQuote'))by('printQuote').onclick=downloadQuotePdf;if(by('createProject'))by('createProject').onclick=createProjectFromEngagement;
  if(by('checkBackend'))by('checkBackend').onclick=async()=>{await checkBackend();render();toast(state.backendOnline?'Backend disponible.':'Backend no disponible en '+state.backendUrl)};
  if(by('returnToStage'))by('returnToStage').onclick=returnToStage;
  if(by('clearLocal'))by('clearLocal').onclick=()=>{if(confirm(`¿Eliminar toda la base local de AUNEA Internal v${AUNEA_PRODUCT_VERSION} ${AUNEA_PRODUCT_STATUS} de este navegador?`)){localStorage.removeItem(STORAGE_KEY);state=blankState();render();toast('Datos locales eliminados.')}};
}

function closeOtherAuneaSelects(target){
  if(typeof document==='undefined')return;
  const inside=target?.closest?.('details.aunea-select')||null;
  document.querySelectorAll('details.aunea-select[open]').forEach(box=>{if(box!==inside)box.open=false});
}
if(typeof window!=='undefined'&&!window.__auneaSelectDismissBound){
  window.__auneaSelectDismissBound=true;
  document.addEventListener('click',e=>closeOtherAuneaSelects(e.target),true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('details.aunea-select[open]').forEach(box=>box.open=false)});
}

// CRM interactions. Selection is state, not DOM: the inspector always shows the selected record and
// never keeps a second copy of it (DEC-050).
function bindCrm(){
  const on=(sel,fn)=>document.querySelectorAll(sel).forEach(el=>el.onclick=e=>{e.stopPropagation();fn(el)});
  const live=(sel,fn)=>document.querySelectorAll(sel).forEach(el=>el.onchange=()=>fn(el));

  document.querySelectorAll('[data-company-tab]').forEach(b=>b.onclick=()=>{state.companyTab=b.dataset.companyTab;state.selectedCompanyId=null;render()});
  document.querySelectorAll('[data-select-company]').forEach(r=>r.onclick=()=>{state.selectedCompanyId=r.dataset.selectCompany;render()});
  on('[data-edit-company]',el=>editCompany(el.dataset.editCompany));
  document.querySelectorAll('[data-company-ins-tab]').forEach(b=>b.onclick=()=>{state.companyInspectorTab=b.dataset.companyInsTab;render()});
  live('[data-company-filter]',el=>{state.companyFilters={...state.companyFilters,[el.dataset.companyFilter]:el.value};render()});
  if(document.getElementById('includeArchivedCompanies'))document.getElementById('includeArchivedCompanies').onchange=e=>{state.companyFilters={...state.companyFilters,includeArchived:e.target.checked};state.companyPage=1;state.selectedCompanyId=null;render()};
  if(document.getElementById('clearCompanyFilters'))document.getElementById('clearCompanyFilters').onclick=()=>{state.companyFilters={sector:'',size:'',status:'',includeArchived:false};state.companySearch='';state.companyPage=1;state.selectedCompanyId=null;render()};
  const cs=document.getElementById('companySearch');if(cs)cs.oninput=()=>{state.companySearch=cs.value;state.companyPage=1;state.selectedCompanyId=null;clearTimeout(window.__companySearch);window.__companySearch=setTimeout(render,220)};
  on('[data-company-contacts]',el=>{state.selectedCompanyId=el.dataset.companyContacts;setPage('contactos')});
  on('[data-company-contact-new]',el=>{state.selectedCompanyId=el.dataset.companyContactNew;addContact()});
  on('[data-company-opportunity]',el=>{state.selectedCompanyId=el.dataset.companyOpportunity;addOpportunity()});
  on('[data-company-interaction]',el=>{state.selectedCompanyId=el.dataset.companyInteraction;addInteraction()});

  document.querySelectorAll('[data-select-contact]').forEach(r=>r.onclick=()=>{state.selectedContactId=r.dataset.selectContact;render()});
  on('[data-edit-contact]',el=>editContact(el.dataset.editContact));
  on('[data-inactivate-contact]',el=>{if(inactivateContact(el.dataset.inactivateContact))render()});
  on('[data-reactivate-contact]',el=>{if(reactivateContact(el.dataset.reactivateContact))render()});
  // The star writes through to Company.primaryContactId — it never sets a field on the contact.
  on('[data-primary-contact]',el=>{const ct=contactById(el.dataset.primaryContact);if(ct){setPrimaryContact(ct.companyId,ct.id);render()}});
  on('[data-contact-history]',el=>{state.selectedContactId=el.dataset.contactHistory;setPage('interacciones')});
  on('[data-contact-interaction]',el=>{const ct=contactById(el.dataset.contactInteraction);if(ct)addInteraction({companyId:ct.companyId,contactIds:[ct.id]})});
  document.querySelectorAll('[data-contact-filter-option]').forEach(el=>el.onclick=e=>{e.stopPropagation();const key=el.dataset.contactFilterOption,val=el.dataset.value||'';state.contactFilters={...state.contactFilters,[key]:val};if(key==='status'&&val==='Inactivo')state.contactFilters.includeInactive=true;state.contactPage=1;state.selectedContactId=null;render()});
  if(document.getElementById('includeInactiveContacts'))document.getElementById('includeInactiveContacts').onchange=e=>{state.contactFilters={...state.contactFilters,includeInactive:e.target.checked};if(!e.target.checked&&state.contactFilters.status==='Inactivo')state.contactFilters.status='';state.contactPage=1;state.selectedContactId=null;render()};
  if(document.getElementById('clearContactFilters'))document.getElementById('clearContactFilters').onclick=()=>{state.contactFilters={role:'',status:'',includeInactive:false};state.contactSearch='';state.contactPage=1;state.selectedContactId=null;render()};
  const ks=document.getElementById('contactSearch');if(ks)ks.oninput=()=>{state.contactSearch=ks.value;state.contactPage=1;state.selectedContactId=null;clearTimeout(window.__contactSearch);window.__contactSearch=setTimeout(render,220)};
  document.querySelectorAll('[data-contact-company-option]').forEach(el=>el.onclick=e=>{e.stopPropagation();state.selectedCompanyId=el.dataset.contactCompanyOption||null;state.selectedContactId=null;state.contactPage=1;render()});
  if(document.getElementById('clearContactCompany'))document.getElementById('clearContactCompany').onclick=()=>{state.selectedCompanyId=null;state.selectedContactId=null;state.contactPage=1;render()};
  document.querySelectorAll('[data-contact-page]').forEach(el=>el.onclick=e=>{e.preventDefault();e.stopPropagation();if(el.disabled)return;state.contactPage=Math.max(1,Number(el.dataset.contactPage)||1);state.selectedContactId=null;render()});

  document.querySelectorAll('[data-interaction-filter-option]').forEach(el=>el.onclick=e=>{
    e.stopPropagation();const key=el.dataset.interactionFilterOption,val=el.dataset.value||'';
    state.interactionFilters={...state.interactionFilters,[key]:val};
    if(key==='companyId')state.interactionFilters.contactId='';
    state.interactionPage=1;
    render();
  });
  if(document.getElementById('clearInteractionFilters'))document.getElementById('clearInteractionFilters').onclick=()=>{state.interactionFilters={companyId:'',contactId:''};state.interactionPage=1;render()};
  document.querySelectorAll('[data-interaction-page]').forEach(el=>el.onclick=e=>{e.preventDefault();e.stopPropagation();if(el.disabled)return;state.interactionPage=Math.max(1,Number(el.dataset.interactionPage)||1);render()});
  document.querySelectorAll('[data-opportunity-filter-option]').forEach(el=>el.onclick=e=>{
    e.stopPropagation();const key=el.dataset.opportunityFilterOption,val=el.dataset.value||'';
    state.opportunityFilters={...state.opportunityFilters,[key]:val};
    if(key==='companyId')state.opportunityFilters.contactId='';
    state.opportunityPage=1;
    render();
  });
  if(document.getElementById('clearOpportunityFilters'))document.getElementById('clearOpportunityFilters').onclick=()=>{state.opportunityFilters={companyId:'',contactId:''};state.opportunityPage=1;render()};
  document.querySelectorAll('[data-opportunity-page]').forEach(el=>el.onclick=e=>{e.preventDefault();e.stopPropagation();if(el.disabled)return;state.opportunityPage=Math.max(1,Number(el.dataset.opportunityPage)||1);render()});

  on('[data-edit-interaction]',el=>editInteraction(el.dataset.editInteraction));
  on('[data-delete-interaction]',el=>deleteInteraction(el.dataset.deleteInteraction));
  on('[data-edit-opportunity]',el=>editOpportunity(el.dataset.editOpportunity));
  on('[data-opportunity-study]',el=>createStudyFromOpportunity(el.dataset.opportunityStudy));
}
// [AUNEA-FE-SHELL-NAV-010] END