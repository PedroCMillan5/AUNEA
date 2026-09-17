// [AUNEA-FE-ENG-LIFECYCLE-010] START — Engagement lifecycle and confirmed snapshot
// PURPOSE: Own the Engagement's governed lifecycle and the confirmed AS-IS snapshot that PG09 seals.
//          The status is a stored attribute of the Engagement with validated transitions — never a
//          label inferred from what a screen happens to be showing.
// SOURCE: DEC-051 (Engagement lifecycle Preparación → Sesión 1 → Trabajo interno → Listo para
//         resultados → Sesión 2 → Cerrado); DEC-041 (one snapshot, read by every surface);
//         DEC-050 (single owner / single capture); Architecture Contract v1.2 rows P05 and PG09.
// INPUTS: state.engagements plus the Company/Contact masters they reference.
// OUTPUTS: lifecycle transitions and the immutable confirmed snapshot consumed from PG10 onwards.
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
// Existing local storage is upgraded in place; history is never discarded (DEC-055).
function migrateEngagementsToLifecycle(list = state.engagements) {
  let moved = 0;
  (list || []).forEach(e => {
    const mapped = engagementStatus(e);
    if (e.status !== mapped) { e.status = mapped; moved++; }
  });
  return moved;
}
// [AUNEA-FE-ENG-LIFECYCLE-010] END
