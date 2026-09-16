// [AUNEA-FE-PAGE-COMPANIES-010] START — P01 Empresas
// PURPOSE: Reproduce the approved Empresas reference: tabs, search, four filters, the company table and
//          the persistent inspector with its own tabs, general information, quick actions and next step.
// SOURCE: Reference IMG90-00-01 (governs composition, visible fields, order, controls and states under
//         DEC-056); Architecture Contract v1.2 row P01; DEC-007; DEC-050.
// INPUTS: state.companies plus derived counters from contacts/opportunities/engagements/projects.
// OUTPUTS: page markup only. Company data is owned by AUNEA-FE-CRM-COMPANY-010.
// SIDE_EFFECTS: none beyond reading state.
// CHANGE_RISK: MEDIUM.

const COMPANY_TABS = ['Todas', 'Clientes', 'Prospectos', 'Colaboradores', 'Archivadas'];
const COMPANY_TAB_STATUS = { Clientes: 'Cliente', Prospectos: 'Prospecto', Colaboradores: 'Colaborador', Archivadas: 'Archivada' };

function visibleCompanies() {
  const f = state.companyFilters || {}, q = (state.companySearch || '').toLowerCase().trim();
  const wanted = COMPANY_TAB_STATUS[state.companyTab];
  return state.companies.filter(c => {
    // "Todas" keeps archived companies out of the way; they have their own tab.
    if (wanted ? c.status !== wanted : c.status === 'Archivada') return false;
    if (f.sector && c.sector !== f.sector) return false;
    if (f.status && c.status !== f.status) return false;
    if (f.country && c.country !== f.country) return false;
    if (f.size && companySizeBand(c) !== f.size) return false;
    if (q && ![c.name, c.tradeName, labelFrom('REF_DOMAIN', c.sector), labelFrom('REF_COUNTRY_ISO3166', c.country)]
      .some(v => String(v || '').toLowerCase().includes(q))) return false;
    return true;
  });
}
function selectedCompany() {
  return companyById(state.selectedCompanyId) || visibleCompanies()[0] || null;
}

function companyFilterRow() {
  const f = state.companyFilters || {};
  const sel = (key, label, options) => `<div class="filter-group"><span>${esc(label)}</span><select data-company-filter="${key}"><option value="">${esc(label)}</option>${options.map(o => `<option value="${attr(o.value)}" ${f[key] === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>`;
  // Filter option sets are built from the companies that actually exist, so the UI never offers a filter
  // that can only ever return nothing.
  const present = (get) => [...new Set(state.companies.map(get).filter(Boolean))];
  return `<div class="filter-row">
    ${sel('sector', 'Sector', present(c => c.sector).map(v => ({ value: v, label: labelFrom('REF_DOMAIN', v) })))}
    ${sel('size', 'Tamaño', present(c => companySizeBand(c)).filter(v => v !== '—').map(v => ({ value: v, label: v })))}
    ${sel('status', 'Estado', COMPANY_STATUS.map(v => ({ value: v, label: v })))}
    ${sel('country', 'País', present(c => c.country).map(v => ({ value: v, label: labelFrom('REF_COUNTRY_ISO3166', v) })))}
    <button class="link-btn" id="clearCompanyFilters">Limpiar</button>
  </div>`;
}

function companyTable(rows) {
  if (!rows.length) return `<div class="empty"><h2>Sin empresas con estos criterios</h2><p>Ajusta la búsqueda o los filtros, o crea una empresa nueva.</p></div>`;
  const sel = state.selectedCompanyId;
  return `<div class="table-wrap"><table class="data-table"><thead><tr>
      <th>Empresa</th><th>Sector</th><th>Tamaño</th><th>País</th><th>Estado</th><th>Contacto principal</th><th>Fecha de alta</th><th></th>
    </tr></thead><tbody>${rows.map(c => {
    const primary = contactById(c.primaryContactId);
    return `<tr class="${c.id === sel ? 'row-selected' : ''}" data-select-company="${attr(c.id)}">
      <td><b>${esc(c.name)}</b>${c.tradeName ? `<br><small>${esc(c.tradeName)}</small>` : ''}</td>
      <td>${esc(labelFrom('REF_DOMAIN', c.sector) || '—')}</td>
      <td>${esc(companySizeBand(c))}</td>
      <td>${esc(labelFrom('REF_COUNTRY_ISO3166', c.country) || '—')}</td>
      <td><span class="badge ${companyStatusClass(c.status)}">${esc(c.status || '—')}</span></td>
      <td>${primary ? `<b>${esc(contactFullName(primary))}</b><br><small>${esc(primary.role || '')}</small>` : '<small>Sin asignar</small>'}</td>
      <td>${esc(formatDateEs(c.createdAt))}</td>
      <td><div class="row-actions"><button class="btn btn-small" data-edit-company="${attr(c.id)}">Editar</button></div></td>
    </tr>`;
  }).join('')}</tbody></table></div>
  <div class="table-foot"><span>Mostrando ${rows.length} de ${state.companies.length} empresas</span></div>`;
}

function companyInspector(co) {
  if (!co) return insCard('Vista de la empresa', `<p>Selecciona una empresa para ver su ficha, sus contactos y su actividad relacionada.</p>`, { accent: true, icon: '▦' });
  const n = companyCounters(co.id);
  const tabs = ['Resumen', `Contactos (${n.contacts})`, `Proyectos (${n.projects})`, 'Notas', 'Historial'];
  const active = state.companyInspectorTab || 'Resumen';
  const primary = contactById(co.primaryContactId);
  const head = `<div class="ins-head"><h3>${esc(co.name)}</h3><button class="btn btn-small" data-edit-company="${attr(co.id)}">Editar</button></div>
    <div style="margin-bottom:12px"><span class="badge ${companyStatusClass(co.status)}">${esc(co.status || '—')}</span></div>
    <div class="tabs">${tabs.map(t => `<button class="tab ${t.split(' (')[0] === active ? 'active' : ''}" data-company-ins-tab="${attr(t.split(' (')[0])}">${esc(t)}</button>`).join('')}</div>`;

  let body = '';
  if (active === 'Contactos') {
    const list = contactsOfCompany(co.id);
    body = list.length
      ? `<div class="result-list">${list.map(c => `<div class="result-item"><b>${esc(contactFullName(c))}</b>${isPrimaryContact(c) ? ' <span class="badge system">Principal</span>' : ''}<p>${esc(c.role || 'Sin cargo')} · ${esc(c.email || 'sin email')}</p></div>`).join('')}</div>`
      : `<div class="empty"><p>Esta empresa no tiene contactos registrados.</p></div>`;
  } else if (active === 'Proyectos') {
    const list = state.projects.filter(p => p.companyId === co.id);
    body = list.length
      ? `<div class="result-list">${list.map(p => `<div class="result-item"><b>${esc(p.name)}</b><p>${esc(p.status || '—')} · ${esc(formatDateEs(p.createdAt))}</p></div>`).join('')}</div>`
      : `<div class="empty"><p>Sin proyectos. Un proyecto nace de una decisión de implementación (DEC-054).</p></div>`;
  } else if (active === 'Notas') {
    body = co.notes ? `<div class="kv-box">${esc(co.notes)}</div>` : `<div class="empty"><p>Sin notas generales.</p></div>`;
  } else if (active === 'Historial') {
    const list = interactionsOf(co.id).slice(0, 12);
    body = list.length
      ? `<div class="result-list">${list.map(i => `<div class="result-item"><b>${esc(i.subject)}</b><p>${esc(i.type)} · ${esc(formatDateEs(i.occurredAt))} · ${esc(i.outcome || '')}</p></div>`).join('')}</div>`
      : `<div class="empty"><p>Sin interacciones registradas. El histórico se construye en Interacciones (DEC-058).</p></div>`;
  } else {
    body = `<div class="ins-note" style="margin-bottom:10px"><b>Información general</b></div>` + kvRows([
      ['Nombre legal', esc(co.name)],
      ['Nombre comercial', esc(co.tradeName || '—')],
      ['CIF', esc(co.taxId || '—')],
      ['Sector', esc(labelFrom('REF_DOMAIN', co.sector) || '—')],
      ['Tamaño', esc(companySizeBand(co) === '—' ? '—' : `${companySizeBand(co)} empleados`)],
      ['País', esc(labelFrom('REF_COUNTRY_ISO3166', co.country) || '—')],
      ['Tipo de organización', esc(co.orgType || '—')],
      ['Sitio web', co.website ? `<a href="#" class="link-btn">${esc(co.website)}</a>` : '—'],
      ['Estado', `<span class="badge ${companyStatusClass(co.status)}">${esc(co.status || '—')}</span>`],
      ['Canal de entrada', esc(co.entryChannel || '—')],
      ['Fecha de alta', esc(formatDateEs(co.createdAt))],
      ['Responsable AUNEA', esc(co.owner || '—')],
      ['Contacto principal', primary ? esc(contactFullName(primary)) : '—']
    ]) + (co.notes ? `<div style="margin-top:12px"><div class="ins-note"><b>Notas generales</b></div><div class="kv-box" style="margin-top:6px">${esc(co.notes)}</div></div>` : '');
  }

  const quick = insCard('Acciones rápidas', `<div class="quick-actions">
      <button class="btn btn-small" data-company-contacts="${attr(co.id)}">Ver contactos</button>
      <button class="btn btn-small" data-company-opportunity="${attr(co.id)}">Nueva oportunidad</button>
      <button class="btn btn-small" data-company-contact-new="${attr(co.id)}">Nuevo contacto</button>
      <button class="btn btn-small" data-company-interaction="${attr(co.id)}">Registrar interacción</button>
    </div>`);
  const next = `<div class="tip-card"><b>Siguiente paso</b><p>${n.contacts
    ? 'Selecciona un contacto para iniciar una sesión de diagnóstico, o registra la próxima interacción.'
    : 'Añade un contacto para poder preparar una oportunidad o una sesión de diagnóstico.'}</p></div>`;
  return `<div class="ins-card">${head}${body}</div>` + quick + next;
}

function companiesPage() {
  const rows = visibleCompanies();
  const co = selectedCompany();
  if (co && state.selectedCompanyId !== co.id) state.selectedCompanyId = co.id;
  const main = `<div class="tabs">${COMPANY_TABS.map(t => `<button class="tab ${t === (state.companyTab || 'Todas') ? 'active' : ''}" data-company-tab="${attr(t)}">${esc(t)}</button>`).join('')}</div>
    <div class="search-bar"><input id="companySearch" value="${attr(state.companySearch || '')}" placeholder="Buscar empresa, sector o ubicación..."></div>
    ${companyFilterRow()}
    ${companyTable(rows)}`;
  return pageTop('Empresas', 'Gestiona las empresas con las que trabaja AUNEA.',
      `<button class="btn btn-primary" id="addCompanyBtn">+ Nueva empresa</button>`, 'I90-00-01')
    + workspace(main, companyInspector(co), { wide: true });
}
// [AUNEA-FE-PAGE-COMPANIES-010] END
