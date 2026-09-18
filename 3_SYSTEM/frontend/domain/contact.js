// [AUNEA-FE-CRM-CONTACT-010] START — Contact master (DEC-061)
// PURPOSE: Own the Contact record: the exact field set DEC-061 closes, the Company-owned "principal"
//          relation, the derived last-interaction projection, and reversible inactivation that preserves history. No other surface keeps an editable copy of a Contact field (DEC-050).
// SOURCE: DEC-061 (Spain-only contact schema, inactivation and structured generic roles); DEC-050 (single owner / single capture);
//         DEC-051 (roles are contextual to the Engagement); DEC-055 (history is never destroyed);
//         reference IMG90-00-02 adapted by DEC-061; Architecture Contract v1.5 row P02.
// INPUTS: state.contacts, state.companies, state.interactions and the canonical reference catalogues.
// OUTPUTS: Contact records, the Company.primaryContactId relation and derived projections.
// SIDE_EFFECTS: state mutation and audit entries.
// CHANGE_RISK: HIGH.

// DEC-061 closes these as operational states of the Contact itself. They are not pipeline states:
// the commercial pipeline belongs to Opportunity (DEC-051).
const CONTACT_STATUS = ['Activo', 'Pendiente', 'Inactivo'];
const CONTACT_NOTES_MAX = 500;
const CONTACT_ROLE_OPTIONS = Object.freeze([
  'Dirección general','Operaciones','Administración / Finanzas','Comercial / Ventas','Marketing',
  'Personas / RR. HH.','Tecnología / IT','Producto','Compras','Legal / Compliance',
  'Atención al cliente','Project Management / PMO','Responsable de área','Técnico / Especialista','Otro'
]);

function contactFullName(ct) {
  if (!ct) return '';
  const joined = [ct.firstName, ct.lastName].filter(Boolean).join(' ').trim();
  return joined || ct.name || '';
}
function contactsOfCompany(companyId) { return state.contacts.filter(c => c.companyId === companyId); }

// "Principal" is a relation owned by Company, not an attribute of the Contact (DEC-061). Asking the
// question this way is what keeps a company from ending up with two primaries.
function isPrimaryContact(ct) {
  if (!ct) return false;
  const co = companyById(ct.companyId);
  return !!co && co.primaryContactId === ct.id;
}
function setPrimaryContact(companyId, contactId) {
  const co = companyById(companyId);
  if (!co) return;
  const ct = contactById(contactId);
  if (contactId && (!ct || ct.companyId !== companyId)) { toast('El contacto principal debe pertenecer a la empresa.'); return; }
  // Write-through to the owner, exactly once. Toggling the current primary clears the relation.
  co.primaryContactId = (co.primaryContactId === contactId) ? null : contactId;
  markDirty(co.primaryContactId
    ? `Contacto principal de ${co.name} establecido: ${contactFullName(ct)}`
    : `Contacto principal de ${co.name} retirado`);
}

// Last interaction is derived from the Interaction log and never copied onto the Contact (DEC-058).
function contactInteractions(contactId) {
  return (state.interactions || [])
    .filter(i => (i.contactIds || []).includes(contactId))
    .sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')));
}
function lastInteractionOf(contactId) { return contactInteractions(contactId)[0] || null; }

// Contact history is preserved by status, never by destructive deletion (DEC-061).
function inactivateContact(contactId) {
  const ct = contactById(contactId);
  if (!ct || ct.status === 'Inactivo') return false;
  ct.status = 'Inactivo';
  const co = companyById(ct.companyId);
  if (co?.primaryContactId === ct.id) co.primaryContactId = null;
  audit(`Contacto ${contactFullName(ct)} inactivado`);
  markDirty(`Contacto inactivado: ${contactFullName(ct)}`);
  return true;
}
function reactivateContact(contactId) {
  const ct = contactById(contactId);
  if (!ct || ct.status !== 'Inactivo') return false;
  ct.status = 'Activo';
  audit(`Contacto ${contactFullName(ct)} reactivado`);
  markDirty(`Contacto reactivado: ${contactFullName(ct)}`);
  return true;
}

function contactSelectControl(id,label,options,current,placeholder='Sin indicar',help='') {
  const normalized=options.map(o=>typeof o==='string'?{value:o,label:o}:o);
  const selected=normalized.find(o=>String(o.value)===String(current));
  return `<div class="field"><label>${esc(label)}</label><input type="hidden" id="${attr(id)}" value="${attr(current||'')}"><details class="aunea-select contact-form-select"><summary><span data-contact-select-label="${attr(id)}">${esc(selected?.label||placeholder)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="${attr(label)}"><button type="button" role="option" data-contact-select-option="${attr(id)}" data-value="">${esc(placeholder)}</button>${normalized.map(o=>`<button type="button" role="option" class="${String(o.value)===String(current)?'selected':''}" data-contact-select-option="${attr(id)}" data-value="${attr(o.value)}">${esc(o.label)}</button>`).join('')}</div></details>${help?`<div class="field-help">${esc(help)}</div>`:''}</div>`;
}
function contactRoleOptions(current='') {
  const values=[...CONTACT_ROLE_OPTIONS];
  if(current && !values.includes(current)) values.unshift(current);
  return values.map(value=>({value,label:value}));
}

function contactFormBody(ct = {}) {
  const companyOptions=state.companies.map(c=>({value:c.id,label:c.name}));
  return `<div class="form-grid">
    ${contactSelectControl('cContactCompany','Empresa',companyOptions,ct.companyId||'','Selecciona empresa','El contacto pertenece a una Company única.')}
    ${contactSelectControl('cContactRole','Cargo / rol',contactRoleOptions(ct.role||''),ct.role||'','Selecciona cargo')}
    <div class="field"><label>Nombre</label><input id="cContactFirst" value="${attr(ct.firstName || '')}"></div>
    <div class="field"><label>Apellidos</label><input id="cContactLast" value="${attr(ct.lastName || '')}"></div>
    <div class="field"><label>Email</label><input id="cContactEmail" type="email" value="${attr(ct.email || '')}"></div>
    <div class="field"><label>Teléfono</label><input id="cContactPhone" value="${attr(ct.phone || '')}"></div>
    ${contactSelectControl('cContactStatus','Estado',CONTACT_STATUS,ct.status||'Activo','Activo')}
    <div class="field full"><label>Notas</label><textarea id="cContactNotes" maxlength="${CONTACT_NOTES_MAX}">${esc(ct.notes || '')}</textarea><div class="field-help">Máximo ${CONTACT_NOTES_MAX} caracteres.</div></div>
  </div>`;
}
function readContactForm() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  return {
    companyId: v('cContactCompany'), firstName: v('cContactFirst'), lastName: v('cContactLast'),
    role: v('cContactRole'), email: v('cContactEmail'), phone: v('cContactPhone'),
    status: v('cContactStatus') || 'Activo', notes: v('cContactNotes').slice(0, CONTACT_NOTES_MAX)
  };
}
function addContact() {
  if (!state.companies.length) return toast('Crea primero una empresa.');
  const defaultCompany=companyById(state.selectedCompanyId)?.id||state.companies[0].id;
  openModal('Nuevo contacto', contactFormBody({ companyId: defaultCompany, status:'Activo' }), () => {
    const data = readContactForm();
    if (!data.firstName) return toast('Indica el nombre.');
    const ct = { id: id('CON'), ...data, createdAt: now() };
    state.contacts.push(ct);
    state.selectedContactId = ct.id;
    markDirty(`Contacto creado: ${contactFullName(ct)}`);
    closeModal(); render();
  });
}
function editContact(contactId) {
  const ct = contactById(contactId);
  if (!ct) return;
  openModal('Editar contacto', contactFormBody(ct), () => {
    const before = { ...ct }, data = readContactForm();
    if (!data.firstName) return toast('Indica el nombre.');
    Object.assign(ct, data);
    [['firstName', 'Nombre'], ['lastName', 'Apellidos'], ['role', 'Cargo'], ['email', 'Email'], ['phone', 'Teléfono'],
     ['status', 'Estado'], ['notes', 'Notas'], ['companyId', 'Empresa']]
      .forEach(([k, label]) => { if ((before[k] || '') !== (ct[k] || '')) audit(`Contacto ${contactFullName(ct)} editado: ${label} "${before[k] || '—'}"→"${ct[k] || '—'}"`); });
    markDirty(); closeModal(); render();
  }, 'Guardar cambios');
}

// One-time migration of contacts captured before DEC-061 closed the schema. Nothing is discarded: the
// old single name is split, and the old commercial fields are preserved untouched under _legacy because
// they are Opportunity/Interaction semantics (DEC-051/058), not Contact fields.
function migrateContactsToCurrentContract(contacts) {
  let changed = 0;
  for (const ct of contacts || []) {
    if (ct.firstName !== undefined && ct.lastName !== undefined) {
      let touched=false;
      if(ct.language!==undefined||ct.country!==undefined){ct._legacy={...(ct._legacy||{}),language:ct.language||null,country:ct.country||null};delete ct.language;delete ct.country;touched=true}
      if(!CONTACT_STATUS.includes(ct.status)){ct.status='Activo';touched=true}
      if(touched)changed++;
      continue;
    }
    const parts = String(ct.name || '').trim().split(/\s+/);
    ct.firstName = parts.shift() || '';
    ct.lastName = parts.join(' ');
    const legacyStatus = ct.status;
    // The old list was a commercial pipeline. Only the two states that genuinely describe the person
    // map across; everything else becomes Activo and the pipeline value is kept for an Opportunity.
    ct.status = (legacyStatus === 'Perdido' || legacyStatus === 'En pausa') ? 'Inactivo'
      : (legacyStatus === 'Nuevo' ? 'Pendiente' : 'Activo');
    ct._legacy = { pipelineStatus: legacyStatus || null, source: ct.source || null, nextAction: ct.nextAction || null };
    delete ct.source; delete ct.nextAction; delete ct.name;
    if (ct.notes === undefined) ct.notes = '';
    if(ct.language!==undefined||ct.country!==undefined){
      ct._legacy={...(ct._legacy||{}),language:ct.language||null,country:ct.country||null};
      delete ct.language;delete ct.country;
    }
    changed++;
  }
  return changed;
}
// [AUNEA-FE-CRM-CONTACT-010] END
