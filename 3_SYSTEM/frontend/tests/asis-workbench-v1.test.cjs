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
  assert.match(fn.asisCoverageHtml(e,null),/100 campos del modelo examinados/);
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
  assert.match(view,/Espera: 0 min/);
  assert.match(view,/Ninguna opción lleva ahorro asignado/);
  assert.match(fn.asisDirectionCardsHtml(e),/pendientes de simulación/);
});
test('per-critical-step matrix presents three conditional options without pretending to simulate',()=>{
  const e=fixture(),before=JSON.stringify(e),html=fn.asisPointCardsHtml(e.snapshot);
  assert.equal((html.match(/data-asis-direction=/g)||[]).length,3);
  assert.match(html,/Optimización sin IA/);
  assert.match(html,/Optimización asistida por IA/);
  assert.match(html,/Rediseño y tecnología existente/);
  assert.match(html,/Registrar factura/);
  assert.match(html,/Copia manual/);
  assert.match(html,/Tiempo futuro y contribución:<\/strong> no calculados/);
  assert.equal(JSON.stringify(e),before);
  const extra=JSON.parse(JSON.stringify(e));
  extra.snapshot.processSteps.push({id:'S2',step_name:'Aprobar factura',active_time:2,status:'ACTIVE'});
  extra.snapshot.frictions.push({id:'F2',status:'ACTIVE',affected_steps:['S2'],client_label:'Espera para aprobar'});
  const html2=fn.asisPointCardsHtml(extra.snapshot);
  assert.equal((html2.match(/data-asis-direction=/g)||[]).length,6);
  extra.snapshot.frictions[1].client_label='<script>alert(1)</script>';
  const escaped=fn.asisPointCardsHtml(extra.snapshot);
  assert.ok(!escaped.includes('<script>'));
  assert.ok(escaped.includes('&lt;script>'));
});
test('no refactor of the confirmed AS-IS or official recommendation gate',()=>{
  assert.match(html,/domain\/analysis-workbench\.js/);
  assert.match(results,/asisPointCardsHtml\(record\)/);
  assert.match(results,/asisCoverageHtml\(e,asisAnalysisResult\(e\)\)/);
  assert.match(results,/runAsisAnalysis\(e\)/);
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
