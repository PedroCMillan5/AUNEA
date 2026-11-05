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
test('PG11 existing inspector guides AS-IS, AI advice, future design and connections',()=>{
  const start=src.indexOf('function tobeInspectorHtml(');
  const end=src.indexOf('\n}\n',start)+2;
  assert.ok(start>=0&&end>start);
  const inspector=src.slice(start,end);
  const stages=['tobeStepOrigin','tobeStepAdvice','tobeStepDesign'];
  const offsets=stages.map(x=>inspector.indexOf('id="'+x+'"'));
  assert.ok(offsets.every(x=>x>=0));
  assert.ok(offsets[0]<offsets[1]&&offsets[1]<offsets[2]);
  for(const stage of [...stages,'tobeStepRoutes'])
    assert.match(inspector,new RegExp('data-tobe-jump="'+stage+'"'));
  assert.match(inspector,/tobeAiAdviceHtml\(e,item\)/);
  assert.match(inspector,/tobeArtifactField\(item,'inputs'/);
  assert.match(inspector,/tobeArtifactField\(item,'outputs'/);
  assert.match(inspector,/tobeFlowInspector\(e,p,item\)/);
  assert.match(src,/id="tobeStepRoutes"/);
  assert.match(src,/AUNEA-FE-PG11-GUIDED-INSPECTOR-253/);
});
test('PG11 introduces its purpose and four explicit consultant actions',()=>{
  assert.match(src,/tobe-task-guide/);
  assert.match(src,/Qué tienes que hacer aquí/);
  assert.match(src,/1\. Entender/);
  assert.match(src,/2\. Decidir/);
  assert.match(src,/3\. Configurar/);
  assert.match(src,/4\. Conectar/);
  assert.match(src,/Resultado esperado:/);
});
test('PG11 text instructions appear as placeholders rather than duplicate help below fields',()=>{
  const start=src.indexOf('function tobeField(item,key,label,value');
  const end=src.indexOf('\n}\n',start)+2;
  const field=src.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(field,/placeholder=/);
  assert.doesNotMatch(field,/esc\(help\)<\/p>/);
  assert.match(field,/warning\+'<\/div>'/);
});
test('PG11 keeps map controls connected while increasing room for readable actions',()=>{
  assert.match(src,/pos\.col-1\)\*272/);
  assert.match(src,/pos\.row-1\)\*325/);
  assert.match(src,/data-tobe-move/);
  assert.match(src,/data-tobe-connect/);
  assert.match(src,/data-tobe-discard-added/);
  assert.match(src,/data-tobe-remove-original/);
});
test('PG11 maps all canonical transformations to a specific rationale label',()=>{
  const a=src.indexOf('// [AUNEA-FE-PG11-TRANSFORMATION-UX-258] START');
  const b=src.indexOf('// [AUNEA-FE-PG11-TRANSFORMATION-UX-258] END',a);
  assert.ok(a>=0&&b>a);
  const content=src.slice(a,b),names=['Se mantiene','Se modifica','Se elimina',
    'Se automatiza','Se asiste con IA','Requiere decisión humana','Se incorpora control'];
  for(const name of names)assert.ok(content.includes("case '"+name+"'"),name);
  assert.match(content,/function tobeMeaningfulRationale/);
  assert.match(src,/data-tobe-rationale-label/);
  assert.match(src,/tobeTransformationRationaleLabel\(item\.transformation\)/);
});
test('PG11 transformation selection updates only visible guidance and keeps user values',()=>{
  const a=src.indexOf('// [AUNEA-FE-PG11-TRANSFORMATION-LIVE-259] START');
  const b=src.indexOf('// [AUNEA-FE-PG11-TRANSFORMATION-LIVE-259] END',a);
  const block=src.slice(a,b);
  assert.ok(a>=0&&b>a);
  assert.match(block,/addEventListener\('change'/);
  assert.match(block,/tobeTransformationRationaleLabel\(value\)/);
  assert.match(block,/textarea\.placeholder=tobeFieldHelp/);
  assert.doesNotMatch(block,/textarea\.value\s*=/);
  assert.match(block,/data-tobe-ai-difference/);
});
test('PG11 rejects empty and inherited NO rationale without modifying source',()=>{
  assert.match(src,/if\(!tobeMeaningfulRationale\(item\.problemResolved\)\)/);
  assert.match(src,/if\(TOBE_TRANSFORMATIONS\.includes\(t\)&&!tobeMeaningfulRationale/);
  assert.match(src,/Completa nombre, responsable y motivo/);
  assert.match(src,/decision\.status==='ACCEPT'&&suggested\?\.transformation/);
  assert.match(src,/«Modificar antes de usar»/);
});
test('PG11 review rejects P4 NO rationale and accepted IA transformation mismatch',()=>{
  const functionNames=['tobeMeaningfulRationale','tobeTransformationRationaleLabel','tobeReviewReadiness'];
  const code=functionNames.map(name=>{
    const first=src.indexOf('function '+name+'('),end=src.indexOf('\n}\n',first);
    assert.ok(first>=0&&end>first,name);
    return src.slice(first,end+2);
  }).join('\n');
  const source={id:'P4',step_name:'Registrar en ERP y archivar expediente'};
  const snapshot={version:1,processSteps:[source]},e={snapshot};
  const item={sourceStepId:'P4',sourceStepName:source.step_name,transformation:'Se mantiene',
    problemResolved:'NO',futureActor:'Administración',tool:'ERP',inputs:['PDF'],
    outputs:['RECORD'],controlsRisk:'Control de duplicados',automationAi:'',
    humanSupervision:''};
  const p={sourceSnapshotVersion:1,items:[item],aiDraft:{
    proposal:{items:[{source_step_id:'P4',transformation:'Se automatiza'}],review:{issues:[]}}
  },review:{decisions:{P4:{status:'ACCEPT',note:'Justificación suficiente de la propuesta.'}}}};
  const sandbox={String,Array,Set,
    TOBE_TRANSFORMATIONS:['Se mantiene','Se modifica','Se elimina','Se automatiza',
      'Se asiste con IA','Requiere decisión humana','Se incorpora control'],
    confirmedSnapshot:x=>x.snapshot,tobeSourceSteps:x=>x.snapshot.processSteps,
    fieldOptions:()=>[],selectedOtherMissingDetail:()=>false,
    tobeArtifactValues:value=>({resolved:value,unknown:[]}),
    tobeHumanReviewRecord:(x,proposal)=>proposal.review,
    tobeFlowIntegrity:()=>null,tobeCoherenceFindings:()=>[],
    tobeAddedSteps:proposal=>proposal.addedSteps||[],
    tobeFlowItemName:step=>step.stepName||step.sourceStepName};
  vm.createContext(sandbox);vm.runInContext(code,sandbox);
  assert.match(sandbox.tobeReviewReadiness(e,p),/Motivo para conservar la actividad/);
  item.problemResolved='Se conserva el registro humano y se documentan sus riesgos.';
  assert.match(sandbox.tobeReviewReadiness(e,p),/La propuesta IA.*Se automatiza/);
  p.review.decisions.P4.status='MODIFY';
  assert.equal(sandbox.tobeReviewReadiness(e,p),null);
  p.addedSteps=[{stepName:'Validar datos',futureActor:'Administración',
    transformation:'Se incorpora control',problemResolved:'NO'}];
  assert.match(sandbox.tobeReviewReadiness(e,p),/motivo de la actividad nueva/);
});
test('PG11 dynamic field help never overwrites existing consultant text',()=>{
  const start=src.indexOf('// [AUNEA-FE-PG11-TRANSFORMATION-LIVE-259] START'),
    end=src.indexOf('// [AUNEA-FE-PG11-TRANSFORMATION-LIVE-259] END',start);
  const handler=src.slice(start,end);
  assert.ok(start>=0&&end>start);
  const label={textContent:''},textarea={value:'Texto del consultor',placeholder:''},
    badge={textContent:''},message={textContent:''};
  const field={querySelector:query=>query==='[data-tobe-rationale-label]'?label:
    query==='[data-tobe-field="problemResolved"]'?textarea:null};
  const root={querySelector:query=>({
    '[data-tobe-rationale-wrapper]':field,'.tobe-selected-status':badge,
    '[data-tobe-transformation-message]':message
  })[query]||null};
  let onChange=null;
  const sandbox={document:{addEventListener:(type,fn)=>{
    if(type==='change')onChange=fn;
  },getElementById:()=>root},state:{activePage:'tobe'},
    tobeTransformationRationaleLabel:()=> 'Motivo de la modificación y problema que resuelve',
    tobeFieldHelp:()=> 'Explica el cambio con evidencia'};
  vm.createContext(sandbox);vm.runInContext(handler,sandbox);
  assert.ok(onChange);
  onChange({target:{dataset:{tobeField:'transformation'},value:'Se modifica',
    closest:()=>root}});
  assert.equal(label.textContent,'Motivo de la modificación y problema que resuelve');
  assert.equal(textarea.placeholder,'Explica el cambio con evidencia');
  assert.equal(textarea.value,'Texto del consultor');
  assert.equal(badge.textContent,'Se modifica');
});
// [AUNEA-UAT-PG11-FUTURE-FLOW-233] END
