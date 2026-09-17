// [AUNEA-FE-PAGE-COMPANIES-010] START — P01 Empresas
// PURPOSE: Reproduce the approved Empresas reference and expose governed CRM actions: search, filters,
//          company table, archive/edit actions, notes/history popups and related-entity inspector tabs.
// SOURCE: IMG90-00-01; Architecture Contract v1.3 P01; DEC-007/050/051/054/055/058; PROJECT_RULES v1.5.
// INPUTS: state.companies plus related contacts/opportunities/engagements/projects/interactions.
// OUTPUTS: page markup and company-specific UI events. Company data remains owned by AUNEA-FE-CRM-COMPANY-010.
// SIDE_EFFECTS: delegated UI actions call governed domain operations; no duplicate business state.
// CHANGE_RISK: MEDIUM.

const COMPANY_TABS=['Todas','Clientes','Prospectos','Colaboradores','Archivadas'];
const COMPANY_TAB_STATUS={Clientes:'Cliente',Prospectos:'Prospecto',Colaboradores:'Colaborador',Archivadas:'Archivada'};
const visibleKey=v=>String(v||'').trim().toLocaleLowerCase('es');
const countryLabel=v=>labelFrom('REF_COUNTRY_ISO3166',v)||v||'—';

function visibleCompanies(){
  const f=state.companyFilters||{},q=(state.companySearch||'').toLowerCase().trim(),wanted=COMPANY_TAB_STATUS[state.companyTab];
  return state.companies.filter(c=>{
    if(wanted?c.status!==wanted:c.status==='Archivada')return false;
    if(f.sector&&visibleKey(companySectorLabel(c.sector))!==visibleKey(f.sector))return false;
    if(f.status&&c.status!==f.status)return false;
    if(f.country&&visibleKey(countryLabel(c.country))!==visibleKey(f.country))return false;
    if(f.size&&companySizeBand(c)!==f.size)return false;
    if(q&&![c.name,c.tradeName,companySectorLabel(c.sector),countryLabel(c.country)].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    return true;
  });
}
function selectedCompany(){return companyById(state.selectedCompanyId)||visibleCompanies()[0]||null}
function uniqueVisibleOptions(values,labeler){
  const seen=new Set(),out=[];
  values.filter(Boolean).forEach(v=>{const label=labeler(v),k=visibleKey(label);if(!k||seen.has(k))return;seen.add(k);out.push({value:label,label})});
  return out.sort((a,b)=>a.label.localeCompare(b.label,'es'));
}
function companyFilterRow(){
  const f=state.companyFilters||{};
  const sel=(key,label,options)=>`<div class="filter-group"><span>${esc(label)}</span><select data-company-filter="${key}"><option value="">${esc(label)}</option>${options.map(o=>`<option value="${attr(o.value)}" ${f[key]===o.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>`;
  const present=get=>state.companies.map(get).filter(Boolean);
  return `<div class="filter-row">
    ${sel('sector','Sector',uniqueVisibleOptions(present(c=>c.sector),companySectorLabel))}
    ${sel('size','Tamaño',[...new Set(present(c=>companySizeBand(c)).filter(v=>v!=='—'))].map(v=>({value:v,label:v})))}
    ${sel('status','Estado',COMPANY_STATUS.map(v=>({value:v,label:v})))}
    ${sel('country','País',uniqueVisibleOptions(present(c=>c.country),countryLabel))}
    <button class="link-btn" id="clearCompanyFilters">Limpiar</button>
  </div>`;
}
function companyHistoryMarkup(co){
  const list=interactionsOf(co.id).slice(0,20);
  return list.length?`<div class="result-list">${list.map(i=>`<div class="result-item"><b>${esc(i.subject||'Interacción')}</b><p>${esc(i.type||'—')} · ${esc(formatDateEs(i.occurredAt))}${i.outcome?` · ${esc(i.outcome)}`:''}</p></div>`).join('')}</div>`:'<div class="empty"><p>Sin interacciones registradas.</p></div>';
}
function companyNotesPopup(co){
  openModal(`Notas · ${co.name}`,co.notes?`<div class="kv-box">${esc(co.notes)}</div>`:'<div class="empty"><p>Sin notas generales.</p></div>',()=>closeModal(),'Cerrar');
}
function companyHistoryPopup(co){openModal(`Historial · ${co.name}`,companyHistoryMarkup(co),()=>closeModal(),'Cerrar')}

function companyActionMenu(c){return `<details class="row-menu"><summary class="kebab-btn" aria-label="Acciones de ${attr(c.name)}">•••</summary><div class="row-menu-popover">
  <button type="button" data-edit-company="${attr(c.id)}">Editar</button>
  <button type="button" data-company-notes-popup="${attr(c.id)}">Notas</button>
  <button type="button" data-company-history-popup="${attr(c.id)}">Historial</button>
  ${c.status!=='Archivada'?`<button type="button" class="danger-text" data-archive-company="${attr(c.id)}">Archivar</button>`:''}
</div></details>`}

function companyTable(rows){
  if(!rows.length)return `<div class="empty"><h2>Sin empresas con estos criterios</h2><p>Ajusta la búsqueda o los filtros, o crea una empresa nueva.</p></div>`;
  const sel=state.selectedCompanyId;
  return `<div class="table-wrap"><table class="data-table company-table"><thead><tr><th>Empresa</th><th>Sector</th><th>Tamaño</th><th>País</th><th>Estado</th><th>Contacto principal</th><th>Fecha de alta</th><th>Acciones</th></tr></thead><tbody>${rows.map(c=>{
    const primary=contactById(c.primaryContactId);
    return `<tr class="company-row ${c.id===sel?'row-selected':''}" data-select-company="${attr(c.id)}"><td><b>${esc(c.name)}</b>${c.tradeName?`<br><small>${esc(c.tradeName)}</small>`:''}</td><td>${esc(companySectorLabel(c.sector))}</td><td>${esc(companySizeBand(c))}</td><td>${esc(countryLabel(c.country))}</td><td><span class="badge ${companyStatusClass(c.status)}">${esc(c.status||'—')}</span></td><td>${primary?`<b>${esc(contactFullName(primary))}</b><br><small>${esc(primary.role||'')}</small>`:'<small>Sin asignar</small>'}</td><td>${esc(formatDateEs(c.createdAt))}</td><td>${companyActionMenu(c)}</td></tr>`;
  }).join('')}</tbody></table></div><div class="table-foot"><span>Mostrando ${rows.length} de ${state.companies.length} empresas</span></div>`;
}

function companyInspector(co){
  if(!co)return insCard('Vista de la empresa','<p>Selecciona una empresa para ver su ficha y sus relaciones.</p>',{accent:true,icon:'▦'});
  const n=companyCounters(co.id),tabs=['Resumen',`Contactos (${n.contacts})`,`Oportunidades (${n.opportunities})`,`Estudios (${n.engagements})`,`Proyectos (${n.projects})`],active=state.companyInspectorTab||'Resumen',primary=contactById(co.primaryContactId);
  const head=`<div class="ins-head"><h3>${esc(co.name)}</h3><div class="ins-head-actions"><button class="btn btn-small" data-edit-company="${attr(co.id)}">Editar</button>${co.status!=='Archivada'?`<button class="btn btn-small" data-archive-company="${attr(co.id)}">Archivar</button>`:''}</div></div><div style="margin-bottom:12px"><span class="badge ${companyStatusClass(co.status)}">${esc(co.status||'—')}</span></div><div class="tabs">${tabs.map(t=>`<button class="tab ${t.split(' (')[0]===active?'active':''}" data-company-ins-tab="${attr(t.split(' (')[0])}">${esc(t)}</button>`).join('')}</div>`;
  let body='';
  if(active==='Contactos'){
    const list=contactsOfCompany(co.id);body=list.length?`<div class="result-list">${list.map(c=>`<div class="result-item"><b>${esc(contactFullName(c))}</b>${isPrimaryContact(c)?' <span class="badge system">Principal</span>':''}<p>${esc(c.role||'Sin cargo')} · ${esc(c.email||'sin email')}</p></div>`).join('')}</div>`:'<div class="empty"><p>Esta empresa no tiene contactos registrados.</p></div>';
  }else if(active==='Oportunidades'){
    const list=(state.opportunities||[]).filter(o=>o.companyId===co.id);body=list.length?`<div class="result-list">${list.map(o=>`<div class="result-item"><b>${esc(o.title||'Oportunidad')}</b><p>${esc(o.stage||'—')} · ${esc(o.source||'—')}</p></div>`).join('')}</div>`:'<div class="empty"><p>Sin oportunidades registradas.</p></div>';
  }else if(active==='Estudios'){
    const list=state.engagements.filter(e=>e.companyId===co.id);body=list.length?`<div class="result-list">${list.map(e=>`<div class="result-item"><b>${esc(e.title||'Estudio')}</b><p>${esc(engagementStatus(e))} · ${esc(formatDateEs(e.updatedAt||e.createdAt))}</p></div>`).join('')}</div>`:'<div class="empty"><p>Sin estudios registrados.</p></div>';
  }else if(active==='Proyectos'){
    const list=state.projects.filter(p=>p.companyId===co.id);body=list.length?`<div class="result-list">${list.map(p=>`<div class="result-item"><b>${esc(p.name)}</b><p>${esc(p.status||'—')} · ${esc(formatDateEs(p.createdAt))}</p></div>`).join('')}</div>`:'<div class="empty"><p>Sin proyectos. Un proyecto nace de una decisión de implementación.</p></div>';
  }else{
    body=`<div class="ins-note" style="margin-bottom:10px"><b>Información general</b></div>`+kvRows([['Nombre legal',esc(co.name)],['Nombre comercial',esc(co.tradeName||'—')],['CIF',esc(co.taxId||'—')],['Sector',esc(companySectorLabel(co.sector))],['Tamaño',esc(companySizeBand(co)==='—'?'—':`${companySizeBand(co)} empleados`)],['País',esc(countryLabel(co.country))],['Tipo de organización',esc(co.orgType||'—')],['Sitio web',co.website?`<a href="#" class="link-btn">${esc(co.website)}</a>`:'—'],['Estado',`<span class="badge ${companyStatusClass(co.status)}">${esc(co.status||'—')}</span>`],['Canal de entrada',esc(co.entryChannel||'—')],['Fecha de alta',esc(formatDateEs(co.createdAt))],['Responsable AUNEA',esc(co.owner||'—')],['Contacto principal',primary?esc(contactFullName(primary)):'—']]);
  }
  const quick=insCard('Acciones rápidas',`<div class="quick-actions"><button class="btn btn-small" data-company-contacts="${attr(co.id)}">Ver contactos</button><button class="btn btn-small" data-company-opportunity="${attr(co.id)}">Nueva oportunidad</button><button class="btn btn-small" data-company-contact-new="${attr(co.id)}">Nuevo contacto</button><button class="btn btn-small" data-company-interaction="${attr(co.id)}">Registrar interacción</button></div>`);
  return `<div class="ins-card">${head}${body}</div>${quick}`;
}

// Delegated company-only actions survive page rerenders without creating a second data owner.
if(!window.__auneaCompanyActionsBound){
  window.__auneaCompanyActionsBound=true;
  document.addEventListener('click',e=>{
    const action=e.target.closest('[data-archive-company],[data-company-notes-popup],[data-company-history-popup]');if(!action)return;
    e.preventDefault();e.stopPropagation();
    const companyId=action.dataset.archiveCompany||action.dataset.companyNotesPopup||action.dataset.companyHistoryPopup,co=companyById(companyId);if(!co)return;
    if(action.dataset.archiveCompany!==undefined)archiveCompany(companyId);
    else if(action.dataset.companyNotesPopup!==undefined)companyNotesPopup(co);
    else companyHistoryPopup(co);
  },true);
}

function companiesPage(){
  const rows=visibleCompanies(),co=selectedCompany();if(co&&state.selectedCompanyId!==co.id)state.selectedCompanyId=co.id;
  const main=`<div class="tabs">${COMPANY_TABS.map(t=>`<button class="tab ${t===(state.companyTab||'Todas')?'active':''}" data-company-tab="${attr(t)}">${esc(t)}</button>`).join('')}</div><div class="search-bar"><input id="companySearch" value="${attr(state.companySearch||'')}" placeholder="Buscar empresa, sector o ubicación..."></div>${companyFilterRow()}${companyTable(rows)}`;
  return pageTop('Empresas','Gestiona las empresas con las que trabaja AUNEA.',`<button class="btn btn-primary" id="addCompanyBtn">+ Nueva empresa</button>`,'I90-00-01')+workspace(main,companyInspector(co),{wide:true});
}
// [AUNEA-FE-PAGE-COMPANIES-010] END
