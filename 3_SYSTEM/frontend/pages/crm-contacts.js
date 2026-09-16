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
  return companyById(state.selectedCompanyId) || state.companies[0] || null;
}
function visibleContacts(companyId) {
  const f = state.contactFilters || {}, q = (state.contactSearch || '').toLowerCase().trim();
  return state.contacts.filter(c => {
    if (c.companyId !== companyId) return false;
    if (f.role && c.role !== f.role) return false;
    if (f.status && c.status !== f.status) return false;
    if (f.language && c.language !== f.language) return false;
    if (q && ![contactFullName(c), c.role, c.email, c.phone].some(v => String(v || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

function contactFilterRow(companyId) {
  const f = state.contactFilters || {};
  const pool = state.contacts.filter(c => c.companyId === companyId);
  const sel = (key, label, options) => `<div class="filter-group"><span>${esc(label)}</span><select data-contact-filter="${key}"><option value="">Todos</option>${options.map(o => `<option value="${attr(o.value)}" ${f[key] === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>`;
  const present = get => [...new Set(pool.map(get).filter(Boolean))];
  return `<div class="filter-row">
    ${sel('role', 'Cargo', present(c => c.role).map(v => ({ value: v, label: v })))}
    ${sel('status', 'Estado', CONTACT_STATUS.map(v => ({ value: v, label: v })))}
    ${sel('language', 'Idioma', present(c => c.language).map(v => ({ value: v, label: labelFrom('REF_LANGUAGE_ISO6391', v) || v })))}
    <button class="link-btn" id="clearContactFilters">Limpiar filtros</button>
  </div>`;
}

function contactStatusClass(status) {
  return status === 'Activo' ? 'ok' : status === 'Pendiente' ? 'wait' : status === 'Inactivo' ? 'off' : '';
}

function contactTable(rows, companyId) {
  if (!rows.length) {
    return `<div class="empty"><h2>Sin contactos con estos criterios</h2><p>${state.contacts.some(c => c.companyId === companyId)
      ? 'Ajusta la búsqueda o los filtros.' : 'Esta empresa todavía no tiene contactos registrados.'}</p></div>`;
  }
  const sel = state.selectedContactId;
  return `<div class="table-wrap"><table class="data-table"><thead><tr>
      <th></th><th>Nombre</th><th>Cargo</th><th>Email</th><th>Teléfono</th><th>Estado</th><th>Principal</th><th>Última interacción</th>
    </tr></thead><tbody>${rows.map(c => {
    const last = lastInteractionOf(c.id);
    return `<tr class="${c.id === sel ? 'row-selected' : ''}" data-select-contact="${attr(c.id)}">
      <td><input type="checkbox" ${c.id === sel ? 'checked' : ''} aria-label="Seleccionar ${attr(contactFullName(c))}"></td>
      <td><b>${esc(contactFullName(c))}</b></td>
      <td>${esc(c.role || '—')}</td>
      <td>${esc(c.email || '—')}</td>
      <td>${esc(c.phone || '—')}</td>
      <td><span class="badge ${contactStatusClass(c.status)}">${esc(c.status || '—')}</span></td>
      <td><button class="star-toggle ${isPrimaryContact(c) ? 'on' : ''}" data-primary-contact="${attr(c.id)}" title="Contacto principal de la empresa" aria-label="Marcar como contacto principal">${isPrimaryContact(c) ? '★' : '☆'}</button></td>
      <td>${last ? esc(formatDateEs(last.occurredAt)) : '—'}</td>
    </tr>`;
  }).join('')}</tbody></table></div>
  <div class="table-foot"><span>Mostrando ${rows.length} de ${state.contacts.filter(c => c.companyId === companyId).length} contactos</span></div>`;
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
  const co = contactsPageCompany();
  if (co && state.selectedCompanyId !== co.id) state.selectedCompanyId = co.id;
  if (!co) {
    return pageTop('Contactos', 'Selecciona una empresa y gestiona sus contactos para preparar proyectos y diagnósticos.',
        `<button class="btn btn-primary" id="addCompanyBtn">+ Nueva empresa</button>`, 'I90-00-02')
      + `<div class="empty"><h2>Todavía no hay empresas</h2><p>Un contacto pertenece siempre a una empresa (DEC-007). Crea la empresa primero.</p></div>`;
  }
  const rows = visibleContacts(co.id);
  const ct = contactById(state.selectedContactId) && contactById(state.selectedContactId).companyId === co.id
    ? contactById(state.selectedContactId) : rows[0] || null;
  if (ct) state.selectedContactId = ct.id;

  const picker = `<div class="entity-picker"><div class="ep-icon">▦</div>
    <div class="ep-grow"><small>Empresa seleccionada</small><b>${esc(co.name)}</b></div>
    <select id="contactsCompanyPicker">${state.companies.map(c => `<option value="${attr(c.id)}" ${c.id === co.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <button class="btn btn-small" data-page="empresas">Cambiar empresa</button></div>`;
  const main = picker
    + `<div class="search-bar"><input id="contactSearch" value="${attr(state.contactSearch || '')}" placeholder="Buscar contactos..."></div>`
    + contactFilterRow(co.id)
    + contactTable(rows, co.id);

  const bar = actionBar(
    ct ? `<button class="btn btn-danger" data-delete-contact="${attr(ct.id)}">Eliminar contacto</button>` : '',
    `<button class="btn" data-page="empresas">Abrir empresa</button>`
    + (ct ? `<button class="btn" data-edit-contact="${attr(ct.id)}">Editar contacto</button>` : '')
    + (ct ? `<button class="btn" data-contact-project="${attr(ct.id)}">Crear proyecto</button>` : '')
    + (ct ? `<button class="btn btn-primary" data-contact-study="${attr(ct.id)}">Iniciar diagnóstico →</button>` : ''));

  return pageTop('Contactos', 'Selecciona una empresa y gestiona sus contactos para preparar proyectos y diagnósticos.',
      `<button class="btn" id="addCompanyBtn">Nueva empresa</button><button class="btn btn-primary" id="addContactBtn">+ Nuevo contacto</button>`, 'I90-00-02')
    + workspace(main, contactInspector(ct)) + bar;
}
// [AUNEA-FE-PAGE-CONTACTS-010] END
