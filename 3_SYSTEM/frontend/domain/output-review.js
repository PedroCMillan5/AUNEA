// [AUNEA-FE-OUTPUT-REVIEW-010] START — Versioned human review
// PURPOSE: Bind human approval to the exact engine output, scenario and confirmed AS-IS/TO-BE versions.
// SOURCE: DEC-041/053/054/055; Architecture Contract v1.3 publication gate.
// INPUTS: confirmed snapshot, backend output, selected scenario and approved TO-BE.
// OUTPUTS: append-only review versions; immutable approved source records.
// SIDE_EFFECTS: Engagement history and audit; never runs an engine.
// CHANGE_RISK: HIGH.
function reviewSources(e) {
  const snap=confirmedSnapshot(e),tobe=approvedTobeForClient(e),output=e?.diagnosticOutput;
  const scenario=[output?.optimal_scenario,...(e?.scenarioResults||[])][e?.selectedScenarioIndex??0];
  if(!snap||!tobe||tobe.sourceSnapshotVersion!==snap.version||!output||!scenario) return null;
  return {snapshotVersion:snap.version,tobeVersion:tobe.version,output,scenario};
}
function reviewFingerprint(sources){return JSON.stringify(sources)}
function currentOutputReview(e){
  const sources=reviewSources(e);if(!sources)return null;
  return [...(e.outputReviews||[])].reverse().find(r=>r.fingerprint===reviewFingerprint(sources))||null;
}
function approvedOutputReview(e){const r=currentOutputReview(e);return r&&['APPROVED_FOR_CLIENT','PUBLISHED'].includes(r.status)?r:null}
function createOutputReview(e){
  const sources=reviewSources(e);if(!sources)return null;
  const existing=currentOutputReview(e);if(existing)return existing;
  const history=e.outputReviews||(e.outputReviews=[]);
  const r={id:id('REV'),version:history.length+1,status:'DRAFT',createdAt:now(),fingerprint:reviewFingerprint(sources),sources:frozenCopy(sources),includePrice:false};
  history.push(r);markDirty('Revisión de resultados creada como borrador');return r;
}
function advanceOutputReview(e,includePrice=false){
  const r=currentOutputReview(e);if(!r)return false;
  const next={DRAFT:'REVIEWED',REVIEWED:'APPROVED_FOR_CLIENT'}[r.status];if(!next)return false;
  r.status=next;r.reviewedAt=now();
  if(next==='APPROVED_FOR_CLIENT'){
    r.approvedAt=now();r.includePrice=includePrice===true;
    advanceEngagementTo(e,'Listo para resultados','resultados revisados y aprobados por el consultor');
  }
  markDirty('Revisión humana de resultados: '+next);return true;
}
// [AUNEA-FE-OUTPUT-REVIEW-010] END
