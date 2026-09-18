// [AUNEA-UAT-ENG-LIFECYCLE-010] START — Engagement lifecycle contract
// PURPOSE: Hold the Engagement to the six governed states and to forward, one-step transitions, and
//          prove no surface writes a status outside them.
// SOURCE: DEC-051 (Preparación → Sesión 1 → Trabajo interno → Listo para resultados → Sesión 2 →
//         Cerrado); Architecture Contract v1.4 row P05.
// INPUTS: domain/engagement.js in an isolated vm context, plus the callers that move the lifecycle.
// OUTPUTS: pass/fail assertions.
// SIDE_EFFECTS: none.
// CHANGE_RISK: HIGH.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

let clock = 0;
function makeCtx() {
  const ctx = {
    console, state: { engagements: [], companies: [], contacts: [] }, dirty: [], audited: [],
    schema: { version: '1.2', source: 'AUNEA_DIAGNOSTIC_DATABASE_v0.9.2_DIAGNOSTIC_MASTER_V1.2.xlsx' },
    // Distinct stamps per call, so an identical capture is proven to dedupe on content and not on time.
    now: () => `2026-09-17T09:00:${String(clock++).padStart(2, '0')}.000Z`,
    markDirty(reason) { ctx.dirty.push(reason); },
    audit(msg) { ctx.audited.push(msg); },
    companyById: id => ctx.state.companies.find(c => c.id === id) || null,
    contactById: id => ctx.state.contacts.find(c => c.id === id) || null,
    contactFullName: c => [c.firstName, c.lastName].filter(Boolean).join(' '),
    activeSteps: e => (e.processSteps || []).filter(s => s.status !== 'SUPERSEDED'),
    activeFrictions: e => (e.frictions || []).filter(f => f.status !== 'SUPERSEDED')
  };
  vm.createContext(ctx);
  vm.runInContext(read('domain/engagement.js'), ctx);
  ctx.$ = expr => vm.runInContext(expr, ctx);
  return ctx;
}

test('the lifecycle is exactly the six governed states, in order', () => {
  const ctx = makeCtx();
  // Arrays cross the vm realm boundary, so compare by value rather than by reference identity.
  assert.equal(ctx.$('ENGAGEMENT_LIFECYCLE.join("|")'),
    'Preparación|Sesión 1|Trabajo interno|Listo para resultados|Sesión 2|Cerrado');
  assert.ok(Object.isFrozen(ctx.$('ENGAGEMENT_LIFECYCLE')));
});

test('a transition is only ever one step forward', () => {
  const ctx = makeCtx();
  const e = { id: 'E1', title: 'Estudio', status: 'Preparación' };
  assert.equal(ctx.setEngagementStatus(e, 'Trabajo interno'), false, 'no skipping states');
  assert.equal(e.status, 'Preparación');
  assert.equal(ctx.setEngagementStatus(e, 'Sesión 1'), true);
  assert.equal(e.status, 'Sesión 1');
  assert.equal(ctx.setEngagementStatus(e, 'Preparación'), false, 'no ungoverned way back');
  assert.equal(ctx.setEngagementStatus(e, 'Ganado'), false, 'no state outside the contract');
  assert.equal(e.status, 'Sesión 1');
});

test('Cerrado is terminal and every step is recorded', () => {
  const ctx = makeCtx();
  const e = { id: 'E1', title: 'Estudio', status: 'Preparación' };
  for (const to of ['Sesión 1', 'Trabajo interno', 'Listo para resultados', 'Sesión 2', 'Cerrado']) {
    assert.equal(ctx.setEngagementStatus(e, to, 'test'), true, to);
  }
  assert.equal(ctx.nextEngagementStatus(e), null);
  assert.equal(ctx.setEngagementStatus(e, 'Sesión 2'), false);
  assert.equal(e.lifecycleLog.map(x => x.to).join('|'),
    'Sesión 1|Trabajo interno|Listo para resultados|Sesión 2|Cerrado');
  assert.equal(e.lifecycleLog[0].from, 'Preparación');
});

test('advanceEngagementTo is a no-op rather than an error when the step does not apply', () => {
  const ctx = makeCtx();
  const e = { id: 'E1', status: 'Preparación' };
  assert.equal(ctx.advanceEngagementTo(e, 'Sesión 2', 'x'), false);
  assert.equal(e.status, 'Preparación');
  assert.equal(ctx.advanceEngagementTo(e, 'Sesión 1', 'x'), true);
  assert.equal(ctx.engagementAtLeast(e, 'Sesión 1'), true);
  assert.equal(ctx.engagementAtLeast(e, 'Trabajo interno'), false);
});

test('statuses written before the contract closed are migrated, not reinterpreted on every read', () => {
  const ctx = makeCtx();
  const list = [{ status: 'En preparación' }, { status: 'Resultados calculados' },
    { status: 'Convertido en proyecto' }, { status: 'Sesión 2' }, {}];
  assert.equal(ctx.migrateEngagementsToLifecycle(list), 5);
  assert.deepEqual(list.map(x => x.status),
    ['Preparación', 'Trabajo interno', 'Cerrado', 'Sesión 2', 'Preparación']);
  assert.equal(ctx.migrateEngagementsToLifecycle(list), 0, 'migration is idempotent');
});

test('no surface writes an Engagement status outside the lifecycle', () => {
  const sources = ['core/state.js', 'ui/shell.js', 'services/engine-adapter.js', 'pages/results.js', 'uat/fixtures.js'];
  for (const f of sources) {
    const src = read(f);
    assert.doesNotMatch(src, /e\.status\s*=\s*'(?!.*ENGAGEMENT)/,
      `${f} must move the lifecycle through setEngagementStatus/advanceEngagementTo, not by assignment`);
    assert.doesNotMatch(src, /'Convertido en proyecto'|'Resultados calculados'/, `${f} must not carry a retired status`);
  }
  // Creating the Project is a decision, and the decision is what closes the engagement.
  assert.match(read('domain/project.js'), /advanceEngagementTo\(e,'Cerrado','decisión de implementación'\)/);
  // The first capture of the session is what starts Sesión 1 — not a page being open.
  assert.match(read('core/state.js'), /advanceEngagementTo\(e,'Sesión 1','primera captura de la sesión'\)/);
  // Estudios drives the lifecycle by hand and can only ever offer the next governed state.
  assert.match(read('ui/shell.js'), /data-advance-eng="\$\{e\.id\}"/);
  assert.match(read('core/state.js'), /setEngagementStatus\(e,nextEngagementStatus\(e\)/);
});

test('migration runs on boot so stored engagements reach the contract', () => {
  assert.match(read('core/state.js'), /migrateEngagementsToLifecycle\(state\.engagements\)/);
});
// --- C03: the confirmed snapshot PG09 seals -----------------------------------------------------

function sealedFixture() {
  const ctx = makeCtx();
  ctx.state.companies.push({ id: 'CO1', name: 'Nordia Retail', sector: 'CNAE25-G', country: 'ES', employeeCount: 420, orgType: 'Empresa privada', entryChannel: 'Inbound' });
  ctx.state.contacts.push({ id: 'CT1', companyId: 'CO1', firstName: 'Laura', lastName: 'Gómez', role: 'Directora de Operaciones', email: 'laura@nordia.invalid', phone: '+34 612 345 678' });
  const e = {
    id: 'E1', title: 'Estudio', status: 'Sesión 1', companyId: 'CO1', contactIds: ['CT1'], businessAreaId: 'D04',
    priority: 'Alta', contextSummary: 'Crecimiento',
    answers: { DF011: 'Gestión de pedidos online', DF093: 'YES' }, answerDetails: {},
    processSteps: [{ id: 'S1', status: 'ACTIVE', step_name: 'Recepción', active_time: 3 },
                   { id: 'S0', status: 'SUPERSEDED', step_name: 'Paso retirado' }],
    frictions: [{ id: 'F1', status: 'ACTIVE', friction_type: 'P03' }],
    risks: [{ id: 'R1' }], economicInputs: [{ deduplication_key: 'E1' }],
    confirmedAsIs: true, asIsConfirmedAt: '2026-09-17T08:00:00.000Z'
  };
  ctx.state.engagements.push(e);
  return { ctx, e };
}

test('C03 sealing PG09 records what was confirmed, versioned, and opens internal work', () => {
  const { ctx, e } = sealedFixture();
  const snap = ctx.sealConfirmedSnapshot(e, 'test');
  assert.equal(snap.version, 1);
  assert.equal(snap.schemaVersion, 2);
  assert.equal(snap.stageId, 'S09');
  assert.equal(snap.company.name, 'Nordia Retail');
  assert.equal(snap.contacts[0].role, 'Directora de Operaciones');
  assert.equal(snap.diagnosticMaster.version, '1.2', 'the snapshot names the Diagnostic Master it was captured under');
  assert.equal(snap.processSteps.length, 1, 'superseded steps are not part of the confirmed AS-IS');
  assert.equal(snap.priority, 'Alta');
  assert.equal(snap.businessAreaId, 'D04');
  // Sealing PG09 is what moves the engagement into internal work.
  assert.equal(e.status, 'Trabajo interno');
});

test('C03 the snapshot is immutable and unaffected by later master or capture edits', () => {
  const { ctx, e } = sealedFixture();
  const snap = ctx.sealConfirmedSnapshot(e, 'test');
  assert.ok(Object.isFrozen(snap) && Object.isFrozen(snap.company) && Object.isFrozen(snap.processSteps[0]));
  assert.throws(() => { 'use strict'; snap.company.name = 'Otra'; }, TypeError);
  // The Company master moves on; the sealed record does not.
  ctx.state.companies[0].name = 'Nordia Retail Group';
  ctx.state.contacts[0].role = 'CEO';
  e.answers.DF011 = 'Otro proceso';
  e.processSteps.push({ id: 'S2', status: 'ACTIVE', step_name: 'Paso posterior' });
  const still = ctx.confirmedSnapshot(e);
  assert.equal(still.company.name, 'Nordia Retail');
  assert.equal(still.contacts[0].role, 'Directora de Operaciones');
  assert.equal(still.answers.DF011, 'Gestión de pedidos online');
  assert.equal(still.processSteps.length, 1);
});

test('C03 re-sealing appends a version only when the capture actually changed', () => {
  const { ctx, e } = sealedFixture();
  const v1 = ctx.sealConfirmedSnapshot(e, 'primera');
  const same = ctx.sealConfirmedSnapshot(e, 'sin cambios');
  assert.equal(same.version, 1, 'an unchanged re-confirmation does not pile up versions');
  assert.equal(e.confirmedSnapshots.length, 1);
  e.processSteps.push({ id: 'S2', status: 'ACTIVE', step_name: 'Validación de stock' });
  const v2 = ctx.sealConfirmedSnapshot(e, 'tras editar el mapa');
  assert.equal(v2.version, 2);
  assert.equal(e.confirmedSnapshots.length, 2);
  assert.equal(v1.processSteps.length, 1, 'the earlier version is never rewritten');
  assert.equal(ctx.confirmedSnapshot(e).version, 2, 'the latest sealed version is the one of record');
  assert.equal(e.status, 'Trabajo interno', 're-sealing does not move the lifecycle twice');
});

test('C03 nothing is sealed until the AS-IS is actually confirmed', () => {
  const { ctx, e } = sealedFixture();
  e.confirmedAsIs = false;
  assert.equal(ctx.sealConfirmedSnapshot(e, 'test'), null);
  assert.equal(ctx.hasConfirmedSnapshot(e), false);
  assert.equal(ctx.engagementOfRecord(e), e, 'before PG09 the live engagement is all there is');
});

test('C03 internal work reads the sealed capture but keeps the live engagement identity', () => {
  const { ctx, e } = sealedFixture();
  ctx.sealConfirmedSnapshot(e, 'test');
  e.answers.DF011 = 'Editado después';
  e.diagnosticOutput = { recommendation: {} };
  const record = ctx.engagementOfRecord(e);
  assert.equal(record.id, 'E1');
  assert.equal(record.answers.DF011, 'Gestión de pedidos online', 'the engines run on the confirmed capture');
  assert.ok(record.diagnosticOutput, 'outputs produced after PG09 stay on the live engagement');
  assert.equal(record.confirmedSnapshotVersion, 1);
});

test('C03 the confirmed snapshot is a different thing from the Session Display projection', () => {
  const sessionSnapshot = read('domain/session-snapshot.js');
  const engagement = read('domain/engagement.js');
  assert.doesNotMatch(sessionSnapshot, /confirmedSnapshots|sealConfirmedSnapshot/,
    'the client-safe projection must not become the historic record');
  assert.match(engagement, /domain\/session-snapshot\.js/, 'the historic record states the distinction');
  // Confirming the AS-IS is what seals it, and the engines consume it.
  assert.match(read('domain/process-lifecycle.js'), /sealConfirmedSnapshot\(e,/);
  assert.match(read('services/engine-adapter.js'), /engagementOfRecord\(engagement\)/);
});
// [AUNEA-UAT-ENG-LIFECYCLE-010] END
