// [AUNEA-UAT-ENG-LIFECYCLE-010] START — Engagement lifecycle contract
// PURPOSE: Hold the Engagement to the six governed states and to forward, one-step transitions, and
//          prove no surface writes a status outside them.
// SOURCE: DEC-051 (Preparación → Sesión 1 → Trabajo interno → Listo para resultados → Sesión 2 →
//         Cerrado); Architecture Contract v1.2 row P05.
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

function makeCtx() {
  const ctx = {
    console, state: { engagements: [] }, dirty: [],
    now: () => '2026-09-17T09:00:00.000Z',
    markDirty(reason) { ctx.dirty.push(reason); }
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
  assert.equal(ctx.migrateEngagementsToLifecycle(list), 4);
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
  assert.match(read('core/state.js'), /advanceEngagementTo\(e,'Cerrado','decisión de implementación'\)/);
  // The first capture of the session is what starts Sesión 1 — not a page being open.
  assert.match(read('core/state.js'), /advanceEngagementTo\(e,'Sesión 1','primera captura de la sesión'\)/);
  // Estudios drives the lifecycle by hand and can only ever offer the next governed state.
  assert.match(read('ui/shell.js'), /data-advance-eng="\$\{e\.id\}"/);
  assert.match(read('core/state.js'), /setEngagementStatus\(e,nextEngagementStatus\(e\)/);
});

test('migration runs on boot so stored engagements reach the contract', () => {
  assert.match(read('core/state.js'), /migrateEngagementsToLifecycle\(state\.engagements\)/);
});
// [AUNEA-UAT-ENG-LIFECYCLE-010] END
