// [AUNEA-FE-RESULT-CONTEXT-368] START — single read projection for all internal results.
// PURPOSE: Deliver the current backend DiagnosticOutput and its source freshness without a second owner.
// SOURCE: Simulator CANONICAL PG10–PG15; DEC-034/050/052/055; PROJECT_RULES.md.
// INPUTS: Engagement confirmed AS-IS snapshot, engine input version, technical gate freshness.
// OUTPUTS: existing DiagnosticOutput reference or null, and existing freshness status.
// SIDE_EFFECTS: none. Never recomputes, copies or approves an engine result.
// CHANGE_RISK: HIGH.
function currentDiagnosticOutput(e){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  return snap&&e?.lastEngineSnapshotVersion===snap.version&&(typeof engineGateOutputFresh!=='function'||engineGateOutputFresh(e))?e.diagnosticOutput:null;
}
function diagnosticOutputFreshness(e){
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  if(!snap)return {status:'BLOCKED',label:'Sin snapshot confirmado',snapshotVersion:null};
  if(!e?.diagnosticOutput)return {status:'PENDING',label:'Diagnóstico pendiente',snapshotVersion:snap.version};
  if(e.lastEngineSnapshotVersion!==snap.version)return {status:'OBSOLETE',label:'Resultado obsoleto',snapshotVersion:snap.version,outputSnapshotVersion:e.lastEngineSnapshotVersion??null};
  if(typeof engineGateOutputFresh==='function'&&!engineGateOutputFresh(e))return {status:'OBSOLETE',label:'Resultado obsoleto: decisiones internas modificadas',snapshotVersion:snap.version,outputSnapshotVersion:e.lastEngineSnapshotVersion};
  return {status:'CURRENT',label:'Resultado vigente',snapshotVersion:snap.version,outputSnapshotVersion:e.lastEngineSnapshotVersion};
}
// [AUNEA-FE-RESULT-CONTEXT-368] END
