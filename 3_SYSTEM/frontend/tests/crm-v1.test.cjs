// [AUNEA-UAT-CRM-010] START — CRM contracts: Company, Contact, Interaction, Opportunity
// PURPOSE: Hold the four CRM domains to the decisions that closed them — the DEC-061 Contact contract,
//          principal as a Company-owned relation, reversible inactivation, structured roles,
//          last interaction derived rather than stored, and the pipeline living on the case.
// SOURCE: DEC-007/042/050/051/054/055/058/061; references IMG90-00-01 and IMG90-00-02 under DEC-056;
//         Architecture Contract v1.5 rows P01–P04.
// INPUTS: the CRM domain modules executed in an isolated vm context.
// OUTPUTS: pass/fail assertions.
// SIDE_EFFECTS: none (read-only, in-memory context).
// CHANGE_RISK: HIGH.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// Minimal host for the domain modules: real code, stubbed shell.
function ctxWith(seed = {}) {
  const ctx = {
    console,
    state: {
      companies: [], contacts: [], interactions: [], opportunities: [], engagements: [], projects: [], audit: [],
      selectedCompanyId: null, selectedContactId: null, ...seed
    },
    schema: { option_sets: { REF_LANGUAGE_ISO6391: { options: [{ value: 'es', label: 'Español' }] }, REF_COUNTRY_ISO3166: { options: [{ value: 'ES', label: 'España' }] }, REF_DOMAIN: { options: [{ value: 'D08', label: 'Prestación del servicio y gestión del trabajo' }] }, REF_INDUSTRY_CNAE25: { options: [{ value: 'CNAE25-N', label: 'Actividades profesionales, científicas y técnicas' }] } } },
    esc: v => String(v ?? ''), attr: v => String(v ?? ''),
    toast: () => {}, audit: m => ctx.state.audit.push({ m }), markDirty: () => {}, render: () => {},
    openModal: () => {}, closeModal: () => {}, confirm: () => true,
    now: () => new Date().toISOString(), id: p => `${p}-x`,
    fieldOptions: s => ctx.schema.option_sets[s]?.options || [],
    labelFrom: (s, v) => ctx.schema.option_sets[s]?.options.find(o => o.value === v)?.label || v || '—',
    formatDateEs: v => String(v || '—'),
    document: { getElementById: () => null, querySelectorAll: () => [] }
  };
  ctx.companyById = idv => ctx.state.companies.find(c => c.id === idv) || null;
  ctx.contactById = idv => ctx.state.contacts.find(c => c.id === idv) || null;
  vm.createContext(ctx);
  for (const f of ['domain/company.js', 'domain/contact.js', 'domain/interaction.js', 'domain/opportunity.js']) {
    vm.runInContext(read(f), ctx);
  }
  // Top-level const/let live in the context's lexical scope, not as properties of the context object,
  // so module constants are read by evaluating the identifier inside the same context.
  ctx.$ = expr => vm.runInContext(expr, ctx);
  return ctx;
}

test('the Contact schema is exactly what DEC-061 closes', () => {
  const src = read('domain/contact.js');
  for (const field of ['firstName', 'lastName', 'role', 'email', 'phone', 'status', 'notes', 'companyId']) {
    assert.ok(src.includes(field), `Contact must carry ${field}`);
  }
  assert.doesNotMatch(src, /id="cContactLanguage"|id="cContactCountry"/, 'Spain-only Contact capture has no Language/Country controls');
  const ctx = ctxWith();
  assert.deepEqual([...ctx.$('CONTACT_STATUS')], ['Activo', 'Pendiente', 'Inactivo']);
  assert.ok(ctx.$('CONTACT_ROLE_OPTIONS').includes('Dirección general'));
  assert.ok(ctx.$('CONTACT_ROLE_OPTIONS').includes('Project Management / PMO'));
  assert.equal(ctx.$('CONTACT_NOTES_MAX'), 500);
});

test('name and surname are persisted as two separate fields', () => {
  const ctx = ctxWith();
  ctx.state.contacts.push({ id: 'C1', companyId: 'X', firstName: 'Laura', lastName: 'Martínez' });
  assert.equal(ctx.contactFullName(ctx.contactById('C1')), 'Laura Martínez');
  // The joined value is a projection; nothing writes a single "name" field back.
  assert.doesNotMatch(read('domain/contact.js'), /ct\.name\s*=/);
});

test('principal is a Company relation, never an attribute of the Contact', () => {
  const ctx = ctxWith();
  ctx.state.companies.push({ id: 'CO1', name: 'Nordia', primaryContactId: null });
  ctx.state.contacts.push({ id: 'C1', companyId: 'CO1', firstName: 'Laura' }, { id: 'C2', companyId: 'CO1', firstName: 'Carlos' });
  ctx.setPrimaryContact('CO1', 'C1');
  assert.equal(ctx.companyById('CO1').primaryContactId, 'C1');
  assert.ok(ctx.isPrimaryContact(ctx.contactById('C1')));
  assert.equal(ctx.contactById('C1').primary, undefined, 'no primary flag is written onto the contact');
  // One primary at a time: selecting another moves the relation rather than adding a second.
  ctx.setPrimaryContact('CO1', 'C2');
  assert.equal(ctx.companyById('CO1').primaryContactId, 'C2');
  assert.ok(!ctx.isPrimaryContact(ctx.contactById('C1')));
  // Toggling the current primary clears it.
  ctx.setPrimaryContact('CO1', 'C2');
  assert.equal(ctx.companyById('CO1').primaryContactId, null);
});

test('a contact from another company cannot become the primary', () => {
  const ctx = ctxWith();
  ctx.state.companies.push({ id: 'CO1', name: 'Nordia', primaryContactId: null });
  ctx.state.contacts.push({ id: 'C9', companyId: 'OTHER', firstName: 'Ajena' });
  ctx.setPrimaryContact('CO1', 'C9');
  assert.equal(ctx.companyById('CO1').primaryContactId, null);
});

test('last interaction is derived from the Interaction log, never stored on the Contact', () => {
  const ctx = ctxWith();
  ctx.state.contacts.push({ id: 'C1', companyId: 'CO1', firstName: 'Laura' });
  ctx.state.interactions.push(
    { id: 'I1', companyId: 'CO1', contactIds: ['C1'], occurredAt: '2026-09-01T10:00:00.000Z', subject: 'Primera' },
    { id: 'I2', companyId: 'CO1', contactIds: ['C1'], occurredAt: '2026-09-10T10:00:00.000Z', subject: 'Segunda' });
  assert.equal(ctx.lastInteractionOf('C1').subject, 'Segunda', 'the most recent event wins');
  assert.equal(ctx.contactById('C1').lastInteraction, undefined, 'no copy is kept on the contact');
  assert.doesNotMatch(read('domain/contact.js'), /lastInteraction\s*=/);
});

test('inactivating a contact preserves the record and all historical references', () => {
  const ctx = ctxWith();
  ctx.state.companies.push({ id: 'CO1', name: 'Nordia', primaryContactId: 'C1' });
  ctx.state.contacts.push({ id: 'C1', companyId: 'CO1', firstName: 'Laura', status:'Activo' });
  ctx.state.engagements.push({ id: 'E1', companyId: 'CO1', contactIds: ['C1'], title: 'Diagnóstico' });
  ctx.state.projects.push({ id:'P1', companyId:'CO1', contactIds:['C1'] });
  assert.equal(ctx.inactivateContact('C1'), true);
  assert.equal(ctx.contactById('C1').status, 'Inactivo');
  assert.equal(ctx.companyById('CO1').primaryContactId, null);
  assert.equal(ctx.state.engagements[0].contactIds[0], 'C1');
  assert.equal(ctx.state.projects[0].contactIds[0], 'C1');
});

test('an inactive contact can be reactivated without recreating identity', () => {
  const ctx = ctxWith();
  ctx.state.contacts.push({ id:'C1', companyId:'CO1', firstName:'Laura', status:'Inactivo' });
  assert.equal(ctx.reactivateContact('C1'), true);
  assert.equal(ctx.contactById('C1').status, 'Activo');
  assert.equal(ctx.state.contacts.length, 1);
});

test('no destructive cascade deletes a company along with its contacts', () => {
  const src = read('domain/company.js');
  assert.ok(src.includes('function archiveCompany'), 'companies are archived, not deleted');
  assert.doesNotMatch(src, /state\.contacts\s*=\s*state\.contacts\.filter\(x\s*=>\s*x\.companyId\s*!==/,
    'removing a company must never cascade into its contacts (DEC-061/055)');
});

test('legacy Contact shapes migrate to DEC-061 without losing anything', () => {
  const ctx = ctxWith();
  const legacy = [{ id: 'C1', companyId: 'CO1', name: 'Laura Martínez Ruiz', role: 'Directora', status: 'Perdido', source: 'Referido', nextAction: 'Llamar' }];
  assert.equal(ctx.migrateContactsToCurrentContract(legacy), 1);
  const ct = legacy[0];
  assert.equal(ct.firstName, 'Laura');
  assert.equal(ct.lastName, 'Martínez Ruiz');
  assert.equal(ct.status, 'Inactivo', '"Perdido" is the one legacy state that genuinely describes the person');
  // The commercial fields are Opportunity/Interaction semantics, so they are preserved rather than
  // forced onto a Contact field that no longer exists.
  assert.equal(ct._legacy.pipelineStatus, 'Perdido');
  assert.equal(ct._legacy.source, 'Referido');
  assert.equal(ct._legacy.nextAction, 'Llamar');
  assert.equal(ct.name, undefined);
  // Country/language are legacy-only under the Spain-only operating contract.
  ct.language='es';ct.country='ES';
  assert.equal(ctx.migrateContactsToCurrentContract(legacy),1);
  assert.equal(ct.language,undefined);assert.equal(ct.country,undefined);
  assert.equal(ct._legacy.language,'es');assert.equal(ct._legacy.country,'ES');
  // Running it twice must not re-split an already migrated record.
  assert.equal(ctx.migrateContactsToCurrentContract(legacy), 0);
});

test('the commercial pipeline lives on the Opportunity, not on the person', () => {
  const ctx = ctxWith();
  assert.ok(ctx.$('OPPORTUNITY_STAGE').includes('Propuesta') && ctx.$('OPPORTUNITY_STAGE').includes('Ganada'));
  assert.ok(!ctx.$('CONTACT_STATUS').includes('Propuesta'), 'pipeline states must not reappear on Contact');
  assert.ok(ctx.isOpportunityOpen({ stage: 'Diagnóstico' }));
  assert.ok(!ctx.isOpportunityOpen({ stage: 'Perdida' }));
});

test('the next follow-up belongs to the interaction that scheduled it', () => {
  const ctx = ctxWith();
  const future = new Date(Date.now() + 864e5).toISOString();
  const past = new Date(Date.now() - 864e5).toISOString();
  ctx.state.interactions.push(
    { id: 'I1', companyId: 'CO1', contactIds: [], nextFollowUpAt: past, subject: 'Vencida' },
    { id: 'I2', companyId: 'CO1', contactIds: [], nextFollowUpAt: future, subject: 'Vigente' });
  assert.equal(ctx.pendingFollowUp().subject, 'Vigente', 'only a future follow-up is pending');
  assert.doesNotMatch(read('domain/interaction.js'), /co\.nextFollowUpAt\s*=|ct\.nextFollowUpAt\s*=/,
    'the follow-up must not be copied onto Company or Contact (DEC-058)');
});

test('the company size band is derived from the canonical employee count', () => {
  const ctx = ctxWith();
  assert.equal(ctx.companySizeBand({ employeeCount: 420 }), '251–500');
  assert.equal(ctx.companySizeBand({ employeeCount: 5000 }), 'Más de 1.000');
  assert.equal(ctx.companySizeBand({}), '—', 'an unknown size reads as unknown, never as a guess');
});

test('company states come from the approved reference', () => {
  const ctx = ctxWith();
  for (const s of ['Cliente', 'Prospecto', 'Colaborador', 'Archivada']) assert.ok(ctx.$('COMPANY_STATUS').includes(s));
});

test('an Engagement created from an Opportunity references the origin instead of copying it', () => {
  const src = read('domain/opportunity.js');
  assert.match(src, /e\.opportunityId\s*=\s*o\.id/, 'the origin is stored as a reference');
  assert.doesNotMatch(src, /e\.answers\s*=\s*\{\s*\.\.\.o/, 'opportunity data must not be copied into the engagement');
});

test('the CRM pages read state and never own it', () => {
  for (const p of ['pages/crm-companies.js', 'pages/crm-contacts.js', 'pages/crm-interactions.js', 'pages/crm-opportunities.js']) {
    const src = read(p);
    assert.doesNotMatch(src, /state\.(companies|contacts|interactions|opportunities)\.push\(/,
      `${p} renders; creating records belongs to the domain module that owns them`);
  }
});

test('the two reference-governed pages declare the reference they reproduce', () => {
  assert.match(read('pages/crm-companies.js'), /'I90-00-01'/);
  assert.match(read('pages/crm-contacts.js'), /'I90-00-02'/);
});

test('Contactos reproduces the visible columns of IMG90-00-02, in order', () => {
  const src = read('pages/crm-contacts.js');
  const head = src.slice(src.indexOf('<thead>'), src.indexOf('</thead>'));
  const cols = [...head.matchAll(/<th>([^<]*)<\/th>/g)].map(m => m[1].trim()).filter(Boolean);
  assert.deepEqual(cols, ['Nombre', 'Empresa', 'Cargo', 'Email', 'Teléfono', 'Estado', 'Principal', 'Última interacción']);
});

test('Empresas reproduces the visible columns of IMG90-00-01, in order', () => {
  const src = read('pages/crm-companies.js');
  const head = src.slice(src.indexOf('<thead>'), src.indexOf('</thead>'));
  const cols = [...head.matchAll(/<th>([^<]*)<\/th>/g)].map(m => m[1].trim()).filter(Boolean);
  assert.deepEqual(cols, ['Empresa', 'Sector', 'Tamaño', 'Estado', 'Contacto principal', 'Fecha de alta', 'Acciones']);
});
test('Contactos supports all-company scope, AUNEA filters, interactions and no direct Project creation',()=>{
  const page=read('pages/crm-contacts.js'),shell=read('ui/shell.js'),domain=read('domain/contact.js');
  assert.match(page,/return companyById\(state\.selectedCompanyId\) \|\| null/);
  assert.match(page,/Todas las empresas/);
  assert.match(page,/Quitar empresa/);
  assert.match(page,/Incluir inactivos/);
  assert.match(page,/data-contact-filter-option/);
  assert.match(page,/data-contact-interaction/);
  assert.match(page,/data-contact-study/);
  assert.doesNotMatch(page,/data-contact-project|Crear proyecto/);
  assert.match(domain,/contactSelectControl\('cContactRole'/);
  assert.match(domain,/contactSelectControl\('cContactStatus'/);
  assert.match(shell,/addInteraction\(\{companyId:ct\.companyId,contactIds:\[ct\.id\]\}\)/);
});

test('AUNEA dropdowns close when focus moves outside or to another selector',()=>{
  const shell=read('ui/shell.js');
  assert.match(shell,/function closeOtherAuneaSelects/);
  assert.match(shell,/details\.aunea-select\[open\]/);
  assert.match(shell,/if\(box!==inside\)box\.open=false/);
  assert.match(shell,/e\.key==='Escape'/);
});

test('Contactos company picker is one anchored AUNEA control, not duplicated text plus selector',()=>{
  const page=read('pages/crm-contacts.js'),css=read('ui-system.css');
  assert.match(page,/contact-company-control/);
  assert.match(page,/class="aunea-select entity-picker-select"/);
  assert.doesNotMatch(page,/ep-grow"><small>Empresa<\/small><b>\$\{esc\(label\)\}<\/b><\/div>\s*<details class="aunea-select entity-picker-select"/);
  assert.match(css,/\.contact-company-control\{position:relative;flex:1/);
  assert.match(css,/\.entity-picker-select \.aunea-select-menu\{width:100%;min-width:100%;left:0;right:auto/);
});

// [AUNEA-UAT-CRM-010] END
