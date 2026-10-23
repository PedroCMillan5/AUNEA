// [AUNEA-UAT-WORKFLOW-READINESS-153] START — Internal PG10–PG15/read-only publication navigation
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
const context={
  confirmedSnapshot:e=>e.snapshot,
  asisAnalysisResult:()=>null,
  latestTobe:e=>e.tobeProposals?.at(-1)||null,
  currentOutputReview:e=>e.review||null,
  approvedOutputReview:e=>e.review?.status==='APPROVED_FOR_CLIENT'?e.review:null,
  esc:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
};
vm.createContext(context);
vm.runInContext(source,context);
const sample=()=>({confirmedAsIs:true,snapshot:{version:2},lastEngineSnapshotVersion:2,diagnosticOutput:null,tobeProposals:[],scenarioResults:[]});
test('no confirmed PG09 snapshot means no internal readiness or client mode',()=>{
  const e=sample();e.confirmedAsIs=false;
  assert.equal(context.workbenchContinuityModel(e).length,0);
  assert.doesNotMatch(context.workbenchContinuityHtml(e),/data-page="modoresultados"/);
});
test('a confirmed AS-IS can be analysed with official gates still unresolved',()=>{
  const e=sample(),before=JSON.stringify(e);
  const phases=context.workbenchContinuityModel(e);
  assert.equal(phases.length,6);
  assert.match(phases[0].status,/Análisis disponible/);
  assert.match(context.workbenchContinuityHtml(e),/Sin paquete aprobado/);
  assert.doesNotMatch(context.workbenchContinuityHtml(e),/data-page="modoresultados"/);
  assert.equal(JSON.stringify(e),before);
});
test('old TO-BE and obsolete engine outputs never grant a green path',()=>{
  const e=sample();
  e.diagnosticOutput={optimal_scenario:{scenario_id:'ORIGINAL'}};
  e.lastEngineSnapshotVersion=1;
  e.tobeProposals=[{sourceSnapshotVersion:1,status:'APPROVED_FOR_CLIENT'}];
  e.review={status:'REVIEWED'};
  const m=context.workbenchContinuityModel(e);
  assert.match(m[1].status,/pendiente/);
  assert.match(m[2].status,/Necesita TO-BE/);
  assert.match(m[4].status,/pendiente/);
  assert.doesNotMatch(context.workbenchContinuityHtml(e),/data-page="modoresultados"/);
});
test('exact approved current review is the only path to client mode',()=>{
  const e=sample();
  e.diagnosticOutput={optimal_scenario:{scenario_id:'ORIGINAL'}};
  e.tobeProposals=[{sourceSnapshotVersion:2,status:'APPROVED_FOR_CLIENT'}];
  e.review={status:'REVIEWED'};
  assert.doesNotMatch(context.workbenchContinuityHtml(e),/data-page="modoresultados"/);
  e.review.status='APPROVED_FOR_CLIENT';
  const model=context.workbenchContinuityModel(e);
  assert.match(model[5].status,/Aprobado/);
  assert.match(context.workbenchContinuityHtml(e),/data-page="modoresultados"/);
  assert.equal(e.diagnosticOutput.optimal_scenario.scenario_id,'ORIGINAL');
});
test('implementation is read-only and the runtime owns no new diagnostic fields',()=>{
  assert.match(source,/AUNEA-FE-WORKFLOW-READINESS-153/);
  assert.equal((source.match(/workbenchContinuityHtml\(e\)/g)||[]).length>=2,true);
  const fn=source.slice(source.indexOf('function workbenchContinuityModel('),source.indexOf('// [AUNEA-FE-WORKFLOW-READINESS-153] END'));
  assert.doesNotMatch(fn,/setAnswer\(|markDirty\(|createOutputReview\(|advanceOutputReview\(|\bfetch\(/);
  assert.doesNotMatch(fn,/DF\d{3}/);
});
// [AUNEA-UAT-WORKFLOW-READINESS-153] END
