// [AUNEA-FE-CRM-INTERACTION-010] START — Interaction log (P03, DEC-058)
// PURPOSE: Own each relationship event and the next follow-up it schedules. Company, Contact and
//          Opportunity read the timeline, the last interaction and the pending follow-up as derived
//          projections; none of them keeps a second editable copy (DEC-050/058).
// SOURCE: DEC-058 (Interaction owns the event and Next_Followup_At); DEC-051 (entities stay separate);
//         DEC-050 (single owner / single capture); Architecture Contract v1.5 row P03.
// INPUTS: state.interactions, state.companies, state.contacts, state.opportunities, state.engagements.
// OUTPUTS: Interaction records and the timeline/last-interaction/next-follow-up projections.
// SIDE_EFFECTS: state mutation and audit entries.
// CHANGE_RISK: HIGH.
//
// NOTE ON VISUAL FIDELITY: the approved reference set 21+2 contains no P03 screen. DEC-058 closes the
// functional contract regardless, so this is built to the contract and rendered in the global AUNEA
// System visual language. It carries no pending visual debt.

const INTERACTION_TYPE = ['Reunión', 'Llamada', 'Email', 'Mensaje', 'Evento', 'Nota interna'];
const INTERACTION_CHANNEL = ['Presencial', 'Videollamada', 'Teléfono', 'Email', 'LinkedIn', 'Otro'];
const INTERACTION_DIRECTION = ['Entrante', 'Saliente', 'Interna'];
const INTERACTION_OUTCOME = ['Sin resultado aún', 'Avanza', 'Requiere seguimiento', 'Bloqueado', 'Cerrado'];

function interactionsOf(companyId) {
  return (state.interactions || [])
    .filter(i => i.companyId === companyId)
    .sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')));
}
function allInteractionsSorted() {
  return (state.interactions || []).slice().sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')));
}
// The live follow-up is the earliest future one still owned by an interaction — a projection, never a
// task stored on Company or Contact (DEC-058).
function pendingFollowUp(scope = {}) {
  const now_ = new Date().toISOString();
  return (state.interactions || [])
    .filter(i => i.nextFollowUpAt && i.nextFollowUpAt >= now_)
    .filter(i => (!scope.companyId || i.companyId === scope.companyId))
    .filter(i => (!scope.contactId || (i.contactIds || []).includes(scope.contactId)))
    .sort((a, b) => String(a.nextFollowUpAt).localeCompare(String(b.nextFollowUpAt)))[0] || null;
}

function interactionFormBody(it = {}) {
  const companyId = it.companyId || state.selectedCompanyId || state.companies[0]?.id || '';
  const plain = (list, sel) => list.map(s => `<option ${s === sel ? 'selected' : ''}>${s}</option>`).join('');
  const contacts = state.contacts.filter(c => c.companyId === companyId);
  const opps = (state.opportunities || []).filter(o => o.companyId === companyId);
  const engs = state.engagements.filter(e => e.companyId === companyId);
  const isoLocal = v => (v ? String(v).slice(0, 16) : '');
  return `<div class="form-grid">
    <div class="field"><label>Empresa</label><select id="iCompany">${state.companies.map(c => `<option value="${attr(c.id)}" ${c.id === companyId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Fecha y hora</label><input id="iWhen" type="datetime-local" value="${attr(isoLocal(it.occurredAt || now()))}"></div>
    <div class="field"><label>Tipo</label><select id="iType">${plain(INTERACTION_TYPE, it.type || 'Reunión')}</select></div>
    <div class="field"><label>Canal</label><select id="iChannel">${plain(INTERACTION_CHANNEL, it.channel || 'Videollamada')}</select></div>
    <div class="field"><label>Dirección</label><select id="iDirection">${plain(INTERACTION_DIRECTION, it.direction || 'Saliente')}</select></div>
    <div class="field"><label>Resultado</label><select id="iOutcome">${plain(INTERACTION_OUTCOME, it.outcome || 'Sin resultado aún')}</select></div>
    <div class="field full"><label>Contactos participantes</label><div class="choice-grid">${contacts.length ? contacts.map(c => `<span class="choice"><input type="checkbox" id="ic_${attr(c.id)}" data-interaction-contact="${attr(c.id)}" ${(it.contactIds || []).includes(c.id) ? 'checked' : ''}><label for="ic_${attr(c.id)}">${esc(contactFullName(c))}</label></span>`).join('') : '<span class="field-help">Esta empresa no tiene contactos registrados todavía.</span>'}</div><div class="field-help">Se referencian; sus datos maestros no se vuelven a pedir aquí (DEC-058).</div></div>
    <div class="field full"><label>Asunto</label><input id="iSubject" value="${attr(it.subject || '')}"></div>
    <div class="field full"><label>Resumen / notas</label><textarea id="iSummary">${esc(it.summary || '')}</textarea></div>
    <div class="field"><label>Oportunidad relacionada</label><select id="iOpportunity"><option value="">Ninguna</option>${opps.map(o => `<option value="${attr(o.id)}" ${o.id === it.opportunityId ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}</select></div>
    <div class="field"><label>Estudio relacionado</label><select id="iEngagement"><option value="">Ninguno</option>${engs.map(e => `<option value="${attr(e.id)}" ${e.id === it.engagementId ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</select></div>
    <div class="field"><label>Próximo seguimiento</label><input id="iFollowUp" type="datetime-local" value="${attr(isoLocal(it.nextFollowUpAt))}"><div class="field-help">Pertenece a este evento. Empresa, contacto y oportunidad lo muestran sin duplicarlo.</div></div>
    <div class="field"><label>Evidencia referenciada</label><input id="iEvidence" value="${attr(it.evidenceRef || '')}" placeholder="Enlace o referencia"></div>
  </div>`;
}
function readInteractionForm() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  return {
    companyId: v('iCompany'), occurredAt: v('iWhen') ? new Date(v('iWhen')).toISOString() : now(),
    type: v('iType'), channel: v('iChannel'), direction: v('iDirection'), outcome: v('iOutcome'),
    contactIds: [...document.querySelectorAll('[data-interaction-contact]')].filter(x => x.checked).map(x => x.dataset.interactionContact),
    subject: v('iSubject'), summary: v('iSummary'),
    opportunityId: v('iOpportunity') || null, engagementId: v('iEngagement') || null,
    nextFollowUpAt: v('iFollowUp') ? new Date(v('iFollowUp')).toISOString() : null,
    evidenceRef: v('iEvidence')
  };
}
function addInteraction(seed={}) {
  if (!state.companies.length) return toast('Crea primero una empresa.');
  const draft={companyId:seed.companyId||state.selectedCompanyId||state.companies[0]?.id||'',contactIds:seed.contactIds||[]};
  openModal('Nueva interacción', interactionFormBody(draft), () => {
    const data = readInteractionForm();
    if (!data.subject) return toast('Indica el asunto.');
    state.interactions.push({ id: id('INT'), ...data, createdAt: now() });
    markDirty(`Interacción registrada: ${data.subject}`);
    closeModal(); render();
  });
  rebindInteractionCompany();
}
function editInteraction(interactionId) {
  const it = (state.interactions || []).find(x => x.id === interactionId);
  if (!it) return;
  openModal('Editar interacción', interactionFormBody(it), () => {
    Object.assign(it, readInteractionForm());
    markDirty(`Interacción actualizada: ${it.subject}`);
    closeModal(); render();
  }, 'Guardar cambios');
  rebindInteractionCompany();
}
// Changing the company changes which contacts, opportunities and engagements can be referenced, so the
// dependent parts of the form are re-rendered rather than left showing another company's records.
function rebindInteractionCompany() {
  const sel = document.getElementById('iCompany');
  if (!sel) return;
  sel.onchange = () => {
    const draft = readInteractionForm();
    const body = document.querySelector('.modal-body');
    if (body) body.innerHTML = interactionFormBody({ ...draft, contactIds: [] });
    rebindInteractionCompany();
  };
}
function deleteInteraction(interactionId) {
  const it = (state.interactions || []).find(x => x.id === interactionId);
  if (!it) return;
  if (!confirm(`¿Eliminar la interacción "${it.subject}"? El histórico de relación perderá este evento.`)) return;
  state.interactions = state.interactions.filter(x => x.id !== interactionId);
  markDirty(`Interacción eliminada: ${it.subject}`);
  render();
}
// [AUNEA-FE-CRM-INTERACTION-010] END
