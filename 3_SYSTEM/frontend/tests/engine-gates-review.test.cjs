// [AUNEA-UAT-ENGINE-GATE-ASSIST-151] START
// Contract: 5 canonically governed booleans, with review-only suggestions and explicit consultant confirmation.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const adapter=fs.readFileSync(path.join(root,'services/engine-adapter.js'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');
const start=adapter.indexOf('const ENGINE_GATE_CONTRACT=');
const end=adapter.indexOf('function evidenceTypeBackend(v){',start);
assert.ok(start>=0&&end>start,'Governed gate review source missing');
const source=adapter.slice(start,end);
const reuseCode=fs.readFileSync(path.join(root,'domain/no-reask.js'),'utf8');
const approvalBegin=reuseCode.indexOf('function approvalCriteriaSource(');
const approvalEnd=reuseCode.indexOf('function riskDerivedSourceGaps(',approvalBegin);
assert.ok(approvalBegin>=0&&approvalEnd>approvalBegin);
const approvalFn=reuseCode.slice(approvalBegin,approvalEnd);

const fields=['DF075','DF086','DF087','DF088','DF089','DF050'].map(Field_ID=>({Field_ID}));
let modal=null,closeCount=0,runCount=0,persistCount=0,dirtyCount=0,toastLog=[];
let current=null,nodes=[];
const stub={
 state:{dirty:false,audit:[]},
 activeSteps:e=>(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
 activeFrictions:e=>(e.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),
 normalizeArray:v=>Array.isArray(v)?v:v==null||v===''?[]:[v],
 labelFrom:(set,v)=>String(v||''),
 confirmedSnapshot:e=>e.snapshot||null,
 schema:{fields},
 esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
 attr:s=>String(s??'').replaceAll('"','&quot;'),
 auneaSelectControl:(id,options,value)=>'<input data-gate-selected="'+id+'" value="'+value+'">',
 currentEng:()=>current,
 document:{
  querySelectorAll:()=>nodes,
  querySelector:()=>({scrollIntoView:()=>{}})
 },
 openModal:(title,body,confirm,label)=>{modal={title,body,confirm,label}},
 closeModal:()=>{closeCount++},
 now:()=> '2026-10-23T10:00:00',
 markDirty:()=>{dirtyCount++},
 persistRecoverySnapshot:()=>{persistCount++;return true},
 runDiagnosis:()=>{runCount++},
 render:()=>{},
 toast:t=>{toastLog.push(t)}
};
const exposed=['ENGINE_GATE_CONTRACT','engineGateReviewEvidence','engineGateCard','inferGateSuggestion','unresolvedEngineGates','openEngineGateReview','gateBool','engineGateFingerprint','engineGateOutputFresh'];
const context=vm.createContext({...stub});
const fn=vm.runInContext(approvalFn+'\n'+source+'\n({'+exposed.join(',')+'})',context);
const record=()=>({
 answers:{DF086:[]},engineGates:{},processSteps:[],frictions:[],
 snapshot:{version:1},answerDetails:{}
});
const allKeys=fn.ENGINE_GATE_CONTRACT.map(x=>x.key);

test('No gate inference invents No from empty capture',()=>{
 const e=record();
 assert.equal(fn.unresolvedEngineGates(e).length,5);
 for(const c of fn.ENGINE_GATE_CONTRACT){
  const review=fn.engineGateReviewEvidence(c,e);
  assert.equal(review.suggestion,'');
  assert.equal(review.status,'INSUFFICIENT');
 }
});

test('Levante-shaped record shows actual sources, avoids AI and tool capability claims',()=>{
 const e=record();
 e.processSteps=[
  {step_name:'Recibir factura del proveedor',tool:'EMAIL',inputs:['PDF']},
  {step_name:'Determinar si procede aprobación',step_type:'ST04',tool:'EMAIL',decision_criteria:[]},
  {step_name:'Aprobar factura',step_type:'ST05',tool:'EMAIL'},
  {step_name:'Registrar en ERP y archivar',tool:'ERP',inputs:['PDF'],manual_actions:['REKEY']}
 ];
 e.frictions=[{friction_type:'P09',client_label:'Falta de visibilidad del estado',observable_signal:'Seguimiento manual por correo',evidence_type:'EV04'}];
 const byKey=Object.fromEntries(fn.ENGINE_GATE_CONTRACT.map(c=>[c.key,fn.engineGateReviewEvidence(c,e)]));
 assert.match(JSON.stringify(byKey.process_design_first.sources),/Determinar si procede aprobación/);
 assert.equal(byKey.existing_tool_can_close.suggestion,'');
 assert.match(JSON.stringify(byKey.existing_tool_can_close.sources),/ERP/);
 assert.equal(byKey.unstructured_interpretation_need.suggestion,'');
 assert.match(JSON.stringify(byKey.unstructured_interpretation_need.sources),/PDF|Recibir factura/);
 assert.equal(byKey.bounded_action_space.suggestion,'');
 assert.equal(byKey.management_visibility_need.suggestion,'YES');
 const card=fn.engineGateCard(fn.ENGINE_GATE_CONTRACT[4],e);
 assert.match(card,/Propuesta de AUNEA: Sí/);
 assert.match(card,/data-gate-selected="engine_gate_management_visibility_need" value=""/);
 assert.doesNotMatch(card,/RULE_RECOMMENDATION|RULE_LEVEL_AI|IN-R-11/);
});

test('Explicitly confirmed answers preserve five existing backend booleans and snapshot provenance',()=>{
 current=record();nodes=[];modal=null;runCount=0;persistCount=0;
 fn.openEngineGateReview();
 assert.equal(modal.title,'Decisiones del consultor');
 assert.equal((modal.body.match(/class="engine-review-card"/g)||[]).length,5);
 assert.doesNotMatch(modal.body,/Confirmación del consultor antes de calcular/);
 assert.match(modal.body,/Pendiente no equivale a No/);
 assert.match(modal.body,/No son campos pendientes del cliente/);
 assert.match(modal.body,/Cómo completarlas/);
 assert.match(modal.body,/AUNEA puede proponer una respuesta, pero no la marca por ti/);
 assert.match(modal.body,/Decisión 1 de 5/);
 assert.match(modal.body,/Decisión 5 de 5/);
 assert.equal(modal.label,'Confirmar decisiones y calcular recomendación');
 const before=JSON.stringify(current.engineGates);
 nodes=allKeys.map((key,i)=>({dataset:{engineGate:key},value:i===4?'YES':''}));
 modal.confirm();
 assert.equal(runCount,0);assert.equal(persistCount,0);
 assert.equal(JSON.stringify(current.engineGates),before);
 assert.equal(Object.keys(current.engineGates).length,0);
 nodes=allKeys.map((key,i)=>({dataset:{engineGate:key},value:i===4?'YES':'NO'}));
 modal.confirm();
 assert.equal(runCount,1);assert.equal(persistCount,1);
 assert.equal(fn.unresolvedEngineGates(current).length,0);
 assert.equal(current.engineGateReview.snapshotVersion,1);
 assert.equal(Object.keys(current.engineGateReview.decisions).length,5);
 assert.equal(current.engineGates.management_visibility_need,'YES');
 assert.equal(current.engineGates.bounded_action_space,'NO');
});

test('A later snapshot invalidates all five decisions, including their consultant approval',()=>{
 const e=record();
 Object.assign(e.engineGates,Object.fromEntries(allKeys.map(k=>[k,'YES'])));
 assert.equal(fn.unresolvedEngineGates(e).length,5,'bare binary flags cannot stand in for human approval');
 e.engineGateReview={snapshotVersion:1,decisions:Object.fromEntries(allKeys.map(k=>[k,{answer:'YES',basis:'REVIEW'}]))};
 assert.equal(fn.unresolvedEngineGates(e).length,0);
 e.snapshot.version=2;
 assert.equal(fn.unresolvedEngineGates(e).length,5);
 e.snapshot.version=1;
 e.engineGates[allKeys[0]]='NO';
 assert.equal(fn.unresolvedEngineGates(e).length,1,'changed value is no longer the answer approved');
});

test('The adapter keeps the canonical five backend flags and one-to-one polarity',()=>{
 const expected=[
  'existing_tool_can_cover:gateBool(g.existing_tool_can_close)',
  'process_design_preconditions_ok:!gateBool(g.process_design_first)',
  'requires_unstructured_ai_assistance:gateBool(g.unstructured_interpretation_need)',
  'requires_bounded_agent_action:gateBool(g.bounded_action_space)',
  'requires_management_visibility:gateBool(g.management_visibility_need)'
 ];
 for(const f of expected)assert.ok(adapter.includes(f),f);
 assert.match(css,/AUNEA-FE-ENGINE-GATES-UX-151/);
});

test('Gate edits invalidate only diagnostic outputs generated with an earlier decision set',()=>{
 const e=record();
 Object.assign(e.engineGates,Object.fromEntries(allKeys.map(k=>[k,'NO'])));
 e.lastEngineGateFingerprint=fn.engineGateFingerprint(e);
 assert.equal(fn.engineGateOutputFresh(e),true);
 e.engineGates.management_visibility_need='YES';
 assert.equal(fn.engineGateOutputFresh(e),false);
 const results=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
 const review=fs.readFileSync(path.join(root,'domain/output-review.js'),'utf8');
 const shell=fs.readFileSync(path.join(root,'ui/shell.js'),'utf8');
 assert.match(results,/engineGateOutputFresh\(e\)/);
 assert.match(review,/engineGateOutputFresh\(e\)/);
 assert.match(shell,/reviewEngineGates.*openEngineGateReview/);
 assert.match(adapter,/e\.lastEngineGateFingerprint=sourceGateFingerprint/);
});

test('Review is calculated from immutable confirmed snapshot when available',()=>{
 const ctx=vm.createContext({...stub,engagementOfRecord:e=>e.sealedRecord||e});
 const gates=vm.runInContext(approvalFn+'\n'+source+'\n({engineGateReviewEvidence,ENGINE_GATE_CONTRACT})',ctx);
 const e=record();
 e.processSteps=[{step_name:'Live edit not in snapshot',tool:'NEW_TOOL'}];
 e.sealedRecord={answers:{},processSteps:[{step_name:'Factura recibida',tool:'ERP'}],frictions:[]};
 const info=gates.engineGateReviewEvidence(gates.ENGINE_GATE_CONTRACT[1],e);
 assert.match(JSON.stringify(info.sources),/ERP/);
 assert.doesNotMatch(JSON.stringify(info.sources),/NEW_TOOL/);
});


test('Structured DF027 and DF081 never display [object Object], preserve values and units',()=>{
 const e=record();
 e.answers.DF027={value:38,mode:'DECLARED'};
 e.answers.DF081={value:3,unit:'min',period:'case'};
 e.processSteps=[
  {id:'UAT-LIT-P1',step_name:'Recibir factura'},
  {id:'UAT-LIT-P2',step_name:'Decidir aprobación'}
 ];
 e.answers.DF053=['UAT-LIT-P1','UAT-LIT-P2'];
 e.frictions=[{friction_type:'P09',client_label:'Falta de visibilidad'}];
 const c=fn.ENGINE_GATE_CONTRACT[4],info=fn.engineGateReviewEvidence(c,e),html=fn.engineGateCard(c,e);
 assert.match(JSON.stringify(info.sources),/38 casos/);
 assert.match(JSON.stringify(info.sources),/3 min\/caso/);
 assert.match(JSON.stringify(info.sources),/Paso 1 — Recibir factura/);
 assert.doesNotMatch(html,/\[object Object\]|UAT-LIT-P1|UAT-LIT-P2/);
});
test('Pair integration identifiers render readable step names, no duplicated tool list',()=>{
 const e=record();
 e.processSteps=[
  {id:'UAT-LIT-P3',step_name:'Aprobar factura',tool:'EMAIL'},
  {id:'UAT-LIT-P4',step_name:'Registrar en ERP',tool:'ERP'}
 ];
 e.answers.DF054=['pair:UAT-LIT-P3:UAT-LIT-P4'];
 e.answers.DF046=['EMAIL','ERP'];
 const info=fn.engineGateReviewEvidence(fn.ENGINE_GATE_CONTRACT[1],e);
 const body=JSON.stringify(info.sources);
 assert.match(body,/Aprobar factura.*Registrar en ERP/);
 assert.doesNotMatch(body,/UAT-LIT|pair:/);
 assert.equal(info.sources.filter(s=>/Herramientas actuales/.test(s.label)).length,1);
});
test('Inherited approval criteria do not produce a false missing-criterion warning',()=>{
 const e=record();
 e.processSteps=[
  {id:'P2',step_type:'ST04',step_name:'Determinar si procede aprobación',
    decision_criteria:['OTHER'],_details:{decision_criteria:'SÓLO SIMULACIÓN QA: umbral >1.500 €; política real no validada'},normal_next_step:'P3'},
  {id:'P3',step_type:'ST05',step_name:'Aprobar factura',decision_criteria:[]}
 ];
 const info=fn.engineGateReviewEvidence(fn.ENGINE_GATE_CONTRACT[0],e);
 const joined=JSON.stringify(info.sources);
 assert.doesNotMatch(joined,/sin criterio documentado|Criterio de decisión pendiente/);
 assert.match(joined,/simulación QA, no política validada: umbral/);
 assert.match(joined,/hereda el criterio de Paso 1/);
 const card=fn.engineGateCard(fn.ENGINE_GATE_CONTRACT[0],e);
 assert.match(card,/¿Es necesario rediseñar el proceso antes de automatizar?/);
});
test('Unsupported structured objects are not treated as facts or converted to raw object strings',()=>{
 const e=record();
 e.answers.DF027={unrecognized:true};
 const info=fn.engineGateReviewEvidence(fn.ENGINE_GATE_CONTRACT[4],e);
 assert.doesNotMatch(JSON.stringify(info.sources),/\[object Object\]/);
 assert.ok(!info.sources.some(x=>x.label.startsWith('Cola de trabajo declarada')));
});

test('The reopened popup distinguishes verified review state from a technical proposal',()=>{
 const e=record();
 e.answers.DF086=['VISIBILITY'];
 e.frictions=[{friction_type:'P09',client_label:'Falta visibilidad'}];
 e.engineGates=Object.fromEntries(allKeys.map(k=>[k,'NO']));
 e.engineGates.management_visibility_need='YES';
 const c=fn.ENGINE_GATE_CONTRACT[4];
 assert.match(fn.engineGateCard(c,e),/Propuesta para contrastar/);
 assert.doesNotMatch(fn.engineGateCard(c,e),/Confirmada por el consultor/);
 e.engineGateReview={snapshotVersion:1,decisions:Object.fromEntries(allKeys.map(k=>[k,{answer:e.engineGates[k],basis:'REVIEW'}]))};
 assert.match(fn.engineGateCard(c,e),/Confirmada por el consultor/);
 assert.match(fn.engineGateCard(c,e),/Respuesta confirmada por el consultor/);
 e.engineGateReview.decisions[c.key].answer='NO';
 assert.doesNotMatch(fn.engineGateCard(c,e),/Confirmada por el consultor/);
});

test('A changed snapshot while the review modal remains open cannot save stale decisions',()=>{
 current=record();modal=null;nodes=[];runCount=0;persistCount=0;
 fn.openEngineGateReview();
 const first=modal;
 current.snapshot.version=2;
 nodes=allKeys.map(key=>({dataset:{engineGate:key},value:'NO'}));
 first.confirm();
 assert.equal(runCount,0);
 assert.equal(persistCount,0);
 assert.equal(fn.unresolvedEngineGates(current).length,5);
 assert.equal(current.engineGateReview,undefined);
});

test('A source-identical binary fingerprint never publishes a result without a valid consultant review',()=>{
 const e=record();
 e.engineGates=Object.fromEntries(allKeys.map(k=>[k,'YES']));
 e.lastEngineGateFingerprint=fn.engineGateFingerprint(e);
 e.diagnosticOutput={recommendation:{},quote:{},optimal_scenario:{}};
 e.lastEngineGateFingerprint=undefined;
 assert.equal(fn.engineGateOutputFresh(e),false,'a legacy output without a gate fingerprint is not fresh');
 e.lastEngineGateFingerprint=fn.engineGateFingerprint(e);
 assert.equal(fn.engineGateOutputFresh(e),false,'a binary fingerprint without its review is insufficient');
 e.engineGateReview={snapshotVersion:1,decisions:Object.fromEntries(allKeys.map(k=>[k,{answer:'YES',basis:'REVIEW'}]))};
 assert.equal(fn.engineGateOutputFresh(e),true);
 e.engineGateReview.decisions[allKeys[0]].answer='NO';
 assert.equal(fn.engineGateOutputFresh(e),false);
});

test('The entire snapshot-to-results boundary invalidates review, client output and stale asynchronous responses',()=>{
 const results=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
 const outputReview=fs.readFileSync(path.join(root,'domain/output-review.js'),'utf8');
 const view=results.slice(results.indexOf('function currentDiagnosticOutput(e)'),results.indexOf('function num(x)'));
 const review=outputReview.slice(outputReview.indexOf('function reviewSources(e)'),outputReview.indexOf('function createOutputReview(e)'));
 const extra={...stub,ENGINE_GATE_CONTRACT:fn.ENGINE_GATE_CONTRACT,ENGINE_GATE_GUIDE:vm.runInContext('ENGINE_GATE_GUIDE',context),engineGateOutputFresh:fn.engineGateOutputFresh,
   confirmedSnapshot:e=>e.snapshot,approvedTobeForClient:e=>e.approvedTobe,esc:stub.esc};
 const local=vm.runInNewContext(view+'\n'+review+'\n({currentDiagnosticOutput,diagnosticOutputFreshness,diagnosisEngineDecisionTraceHtml,reviewSources,approvedOutputReview})',extra);
 const e=record(),decisions=Object.fromEntries(allKeys.map(k=>[k,{answer:'NO',basis:'REVIEW'}]));
 e.engineGates=Object.fromEntries(allKeys.map(k=>[k,'NO']));
 e.engineGateReview={snapshotVersion:1,decisions};
 e.lastEngineSnapshotVersion=1;
 e.lastEngineGateFingerprint=fn.engineGateFingerprint(e);
 e.diagnosticOutput={recommendation:{},quote:{},optimal_scenario:{quote:{status:'BLOCKED'}}};
 e.approvedTobe={version:1,sourceSnapshotVersion:1};
 e.selectedScenarioIndex=0;
 assert.equal(local.diagnosticOutputFreshness(e).status,'CURRENT');
 assert.equal(local.currentDiagnosticOutput(e),e.diagnosticOutput);
 assert.match(local.diagnosisEngineDecisionTraceHtml(e),/cinco respuestas técnicas/);
 const reviewInputs=local.reviewSources(e);
 assert.ok(reviewInputs,'the current PG10 output can enter the consultant review stage');
 e.outputReviews=[{status:'APPROVED_FOR_CLIENT',fingerprint:JSON.stringify(reviewInputs)}];
 assert.ok(local.approvedOutputReview(e),'the reviewed result can become client-eligible');
 e.engineGates.management_visibility_need='YES';
 assert.equal(local.currentDiagnosticOutput(e),null);
 assert.equal(local.diagnosticOutputFreshness(e).status,'OBSOLETE');
 assert.equal(local.reviewSources(e),null);
 assert.equal(local.approvedOutputReview(e),null,'the previous client approval cannot publish changed gate inputs');
 e.engineGates.management_visibility_need='NO';
 e.snapshot.version=2;
 assert.equal(local.currentDiagnosticOutput(e),null);
 assert.equal(local.reviewSources(e),null);
 // The async pipeline must check its original decision fingerprint before committing output.
 assert.match(adapter,/const sourceGateFingerprint=engineGateFingerprint\(e\)/);
 assert.match(adapter,/sourceGateFingerprint!==engineGateFingerprint\(e\)\|\|unresolvedEngineGates\(e\)\.length/);
 assert.match(results,/diagnosisEngineDecisionTraceHtml\(e\)/);
 assert.match(results,/unresolved\.length===0/);
});


test('E2E consultant gate → backend → durable PG10 output: mid-run edits and save conflicts never publish',async()=>{
 const begin=adapter.indexOf('async function runDiagnosis()');
 const end=adapter.indexOf('// C05 · Optional internal AI',begin);
 assert.ok(begin>0&&end>begin,'the production diagnosis runner must exist');
 const realRunner=adapter.slice(begin,end);
 const base=()=>{
  const e=record();
  e.id='UAT-END-TO-END-01';e.confirmedAsIs=true;
  e.engineGates=Object.fromEntries(allKeys.map(k=>[k,'NO']));
  e.engineGateReview={snapshotVersion:1,decisions:Object.fromEntries(allKeys.map(k=>[k,{answer:'NO',basis:'REVIEW'}]))};
  return e;
 };
 const output={recommendation:{action_id:'TEST'},quote:{status:'BLOCKED'},optimal_scenario:{id:'OPTIMAL'}};
 async function attempt(behavior){
  const e=base(),messages=[],audit=[];
  let persistCalls=0,renderCount=0;
  const state={backendOnline:true,backendUrl:'/test-backend',activePage:'resultados'};
  const mock={
   state,currentEng:()=>e,hasConfirmedSnapshot:x=>!!x.snapshot,
   confirmedSnapshot:x=>x.snapshot,
   canonicalMissingRequired:()=>[],captureIntegrityIssues:()=>[],
   engagementOfRecord:x=>x,unresolvedEngineGates:fn.unresolvedEngineGates,
   engineGateFingerprint:fn.engineGateFingerprint,engineGateOutputFresh:fn.engineGateOutputFresh,
   document:{getElementById:()=>null},buildBackendPayload:()=>({engagement_id:e.id}),
   diagnosticCoveragePreflight:async()=>({status:'READY'}),handleCoveragePreflight:()=>true,
   fetch:async()=>{if(behavior==='changed')e.engineGates.management_visibility_need='YES';return {ok:true,json:async()=>output};},
   now:()=> '2026-10-23T10:00:00',markDirty:reason=>audit.push(reason),
   persistRecoverySnapshot:()=>{persistCalls++;return behavior!=='conflict';},
   render:()=>{renderCount++;},toast:t=>messages.push(t)
  };
  const {runDiagnosis}=vm.runInNewContext(realRunner+'\n({runDiagnosis})',mock);
  await runDiagnosis();
  return {e,messages,audit,persistCalls,renderCount,state};
 }
 const changed=await attempt('changed');
 assert.equal(changed.e.diagnosticOutput,undefined);
 assert.equal(changed.persistCalls,0);
 assert.match(changed.messages.join(' '),/decisiones técnicas cambiaron/);
 const conflict=await attempt('conflict');
 assert.equal(conflict.e.diagnosticOutput,undefined,'a failed durable commit rolls back official outputs');
 assert.equal(conflict.persistCalls,1);
 assert.match(conflict.messages.join(' '),/no se ha podido guardar/);
 const ok=await attempt('ok');
 assert.equal(ok.e.diagnosticOutput,output);
 assert.equal(ok.e.lastEngineSnapshotVersion,1);
 assert.equal(ok.persistCalls,1);
 assert.match(ok.messages.join(' '),/calculado y guardado/);
});

// [AUNEA-UAT-ENGINE-GATE-ASSIST-151] END
