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
  { max: 10, label: '1–10' }, { max: 50, label: '11–50' }, { max: 250, label: '51–250' },
  { max: 500, label: '251–500' }, { max: 1000, label: '501–1.000' }, { max: Infinity, label: 'Más de 1.000' }
];

// REF_DOMAIN may keep stable English/internal labels. The visible CRM surface is Spanish by contract;
// this projection changes presentation only and never rewrites the stored canonical value.
const COMPANY_SECTOR_LABEL_ES = Object.freeze({
  'strategy & governance':'Estrategia y gobierno',
  'marketing planning & content':'Planificación de marketing y contenidos',
  'lead generation & inbound':'Generación de leads e inbound',
  'sales & crm':'Ventas y CRM',
  'proposal, contracting & commercial admin':'Propuestas, contratación y administración comercial',
  'client intake & onboarding':'Alta y onboarding de clientes',
  'project setup & planning':'Configuración y planificación de proyectos',
  'service delivery & work management':'Prestación del servicio y gestión del trabajo',
  'approvals, qa & exceptions':'Aprobaciones, calidad y excepciones',
  'client communication & support':'Comunicación y soporte al cliente',
  'customer success, renewal & retention':'Éxito del cliente, renovación y retención',
  'billing, invoicing & collections':'Facturación y cobros',
  'finance, accounting & management reporting':'Finanzas, contabilidad y reporting de gestión',
  'procurement & vendor management':'Compras y gestión de proveedores',
  'recruitment & hiring':'Reclutamiento y contratación',
  'employee onboarding, hr ops & offboarding':'Onboarding, operaciones de RR. HH. y bajas',
  'knowledge & document management':'Gestión del conocimiento y documental',
  'data, reporting & bi':'Datos, reporting y BI',
  'it, access, assets & security':'TI, accesos, activos y seguridad',
  'compliance, legal & risk':'Cumplimiento, legal y riesgo',
  'capacity, resource & scheduling':'Capacidad, recursos y planificación',
  'training, events & community':'Formación, eventos y comunidad',
  'field service & appointment operations':'Servicio de campo y gestión de citas',
  'creative, agency & production operations':'Operaciones creativas, de agencia y producción',
  'professional services delivery':'Prestación de servicios profesionales',
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
function companyStatusLabel(status) {
  return status === 'Prospecto' ? 'Potencial cliente' : status || '—';
}
function companyStatusOptions() {
  return COMPANY_STATUS.map(value => ({value,label:companyStatusLabel(value)}));
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

function currentAuneaOwnerName() {
  const visible = document.querySelector('.user-chip b')?.textContent?.trim();
  if (visible) return visible;
  if (typeof AUNEA_DEFAULT_PROJECT_OWNER !== 'undefined') return AUNEA_DEFAULT_PROJECT_OWNER.name;
  return 'Pedro Carrasco';
}
function companySelectControl(id,label,options,current,placeholder='Sin indicar',help='') {
  const selected=options.find(o=>String(o.value)===String(current));
  return `<div class="field"><label>${esc(label)}</label><input type="hidden" id="${attr(id)}" value="${attr(current||'')}"><details class="aunea-select company-form-select"><summary><span data-company-select-label="${attr(id)}">${esc(selected?.label||placeholder)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="${attr(label)}"><button type="button" role="option" data-company-select-option="${attr(id)}" data-value="">${esc(placeholder)}</button>${options.map(o=>`<button type="button" role="option" class="${String(o.value)===String(current)?'selected':''}" data-company-select-option="${attr(id)}" data-value="${attr(o.value)}">${esc(o.label)}</button>`).join('')}</div></details>${help?`<div class="field-help">${esc(help)}</div>`:''}</div>`;
}
const COMPANY_EMPLOYEE_RANGE_OPTIONS = Object.freeze([
  {value:'10',label:'1–10'},
  {value:'50',label:'11–50'},
  {value:'250',label:'51–250'},
  {value:'500',label:'251–500'},
  {value:'1000',label:'501–1.000'},
  {value:'1001',label:'Más de 1.000'}
]);
function companyEmployeeRangeValue(count) {
  const n=Number(count);
  if(!Number.isFinite(n)||n<=0)return '';
  if(n<=10)return '10';
  if(n<=50)return '50';
  if(n<=250)return '250';
  if(n<=500)return '500';
  if(n<=1000)return '1000';
  return '1001';
}
function companyFormBody(co = {}) {
  const owner=currentAuneaOwnerName();
  const employeeValue=companyEmployeeRangeValue(co.employeeCount);
  return `<div class="form-grid">
    <div class="field"><label>Nombre comercial</label><input id="cCoName" value="${attr(co.tradeName || co.name || '')}"><div class="field-help">DF001 · RT_COMPANY.Company_Name</div></div>
    <div class="field"><label>CIF / identificador fiscal</label><input id="cCoTaxId" value="${attr(co.taxId || '')}"></div>
    ${companySelectControl('cCoSector','Sector',companySectorOptions(),co.sector||'','Sin indicar','DF002 · catálogo REF_DOMAIN')}
    ${companySelectControl('cCoEmployees','Número de empleados',COMPANY_EMPLOYEE_RANGE_OPTIONS,employeeValue,'Sin indicar','DF003 · rango aproximado')}
    ${companySelectControl('cCoOrgType','Tipo de organización',COMPANY_ORG_TYPE.map(value=>({value,label:value})),co.orgType||'')}
    <div class="field"><label>Sitio web</label><input id="cCoWebsite" value="${attr(co.website || '')}" placeholder="www.ejemplo.com"></div>
    ${companySelectControl('cCoStatus','Estado',companyStatusOptions(),co.status||'Prospecto','Potencial cliente')}
    ${companySelectControl('cCoChannel','Canal de entrada',COMPANY_ENTRY_CHANNEL.map(value=>({value,label:value})),co.entryChannel||'')}
    <div class="field"><label>Responsable AUNEA</label><input id="cCoOwner" value="${attr(owner)}" readonly></div>
    <input type="hidden" id="cCoCountry" value="${attr(co.country || 'ES')}">
    <div class="field full"><label>Notas generales</label><textarea id="cCoNotes" maxlength="500">${esc(co.notes || '')}</textarea></div>
  </div>`;
}
function readCompanyForm() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  const name=v('cCoName');
  return {
    name, tradeName: '', taxId: v('cCoTaxId'), sector: v('cCoSector'),
    employeeCount: v('cCoEmployees') ? Number(v('cCoEmployees')) : null, country: v('cCoCountry') || 'ES',
    orgType: v('cCoOrgType'), website: v('cCoWebsite'), status: v('cCoStatus') || 'Prospecto',
    entryChannel: v('cCoChannel'), owner: currentAuneaOwnerName(), notes: v('cCoNotes').slice(0, 500)
  };
}
if(!window.__auneaCompanyFormSelectBound){
  window.__auneaCompanyFormSelectBound=true;
  document.addEventListener('click',e=>{
    const option=e.target.closest('[data-company-select-option]');if(!option)return;
    e.preventDefault();e.stopPropagation();
    const target=document.getElementById(option.dataset.companySelectOption);if(!target)return;
    target.value=option.dataset.value||'';
    const box=option.closest('.aunea-select'),label=box?.querySelector('[data-company-select-label]');
    if(label)label.textContent=option.textContent.trim();
    box?.querySelectorAll('[data-company-select-option]').forEach(btn=>btn.classList.toggle('selected',btn===option));
    if(box)box.open=false;
  },true);
}

function addCompany() {
  openModal('Nueva empresa', companyFormBody(), () => {
    const data = readCompanyForm();
    if (!data.name) return toast('Indica el nombre comercial.');
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
    if (!data.name) return toast('Indica el nombre comercial.');
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
