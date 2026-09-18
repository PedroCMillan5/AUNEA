// [AUNEA-UAT-CRM-010] START — CRM contracts: Company, Contact, Interaction, Opportunity
// PURPOSE: Hold the four CRM domains to the decisions that closed them — the DEC-057 contact schema,
//          principal as a Company-owned relation, a real delete guarded by referential integrity,
//          last interaction derived rather than stored, and the pipeline living on the case.
// SOURCE: DEC-007/042/050/051/055/057/058; references IMG90-00-01 and IMG90-00-02 under DEC-056;
//         Architecture Contract v1.4 rows P01–P04.
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

test('the Contact schema is exactly what DEC-057 closes', () => {
  const src = read('domain/contact.js');
  for (const f of ['firstName', 'lastName', 'role', 'email', 'phone', 'language', 'country', 'status', 'notes', 'companyId']) {
    assert.ok(src.includes(f), `Contact must carry ${f}`);
  }
  const ctx = ctxWith();
  assert.deepEqual([...ctx.$('CONTACT_STATUS')], ['Activo', 'Pendiente', 'Inactivo'],
    'Contact status is operational, not the commercial pipeline');
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

test('deleting a contact is blocked while history would be destroyed', () => {
  const ctx = ctxWith();
  ctx.state.companies.push({ id: 'CO1', name: 'Nordia', primaryContactId: 'C1' });
  ctx.state.contacts.push({ id: 'C1', companyId: 'CO1', firstName: 'Laura' });
  ctx.state.engagements.push({ id: 'E1', companyId: 'CO1', contactIds: ['C1'], title: 'Diagnóstico' });
  assert.ok(ctx.contactDeletionBlockers('C1').length, 'an engagement snapshot must block the delete');
  assert.equal(ctx.deleteContact('C1'), false);
  assert.ok(ctx.contactById('C1'), 'the contact survives');
});

test('deleting a contact with no dependencies is a real delete and releases the relation', () => {
  const ctx = ctxWith();
  ctx.state.companies.push({ id: 'CO1', name: 'Nordia', primaryContactId: 'C1' });
  ctx.state.contacts.push({ id: 'C1', companyId: 'CO1', firstName: 'Laura' });
  // Arrays built inside the vm realm are never reference-equal to one built here, so assert length.
  assert.equal(ctx.contactDeletionBlockers('C1').length, 0);
  assert.equal(ctx.deleteContact('C1'), true);
  assert.equal(ctx.contactById('C1'), null, 'DEC-057 makes this a real delete, not an archive');
  assert.equal(ctx.companyById('CO1').primaryContactId, null, 'the company no longer points at a missing contact');
});

test('no destructive cascade deletes a company along with its contacts', () => {
  const src = read('domain/company.js');
  assert.ok(src.includes('function archiveCompany'), 'companies are archived, not deleted');
  assert.doesNotMatch(src, /state\.contacts\s*=\s*state\.contacts\.filter\(x\s*=>\s*x\.companyId\s*!==/,
    'removing a company must never cascade into its contacts (DEC-057/055)');
});

test('the pre-DEC-057 contact shape migrates without losing anything', () => {
  const ctx = ctxWith();
  const legacy = [{ id: 'C1', companyId: 'CO1', name: 'Laura Martínez Ruiz', role: 'Directora', status: 'Perdido', source: 'Referido', nextAction: 'Llamar' }];
  assert.equal(ctx.migrateContactsToDec057(legacy), 1);
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
  // Running it twice must not re-split an already migrated record.
  assert.equal(ctx.migrateContactsToDec057(legacy), 0);
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
  assert.deepEqual(cols, ['Nombre', 'Cargo', 'Email', 'Teléfono', 'Estado', 'Principal', 'Última interacción']);
});

test('Empresas reproduces the visible columns of IMG90-00-01, in order', () => {
  const src = read('pages/crm-companies.js');
  const head = src.slice(src.indexOf('<thead>'), src.indexOf('</thead>'));
  const cols = [...head.matchAll(/<th>([^<]*)<\/th>/g)].map(m => m[1].trim()).filter(Boolean);
  assert.deepEqual(cols, ['Empresa', 'Sector', 'Tamaño', 'Estado', 'Contacto principal', 'Fecha de alta', 'Acciones']);
});
// [AUNEA-UAT-CRM-010] END
