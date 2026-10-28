// [AUNEA-UAT-ASIS-WORKBENCH-152] START — Source-only end-to-end contract
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'domain/analysis-workbench.js'),'utf8');
const results=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
const adapter=fs.readFileSync(path.join(root,'services/engine-adapter.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const canonical=JSON.parse(fs.readFileSync(path.join(root,'data/diagnostic-master.min.json'),'utf8'));
const context={
  schema:canonical,
  confirmedSnapshot:e=>e.snapshot,
  engagementOfRecord:e=>e.snapshot,
  effectiveValue:(field,record)=>record.answers?.[field.Field_ID],
  valuePresent:v=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0),
  normalizeArray:v=>Array.isArray(v)?v:v==null||v===''?[]:[v],
  labelFrom:(_,v)=>String(v||''),
  esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  attr:s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),
  state:{backendUrl:'/test-backend',backendOnline:true},
  toast:()=>{},
  document:{getElementById:()=>null},
  render:()=>{},
  buildBackendPayload:e=>({engagement_id:e.id}),
  fetch:async()=>({ok:true,json:async()=>({diagnostic_type:'ASIS_ONLY',engagement_id:'SRC',
    input_coverage:{status:'COMPLETE',items:[]},status:'ANALYZED',
    pain_results:[],risk_result:{status:'COMPLETE'},economic_result:{},process_time_projection:null})})
};
vm.createContext(context);
const fn=vm.runInContext(source+'\n({asisFieldInventory,asisPointRecords,asisPointCardsHtml,asisCoverageHtml,asisDirectionCardsHtml,asisAnalysisKey,asisAnalysisResult,runAsisAnalysis})',context);
const fixture=()=>({
 id:'SRC',confirmedAsIs:true,snapshot:{version:1,
  answers:{DF011:'Recepción de facturas',DF025:{value:48,unit:'h'},DF026:{value:72,unit:'h'}},
  answerDetails:{},processSteps:[{id:'S1',status:'ACTIVE',step_name:'Registrar factura',active_time:5,wait_time:0,rework_time:3}],
  frictions:[{id:'F1',status:'ACTIVE',affected_steps:['S1'],friction_type:'P04',client_label:'Copia manual',observable_signal:'Doble registro',evidence_type:'EV02'}],
  risks:[{id:'R1',step_ids:['S1'],description:'Error por reentrada',controls_present:false}],
  economicInputs:[{id:'E1',step_ids:['S1'],driver_id:'ED01',evidence_type:'CLIENT_DECLARED'}]
 }});
test('all 100 canonical fields are audited, not just a subset of questions',()=>{
  const e=fixture();
  const groups=fn.asisFieldInventory(e.snapshot);
  const all=groups.flatMap(x=>x.items);
  assert.equal(canonical.fields.length,100);
  assert.equal(all.length,100);
  assert.equal(new Set(all.map(x=>x.id)).size,100);
  assert.ok(all.some(x=>x.id==='DF025'&&x.filled));
  assert.ok(all.some(x=>x.id==='DF100'&&!x.filled));
  assert.match(fn.asisCoverageHtml(e,null),/100 campos canónicos examinados/);
});
test('source critical points preserve traceability and never project fabricated savings',()=>{
  const e=fixture();
  const p=fn.asisPointRecords(e.snapshot);
  assert.equal(p.points[0].frictions[0].id,'F1');
  assert.equal(p.points[0].risks[0].id,'R1');
  assert.equal(p.points[0].impacts[0].id,'E1');
  const view=fn.asisPointCardsHtml(e.snapshot);
  assert.match(view,/Registrar factura/);
  assert.match(view,/Doble registro|Copia manual/);
  assert.match(view,/Trabajo: 5 min/);
  assert.match(view,/Espera registrada: 0 min/);
  assert.match(view,/Los vínculos no son nuevas fricciones ni implican causa, beneficios o soluciones/);
  assert.match(fn.asisDirectionCardsHtml(e),/Tiempo futuro, ahorro y precio pendientes/);
});
test('three options are global, not duplicated inside per-step source cards',()=>{
  const e=fixture(),before=JSON.stringify(e),html=fn.asisPointCardsHtml(e.snapshot);
  assert.doesNotMatch(html,/data-asis-direction=|asis-point-alternatives-grid/);
  const global=fn.asisDirectionCardsHtml(e);
  assert.equal((global.match(/class="asis-direction-card"/g)||[]).length,3);
  assert.match(global,/Optimización sin IA/);
  assert.match(global,/Optimización asistida por IA/);
  assert.match(global,/Rediseño y tecnología existente/);
  assert.match(html,/Registrar factura/);
  assert.match(html,/Copia manual/);
  assert.match(global,/Tiempo futuro, ahorro y precio pendientes/);
  assert.equal((global.match(/disabled title="Primero calcula el diagnóstico oficial"/g)||[]).length,3);
  assert.equal(JSON.stringify(e),before);
  const extra=JSON.parse(JSON.stringify(e));
  extra.snapshot.processSteps.push({id:'S2',step_name:'Aprobar factura',active_time:2,status:'ACTIVE'});
  extra.snapshot.frictions.push({id:'F2',status:'ACTIVE',affected_steps:['S2'],client_label:'Espera para aprobar'});
  const html2=fn.asisPointCardsHtml(extra.snapshot);
  assert.equal((html2.match(/class="asis-opportunity-point"/g)||[]).length,2);
  assert.doesNotMatch(html2,/data-asis-direction=/);
  extra.snapshot.frictions[1].client_label='<script>alert(1)</script>';
  const escaped=fn.asisPointCardsHtml(extra.snapshot);
  assert.ok(!escaped.includes('<script>'));
  assert.ok(escaped.includes('&lt;script>'));
});
test('no refactor of the confirmed AS-IS or official recommendation gate',()=>{
  assert.match(html,/domain\/analysis-workbench\.js/);
  assert.match(results,/asisPointCardsHtml\(record\)/);
  assert.match(results,/asisCoverageHtml\(e,official\?/);
  assert.match(results,/asisBaselineHtml\(e\)/);
  assert.match(source,/runAsisAnalysis\(e\)/);
  assert.match(adapter,/if\(unresolvedEngineGates\(e\)\.length\)\{openEngineGateReview\(\);return\}/);
  assert.doesNotMatch(source,/setAnswer\(|sealConfirmedSnapshot\(|e\.diagnosticOutput\s*=/);
});
test('analysis is snapshot-bound and cannot mutate the source engagement',async()=>{
  const e=fixture(),original=JSON.stringify(e);
  context.currentEng=()=>e;
  await fn.runAsisAnalysis(e);
  assert.equal(JSON.stringify(e),original);
  assert.equal(fn.asisAnalysisResult(e).status,'ANALYZED');
  e.snapshot={...e.snapshot,version:2};
  assert.equal(fn.asisAnalysisResult(e),null);
  e.confirmedAsIs=false;
  assert.equal(fn.asisAnalysisKey(e),null);
});
// [AUNEA-UAT-ASIS-WORKBENCH-152] END
