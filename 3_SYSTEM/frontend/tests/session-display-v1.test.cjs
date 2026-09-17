// [AUNEA-UAT-SESSION-DISPLAY-010] START — Session Display contract and leak prohibitions
// PURPOSE: Prove the shared surface can only ever show what DEC-048/049 allow. The strong guarantee is
//          structural: the projection is the only thing the display is given, so anything absent from it
//          cannot be revealed by a stylesheet change, a screenshot or devtools.
// SOURCE: DEC-048 (PG01–PG03 are not shared); DEC-049 (one persistent AS-IS, confirmed layers, no
//         scoring, no internal categories, no provenance, no final economics, no business case, no
//         ROI/payback, no TO-BE, no pricing, no recommendation); 90MIN UI SPEC §§3.2, 3.3, 5.
// INPUTS: domain/session-snapshot.js and pages/session-display.js in an isolated vm context.
// OUTPUTS: pass/fail assertions.
// SIDE_EFFECTS: none (read-only, in-memory context).
// CHANGE_RISK: CRITICAL.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function makeCtx(engagement) {
  const store = {};
  const ctx = {
    console,
    state: { companies: [{ id: 'CO1', name: 'Nordia Retail' }] },
    schema: { option_sets: {} },
    localStorage: { setItem: (k, v) => { store[k] = v; }, getItem: k => (k in store ? store[k] : null) },
    now: () => '2026-09-16T10:00:00.000Z',
    esc: v => String(v ?? ''), attr: v => String(v ?? ''),
    formatDateEs: v => String(v || '—'),
    normalizeArray: v => Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]),
    labelFrom: (set, v) => ({ OS_ACTOR_ROLE: { OPERATIONS: 'Operaciones' }, OS_TOOL_CATEGORY: { ERP: 'ERP' },
      OS_STEP_TYPE: { ST02: 'Validación', DECISION: 'Decisión' }, OS_FRICTION_TYPE: { P03: 'Reentrada manual' },
      OS_RISK_CATEGORY: { COMPLIANCE: 'Cumplimiento' }, REF_ECON_DRIVER: { D1: 'Reentrada de datos' } }[set] || {})[v] || v || '',
    activeSteps: e => (e.processSteps || []).filter(s => s.status !== 'SUPERSEDED'),
    activeFrictions: e => (e.frictions || []).filter(f => f.status !== 'SUPERSEDED'),
    companyById: id => ctx.state.companies.find(c => c.id === id) || null,
    engagementCompletion: () => ({ missing: [] }),
    insCard: (t2, b) => `<div class="ins-card">${t2}${b}</div>`,
    workspace: (m, i) => `<div class="workspace">${m}${i}</div>`,
    kvRows: rows => rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join(''),
    toast: () => {}, currentEng: () => engagement,
    document: { getElementById: () => null, body: { classList: { add: () => {} } } },
    window: { addEventListener: () => {}, open: () => null },
    location: { pathname: '/index.html' }
  };
  vm.createContext(ctx);
  vm.runInContext(read('domain/session-snapshot.js'), ctx);
  vm.runInContext(read('pages/session-display.js'), ctx);
  ctx.$ = expr => vm.runInContext(expr, ctx);
  return ctx;
}

// A fully worked engagement carrying everything the client must never see.
function fullEngagement(stageId) {
  return {
    id: 'E1', companyId: 'CO1', stageId,
    answers: { DF011: 'Gestión de pedidos online', DF098: 'Revisar con dirección — Laura — 22/09/2026', DF100: 'NOTA INTERNA CONFIDENCIAL' },
    processSteps: [
      { id: 'S1', status: 'ACTIVE', step_name: 'Recepción del pedido', actor: 'OPERATIONS', tool: 'ERP', step_type: 'ST02', active_time: 3, wait_time: 0 },
      { id: 'S2', status: 'ACTIVE', step_name: 'Validación de stock', actor: 'OPERATIONS', tool: 'ERP', step_type: 'ST02', active_time: 5, wait_time: 33 }
    ],
    frictions: [{ id: 'F1', status: 'ACTIVE', friction_type: 'P03', observable_signal: 'Se reintroduce cada pedido', affected_steps: ['S2'], derived_pain_id: 'P03', evidence_type: 'EV02' }],
    risks: [{ id: 'R1', category: 'COMPLIANCE', description: 'Aprobación manual sin traza', likelihood_1_5: 4, impact_1_5: 5, reversibility: 'HARD', controls_present: false, residual_level: 'R3' }],
    economicInputs: [{ deduplication_key: 'E1', driver_id: 'D1', annual_active_hours: 120, annual_wait_hours: 400, capacity_cost_rate_eur_hour: 32, direct_loss_eur_annual: 18000, current_tool_cost_eur_annual: 4200, realized_cash_saving_eur_annual: 9000, evidence_type: 'EV02' }],
    confirmedAsIs: true,
    diagnosticOutput: { recommendation: { product: 'AUNEA System N3', one_off_eur: 24000, roi_months: 7 } }
  };
}

test('PG01–PG03 share nothing: no substitute client screen exists', () => {
  for (const s of ['S01', 'S02', 'S03']) {
    const ctx = makeCtx(fullEngagement(s));
    const snap = ctx.buildSessionSnapshot(fullEngagement(s));
    assert.equal(snap.state, 'C90-00');
    assert.equal(snap.shared, false);
    assert.equal(snap.steps.length, 0, 'nothing about the process is published before PG04');
    assert.equal(snap.frictions.length + snap.risks.length + snap.impacts.length, 0);
  }
});

test('the confirmed layers appear in the order the decisions state, and never disappear again', () => {
  const layer = s => {
    const ctx = makeCtx(fullEngagement(s));
    const snap = ctx.buildSessionSnapshot(fullEngagement(s));
    return { st: snap.state, fr: snap.frictions.length, ri: snap.risks.length, im: snap.impacts.length };
  };
  assert.deepEqual(layer('S04'), { st: 'C90-01', fr: 0, ri: 0, im: 0 }, 'PG04 builds the map only');
  assert.deepEqual(layer('S05'), { st: 'C90-03', fr: 1, ri: 0, im: 0 }, 'PG05 adds frictions');
  assert.deepEqual(layer('S06'), { st: 'C90-03', fr: 1, ri: 1, im: 0 }, 'PG06 adds risks');
  assert.deepEqual(layer('S07'), { st: 'C90-03', fr: 1, ri: 1, im: 1 }, 'PG07 adds impact');
  assert.deepEqual(layer('S08'), { st: 'C90-03', fr: 1, ri: 1, im: 1 }, 'PG08 keeps every layer while target is captured privately');
  assert.deepEqual(layer('S09'), { st: 'C90-04', fr: 1, ri: 1, im: 1 }, 'PG09 validates the enriched AS-IS');
});

test('nothing DEC-049 prohibits is present anywhere in the published projection', () => {
  const ctx = makeCtx(fullEngagement('S09'));
  const snap = ctx.buildSessionSnapshot(fullEngagement('S09'));
  const json = JSON.stringify(snap);
  // Structural, not cosmetic: these values are absent from the object the display receives.
  const forbidden = {
    'internal note (DF100)': 'NOTA INTERNA CONFIDENCIAL',
    'derived Pain_ID': 'derived_pain_id',
    'risk likelihood score': 'likelihood',
    'risk impact score': 'impact_1_5',
    'residual risk level': 'residual_level',
    'internal risk category code': 'COMPLIANCE',
    'reversibility code': 'HARD',
    'evidence class': 'evidence_type',
    'cost rate': 'capacity_cost_rate',
    'direct loss': 'direct_loss',
    'tool spend': 'current_tool_cost',
    'realized cash saving': 'realized_cash_saving',
    'recommendation': 'recommendation',
    'pricing': 'one_off_eur',
    'ROI / payback': 'roi_months'
  };
  for (const [what, needle] of Object.entries(forbidden)) {
    assert.ok(!json.includes(needle), `${what} must never reach the client surface (found "${needle}")`);
  }
  // Field_IDs must not leak either, other than the agreed next step which DF098 legitimately carries.
  assert.ok(!/\bDF0(?!98)\d\d\b/.test(json), 'no Field_ID may appear in the client projection');
});

test('what the client does see is the business language of their own process', () => {
  const ctx = makeCtx(fullEngagement('S07'));
  const snap = ctx.buildSessionSnapshot(fullEngagement('S07'));
  assert.equal(snap.steps[1].name, 'Validación de stock');
  assert.equal(snap.steps[1].actor, 'Operaciones', 'roles are resolved to their Spanish label, never a code');
  assert.equal(snap.frictions[0].label, 'Reentrada manual');
  assert.equal(snap.risks[0].label, 'Cumplimiento');
  assert.equal(snap.risks[0].description, 'Aprobación manual sin traza');
  assert.equal(snap.impacts[0].label, 'Reentrada de datos');
});

test('waiting time is reported separately and never as active labour', () => {
  const ctx = makeCtx(fullEngagement('S07'));
  const snap = ctx.buildSessionSnapshot(fullEngagement('S07'));
  assert.equal(snap.steps[1].waitMin, 33);
  assert.equal(snap.steps[1].activeMin, 5, 'wait is not folded into active time');
  assert.equal(snap.impacts[0].activeHours, 120);
  assert.equal(snap.impacts[0].waitHours, 400);
});

test('the closing state carries the validation summary but not the internal note', () => {
  const ctx = makeCtx(fullEngagement('S09'));
  const snap = ctx.buildSessionSnapshot(fullEngagement('S09'));
  assert.equal(snap.state, 'C90-04');
  assert.equal(snap.closure.steps, 2);
  assert.equal(snap.closure.frictions, 1);
  assert.match(snap.closure.nextStep, /Revisar con dirección/);
  assert.ok(!JSON.stringify(snap.closure).includes('NOTA INTERNA'), 'DF100 never reaches the client (Architecture Contract PG09)');
});

test('a failed publish reports the failure instead of looking like success', () => {
  const ctx = makeCtx(fullEngagement('S05'));
  ctx.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
  const res = ctx.publishSessionSnapshot(fullEngagement('S05'));
  assert.equal(res.ok, false, 'UI Spec §3.3: a sync failure must never appear as a success');
  assert.match(res.error, /QuotaExceeded/);
});

test('the display reads only the published projection, never the engagement', () => {
  const src = read('pages/session-display.js');
  assert.doesNotMatch(src.slice(0,src.indexOf('// C06 · Modo Resultados')), /currentEng\(\)(?!\s*\))/, 'the shared surface must not reach into the engagement directly');
  assert.match(src, /readSessionSnapshot\(\)/);
  // openSessionDisplay runs in the Console, so it may publish; that is the one permitted use.
  assert.match(src, /function openSessionDisplay/);
});

test('the projection is republished on navigation, not only on data change', () => {
  // Moving between stages changes what the client should see but does not mark the engagement dirty,
  // so autosave alone would leave the shared window frozen on the stage it was opened at.
  const stateJs = read('core/state.js');
  assert.match(stateJs, /function render\(\)\{[\s\S]*publishSessionSnapshot\(currentEng\(\)\)/,
    'render must republish the projection');
});

test('the shared window renders no console chrome', () => {
  const css = read('styles.css');
  assert.match(css, /body\.session-display \.sidebar,body\.session-display \.topbar\{display:none\}/);
});
// [AUNEA-UAT-SESSION-DISPLAY-010] END
