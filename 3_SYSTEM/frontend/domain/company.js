// [AUNEA-FE-CRM-COMPANY-010] START — Company master (P01)
// PURPOSE: Own the Company record: the CRM fields the approved Empresas reference makes visible, the
//          canonical DF001–DF005 write targets, the primary-contact relation and the derived counters.
//          Every other surface reuses this record read-only or writes through to it (DEC-050).
// SOURCE: DEC-007 (one Company per company); DEC-050 (single owner / single capture);
//         reference IMG90-00-01 (visible fields, states, order); Architecture Contract v1.3 row P01;
//         Diagnostic Master DF001–DF005 write targets RT_COMPANY.*; PROJECT_RULES v1.5 Spanish-visible rule.
// INPUTS: state.companies plus the canonical REF_DOMAIN / REF_COUNTRY_ISO3166 catalogues.
// OUTPUTS: Company records and derived projections used across CRM, PG01 and deliverables.
// SIDE_EFFECTS: state mutation and audit entries.
// CHANGE_RISK: HIGH.

const COMPANY_STATUS = ['Cliente', 'Prospecto', 'Colaborador', 'En pausa', 'Archivada'];
const COMPANY_ORG_TYPE = ['Empresa privada', 'Empresa pública', 'Autónomo', 'Asociación', 'Sector público'];
const COMPANY_ENTRY_CHANNEL = ['Recomendación', 'Contacto directo', 'Red personal', 'Inbound', 'Cliente existente'];
const COMPANY_SIZE_BANDS = [
  { max: 10, label: '1–10' }, { max: 50, label: '10–50' }, { max: 250, label: '50–250' },
  { max: 500, label: '250–500' }, { max: 1000, label: '500–1.000' }, { max: Infinity, label: '> 1.000' }
];

// REF_DOMAIN may keep stable English/internal labels. The visible CRM surface is Spanish by contract;
// this projection changes presentation only and never rewrites the stored canonical value.
const COMPANY_SECTOR_LABEL_ES = Object.freeze({
  'professional services':'Servicios profesionales','financial services':'Servicios financieros','banking':'Banca',
  'insurance':'Seguros','retail':'Comercio minorista','wholesale':'Comercio mayorista','manufacturing':'Industria / fabricación',
  'healthcare':'Salud','health care':'Salud','education':'Educación','technology':'Tecnología','software':'Software',
  'telecommunications':'Telecomunicaciones','logistics':'Logística','transportation':'Transporte','hospitality':'Hostelería',
  'real estate':'Inmobiliario','construction':'Construcción','energy':'Energía','utilities':'Servicios públicos',
  'public sector':'Sector público','government':'Administración pública','nonprofit':'Tercer sector','non-profit':'Tercer sector',
  'media':'Medios','marketing & advertising':'Marketing y publicidad','marketing and advertising':'Marketing y publicidad',
  'consulting':'Consultoría','legal services':'Servicios jurídicos','accounting':'Contabilidad','human resources':'Recursos humanos',
  'automotive':'Automoción','agriculture':'Agricultura','food & beverage':'Alimentación y bebidas','food and beverage':'Alimentación y bebidas',
  'travel & tourism':'Viajes y turismo','travel and tourism':'Viajes y turismo','other':'Otro'
});
function companySectorLabel(value) {
  const raw = labelFrom('REF_DOMAIN', value);
  const key = String(raw || value || '').trim().toLowerCase();
  return COMPANY_SECTOR_LABEL_ES[key] || raw || value || '—';
}
function companySectorOptions() {
  return fieldOptions('REF_DOMAIN').map(o => ({ ...o, label: companySectorLabel(o.value) }));
}
function companySizeBand(company) {
  const n = Number(company?.employeeCount);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return (COMPANY_SIZE_BANDS.find(b => n <= b.max) || COMPANY_SIZE_BANDS[COMPANY_SIZE_BANDS.length - 1]).label;
}
function companyStatusClass(status) {
  return status === 'Cliente' ? 'ok' : status === 'Prospecto' ? 'wait' : status === 'Archivada' ? 'off' : '';
}
function companyCounters(companyId) {
  return {
    contacts: state.contacts.filter(c => c.companyId === companyId).length,
    engagements: state.engagements.filter(e => e.companyId === companyId).length,
    projects: state.projects.filter(p => p.companyId === companyId).length,
    opportunities: (state.opportunities || []).filter(o => o.companyId === companyId).length,
    interactions: (state.interactions || []).filter(i => i.companyId === companyId).length
  };
}

function companyFormBody(co = {}) {
  const opt = (list, sel) => list.map(o => `<option value="${attr(o.value)}" ${o.value === sel ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
  const plain = (list, sel) => list.map(s => `<option ${s === sel ? 'selected' : ''}>${s}</option>`).join('');
  return `<div class="form-grid">
    <div class="field"><label>Nombre legal</label><input id="cCoLegal" value="${attr(co.name || '')}"><div class="field-help">DF001 · RT_COMPANY.Company_Name</div></div>
    <div class="field"><label>Nombre comercial</label><input id="cCoTrade" value="${attr(co.tradeName || '')}"></div>
    <div class="field"><label>CIF / identificador fiscal</label><input id="cCoTaxId" value="${attr(co.taxId || '')}"></div>
    <div class="field"><label>Sector</label><select id="cCoSector"><option value="">Sin indicar</option>${opt(companySectorOptions(), co.sector || '')}</select><div class="field-help">DF002 · catálogo REF_DOMAIN</div></div>
    <div class="field"><label>Número de empleados</label><input id="cCoEmployees" type="number" min="1" value="${attr(co.employeeCount || '')}"><div class="field-help">DF003 · el tramo mostrado se deriva de este número</div></div>
    <div class="field"><label>País</label><select id="cCoCountry"><option value="">Sin indicar</option>${opt(fieldOptions('REF_COUNTRY_ISO3166'), co.country || '')}</select><div class="field-help">DF005 · catálogo REF_COUNTRY_ISO3166</div></div>
    <div class="field"><label>Tipo de organización</label><select id="cCoOrgType"><option value="">Sin indicar</option>${plain(COMPANY_ORG_TYPE, co.orgType || '')}</select></div>
    <div class="field"><label>Sitio web</label><input id="cCoWebsite" value="${attr(co.website || '')}" placeholder="www.ejemplo.com"></div>
    <div class="field"><label>Estado</label><select id="cCoStatus">${plain(COMPANY_STATUS, co.status || 'Prospecto')}</select></div>
    <div class="field"><label>Canal de entrada</label><select id="cCoChannel"><option value="">Sin indicar</option>${plain(COMPANY_ENTRY_CHANNEL, co.entryChannel || '')}</select></div>
    <div class="field"><label>Responsable AUNEA</label><input id="cCoOwner" value="${attr(co.owner || '')}"></div>
    <div class="field full"><label>Notas generales</label><textarea id="cCoNotes" maxlength="500">${esc(co.notes || '')}</textarea></div>
  </div>`;
}
function readCompanyForm() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  return {
    name: v('cCoLegal'), tradeName: v('cCoTrade'), taxId: v('cCoTaxId'), sector: v('cCoSector'),
    employeeCount: v('cCoEmployees') ? Number(v('cCoEmployees')) : null, country: v('cCoCountry'),
    orgType: v('cCoOrgType'), website: v('cCoWebsite'), status: v('cCoStatus') || 'Prospecto',
    entryChannel: v('cCoChannel'), owner: v('cCoOwner'), notes: v('cCoNotes').slice(0, 500)
  };
}
function addCompany() {
  openModal('Nueva empresa', companyFormBody(), () => {
    const data = readCompanyForm();
    if (!data.name) return toast('Indica el nombre legal.');
    const co = { id: id('CMP'), ...data, primaryContactId: null, createdAt: now() };
    state.companies.push(co);
    state.selectedCompanyId = co.id;
    markDirty(`Empresa creada: ${co.name}`);
    closeModal(); render();
  });
}
function editCompany(companyId) {
  const co = companyById(companyId);
  if (!co) return;
  openModal('Editar empresa', companyFormBody(co), () => {
    const before = { ...co }, data = readCompanyForm();
    if (!data.name) return toast('Indica el nombre legal.');
    Object.assign(co, data);
    Object.keys(data).forEach(k => { if (String(before[k] ?? '') !== String(co[k] ?? '')) audit(`Empresa ${co.name} editada: ${k} "${before[k] ?? '—'}"→"${co[k] ?? '—'}"`); });
    markDirty(); closeModal(); render();
  }, 'Guardar cambios');
}

function archiveCompany(companyId) {
  const co = companyById(companyId);
  if (!co) return;
  const n = companyCounters(companyId);
  if (!confirm(`¿Archivar ${co.name}? Sus ${n.contacts} contacto(s), ${n.engagements} estudio(s) y ${n.projects} proyecto(s) se conservan.`)) return;
  co.status = 'Archivada';
  markDirty(`Empresa archivada: ${co.name}`);
  render();
}

function migrateCompaniesToCrmRecord(companies) {
  let changed = 0;
  for (const co of companies || []) {
    if (co.status !== undefined && co.primaryContactId !== undefined) continue;
    if (co.status === undefined) co.status = 'Prospecto';
    if (co.primaryContactId === undefined) co.primaryContactId = null;
    for (const k of ['tradeName', 'taxId', 'orgType', 'website', 'entryChannel', 'owner', 'notes']) if (co[k] === undefined) co[k] = '';
    if (co.employeeCount === undefined) co.employeeCount = null;
    if (!co.createdAt) co.createdAt = now();
    changed++;
  }
  return changed;
}
// [AUNEA-FE-CRM-COMPANY-010] END
