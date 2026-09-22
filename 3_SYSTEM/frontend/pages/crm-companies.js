// [AUNEA-FE-PAGE-COMPANIES-010] START — P01 Empresas
// PURPOSE: Reproduce the approved Empresas reference and expose governed CRM actions: search, filters,
//          company table, archive/edit actions, notes/history popups and related-entity inspector tabs.
// SOURCE: IMG90-00-01; Architecture Contract v1.5 P01; DEC-007/050/051/054/055/058; PROJECT_RULES v1.7.
// INPUTS: state.companies plus related contacts/opportunities/engagements/projects/interactions.
// OUTPUTS: page markup and company-specific UI events, including 10-row paging and archived-record opt-in. Company data remains owned by AUNEA-FE-CRM-COMPANY-010.
// SIDE_EFFECTS: delegated UI actions call governed domain operations; no duplicate business state.
// CHANGE_RISK: MEDIUM.

const visibleKey=v=>String(v||'').trim().toLocaleLowerCase('es');

const COMPANY_PAGE_SIZE=5;
function visibleCompanies(){
  const f=state.companyFilters||{},q=(state.companySearch||'').toLowerCase().trim();
  return state.companies.filter(c=>{
    if(c.status==='Archivada'&&!f.includeArchived)return false;
    if(f.sector&&visibleKey(companySectorLabel(c.sector))!==visibleKey(f.sector))return false;
    if(f.status&&c.status!==f.status)return false;
    if(f.size&&companySizeBand(c)!==f.size)return false;
    if(q&&![c.name,c.tradeName,companySectorLabel(c.sector)].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    return true;
  });
}
function companyPagination(rows){
  const totalPages=Math.max(1,Math.ceil(rows.length/COMPANY_PAGE_SIZE));
  const page=Math.min(Math.max(1,Number(state.companyPage)||1),totalPages);
  state.companyPage=page;
  return {page,totalPages,start:(page-1)*COMPANY_PAGE_SIZE,rows:rows.slice((page-1)*COMPANY_PAGE_SIZE,page*COMPANY_PAGE_SIZE)};
}
function selectedCompany(){return companyById(state.selectedCompanyId)||visibleCompanies()[0]||null}
function uniqueVisibleOptions(values,labeler){
  const seen=new Set(),out=[];
  values.filter(Boolean).forEach(v=>{const label=labeler(v),k=visibleKey(label);if(!k||seen.has(k))return;seen.add(k);out.push({value:label,label})});
  return out.sort((a,b)=>a.label.localeCompare(b.label,'es'));
}
function companyFilterControl(key,label,options){
  const current=(state.companyFilters||{})[key]||'',shown=options.find(o=>String(o.value)===String(current))?.label||label;
  return `<div class="filter-group"><span>${esc(label)}</span><details class="aunea-select" data-company-filter-box="${attr(key)}"><summary><span>${esc(shown)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="${attr(label)}"><button type="button" role="option" data-company-filter-option="${attr(key)}" data-value="">Todos</button>${options.map(o=>`<button type="button" role="option" class="${String(current)===String(o.value)?'selected':''}" data-company-filter-option="${attr(key)}" data-value="${attr(o.value)}">${esc(o.label)}</button>`).join('')}</div></details></div>`;
}
function companyFilterRow(){
  const present=get=>state.companies.map(get).filter(Boolean);
  const statuses=COMPANY_STATUS.filter(v=>v!=='Archivada').map(v=>({value:v,label:companyStatusLabel(v)}));
  const includeArchived=!!(state.companyFilters||{}).includeArchived;
  return `<div class="filter-row company-filter-row">
    ${companyFilterControl('sector','Sector',uniqueVisibleOptions(present(c=>c.sector),companySectorLabel))}
    ${companyFilterControl('size','Tamaño',[...new Set(present(c=>companySizeBand(c)).filter(v=>v!=='—'))].map(v=>({value:v,label:v})))}
    ${companyFilterControl('status','Estado',statuses)}
    <label class="filter-check company-archive-check"><input type="checkbox" id="includeArchivedCompanies" ${includeArchived?'checked':''}> Incluir archivadas</label>
    <button class="link-btn" id="clearCompanyFilters">Limpiar</button>
  </div>`;
}
function companyHistoryMarkup(co){
  const list=interactionsOf(co.id).slice(0,20);
  return list.length?`<div class="result-list">${list.map(i=>`<div class="result-item"><b>${esc(i.subject||'Interacción')}</b><p>${esc(i.type||'—')} · ${esc(formatDateEs(i.occurredAt))}${i.outcome?` · ${esc(i.outcome)}`:''}</p></div>`).join('')}</div>`:'<div class="empty"><p>Sin interacciones registradas.</p></div>';
}
function companyNotesPopup(co){openModal(`Notas · ${co.name}`,co.notes?`<div class="kv-box">${esc(co.notes)}</div>`:'<div class="empty"><p>Sin notas generales.</p></div>',()=>closeModal(),'Cerrar')}
function companyHistoryPopup(co){openModal(`Historial · ${co.name}`,companyHistoryMarkup(co),()=>closeModal(),'Cerrar')}

function closeCompanyFloatingMenu(){document.getElementById('companyFloatingMenu')?.remove()}
function openCompanyActionMenu(button,companyId){
  closeCompanyFloatingMenu();
  const co=companyById(companyId);if(!co)return;
  const menu=document.createElement('div');menu.id='companyFloatingMenu';menu.className='row-menu-popover company-floating-menu';
  menu.innerHTML=`<button type="button" data-edit-company="${attr(co.id)}">Editar</button>
    <button type="button" data-company-notes-popup="${attr(co.id)}">Notas</button>
    <button type="button" data-company-history-popup="${attr(co.id)}">Historial</button>
    ${co.status!=='Archivada'?`<button type="button" class="danger-text" data-archive-company="${attr(co.id)}">Archivar</button>`:''}`;
  document.body.appendChild(menu);
  const r=button.getBoundingClientRect(),gap=6;
  let left=Math.min(window.innerWidth-menu.offsetWidth-8,Math.max(8,r.right-menu.offsetWidth));
  let top=r.bottom+gap;
  if(top+menu.offsetHeight>window.innerHeight-8)top=Math.max(8,r.top-menu.offsetHeight-gap);
  menu.style.left=`${left}px`;menu.style.top=`${top}px`;
}
function companyActionMenu(c){return `<button type="button" class="kebab-btn" data-company-actions="${attr(c.id)}" aria-label="Acciones de ${attr(c.name)}">•••</button>`}

function companyTable(rows,totalRows,page,totalPages){
  if(!rows.length)return `<div class="empty"><h2>Sin empresas con estos criterios</h2><p>Ajusta la búsqueda o los filtros, o crea una empresa nueva.</p></div>`;
  const sel=state.selectedCompanyId;
  return `<div class="table-wrap"><table class="data-table company-table"><thead><tr><th>Empresa</th><th>Sector</th><th>Tamaño</th><th>Estado</th><th>Contacto principal</th><th>Fecha de alta</th><th>Acciones</th></tr></thead><tbody>${rows.map(c=>{
    const primary=contactById(c.primaryContactId);
    return `<tr class="company-row ${c.id===sel?'row-selected':''}" data-select-company="${attr(c.id)}"><td><b>${esc(c.name)}</b>${c.tradeName?`<br><small>${esc(c.tradeName)}</small>`:''}</td><td>${esc(companySectorLabel(c.sector))}</td><td>${esc(companySizeBand(c))}</td><td><span class="badge ${companyStatusClass(c.status)}">${esc(companyStatusLabel(c.status))}</span></td><td>${primary?`<b>${esc(contactFullName(primary))}</b><br><small>${esc(primary.role||'')}</small>`:'<small>Sin asignar</small>'}</td><td>${esc(formatDateEs(c.createdAt))}</td><td>${companyActionMenu(c)}</td></tr>`;
  }).join('')}</tbody></table></div><div class="table-foot company-table-foot"><span>Mostrando ${rows.length} de ${totalRows} empresas</span>${totalPages>1?`<nav class="company-pagination" aria-label="Páginas de empresas"><button type="button" data-company-page="${page-1}" ${page<=1?'disabled':''} aria-label="Página anterior">‹</button>${Array.from({length:totalPages},(_,i)=>i+1).map(n=>`<button type="button" class="${n===page?'active':''}" data-company-page="${n}" aria-current="${n===page?'page':'false'}">${n}</button>`).join('')}<button type="button" data-company-page="${page+1}" ${page>=totalPages?'disabled':''} aria-label="Página siguiente">›</button></nav>`:''}</div>`;
}

function inspectorAction(label,attrs,primary=false){return `<button type="button" class="btn btn-small ${primary?'btn-primary':''}" ${attrs}>${esc(label)}</button>`}
function companyInspector(co){
  if(!co)return insCard('Vista de la empresa','<p>Selecciona una empresa para ver su ficha y sus relaciones.</p>',{accent:true,icon:'▦'});
  const n=companyCounters(co.id),tabs=['Resumen',`Contactos (${n.contacts})`,`Oportunidades (${n.opportunities})`,`Estudios (${n.engagements})`,`Proyectos (${n.projects})`],active=state.companyInspectorTab||'Resumen',primary=contactById(co.primaryContactId);
  const head=`<div class="ins-head company-ins-head"><h3>${esc(co.name)}</h3><div class="ins-head-actions"><button class="btn btn-small" data-edit-company="${attr(co.id)}">Editar</button>${co.status!=='Archivada'?`<button class="btn btn-small" data-archive-company="${attr(co.id)}">Archivar</button>`:''}</div></div><div style="margin-bottom:12px"><span class="badge ${companyStatusClass(co.status)}">${esc(companyStatusLabel(co.status))}</span></div><div class="tabs company-ins-tabs">${tabs.map(t=>`<button class="tab ${t.split(' (')[0]===active?'active':''}" data-company-ins-tab="${attr(t.split(' (')[0])}">${esc(t)}</button>`).join('')}</div>`;
  let body='';
  if(active==='Contactos'){
    const list=contactsOfCompany(co.id);body=list.length?`<div class="result-list">${list.map(c=>`<div class="result-item"><div class="result-item-head"><div><b>${esc(contactFullName(c))}</b>${isPrimaryContact(c)?' <span class="badge system">Principal</span>':''}<p>${esc(c.role||'Sin cargo')} · ${esc(c.email||'sin email')}</p></div>${inspectorAction('Ir a contacto',`data-company-open-contact="${attr(c.id)}"`)}</div></div>`).join('')}</div>`:'<div class="empty"><p>Esta empresa no tiene contactos registrados.</p></div>';
  }else if(active==='Oportunidades'){
    const list=(state.opportunities||[]).filter(o=>o.companyId===co.id);body=list.length?`<div class="result-list">${list.map(o=>{const hasProject=state.engagements.some(e=>e.opportunityId===o.id&&state.projects.some(p=>p.engagementId===e.id));return `<div class="result-item"><div class="result-item-head"><div><b>${esc(o.title||'Oportunidad')}</b><p>${esc(o.stage||'—')} · ${esc(o.source||'—')}</p></div><div class="result-actions">${inspectorAction('Editar',`data-company-edit-opportunity="${attr(o.id)}"`)}${hasProject?'':inspectorAction('Crear estudio',`data-company-study-opportunity="${attr(o.id)}"`,true)}</div></div></div>`}).join('')}</div>`:'<div class="empty"><p>Sin oportunidades registradas.</p></div>';
  }else if(active==='Estudios'){
    const list=state.engagements.filter(e=>e.companyId===co.id);body=list.length?`<div class="result-list">${list.map(e=>`<div class="result-item"><div class="result-item-head"><div><b>${esc(e.title||'Estudio')}</b><p>${esc(labelFrom('REF_DOMAIN',e.businessAreaId)||'Área sin indicar')} · ${esc(engagementStatus(e))} · ${esc(formatDateEs(e.updatedAt||e.createdAt))}</p></div>${inspectorAction('Abrir',`data-company-open-study="${attr(e.id)}"`,true)}</div></div>`).join('')}</div>`:'<div class="empty"><p>Sin estudios registrados.</p></div>';
  }else if(active==='Proyectos'){
    const list=state.projects.filter(p=>p.companyId===co.id);body=list.length?`<div class="result-list">${list.map(p=>`<div class="result-item"><b>${esc(p.name)}</b><p>${esc(p.status||'—')} · ${esc(formatDateEs(p.createdAt))}</p></div>`).join('')}</div>`:'<div class="empty"><p>Sin proyectos. Un proyecto nace de una decisión de implementación.</p></div>';
  }else{
    body=`<div class="ins-note" style="margin-bottom:10px"><b>Información general</b></div>`+kvRows([['Nombre comercial',esc(co.name)],['CIF',esc(co.taxId||'—')],['Sector',esc(companySectorLabel(co.sector))],['Tamaño',esc(companySizeBand(co)==='—'?'—':`${companySizeBand(co)} empleados`)],['Tipo de organización',esc(co.orgType||'—')],['Sitio web',co.website?`<a href="#" class="link-btn">${esc(co.website)}</a>`:'—'],['Estado',`<span class="badge ${companyStatusClass(co.status)}">${esc(companyStatusLabel(co.status))}</span>`],['Canal de entrada',esc(co.entryChannel||'—')],['Fecha de alta',esc(formatDateEs(co.createdAt))],['Responsable AUNEA',esc(co.owner||'—')],['Contacto principal',primary?esc(contactFullName(primary)):'—']]);
  }
  return `<div class="ins-card">${head}${body}</div>`;
}

// Delegated company actions survive rerenders. The capture listener also prevents the row click from
// swallowing the three-dot menu before <details> can toggle.
if(!window.__auneaCompanyActionsBound){
  window.__auneaCompanyActionsBound=true;
  document.addEventListener('click',e=>{
    const trigger=e.target.closest('[data-company-actions]');
    if(trigger){e.preventDefault();e.stopPropagation();openCompanyActionMenu(trigger,trigger.dataset.companyActions);return}
    if(!e.target.closest('#companyFloatingMenu'))closeCompanyFloatingMenu();
    const filter=e.target.closest('[data-company-filter-option]');
    if(filter){e.preventDefault();e.stopPropagation();const key=filter.dataset.companyFilterOption;state.companyFilters={...state.companyFilters,[key]:filter.dataset.value||''};state.companyPage=1;render();return}
    const pageBtn=e.target.closest('[data-company-page]');
    if(pageBtn&&!pageBtn.disabled){e.preventDefault();e.stopPropagation();state.companyPage=Math.max(1,Number(pageBtn.dataset.companyPage)||1);state.selectedCompanyId=null;render();return}
    const action=e.target.closest('[data-edit-company],[data-archive-company],[data-company-notes-popup],[data-company-history-popup],[data-company-open-contact],[data-company-edit-opportunity],[data-company-study-opportunity],[data-company-open-study]');if(!action)return;
    e.preventDefault();e.stopPropagation();closeCompanyFloatingMenu();
    if(action.dataset.editCompany!==undefined){editCompany(action.dataset.editCompany);return}
    if(action.dataset.archiveCompany!==undefined){archiveCompany(action.dataset.archiveCompany);return}
    if(action.dataset.companyNotesPopup!==undefined){const co=companyById(action.dataset.companyNotesPopup);if(co)companyNotesPopup(co);return}
    if(action.dataset.companyHistoryPopup!==undefined){const co=companyById(action.dataset.companyHistoryPopup);if(co)companyHistoryPopup(co);return}
    if(action.dataset.companyOpenContact!==undefined){const ct=contactById(action.dataset.companyOpenContact);if(!ct)return;state.selectedCompanyId=ct.companyId;state.selectedContactId=ct.id;setPage('contactos');return}
    if(action.dataset.companyEditOpportunity!==undefined){editOpportunity(action.dataset.companyEditOpportunity);return}
    if(action.dataset.companyStudyOpportunity!==undefined){createStudyFromOpportunity(action.dataset.companyStudyOpportunity);return}
    if(action.dataset.companyOpenStudy!==undefined){const eng=state.engagements.find(x=>x.id===action.dataset.companyOpenStudy);if(!eng)return;state.activeEngagementId=eng.id;state.activePage='diagnostico';render()}
  },true);
}

function companiesPage(){
  const filtered=visibleCompanies(),paged=companyPagination(filtered),rows=paged.rows;
  let co=companyById(state.selectedCompanyId);
  if(!co||!filtered.some(x=>x.id===co.id)){co=rows[0]||null;state.selectedCompanyId=co?.id||null}
  const main=`<div class="search-bar"><input id="companySearch" value="${attr(state.companySearch||'')}" placeholder="Buscar empresa o sector..."></div>${companyFilterRow()}${companyTable(rows,filtered.length,paged.page,paged.totalPages)}`;
  const left=co&&co.status!=='Archivada'?`<button class="btn btn-danger" data-archive-company="${attr(co.id)}">Archivar empresa</button>`:'';
  const right=co?`<button class="btn" data-edit-company="${attr(co.id)}">Editar empresa</button><button class="btn" data-company-contacts="${attr(co.id)}">Ver contactos</button><button class="btn" data-company-contact-new="${attr(co.id)}">Nuevo contacto</button><button class="btn" data-company-opportunity="${attr(co.id)}">Nueva oportunidad</button><button class="btn btn-primary" data-company-interaction="${attr(co.id)}">Registrar interacción</button>`:'';
  return pageTop('Empresas','Gestiona las empresas con las que trabaja AUNEA.',`<button class="btn btn-primary" id="addCompanyBtn">+ Nueva empresa</button>`,'I90-00-01')+workspace(main,companyInspector(co),{wide:true})+actionBar(left,right);
}
// [AUNEA-FE-PAGE-COMPANIES-010] END
