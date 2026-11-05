// [AUNEA-UAT-PG11-FUTURE-FLOW-233] START — proposed topology versioned against original snapshot.
// SOURCE: Simulator CANONICAL PG11/PG12; DEC-050/052/055. No Ollama or browser dependencies.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../pages/results.js'),'utf8');
const block=src.match(/\/\/ \[AUNEA-FE-PG11-FUTURE-FLOW-228\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-FUTURE-FLOW-228\] END/)?.[0];
if(!block)throw Error('Missing future-flow owner contract');
function harness(source){
 const snapshot={version:1,processSteps:structuredClone(source)};
 const e={id:'UAT',confirmedAsIs:true,confirmedSnapshots:[snapshot]};
 const p={version:1,status:'DRAFT',sourceSnapshotVersion:1,items:source.map((s,i)=>({
   id:'TOBE-1-'+(i+1),sourceStepId:s.id,sourceStepName:s.step_name,
   transformation:'Se modifica',problemResolved:'Fricción acreditada',
   futureActor:'Responsable',tool:'Herramienta',inputs:'Entrada',outputs:'Salida',
   automationAi:'',humanSupervision:'Control humano',controlsRisk:'Control'
 }))};
 const sandbox={String,Array,Object,Set,Map,JSON,console,
   tobeSourceSteps:()=>snapshot.processSteps,
   confirmedSnapshot:()=>snapshot,
   processDecisionStep:s=>s.step_type==='ST04',
   TOBE_TRANSFORMATIONS:['Se mantiene','Se modifica','Se elimina','Se automatiza',
     'Se asiste con IA','Requiere decisión humana','Se incorpora control']
 };
 vm.createContext(sandbox);vm.runInContext(block,sandbox);
 const run=(name,...args)=>sandbox[name](e,p,...args);
 return {e,p,snapshot,run};
}
const linear=[
 {id:'S1',step_name:'Recepción',step_type:'ST02',normal_next_step:'S2'},
 {id:'S2',step_name:'Registro',step_type:'ST02',normal_next_step:'__END__'}
];
test('new flow starts with a faithful immutable AS-IS route projection',()=>{
 const h=harness(linear),before=JSON.stringify(h.snapshot);
 assert.equal(h.run('tobeFlowIntegrity'),null);
 assert.deepEqual(JSON.parse(JSON.stringify(h.run('tobeFutureSteps').map(x=>[x.id,x.normal_next_step]))),
  [['S1','S2'],['S2','__END__']]);
 assert.equal(JSON.stringify(h.snapshot),before);
});
test('new linked activity remains a DRAFT until explicitly connected',()=>{
 const h=harness(linear),flow=h.run('tobeFlowOwner');
 flow.addedSteps.push({
   id:'TOBE-ADD-1-1',isAddition:true,sourceStepId:'S1',
   sourceStepName:'Recepción',stepName:'Validar entradas',status:'DRAFT',
   transformation:'Se incorpora control',problemResolved:'Evitar duplicación',
   futureActor:'Supervisor',futureTime:'',futureTimeAssumption:''
 });
 flow.routes['TOBE-ADD-1-1']={normal:'__PENDING__',exception:''};
 h.p.flow=flow;
 assert.match(h.run('tobeFlowIntegrity'),/pendiente de conectar/);
 h.p.flow.routes.S1.normal='TOBE-ADD-1-1';
 h.p.flow.routes['TOBE-ADD-1-1'].normal='S2';
 assert.equal(h.run('tobeFlowIntegrity'),null);
 assert.equal(h.run('tobeFutureSteps').length,3);
 assert.equal(h.p.flow.addedSteps[0].sourceStepId,'S1');
 assert.equal(JSON.stringify(h.snapshot.processSteps),JSON.stringify(linear));
});
test('eliminating a step cannot silently invent a replacement route',()=>{
 const h=harness(linear);h.p.items[1].transformation='Se elimina';
 assert.match(h.run('tobeFlowIntegrity'),/eliminada o pendiente/);
 h.p.flow=h.run('tobeFlowOwner');h.p.flow.routes.S1.normal='__END__';
 assert.equal(h.run('tobeFlowIntegrity'),null);
 assert.deepEqual(JSON.parse(JSON.stringify(h.run('tobeFutureSteps').map(x=>x.id))),['S1']);
 assert.equal(h.snapshot.processSteps[1].normal_next_step,'__END__');
});
test('decisions preserve explicit YES and NO routes, and verify reconvergence',()=>{
 const graph=[
  {id:'G',step_name:'Decidir',step_type:'ST04',normal_next_step:'S1',
    exception_path:{destination_step:'S2'}},
  {id:'S1',step_name:'Con aprobación',step_type:'ST02',normal_next_step:'__END__'},
  {id:'S2',step_name:'Sin aprobación',step_type:'ST02',normal_next_step:'__END__'}
 ];
 const h=harness(graph);assert.equal(h.run('tobeFlowIntegrity'),null);
 h.p.items[2].transformation='Se elimina';
 assert.match(h.run('tobeFlowIntegrity'),/eliminada o pendiente/);
 h.p.flow=h.run('tobeFlowOwner');h.p.flow.routes.G.exception='__END__';
 assert.equal(h.run('tobeFlowIntegrity'),null);
 assert.equal(h.run('tobeFutureSteps')[0].exception_path.destination_step,'__END__');
});
test('a newly added decision needs explicit YES and NO routes and keeps the original source unchanged',()=>{
 const h=harness(linear),snapshot=JSON.stringify(h.snapshot.processSteps),flow=h.run('tobeFlowOwner');
 const id='TOBE-ADD-1-1';
 flow.addedSteps.push({id,isAddition:true,sourceStepId:'S1',sourceStepName:'Recepción',
   stepName:'Clasificar excepción',stepType:'ST04',status:'DRAFT',
   transformation:'Requiere decisión humana',problemResolved:'Distinguir ruta excepcional',
   futureActor:'Supervisor',futureTime:'',futureTimeAssumption:''});
 flow.routes[id]={normal:'S2',exception:'__PENDING__'};
 flow.routes.S1.normal=id;
 h.p.flow=flow;
 assert.match(h.run('tobeFlowIntegrity'),/pendiente de conectar/);
 flow.routes[id].exception='__END__';
 assert.equal(h.run('tobeFlowIntegrity'),null);
 const added=h.run('tobeFutureSteps').find(x=>x.id===id);
 assert.equal(added.step_type,'ST04');
 assert.equal(added.exception_path.destination_step,'__END__');
 assert.equal(JSON.stringify(h.snapshot.processSteps),snapshot);
});

test('future layout coordinates are version-owned and do not rewrite original AS-IS',()=>{
 const h=harness(linear),before=JSON.stringify(h.snapshot),flow=h.run('tobeFlowOwner');
 flow.positions={S1:{x:451,y:188},S2:{x:720,y:188}};
 h.p.flow=flow;
 const recovered=h.run('tobeFlowOwner');
 assert.deepEqual(JSON.parse(JSON.stringify(recovered.positions.S1)),{x:451,y:188});
 assert.equal(h.run('tobeFlowIntegrity'),null);
 assert.equal(JSON.stringify(h.snapshot),before);
});
test('a closed loop with no route to END blocks review',()=>{
 const h=harness(linear);h.p.flow=h.run('tobeFlowOwner');
 h.p.flow.routes.S2.normal='S1';
 assert.match(h.run('tobeFlowIntegrity'),/sin camino hasta el final/);
});
test('no disconnected steps and no addition without a confirmed source',()=>{
 const h=harness(linear),flow=h.run('tobeFlowOwner');
 flow.addedSteps.push({id:'TOBE-ADD-1-1',isAddition:true,sourceStepId:'UNKNOWN',
   sourceStepName:'Otro',stepName:'Control',status:'DRAFT',transformation:'Se incorpora control',
   problemResolved:'Validación',futureActor:'Supervisor',futureTime:'',futureTimeAssumption:''});
 flow.routes['TOBE-ADD-1-1']={normal:'__END__',exception:''};h.p.flow=flow;
 assert.match(h.run('tobeFlowIntegrity'),/no tiene origen AS-IS confirmado/);
 flow.addedSteps[0].sourceStepId='S1';
 assert.match(h.run('tobeFlowIntegrity'),/desconectadas/);
});
test('PG11 field help describes every text field and treats NO as invalid rationale',()=>{
  for(const field of ['stepName','problemResolved','futureActor','tool','inputs','outputs',
    'automationAi','humanSupervision','controlsRisk','futureTime','futureTimeAssumption'])
    assert.match(src,new RegExp(' '+field+':'),field+' must have contextual guidance');
  assert.match(src,/const shown=raw/);
  assert.match(src,/placeholder="'\+attr\(help\)/);
});
test('PG11 free canvas has separately persisted positions and explicit YES/NO connections',()=>{
  assert.match(src,/AUNEA-FE-PG11-FREE-CANVAS-248/);
  assert.match(src,/positions:stored\?\.positions/);
  assert.match(src,/flow\.positions\[d\.id\]=point/);
  assert.match(src,/document\.addEventListener\('pointermove'/);
  assert.match(src,/flow\.routes\[from\]\[kind\]=String\(sourceId\)/);
  assert.match(src,/saveState\('Guardar conexión editada TO-BE'\)/);
  assert.match(src,/field\('exception','Ruta NO/);
  assert.match(src,/data-tobe-move/);
  assert.match(src,/data-tobe-connect/);
  assert.match(src,/data-tobe-discard-added/);
});
test('discarding added steps preserves history while clearing invalid incoming edges',()=>{
  assert.match(src,/item\.status='SUPERSEDED'/);
  assert.match(src,/delete flow\.routes\[id\]/);
  assert.match(src,/route\?\.normal===id/);
  assert.match(src,/route\?\.exception===id/);
  assert.match(src,/draft\.flow=previousFlow/);
});
test('PG11 canvas renders direct move, connect, remove and retirement controls',()=>{
  assert.match(src,/data-tobe-move/);
  assert.match(src,/data-tobe-connect/);
  assert.match(src,/data-tobe-discard-added/);
  assert.match(src,/data-tobe-remove-original/);
  assert.match(src,/flow\.positions\?\.\[id\]/);
  assert.match(src,/original\.transformation='Se elimina'/);
  assert.match(src,/flow\.routes\[from\]\[kind\]=String\(sourceId\)/);
});
test('PG11 canvas uses actual pixel positions, not grid row and column placement',()=>{
  const start=src.indexOf('function tobeCanvasHtml(e,p)');
  const end=src.indexOf('AUNEA-FE-PG11-FREE-CANVAS-248] END',start);
  const canvas=src.slice(start,end);
  assert.match(canvas,/flow\.positions\?\.\[String\(n\.id\)\]/);
  assert.match(canvas,/style="left:/);
  assert.doesNotMatch(canvas,/style="grid-row:/);
  assert.match(src,/saveState\('Guardar posición visual TO-BE'\)/);
  assert.match(src,/draft\.flow=previous/);
});
test('PG11 canonical controls retain catalog-based inputs, outputs, roles and tools',()=>{
  assert.match(src,/AUNEA-FE-PG11-CANONICAL-CONTROLS-251/);
  assert.match(src,/selectedHtml\(htmlId,opts,current/);
  assert.match(src,/tobeArtifactField\(item,'inputs','Datos de entrada'/);
  assert.match(src,/tobeArtifactField\(item,'outputs','Datos de salida'/);
  assert.match(src,/tobeCatalogField\(item,'futureActor','Responsable futuro','OS_ACTOR_ROLE'/);
  assert.match(src,/data-tobe-drop-legacy/);
  assert.match(src,/const shown=raw/);
});
// [AUNEA-UAT-PG11-FUTURE-FLOW-233] END
