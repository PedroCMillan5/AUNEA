// [AUNEA-FE-ENG-LIFECYCLE-010] START — Engagement lifecycle and confirmed snapshot
// PURPOSE: Own the Engagement's governed lifecycle and the confirmed AS-IS snapshot that PG09 seals.
//          The status is a stored attribute of the Engagement with validated transitions — never a
//          label inferred from what a screen happens to be showing.
// SOURCE: DEC-051 (Engagement lifecycle Preparación → Sesión 1 → Trabajo interno → Listo para
//         resultados → Sesión 2 → Cerrado); DEC-041 (one snapshot, read by every surface);
//         DEC-050 (single owner / single capture); Architecture Contract v1.2 rows P05 and PG09.
// INPUTS: state.engagements plus the Company/Contact masters they reference.
// OUTPUTS: lifecycle transitions and the immutable confirmed snapshot consumed from PG10 onwards.
//          It is not domain/session-snapshot.js: that one is the live client-safe projection the
//          Session Display reads during the 90 minutes and is rebuilt on every render.
// SIDE_EFFECTS: state mutation and audit entries.
// CHANGE_RISK: HIGH.

// The canonical order. Position in this array is the lifecycle; nothing else defines it.
const ENGAGEMENT_LIFECYCLE = Object.freeze([
  'Preparación', 'Sesión 1', 'Trabajo interno', 'Listo para resultados', 'Sesión 2', 'Cerrado'
]);
// Statuses written before the lifecycle closed. They are mapped, not guessed at read time, so the
// stored value is always one of the six above.
const ENGAGEMENT_STATUS_LEGACY = Object.freeze({
  'En preparación': 'Preparación',
  'Borrador': 'Preparación',
  'Diagnóstico': 'Sesión 1',
  'Resultados calculados': 'Trabajo interno',
  'Convertido en proyecto': 'Cerrado'
});

function engagementStatus(e) {
  const s = e && e.status;
  if (ENGAGEMENT_LIFECYCLE.includes(s)) return s;
  return ENGAGEMENT_STATUS_LEGACY[s] || ENGAGEMENT_LIFECYCLE[0];
}
function engagementStageIndex(e) { return ENGAGEMENT_LIFECYCLE.indexOf(engagementStatus(e)); }
function nextEngagementStatus(e) {
  const i = engagementStageIndex(e);
  return (i >= 0 && i < ENGAGEMENT_LIFECYCLE.length - 1) ? ENGAGEMENT_LIFECYCLE[i + 1] : null;
}
// Forward, one step at a time. The lifecycle is linear in DEC-051 and no governed source describes a
// way back, so this refuses anything else rather than inventing a re-opening rule.
function canAdvanceEngagement(e, to) { return !!to && nextEngagementStatus(e) === to; }
function setEngagementStatus(e, to, reason = '') {
  if (!e || !canAdvanceEngagement(e, to)) return false;
  const from = engagementStatus(e);
  e.status = to;
  e.updatedAt = now();
  e.lifecycleLog = [...(e.lifecycleLog || []), { from, to, at: now(), reason }];
  markDirty(`Estudio ${e.title || e.id}: ${from} → ${to}${reason ? ` (${reason})` : ''}`);
  return true;
}
// Advance only if the engagement is exactly one step behind. Used by the places that legitimately
// move the lifecycle (opening the session, sealing the snapshot, opening Modo Resultados, deciding),
// so each of them states its own trigger instead of every caller re-implementing the check.
function advanceEngagementTo(e, to, reason = '') {
  return canAdvanceEngagement(e, to) ? setEngagementStatus(e, to, reason) : false;
}
function engagementAtLeast(e, status) {
  const want = ENGAGEMENT_LIFECYCLE.indexOf(status);
  return want >= 0 && engagementStageIndex(e) >= want;
}
// ---------------------------------------------------------------------------------------------
// Confirmed Engagement snapshot (PG09)
//
// Not to be confused with domain/session-snapshot.js: that one is the client-safe projection the
// Session Display reads live during the 90 minutes, and it is rebuilt on every render. This one is
// the sealed record of what was actually confirmed when PG09 closed. Internal work reads it, so a
// later edit to the Company or Contact master cannot silently change what the diagnosis was run on.
const ENGAGEMENT_SNAPSHOT_SCHEMA = 1;

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}
function frozenCopy(v) { return deepFreeze(JSON.parse(JSON.stringify(v ?? null))); }

// The data used at that moment, copied because it is history. Company and Contact keep their own
// live records; what is copied here is only the fields the diagnosis was built on, so the snapshot
// stays a record of the session rather than a second CRM (DEC-050).
function buildConfirmedSnapshot(e) {
  const co = companyById(e.companyId);
  const contacts = (e.contactIds || []).map(contactById).filter(Boolean);
  return {
    schemaVersion: ENGAGEMENT_SNAPSHOT_SCHEMA,
    version: (e.confirmedSnapshots || []).length + 1,
    sealedAt: now(),
    engagementId: e.id,
    stageId: 'S09',
    diagnosticMaster: { version: schema?.version || '', source: schema?.source || '' },
    company: co ? {
      id: co.id, name: co.name, sector: co.sector, country: co.country,
      employeeCount: co.employeeCount ?? null, orgType: co.orgType || '', entryChannel: co.entryChannel || ''
    } : null,
    contacts: contacts.map(c => ({
      id: c.id, name: typeof contactFullName === 'function' ? contactFullName(c) : (c.name || ''),
      role: c.role || '', email: c.email || '', phone: c.phone || ''
    })),
    priority: e.priority || '',
    contextSummary: e.contextSummary || '',
    businessAreaId: e.businessAreaId || '',
    processName: e.answers?.DF011 || e.processName || '',
    answers: { ...(e.answers || {}) },
    answerDetails: { ...(e.answerDetails || {}) },
    processSteps: activeSteps(e),
    frictions: activeFrictions(e),
    risks: [...(e.risks || [])],
    economicInputs: [...(e.economicInputs || [])],
    confirmedAsIs: true,
    asIsConfirmedAt: e.asIsConfirmedAt || now()
  };
}
// Everything except the two volatile stamps, so re-confirming an unchanged capture does not pile up
// identical versions.
function snapshotFingerprint(snap) {
  const { sealedAt, version, ...rest } = snap || {};
  try { return JSON.stringify(rest); } catch { return String(snap); }
}
// Sealing is append-only: an existing version is never rewritten, so what internal work already ran
// on stays exactly as it was (DEC-041).
function sealConfirmedSnapshot(e, reason = 'AS-IS confirmado en PG09') {
  if (!e || !e.confirmedAsIs) return null;
  const history = e.confirmedSnapshots || (e.confirmedSnapshots = []);
  const next = buildConfirmedSnapshot(e);
  const last = history[history.length - 1];
  if (last && snapshotFingerprint(last) === snapshotFingerprint(next)) return last;
  const sealed = frozenCopy(next);
  history.push(sealed);
  audit(`Snapshot confirmado v${sealed.version} sellado para ${e.title || e.id}: ${reason}`);
  // Sealing PG09 is what opens internal work. The helper is a no-op unless the engagement is exactly
  // one step behind, so a re-seal never moves the lifecycle twice.
  advanceEngagementTo(e, 'Trabajo interno', 'snapshot confirmado en PG09');
  return sealed;
}
function confirmedSnapshot(e) {
  const history = e && e.confirmedSnapshots;
  return (history && history.length) ? history[history.length - 1] : null;
}
function hasConfirmedSnapshot(e) { return !!confirmedSnapshot(e); }
// What internal work reads. Identity and everything that happens after PG09 — engine gates, outputs,
// scenarios, the project link — stay on the live engagement; everything the session confirmed comes
// from the sealed record, so a later CRM or capture edit cannot change what a diagnosis ran on.
// Before PG09 is sealed there is nothing confirmed yet and the live engagement is all there is.
function engagementOfRecord(e) {
  const snap = confirmedSnapshot(e);
  if (!snap) return e;
  return {
    ...e,
    answers: snap.answers,
    answerDetails: snap.answerDetails,
    processSteps: snap.processSteps,
    frictions: snap.frictions,
    risks: snap.risks,
    economicInputs: snap.economicInputs,
    businessAreaId: snap.businessAreaId || '',
    confirmedAsIs: true,
    confirmedSnapshotVersion: snap.version
  };
}

// Existing local storage is upgraded in place; history is never discarded (DEC-055).
function migrateEngagementsToLifecycle(list = state.engagements) {
  let moved = 0;
  (list || []).forEach(e => {
    let touched=false;
    const mapped = engagementStatus(e);
    if (e.status !== mapped) { e.status = mapped; touched=true; }
    if(e.businessAreaId===undefined){e.businessAreaId='';touched=true}
    if(touched)moved++;
  });
  return moved;
}
// [AUNEA-FE-ENG-LIFECYCLE-010] END
