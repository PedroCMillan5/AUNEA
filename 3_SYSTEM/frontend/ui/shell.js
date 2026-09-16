// [AUNEA-FE-SHELL-NAV-010] START — Pantallas y eventos
// PURPOSE: Pantallas y eventos.
// SOURCE: v1.0.4 aceptada como baseline técnica; Diagnostic Master v1.1; DEC-034/038/040/043.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM, almacenamiento local y solicitudes HTTP según responsabilidad.
// CHANGE_RISK: HIGH.
const pages={
  inicio(){const active=currentEng();return pageTop('Cockpit de consultoría','Punto de entrada limpio a CRM, estudios y diagnóstico. No se cargan datos ficticios automáticamente.',`<button class="btn btn-primary" id="newStudy">Nuevo estudio</button>`) + `<div class="hero-actions"><button class="hero-action primary" id="homeNewContact"><b>Nuevo contacto</b><p>Registra persona + empresa y conserva la relación a lo largo del tiempo.</p><span class="arrow">→</span></button><button class="hero-action" data-page="estudios"><b>Abrir estudios</b><p>Consulta diagnósticos históricos y continúa desde el punto guardado.</p><span class="arrow">→</span></button><button class="hero-action" data-page="diagnostico"><b>Continuar diagnóstico</b><p>${active?'Retoma '+esc(active.title):'Abre primero un estudio.'}</p><span class="arrow">→</span></button></div><div class="grid g4 section"><div class="card metric"><small>Empresas</small><strong>${state.companies.length}</strong></div><div class="card metric"><small>Contactos</small><strong>${state.contacts.length}</strong></div><div class="card metric"><small>Estudios</small><strong>${state.engagements.length}</strong></div><div class="card metric"><small>Proyectos</small><strong>${state.projects.length}</strong></div></div>`+section('Cómo funciona','El mismo Engagement Record acompaña todo el recorrido.',`<div class="grid g4"><div class="notice"><b>1. Relación</b><br>Empresa → contacto → oportunidad</div><div class="notice"><b>2. Diagnóstico</b><br>Contexto → AS-IS → fricciones → evidencia</div><div class="notice"><b>3. Decisión</b><br>Economics → riesgo → recomendación → escenarios</div><div class="notice"><b>4. Salida</b><br>Quote → entregables → proyecto</div></div>`)},
  empresas:companiesPage,contactos:contactsPage,interacciones:interactionsPage,oportunidades:opportunitiesPage,
  estudios(){return pageTop('Estudios','Biblioteca histórica de engagements. Un contacto puede tener varios estudios y proyectos.',`<button class="btn btn-primary" id="newStudy">Nuevo estudio</button>`) + section('Histórico',`${state.engagements.length} estudio(s) guardados en este navegador.`,state.engagements.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Empresa</th><th>Estudio</th><th>Contacto</th><th>Proceso</th><th>Estado</th><th>Actualizado</th><th></th></tr></thead><tbody>${state.engagements.map(e=>`<tr><td>${esc(companyById(e.companyId)?.name||'—')}</td><td><b>${esc(e.title)}</b></td><td>${esc(e.contactIds.map(x=>contactById(x)?.name).filter(Boolean).join(', '))}</td><td>${esc(e.answers?.DF011||'Pendiente')}</td><td>${statusBadge(e.status)}</td><td>${fmtDate(e.updatedAt)}</td><td><button class="btn btn-small btn-primary" data-open-eng="${e.id}">Abrir</button><button class="btn btn-small" data-open-eng="${e.id}" data-open-eng-page="resultados">Trabajo interno</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><h2>No hay estudios</h2><p>Crea uno desde un contacto para mantener trazabilidad de la relación.</p></div>')},
  proyectos(){return pageTop('Proyectos','Biblioteca histórica de proyectos vinculados a empresas, contactos y engagements.','') + section('Histórico de proyectos','Un mismo contacto puede participar en varios proyectos a lo largo del tiempo.',state.projects.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Empresa</th><th>Proyecto</th><th>Contactos</th><th>Estudio origen</th><th>Estado</th><th>Creado</th></tr></thead><tbody>${state.projects.map(p=>{const e=state.engagements.find(x=>x.id===p.engagementId);return `<tr><td>${esc(companyById(p.companyId)?.name||'—')}</td><td><b>${esc(p.name)}</b></td><td>${esc((p.contactIds||[]).map(x=>contactById(x)?.name).filter(Boolean).join(', '))}</td><td>${esc(e?.title||'—')}</td><td>${statusBadge(p.status)}</td><td>${fmtDate(p.createdAt)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty"><h2>Aún no hay proyectos</h2><p>Un contacto o una oportunidad no son un proyecto. El proyecto se crea cuando un engagement/escenario se confirma para ejecución.</p></div>')},
  diagnostico:stagePage,proceso:processPage,resultados:resultsPage,recomendacion:recommendationPage,escenarios:scenariosPage,quote:quotePage,
  admin(){const e=currentEng();return pageTop('Admin / Auditoría','Estado del frontend, fuente canónica, persistencia y trazabilidad de cambios.',`<button class="btn" id="checkBackend">Comprobar backend</button><button class="btn btn-danger" id="clearLocal">Limpiar datos locales</button>`) + `<div class="grid g4"><div class="card metric"><small>Frontend</small><strong>v${esc(AUNEA_PRODUCT_VERSION)}</strong><span>${esc(AUNEA_PRODUCT_STATUS)}</span></div><div class="card metric"><small>Diagnostic Master</small><strong>100</strong><span>campos canónicos</span></div><div class="card metric"><small>Option sets</small><strong>${Object.keys(schema.option_sets).length}</strong><span>380 opciones</span></div><div class="card metric"><small>Backend</small><strong>${state.backendOnline?'OK':'—'}</strong><span>${esc(state.backendVersion||'no conectado')}</span></div></div>`+section('Fuente canónica','La UI no gobierna reglas.',`<div class="notice good"><strong>Diagnostic Master v1.1:</strong> ${esc(schema.source)}<br>100/100 campos con control UI, objetivo, validación, ejemplo, Source_ID y mapping a engine.</div>`)+section('Auditoría local','Últimos cambios en esta sesión.',state.audit.length?state.audit.slice(0,40).map(a=>`<div class="audit-line"><b>${fmtDate(a.ts)}</b> · ${esc(a.message)}</div>`).join(''):'<div class="empty"><p>Sin cambios registrados todavía.</p></div>')}
};

function postBind(){
  const by=id=>document.getElementById(id);
  if(by('newStudy'))by('newStudy').onclick=newStudy;if(by('homeNewContact'))by('homeNewContact').onclick=addContact;
  if(by('addCompanyBtn'))by('addCompanyBtn').onclick=addCompany;if(by('addContactBtn'))by('addContactBtn').onclick=addContact;
  if(by('openSessionDisplay'))by('openSessionDisplay').onclick=openSessionDisplay;
  if(by('addInteractionBtn'))by('addInteractionBtn').onclick=addInteraction;if(by('addOpportunityBtn'))by('addOpportunityBtn').onclick=addOpportunity;
  bindCrm();
  if(by('addStep'))by('addStep').onclick=()=>openStepModal();if(by('addMultipleSteps'))by('addMultipleSteps').onclick=addMultipleSteps;if(by('addFriction'))by('addFriction').onclick=()=>openFrictionModal();if(by('confirmAsIs'))by('confirmAsIs').onclick=confirmAsIs;
  if(by('addRisk'))by('addRisk').onclick=addRisk;if(by('addEconomic'))by('addEconomic').onclick=addEconomic;if(by('runDiag'))by('runDiag').onclick=runDiagnosis;if(by('runDiagHeader'))by('runDiagHeader').onclick=runDiagnosis;
  if(by('prevStage'))by('prevStage').onclick=()=>{const e=currentEng(),i=schema.flow.findIndex(x=>x.Stage_ID===e.stageId);if(i>0){e.stageId=schema.flow[i-1].Stage_ID;markDirty();render()}};
  if(by('nextStage'))by('nextStage').onclick=()=>{const e=currentEng(),i=schema.flow.findIndex(x=>x.Stage_ID===e.stageId);if(i<schema.flow.length-1){e.stageId=schema.flow[i+1].Stage_ID;markDirty();render()}};
  if(by('saveRecap'))by('saveRecap').onclick=()=>{currentEng().meetingRecap=by('meetingRecap').value;markDirty('Resumen final de reunión actualizado');toast('Resumen guardado en el estudio.')};
  if(by('newScenario'))by('newScenario').onclick=createScenario;
  if(by('quoteScenario'))by('quoteScenario').onchange=()=>{currentEng().selectedScenarioIndex=+by('quoteScenario').value;markDirty('Escenario de cotización seleccionado');render()};
  if(by('printQuote'))by('printQuote').onclick=downloadQuotePdf;if(by('createProject'))by('createProject').onclick=createProjectFromEngagement;
  if(by('checkBackend'))by('checkBackend').onclick=async()=>{await checkBackend();render();toast(state.backendOnline?'Backend disponible.':'Backend no disponible en '+state.backendUrl)};
  if(by('returnToStage'))by('returnToStage').onclick=returnToStage;
  if(by('clearLocal'))by('clearLocal').onclick=()=>{if(confirm(`¿Eliminar toda la base local de AUNEA Internal v${AUNEA_PRODUCT_VERSION} ${AUNEA_PRODUCT_STATUS} de este navegador?`)){localStorage.removeItem(STORAGE_KEY);state=blankState();render();toast('Datos locales eliminados.')}};
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
  if(document.getElementById('clearCompanyFilters'))document.getElementById('clearCompanyFilters').onclick=()=>{state.companyFilters={sector:'',size:'',status:'',country:''};state.companySearch='';render()};
  const cs=document.getElementById('companySearch');if(cs)cs.oninput=()=>{state.companySearch=cs.value;clearTimeout(window.__companySearch);window.__companySearch=setTimeout(render,220)};
  on('[data-company-contacts]',el=>{state.selectedCompanyId=el.dataset.companyContacts;setPage('contactos')});
  on('[data-company-contact-new]',el=>{state.selectedCompanyId=el.dataset.companyContactNew;addContact()});
  on('[data-company-opportunity]',el=>{state.selectedCompanyId=el.dataset.companyOpportunity;addOpportunity()});
  on('[data-company-interaction]',el=>{state.selectedCompanyId=el.dataset.companyInteraction;addInteraction()});

  document.querySelectorAll('[data-select-contact]').forEach(r=>r.onclick=()=>{state.selectedContactId=r.dataset.selectContact;render()});
  on('[data-edit-contact]',el=>editContact(el.dataset.editContact));
  on('[data-delete-contact]',el=>{if(deleteContact(el.dataset.deleteContact))render()});
  // The star writes through to Company.primaryContactId — it never sets a field on the contact.
  on('[data-primary-contact]',el=>{const ct=contactById(el.dataset.primaryContact);if(ct){setPrimaryContact(ct.companyId,ct.id);render()}});
  on('[data-contact-history]',el=>{state.selectedContactId=el.dataset.contactHistory;setPage('interacciones')});
  on('[data-contact-project]',()=>toast('Un proyecto nace de una decisión de implementación sobre un estudio (DEC-054).'));
  live('[data-contact-filter]',el=>{state.contactFilters={...state.contactFilters,[el.dataset.contactFilter]:el.value};render()});
  if(document.getElementById('clearContactFilters'))document.getElementById('clearContactFilters').onclick=()=>{state.contactFilters={role:'',status:'',language:''};state.contactSearch='';render()};
  const ks=document.getElementById('contactSearch');if(ks)ks.oninput=()=>{state.contactSearch=ks.value;clearTimeout(window.__contactSearch);window.__contactSearch=setTimeout(render,220)};
  const cp=document.getElementById('contactsCompanyPicker');if(cp)cp.onchange=()=>{state.selectedCompanyId=cp.value;state.selectedContactId=null;render()};

  on('[data-edit-interaction]',el=>editInteraction(el.dataset.editInteraction));
  on('[data-delete-interaction]',el=>deleteInteraction(el.dataset.deleteInteraction));
  on('[data-edit-opportunity]',el=>editOpportunity(el.dataset.editOpportunity));
  on('[data-opportunity-study]',el=>createStudyFromOpportunity(el.dataset.opportunityStudy));
}
// [AUNEA-FE-SHELL-NAV-010] END