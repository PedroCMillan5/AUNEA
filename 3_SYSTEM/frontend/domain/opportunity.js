// [AUNEA-FE-CRM-OPPORTUNITY-010] START — Opportunity / commercial case (P04, DEC-051)
// PURPOSE: Own the commercial case and its pipeline state, separate from the person. Company and
//          Contacts are referenced; an Engagement may record the Opportunity it originated from.
// SOURCE: DEC-051 (Opportunity is the commercial case, separate from Contact; Interaction → Opportunity
//         → Engagement → Project); DEC-042 (related entities, not states of one row);
//         DEC-050 (single owner / single capture); Architecture Contract v1.2 row P04.
// INPUTS: state.opportunities, state.companies, state.contacts, state.engagements.
// OUTPUTS: Opportunity records and the origin link consumed by Engagement.
// SIDE_EFFECTS: state mutation and audit entries.
// CHANGE_RISK: HIGH.
//
// NOTE ON VISUAL FIDELITY: the approved reference set 21+2 contains no P04 screen. DEC-051 closes the
// functional contract, so this is built to the contract in the global AUNEA System visual language.

// The pipeline lives here, on the commercial case — not on the person. This is where the legacy
// per-contact pipeline states belong after the DEC-057 contact migration.
const OPPORTUNITY_STAGE = ['Nueva', 'Contactada', 'Reunión', 'Diagnóstico', 'Propuesta', 'Ganada', 'Perdida', 'En pausa'];
const OPPORTUNITY_SOURCE = ['Red personal', 'Referido', 'Inbound', 'Cliente existente', 'Otro'];
const OPPORTUNITY_OPEN_STAGES = ['Nueva', 'Contactada', 'Reunión', 'Diagnóstico', 'Propuesta'];

function opportunitiesOf(companyId) { return (state.opportunities || []).filter(o => o.companyId === companyId); }
function isOpportunityOpen(o) { return OPPORTUNITY_OPEN_STAGES.includes(o?.stage); }
function opportunityStageClass(stage) {
  return stage === 'Ganada' ? 'ok' : stage === 'Perdida' ? 'off' : stage === 'En pausa' ? '' : 'wait';
}
// Engagements created from this opportunity. The link is a reference; nothing is copied across.
function engagementsOfOpportunity(opportunityId) { return state.engagements.filter(e => e.opportunityId === opportunityId); }

function opportunityFormBody(o = {}) {
  const companyId = o.companyId || state.selectedCompanyId || state.companies[0]?.id || '';
  const contacts = state.contacts.filter(c => c.companyId === companyId);
  return `<div class="form-grid">
    <div class="field"><label>Empresa</label>${auneaSelectControl('oCompany',state.companies.map(c=>({value:c.id,label:c.name})),companyId)}</div>
    <div class="field"><label>Estado del pipeline</label>${auneaSelectControl('oStage',OPPORTUNITY_STAGE.map(x=>({value:x,label:x})),o.stage||'Nueva')}</div>
    <div class="field full"><label>Título del caso</label><input id="oTitle" value="${attr(o.title || '')}" placeholder="Ej. Automatización de pedidos"></div>
    <div class="field"><label>Origen</label>${auneaSelectControl('oSource',OPPORTUNITY_SOURCE.map(x=>({value:x,label:x})),o.source||'Red personal')}</div>
    <div class="field"><label>Responsable AUNEA</label><input id="oOwner" value="${attr(o.owner || '')}"></div>
    <div class="field full"><label>Contactos implicados</label><div class="choice-grid">${contacts.length ? contacts.map(c => `<span class="choice"><input type="checkbox" id="oc_${attr(c.id)}" data-opportunity-contact="${attr(c.id)}" ${(o.contactIds || []).includes(c.id) ? 'checked' : ''}><label for="oc_${attr(c.id)}">${esc(contactFullName(c))}</label></span>`).join('') : '<span class="field-help">Esta empresa no tiene contactos registrados todavía.</span>'}</div><div class="field-help">Se referencian; una misma persona puede participar en varias oportunidades (DEC-042).</div></div>
    <div class="field full"><label>Notas</label><textarea id="oNotes">${esc(o.notes || '')}</textarea></div>
  </div>`;
}
function readOpportunityForm() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  return {
    companyId: v('oCompany'), title: v('oTitle'), stage: v('oStage') || 'Nueva',
    source: v('oSource'), owner: v('oOwner'), notes: v('oNotes'),
    contactIds: [...document.querySelectorAll('[data-opportunity-contact]')].filter(x => x.checked).map(x => x.dataset.opportunityContact)
  };
}
function addOpportunity() {
  if (!state.companies.length) return toast('Crea primero una empresa.');
  openModal('Nueva oportunidad', opportunityFormBody(), () => {
    const data = readOpportunityForm();
    if (!data.title) return toast('Indica el título del caso.');
    state.opportunities.push({ id: id('OPP'), ...data, createdAt: now(), updatedAt: now() });
    markDirty(`Oportunidad creada: ${data.title}`);
    closeModal(); render();
  });
}
function editOpportunity(opportunityId) {
  const o = (state.opportunities || []).find(x => x.id === opportunityId);
  if (!o) return;
  openModal('Editar oportunidad', opportunityFormBody(o), () => {
    const before = o.stage;
    Object.assign(o, readOpportunityForm(), { updatedAt: now() });
    if (before !== o.stage) audit(`Oportunidad ${o.title}: estado "${before}"→"${o.stage}"`);
    markDirty(); closeModal(); render();
  }, 'Guardar cambios');
}
// Closing, not deleting: a lost case is commercial history worth keeping (DEC-055).
function closeOpportunity(opportunityId, stage) {
  const o = (state.opportunities || []).find(x => x.id === opportunityId);
  if (!o || !OPPORTUNITY_STAGE.includes(stage)) return;
  o.stage = stage; o.updatedAt = now();
  markDirty(`Oportunidad ${o.title} marcada como ${stage}`);
  render();
}

// Creating a study from a case records the origin as a reference. Nothing is copied across: the
// Engagement reads Company and Contacts by id, exactly as it does when created from a contact.
function createStudyFromOpportunity(opportunityId){
  const o=(state.opportunities||[]).find(x=>x.id===opportunityId);
  if(!o)return;
  const primary=(o.contactIds||[])[0]||state.companies.find(c=>c.id===o.companyId)?.primaryContactId;
  if(!primary)return toast('Asocia al menos un contacto a la oportunidad antes de crear el estudio.');
  createStudyFromContact(primary);
  const e=currentEng();
  if(e){e.opportunityId=o.id;e.title=`Diagnóstico · ${o.title}`;audit(`Estudio creado desde la oportunidad ${o.title}`)}
  o.stage=o.stage==='Nueva'||o.stage==='Contactada'?'Diagnóstico':o.stage;o.updatedAt=now();
  markDirty();render();
}
// [AUNEA-FE-CRM-OPPORTUNITY-010] END
