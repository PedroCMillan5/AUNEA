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

test('A later snapshot invalidates prior gate decisions, regardless of stored selections',()=>{
 const e=record();
 Object.assign(e.engineGates,Object.fromEntries(allKeys.map(k=>[k,'YES'])));
 e.engineGateReview={snapshotVersion:1};
 assert.equal(fn.unresolvedEngineGates(e).length,0);
 e.snapshot.version=2;
 assert.equal(fn.unresolvedEngineGates(e).length,5);
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
 assert.match(adapter,/e\.lastEngineGateFingerprint=engineGateFingerprint\(e\)/);
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
 assert.match(JSON.stringify(info.sources),/38/);
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
 assert.match(joined,/simulación QA, sin validar como regla real/);
 assert.match(joined,/heredado de Paso 1/);
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

// [AUNEA-UAT-ENGINE-GATE-ASSIST-151] END
