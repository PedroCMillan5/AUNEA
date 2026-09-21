// [AUNEA-FE-SESSION-SNAPSHOT-010] START — Client-safe projection of the Engagement snapshot
// PURPOSE: Build the only thing the Session Display is ever given. What the client must not see is not
//          hidden with CSS — it is never put in the projection, so it cannot leak through a stylesheet
//          change, a screenshot or the browser devtools.
// SOURCE: DEC-048 (PG01–PG03 are not shared); DEC-049 (one persistent AS-IS enriched by confirmed
//         frictions, risks and impact; no client dashboards, no scoring, no internal categories, no
//         provenance, no final economics, no business case, no ROI/payback, no TO-BE, no pricing, no
//         recommendation); DEC-041/050 (both surfaces read one snapshot, never two copies);
//         90MIN UI SPEC §§3.2, 3.3, 5.
// INPUTS: the current engagement and its stage.
// OUTPUTS: a plain, serialisable, client-safe object plus the key it is published under.
// SIDE_EFFECTS: writes the projection to localStorage so a second window can read it.
// CHANGE_RISK: CRITICAL.

const SESSION_DISPLAY_KEY = 'aunea_session_display_v1';

// Which client state each stage is in. The mapping is the UI spec's, not this module's.
const SESSION_STATE_BY_STAGE = {
  S01: 'C90-00', S02: 'C90-00', S03: 'C90-00',
  S04: 'C90-01', S05: 'C90-03', S06: 'C90-03', S07: 'C90-03', S08: 'C90-03', S09: 'C90-04'
};
// Which confirmed layers are visible over the canvas by the time each stage is reached. A layer never
// disappears once the client has seen it: PG08 keeps everything PG05–PG07 added (DEC-049).
const SESSION_LAYERS_BY_STAGE = {
  S04: [], S05: ['frictions'], S06: ['frictions', 'risks'],
  S07: ['frictions', 'risks', 'impacts'], S08: ['frictions', 'risks', 'impacts'],
  S09: ['frictions', 'risks', 'impacts']
};

function sessionStateFor(stageId) { return SESSION_STATE_BY_STAGE[stageId] || 'C90-00'; }
function sessionLayersFor(stageId) { return SESSION_LAYERS_BY_STAGE[stageId] || []; }

// Business language only. No Field_ID, no Pain_ID, no option-set code, no evidence class.
function clientStep(s, index) {
  return {
    n: index + 1,
    name: s.step_name || `Paso ${index + 1}`,
    actor: labelFrom('OS_ACTOR_ROLE', s.actor) || '',
    tool: labelFrom('OS_TOOL_CATEGORY', s.tool) || '',
    type: labelFrom('OS_STEP_TYPE', s.step_type) || '',
    activeMin: Number(s.active_time) || 0,
    waitMin: Number(s.wait_time) || 0,
    isDecision: String(s.step_type || '').toUpperCase().includes('DECISION'),
    id: s.id
  };
}
function clientFriction(f) {
  return {
    id: f.id,
    // The observable signal is what the client described. Pain_ID is derived by AUNEA and stays internal.
    label: labelFrom('OS_FRICTION_TYPE', f.friction_type) || 'Fricción',
    signal: f.observable_signal || '',
    steps: normalizeArray(f.affected_steps)
  };
}
function clientRisk(r, i) {
  return {
    id: r.id || `R${i}`,
    // Business language only: likelihood, impact scores, reversibility codes and the internal category
    // are Console material and are deliberately absent from this object (DEC-049).
    label: labelFrom('OS_RISK_CATEGORY', r.category) || 'Riesgo',
    description: r.description || '',
    hasControls: r.controls_present === true
  };
}
function clientImpact(x, i) {
  const active = Number(x.annual_active_hours) || 0, wait = Number(x.annual_wait_hours) || 0;
  return {
    id: x.deduplication_key || `E${i}`,
    // The mechanism and where it happens, never the money: no rate, no direct loss, no tool spend, no
    // realized cash saving, no totals, no business case (DEC-049).
    label: labelFrom('REF_ECON_DRIVER', x.driver_id) || 'Impacto',
    activeHours: active,
    waitHours: wait,
    // Waiting is reported separately and never presented as active labour (DEC-032/033).
    note: wait > 0 && active === 0 ? 'Tiempo de espera, no trabajo activo' : ''
  };
}

function buildSessionSnapshot(e) {
  if (!e) return { state: 'C90-00', shared: false, steps: [], frictions: [], risks: [], impacts: [] };
  const stageId = e.stageId || 'S01';
  const st = sessionStateFor(stageId);
  const layers = sessionLayersFor(stageId);
  const shared = st !== 'C90-00';
  // Before PG04 the simulator is not shared at all, so nothing about the process is published — not
  // even the step list. An unshared state that still carried the map would be one stylesheet away
  // from being visible (DEC-048).
  if (!shared) return { state: st, shared: false, stageId, steps: [], frictions: [], risks: [], impacts: [], publishedAt: now() };
  const steps = activeSteps(e).map(clientStep);
  const company = companyById(e.companyId);
  const startBoundary=valuePresent(e.answers?.DF014)?String(e.answers.DF014):'';
  const endBoundary=valuePresent(e.answers?.DF015)?String(e.answers.DF015):'';
  const snap = {
    state: st,
    shared,
    stageId,
    // Identity the client already knows; nothing commercial and no internal metadata.
    company: company ? company.name : '',
    process: e.answers?.DF011 || e.processName || '',
    boundaries:{start:startBoundary,end:endBoundary},
    steps,
    frictions: layers.includes('frictions') ? activeFrictions(e).map(clientFriction) : [],
    risks: layers.includes('risks') ? (e.risks || []).map(clientRisk) : [],
    impacts: layers.includes('impacts') ? (e.economicInputs || []).map(clientImpact) : [],
    confirmedAsIs: !!e.confirmedAsIs,
    publishedAt: now()
  };
  if (st === 'C90-04') {
    // The closing panel: what was validated and what was agreed, never DF100 (internal notes) and never
    // any derived result from the phase that follows.
    snap.closure = {
      steps: steps.length,
      frictions: activeFrictions(e).length,
      risks: (e.risks || []).length,
      impacts: (e.economicInputs || []).length,
      nextStep: e.answers?.DF098 || '',
      pending: (typeof engagementCompletion === 'function' ? engagementCompletion(e).missing.length : 0)
    };
  }
  return snap;
}

// Publishing is what makes the second window update. A failed write must never look like success
// (UI Spec §3.3), so this reports the outcome instead of swallowing it.
function publishSessionSnapshot(e) {
  try {
    localStorage.setItem(SESSION_DISPLAY_KEY, JSON.stringify(buildSessionSnapshot(e)));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}
function readSessionSnapshot() {
  try {
    const raw = localStorage.getItem(SESSION_DISPLAY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
// [AUNEA-FE-SESSION-SNAPSHOT-010] END
