// [AUNEA-FE-PAGE-CONTACTS-010] START — P02 Contactos
// PURPOSE: Reproduce the approved Contactos reference: company selector, search plus the three filters,
//          the contact table with its Principal column, the contact inspector and the action bar.
// SOURCE: Reference IMG90-00-02 (governs composition, visible fields, order, controls and states under
//         DEC-056); DEC-057 (schema, principal as relation, real delete); DEC-050; DEC-058 (last
//         interaction is derived); Architecture Contract v1.2 row P02.
// INPUTS: state.contacts, state.companies, state.interactions.
// OUTPUTS: page markup only. Contact data is owned by AUNEA-FE-CRM-CONTACT-010.
// SIDE_EFFECTS: none beyond reading state.
// CHANGE_RISK: MEDIUM.

function contactsPageCompany() {
  return companyById(state.selectedCompanyId) || null;
}
function visibleContacts(companyId=null) {
  const f = state.contactFilters || {}, q = (state.contactSearch || '').toLowerCase().trim();
  return state.contacts.filter(c => {
    if (companyId && c.companyId !== companyId) return false;
    if (!f.includeInactive && c.status === 'Inactivo') return false;
    if (f.role && c.role !== f.role) return false;
    if (f.status && c.status !== f.status) return false;
    if (q && ![contactFullName(c), c.role, c.email, c.phone, companyById(c.companyId)?.name].some(v => String(v || '').toLowerCase().includes(q))) return false;
    return true;
  });
}
function contactFilterControl(key,label,options,current,placeholder='Todos'){
  const normalized=options.map(o=>typeof o==='string'?{value:o,label:o}:o);
  const selected=normalized.find(o=>String(o.value)===String(current));
  return `<div class="filter-group"><span>${esc(label)}</span><details class="aunea-select" data-contact-filter-box="${attr(key)}"><summary><span>${esc(selected?.label||placeholder)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="${attr(label)}"><button type="button" role="option" data-contact-filter-option="${attr(key)}" data-value="">${esc(placeholder)}</button>${normalized.map(o=>`<button type="button" role="option" class="${String(current)===String(o.value)?'selected':''}" data-contact-filter-option="${attr(key)}" data-value="${attr(o.value)}">${esc(o.label)}</button>`).join('')}</div></details></div>`;
}
function contactFilterRow(companyId=null) {
  const f = state.contactFilters || {};
  const pool = state.contacts.filter(c => !companyId || c.companyId === companyId);
  const presentRoles=[...new Set(pool.map(c=>c.role).filter(Boolean))];
  const roleOptions=[...CONTACT_ROLE_OPTIONS];
  presentRoles.filter(v=>!roleOptions.includes(v)).forEach(v=>roleOptions.unshift(v));
  return `<div class="filter-row">
    ${contactFilterControl('role','Cargo',roleOptions,f.role||'')}
    ${contactFilterControl('status','Estado',CONTACT_STATUS,f.status||'')}
    <label class="filter-check"><input type="checkbox" id="includeInactiveContacts" ${f.includeInactive?'checked':''}><span>Incluir inactivos</span></label>
    <button class="link-btn" id="clearContactFilters">Limpiar filtros</button>
  </div>`;
}
function contactCompanyPicker(co){
  const current=co?.id||'',label=co?.name||'Todas las empresas';
  return `<div class="entity-picker"><div class="ep-icon">▦</div><div class="ep-grow"><small>Empresa</small><b>${esc(label)}</b></div>
    <details class="aunea-select entity-picker-select" data-contact-company-box="1"><summary><span>${esc(label)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="Empresa">
      <button type="button" role="option" data-contact-company-option="" class="${!current?'selected':''}">Todas las empresas</button>
      ${state.companies.map(c=>`<button type="button" role="option" data-contact-company-option="${attr(c.id)}" class="${c.id===current?'selected':''}">${esc(c.name)}</button>`).join('')}
    </div></details>
    ${current?'<button class="btn btn-small" id="clearContactCompany">Quitar empresa</button>':''}
    ${current?'<button class="btn btn-small" data-page="empresas">Abrir empresa</button>':''}
  </div>`;
}
function contactStatusClass(status) {
  return status === 'Activo' ? 'ok' : status === 'Pendiente' ? 'wait' : status === 'Inactivo' ? 'off' : '';
}

function contactTable(rows, companyId=null) {
  if (!rows.length) return `<div class="empty"><h2>Sin contactos con estos criterios</h2><p>Ajusta la búsqueda o los filtros.</p></div>`;
  const sel = state.selectedContactId;
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>Nombre</th><th>Empresa</th><th>Cargo</th><th>Email</th><th>Teléfono</th><th>Estado</th><th>Principal</th><th>Última interacción</th></tr></thead><tbody>${rows.map(c=>{const last=lastInteractionOf(c.id),co=companyById(c.companyId);return `<tr class="${c.id===sel?'row-selected':''}" data-select-contact="${attr(c.id)}"><td><input type="checkbox" ${c.id===sel?'checked':''} aria-label="Seleccionar ${attr(contactFullName(c))}"></td><td><b>${esc(contactFullName(c))}</b></td><td>${esc(co?.name||'—')}</td><td>${esc(c.role||'—')}</td><td>${esc(c.email||'—')}</td><td>${esc(c.phone||'—')}</td><td><span class="badge ${contactStatusClass(c.status)}">${esc(c.status||'—')}</span></td><td><button class="star-toggle ${isPrimaryContact(c)?'on':''}" data-primary-contact="${attr(c.id)}">${isPrimaryContact(c)?'★':'☆'}</button></td><td>${last?esc(formatDateEs(last.occurredAt)):'—'}</td></tr>`}).join('')}</tbody></table></div><div class="table-foot"><span>Mostrando ${rows.length} contactos</span></div>`;
}
function contactInspector(ct) {
  const intro=insCard('Vista del contacto',`<p>Consulta la ficha, registra interacciones e inicia un diagnóstico sin duplicar datos maestros.</p>`,{accent:true,icon:'◉'});
  if(!ct)return intro+insCard('Datos del contacto','<div class="empty"><p>Selecciona un contacto de la tabla.</p></div>');
  const last=lastInteractionOf(ct.id),co=companyById(ct.companyId);
  const data=insCard('Datos del contacto',kvRows([['Empresa',esc(co?.name||'—')],['Nombre',esc(ct.firstName||'—')],['Apellidos',esc(ct.lastName||'—')],['Cargo',esc(ct.role||'—')],['Email',esc(ct.email||'—')],['Teléfono',esc(ct.phone||'—')],['Estado',`<span class="badge ${contactStatusClass(ct.status)}">${esc(ct.status||'—')}</span>`],['Contacto principal',`<button class="star-toggle ${isPrimaryContact(ct)?'on':''}" data-primary-contact="${attr(ct.id)}">${isPrimaryContact(ct)?'★':'☆'}</button> ${isPrimaryContact(ct)?'Sí':'No'}`],['Notas',`<div class="kv-box">${esc(ct.notes||'—')}<span class="char-count">${(ct.notes||'').length}/${CONTACT_NOTES_MAX}</span></div>`],['Última interacción',last?`${esc(formatDateEs(last.occurredAt))} · <button class="link-btn" data-contact-history="${attr(ct.id)}">Ver historial →</button>`:'—']]),{icon:'▤',action:`<button class="btn btn-small" data-edit-contact="${attr(ct.id)}">Editar</button>`});
  return intro+data+insCard('Acciones rápidas',`<div class="quick-actions"><button class="btn btn-small" data-contact-interaction="${attr(ct.id)}">Registrar interacción</button><button class="btn btn-small btn-primary" data-contact-study="${attr(ct.id)}">Iniciar diagnóstico</button></div>`);
}
function contactsPageCompany() {
  return companyById(state.selectedCompanyId) || null;
}
function visibleContacts(companyId=null) {
  const f = state.contactFilters || {}, q = (state.contactSearch || '').toLowerCase().trim();
  return state.contacts.filter(c => {
    if (companyId && c.companyId !== companyId) return false;
    if (!f.includeInactive && c.status === 'Inactivo') return false;
    if (f.role && c.role !== f.role) return false;
    if (f.status && c.status !== f.status) return false;
    if (q && ![contactFullName(c), c.role, c.email, c.phone, companyById(c.companyId)?.name].some(v => String(v || '').toLowerCase().includes(q))) return false;
    return true;
  });
}
function contactFilterControl(key,label,options,current,placeholder='Todos'){
  const normalized=options.map(o=>typeof o==='string'?{value:o,label:o}:o);
  const selected=normalized.find(o=>String(o.value)===String(current));
  return `<div class="filter-group"><span>${esc(label)}</span><details class="aunea-select" data-contact-filter-box="${attr(key)}"><summary><span>${esc(selected?.label||placeholder)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="${attr(label)}"><button type="button" role="option" data-contact-filter-option="${attr(key)}" data-value="">${esc(placeholder)}</button>${normalized.map(o=>`<button type="button" role="option" class="${String(current)===String(o.value)?'selected':''}" data-contact-filter-option="${attr(key)}" data-value="${attr(o.value)}">${esc(o.label)}</button>`).join('')}</div></details></div>`;
}
function contactFilterRow(companyId=null) {
  const f = state.contactFilters || {};
  const pool = state.contacts.filter(c => !companyId || c.companyId === companyId);
  const presentRoles=[...new Set(pool.map(c=>c.role).filter(Boolean))];
  const roleOptions=[...CONTACT_ROLE_OPTIONS];
  presentRoles.filter(v=>!roleOptions.includes(v)).forEach(v=>roleOptions.unshift(v));
  return `<div class="filter-row">
    ${contactFilterControl('role','Cargo',roleOptions,f.role||'')}
    ${contactFilterControl('status','Estado',CONTACT_STATUS,f.status||'')}
    <label class="filter-check"><input type="checkbox" id="includeInactiveContacts" ${f.includeInactive?'checked':''}><span>Incluir inactivos</span></label>
    <button class="link-btn" id="clearContactFilters">Limpiar filtros</button>
  </div>`;
}
function contactCompanyPicker(co){
  const current=co?.id||'',label=co?.name||'Todas las empresas';
  return `<div class="entity-picker"><div class="ep-icon">▦</div><div class="ep-grow"><small>Empresa</small><b>${esc(label)}</b></div>
    <details class="aunea-select entity-picker-select" data-contact-company-box="1"><summary><span>${esc(label)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="Empresa">
      <button type="button" role="option" data-contact-company-option="" class="${!current?'selected':''}">Todas las empresas</button>
      ${state.companies.map(c=>`<button type="button" role="option" data-contact-company-option="${attr(c.id)}" class="${c.id===current?'selected':''}">${esc(c.name)}</button>`).join('')}
    </div></details>
    ${current?'<button class="btn btn-small" id="clearContactCompany">Quitar empresa</button>':''}
    ${current?'<button class="btn btn-small" data-page="empresas">Abrir empresa</button>':''}
  </div>`;
}
function contactStatusClass(status) {
  return status === 'Activo' ? 'ok' : status === 'Pendiente' ? 'wait' : status === 'Inactivo' ? 'off' : '';
}

function contactTable(rows, companyId=null) {
  if (!rows.length) return `<div class="empty"><h2>Sin contactos con estos criterios</h2><p>Ajusta la búsqueda o los filtros.</p></div>`;
  const sel = state.selectedContactId;
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>Nombre</th><th>Empresa</th><th>Cargo</th><th>Email</th><th>Teléfono</th><th>Estado</th><th>Principal</th><th>Última interacción</th></tr></thead><tbody>${rows.map(c=>{const last=lastInteractionOf(c.id),co=companyById(c.companyId);return `<tr class="${c.id===sel?'row-selected':''}" data-select-contact="${attr(c.id)}"><td><input type="checkbox" ${c.id===sel?'checked':''} aria-label="Seleccionar ${attr(contactFullName(c))}"></td><td><b>${esc(contactFullName(c))}</b></td><td>${esc(co?.name||'—')}</td><td>${esc(c.role||'—')}</td><td>${esc(c.email||'—')}</td><td>${esc(c.phone||'—')}</td><td><span class="badge ${contactStatusClass(c.status)}">${esc(c.status||'—')}</span></td><td><button class="star-toggle ${isPrimaryContact(c)?'on':''}" data-primary-contact="${attr(c.id)}">${isPrimaryContact(c)?'★':'☆'}</button></td><td>${last?esc(formatDateEs(last.occurredAt)):'—'}</td></tr>`}).join('')}</tbody></table></div><div class="table-foot"><span>Mostrando ${rows.length} contactos</span></div>`;
}
function contactInspector(ct) {
  const intro = insCard('Vista del contacto', `<p>Aquí puedes ver y editar la información del contacto seleccionado. Este contacto está vinculado a la empresa y puede reutilizarse para crear proyectos y sesiones de diagnóstico.</p>`, { accent: true, icon: '◉' });
  if (!ct) return intro + insCard('Datos del contacto', `<div class="empty"><p>Selecciona un contacto de la tabla.</p></div>`);
  const last = lastInteractionOf(ct.id);
  const co = companyById(ct.companyId);
  const data = insCard('Datos del contacto', kvRows([
    ['Empresa', esc(co?.name || '—')],
    ['Nombre', esc(ct.firstName || '—')],
    ['Apellidos', esc(ct.lastName || '—')],
    ['Cargo', esc(ct.role || '—')],
    ['Email', esc(ct.email || '—')],
    ['Teléfono', esc(ct.phone || '—')],
    ['Idioma', esc(labelFrom('REF_LANGUAGE_ISO6391', ct.language) || '—')],
    ['País', esc(labelFrom('REF_COUNTRY_ISO3166', ct.country) || '—')],
    ['Estado', `<span class="badge ${contactStatusClass(ct.status)}">${esc(ct.status || '—')}</span>`],
    // Rendered as the relation it is: the switch writes to Company.primaryContactId, never to the Contact.
    ['Contacto principal', `<button class="star-toggle ${isPrimaryContact(ct) ? 'on' : ''}" data-primary-contact="${attr(ct.id)}">${isPrimaryContact(ct) ? '★' : '☆'}</button> ${isPrimaryContact(ct) ? 'Sí, es contacto principal' : 'No'}`],
    ['Notas', `<div class="kv-box">${esc(ct.notes || '—')}<span class="char-count">${(ct.notes || '').length}/${CONTACT_NOTES_MAX}</span></div>`],
    ['Última interacción', last ? `${esc(formatDateEs(last.occurredAt))} · <button class="link-btn" data-contact-history="${attr(ct.id)}">Ver historial →</button>` : '—']
  ]), { icon: '▤', action: `<button class="btn btn-small" data-edit-contact="${attr(ct.id)}">Editar</button>` });
  return intro + data;
}

function contactsPage() {
  const co=contactsPageCompany(),rows=visibleContacts(co?.id||null),selected=contactById(state.selectedContactId);
  const ct=selected&&(!co||selected.companyId===co.id)&&rows.some(r=>r.id===selected.id)?selected:rows[0]||null;state.selectedContactId=ct?.id||null;
  const main=contactCompanyPicker(co)+`<div class="search-bar"><input id="contactSearch" value="${attr(state.contactSearch||'')}" placeholder="Buscar contacto, empresa, cargo, email o teléfono..."></div>`+contactFilterRow(co?.id||null)+contactTable(rows,co?.id||null);
  const left=ct?(ct.status==='Inactivo'?`<button class="btn" data-reactivate-contact="${attr(ct.id)}">Reactivar contacto</button>`:`<button class="btn btn-danger" data-inactivate-contact="${attr(ct.id)}">Inactivar contacto</button>`):'';
  const right=(co?'<button class="btn" data-page="empresas">Abrir empresa</button>':'')+(ct?`<button class="btn" data-edit-contact="${attr(ct.id)}">Editar contacto</button><button class="btn" data-contact-interaction="${attr(ct.id)}">Registrar interacción</button><button class="btn btn-primary" data-contact-study="${attr(ct.id)}">Iniciar diagnóstico →</button>`:'');
  return pageTop('Contactos','Gestiona contactos de todas las empresas o acota la vista a una empresa concreta.',`<button class="btn" id="addCompanyBtn">Nueva empresa</button><button class="btn btn-primary" id="addContactBtn">+ Nuevo contacto</button>`,'I90-00-02')+workspace(main,contactInspector(ct))+actionBar(left,right);
}
// [AUNEA-FE-PAGE-CONTACTS-010] END
