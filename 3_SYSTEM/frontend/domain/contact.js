// [AUNEA-FE-CRM-CONTACT-010] START — Contact master (DEC-057)
// PURPOSE: Own the Contact record: the exact field set DEC-057 closes, the Company-owned "principal"
//          relation, the derived last-interaction projection, and a real delete guarded by referential
//          integrity. No other surface keeps an editable copy of a Contact field (DEC-050).
// SOURCE: DEC-057 (schema, principal as relation, real delete); DEC-050 (single owner / single capture);
//         DEC-051 (roles are contextual to the Engagement); DEC-055 (history is never destroyed);
//         reference IMG90-00-02 (visible fields and order); Architecture Contract v1.2 row P02.
// INPUTS: state.contacts, state.companies, state.interactions and the canonical reference catalogues.
// OUTPUTS: Contact records, the Company.primaryContactId relation and derived projections.
// SIDE_EFFECTS: state mutation and audit entries.
// CHANGE_RISK: HIGH.

// DEC-057 closes these as operational states of the Contact itself. They are not pipeline states:
// the commercial pipeline belongs to Opportunity (DEC-051).
const CONTACT_STATUS = ['Activo', 'Pendiente', 'Inactivo'];
const CONTACT_NOTES_MAX = 500;

function contactFullName(ct) {
  if (!ct) return '';
  const joined = [ct.firstName, ct.lastName].filter(Boolean).join(' ').trim();
  return joined || ct.name || '';
}
function contactsOfCompany(companyId) { return state.contacts.filter(c => c.companyId === companyId); }

// "Principal" is a relation owned by Company, not an attribute of the Contact (DEC-057). Asking the
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

// Everything that would be destroyed or left dangling by removing this Contact. DEC-057 allows a real
// delete, but only once this comes back empty: snapshots, interactions, engagements, projects and
// deliverables must survive it (DEC-041/050/054/055).
function contactDependencies(contactId) {
  const ct = contactById(contactId);
  const deps = { engagements: [], interactions: [], opportunities: [], projects: [], primaryOf: [] };
  if (!ct) return deps;
  deps.engagements = state.engagements.filter(e => (e.contactIds || []).includes(contactId));
  deps.interactions = contactInteractions(contactId);
  deps.opportunities = (state.opportunities || []).filter(o => (o.contactIds || []).includes(contactId));
  deps.projects = state.projects.filter(p => (p.contactIds || []).includes(contactId));
  deps.primaryOf = state.companies.filter(c => c.primaryContactId === contactId);
  return deps;
}
function contactDeletionBlockers(contactId) {
  const d = contactDependencies(contactId);
  const blockers = [];
  // Being a company's primary contact is a live relation, so it can be released rather than blocking.
  if (d.engagements.length) blockers.push(`${d.engagements.length} estudio(s) conservan su identidad y rol en el snapshot`);
  if (d.interactions.length) blockers.push(`${d.interactions.length} interacción(es) históricas lo referencian`);
  if (d.opportunities.length) blockers.push(`${d.opportunities.length} oportunidad(es) lo referencian`);
  if (d.projects.length) blockers.push(`${d.projects.length} proyecto(s) lo referencian`);
  return blockers;
}
function deleteContact(contactId) {
  const ct = contactById(contactId);
  if (!ct) return false;
  const blockers = contactDeletionBlockers(contactId);
  if (blockers.length) {
    openModal('No se puede eliminar el contacto',
      `<p class="subtitle">Eliminar <b>${esc(contactFullName(ct))}</b> destruiría o dejaría colgando información histórica que debe conservarse.</p>`
      + `<div class="blocker-list">${blockers.map(b => `<div class="notice warn">${esc(b)}</div>`).join('')}</div>`
      + `<p class="field-help">Las dependencias se resuelven en su propia página propietaria. No existe borrado en cascada de histórico (DEC-057).</p>`,
      () => closeModal(), 'Entendido');
    return false;
  }
  if (!confirm(`¿Eliminar definitivamente a ${contactFullName(ct)}? Esta acción no se puede deshacer.`)) return false;
  // Release the live relation first so no company points at a contact that no longer exists.
  state.companies.forEach(c => { if (c.primaryContactId === contactId) c.primaryContactId = null; });
  state.contacts = state.contacts.filter(c => c.id !== contactId);
  if (state.selectedContactId === contactId) state.selectedContactId = null;
  markDirty(`Contacto eliminado: ${contactFullName(ct)}`);
  return true;
}

function contactFormBody(ct = {}) {
  const companyOpts = state.companies.map(c => `<option value="${attr(c.id)}" ${c.id === ct.companyId ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const langOpts = fieldOptions('REF_LANGUAGE_ISO6391');
  const countryOpts = fieldOptions('REF_COUNTRY_ISO3166');
  const opt = (list, sel) => list.map(o => `<option value="${attr(o.value)}" ${o.value === sel ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
  return `<div class="form-grid">
    <div class="field"><label>Empresa</label><select id="cContactCompany">${companyOpts}</select><div class="field-help">El contacto pertenece a una Company única (DEC-007).</div></div>
    <div class="field"><label>Cargo / rol</label><input id="cContactRole" value="${attr(ct.role || '')}"></div>
    <div class="field"><label>Nombre</label><input id="cContactFirst" value="${attr(ct.firstName || '')}"></div>
    <div class="field"><label>Apellidos</label><input id="cContactLast" value="${attr(ct.lastName || '')}"></div>
    <div class="field"><label>Email</label><input id="cContactEmail" type="email" value="${attr(ct.email || '')}"></div>
    <div class="field"><label>Teléfono</label><input id="cContactPhone" value="${attr(ct.phone || '')}"></div>
    <div class="field"><label>Idioma</label><select id="cContactLanguage"><option value="">Sin indicar</option>${opt(langOpts, ct.language || '')}</select><div class="field-help">Catálogo ISO 639-1.</div></div>
    <div class="field"><label>País</label><select id="cContactCountry"><option value="">Sin indicar</option>${opt(countryOpts, ct.country || '')}</select><div class="field-help">Catálogo ISO 3166 reutilizado.</div></div>
    <div class="field"><label>Estado</label><select id="cContactStatus">${CONTACT_STATUS.map(s => `<option ${s === (ct.status || 'Activo') ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field full"><label>Notas</label><textarea id="cContactNotes" maxlength="${CONTACT_NOTES_MAX}">${esc(ct.notes || '')}</textarea><div class="field-help">Máximo ${CONTACT_NOTES_MAX} caracteres.</div></div>
  </div>`;
}
function readContactForm() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  return {
    companyId: v('cContactCompany'), firstName: v('cContactFirst'), lastName: v('cContactLast'),
    role: v('cContactRole'), email: v('cContactEmail'), phone: v('cContactPhone'),
    language: v('cContactLanguage'), country: v('cContactCountry'),
    status: v('cContactStatus') || 'Activo', notes: v('cContactNotes').slice(0, CONTACT_NOTES_MAX)
  };
}
function addContact() {
  if (!state.companies.length) return toast('Crea primero una empresa.');
  openModal('Nuevo contacto', contactFormBody({ companyId: state.companies[0].id }), () => {
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
     ['language', 'Idioma'], ['country', 'País'], ['status', 'Estado'], ['notes', 'Notas'], ['companyId', 'Empresa']]
      .forEach(([k, label]) => { if ((before[k] || '') !== (ct[k] || '')) audit(`Contacto ${contactFullName(ct)} editado: ${label} "${before[k] || '—'}"→"${ct[k] || '—'}"`); });
    markDirty(); closeModal(); render();
  }, 'Guardar cambios');
}

// One-time migration of contacts captured before DEC-057 closed the schema. Nothing is discarded: the
// old single name is split, and the old commercial fields are preserved untouched under _legacy because
// they are Opportunity/Interaction semantics (DEC-051/058), not Contact fields.
function migrateContactsToDec057(contacts) {
  let changed = 0;
  for (const ct of contacts || []) {
    if (ct.firstName !== undefined && ct.lastName !== undefined) continue;
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
    changed++;
  }
  return changed;
}
// [AUNEA-FE-CRM-CONTACT-010] END
