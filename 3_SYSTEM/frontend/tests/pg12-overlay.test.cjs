'use strict';
// [AUNEA-UAT-PG12-OVERLAY-472] START — source-preserving PG12 single-map regression.
// SOURCE: Simulator CANONICAL PG12; DEC-050/055/075. No UI-generated economics.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'pages/comparison.js'),'utf8');
const process=fs.readFileSync(path.join(root,'domain/process.js'),'utf8');
// Load the real shared semantic owner in the isolated PG12 runtime harness.
const semanticCore=fs.readFileSync(path.join(root,'core/state.js'),'utf8');
const semanticBlock=semanticCore.match(/\/\/ \[AUNEA-FE-UI-SEMANTIC-475\] START[\s\S]*?\/\/ \[AUNEA-FE-UI-SEMANTIC-475\] END/)?.[0];
const regionBlock=semanticCore.match(/\/\/ \[AUNEA-FE-UI-REGION-L3-482\] START[\s\S]*?\/\/ \[AUNEA-FE-UI-REGION-L3-482\] END/)?.[0];
assert.ok(semanticBlock,'PG12 requires the canonical semantic structure owner');
const uiRenderer=fs.readFileSync(path.join(root,'ui/renderer.js'),'utf8');
const sharedBlock=id=>uiRenderer.match(new RegExp('// \\['+id+'\\] START[\\s\\S]*?// \\['+id+'\\] END'))?.[0];
const modeBlock=sharedBlock('AUNEA-FE-UI-CHOICES-L2-478');
const disclosureBlock=sharedBlock('AUNEA-FE-GLOBAL-DISCLOSURE-450');
const dataBlock=sharedBlock('AUNEA-FE-UI-DATA-L3-481');
assert.ok(modeBlock&&disclosureBlock&&dataBlock&&regionBlock,'PG12 requires actual shared UI owners');
const decision=s=>!!(s&&String(s.step_type)==='ST04');
const graphFrom=process.indexOf('function processGraphData(e,steps){'),
  graphTo=process.indexOf('function processNodeIconName(',graphFrom);
assert.ok(graphFrom>=0&&graphTo>graphFrom,'Process graph projection is required');
const graph=vm.runInNewContext(process.slice(graphFrom,graphTo)+';processGraphData',
  {processDecisionStep:decision});
const original=[
  {id:'S1',step_name:'Recibir factura',step_type:'ST02',actor:'ADMIN',tool:'EMAIL',
    active_time:3,normal_next_step:'S2'},
  {id:'S2',step_name:'Determinar aprobación',step_type:'ST04',actor:'ADMIN',tool:'EMAIL',
    normal_next_step:'S3',exception_path:{destination_step:'S4'}},
  {id:'S3',step_name:'Aprobar factura',step_type:'ST05',actor:'MANAGER',tool:'EMAIL',
    wait_time:720,normal_next_step:'S4'},
  {id:'S4',step_name:'Registrar factura',step_type:'ST02',actor:'ADMIN',tool:'ERP',
    rework_time:5,normal_next_step:'__END__'}
];
const source={version:2,processSteps:original,
  frictions:[{affected_steps:['S1'],friction_type:'P01',signal:'Sin seguimiento'}],
  risks:[{step_ids:['S3'],description:'Aprobación omitida'}]};
const makeItem=(s,t='Se modifica')=>({
  id:'T-'+s.id,sourceStepId:s.id,sourceStepName:s.step_name,transformation:t,
  futureActor:s.actor,tool:s.tool,inputs:['PDF'],outputs:['DOCUMENT'],
  problemResolved:'Mejorar trazabilidad',automationAi:'Avisos por reglas',
  humanSupervision:'Manager',controlsRisk:'Auditoría',_details:{}
});
function harness(){
  const proposal={version:4,status:'REVIEWED',sourceSnapshotVersion:2,
    items:original.map(s=>makeItem(s)),
    flow:{startStepId:'S1',routes:{
      S1:{normal:'S2'},S2:{normal:'S3',exception:'S4'},
      S3:{normal:'S4'},S4:{normal:'__END__'}
    },addedSteps:[]}};
  const engagement={id:'E1',confirmedSnapshots:[source]};
  const nativeCalls=[];
  const nativeMap=(e,steps,fr,start,finish,tab,readonly)=>{
    nativeCalls.push({steps:steps.map(x=>x.id),readonly,tab,start,finish,frictions:fr.length});
    const layout=graph(e,steps),cells=layout.nodes.map(n=>{
      const pos=layout.positions.get(n.id);
      return '<div class="process-graph-cell" style="grid-row:'+pos.row+
        ';grid-column:'+pos.col+'" data-graph-node="'+n.id+'">'+
        '<div class="graph-flow-step">NATIVE '+n.id+'</div></div>';
    }).join('');
    return '<div class="flow-canvas client-process-canvas process-graph-canvas process-graph-readonly">'+
      '<div class="process-graph-board" style="--graph-cols:'+layout.cols+
      ';--graph-rows:'+layout.rows+';--graph-card-height:286px"'+
      ' data-graph-edges="[]" data-graph-branches="[]">'+
      '<svg class="process-graph-lines"></svg>'+cells+'</div></div>';
  };
  const context={
    processGraphHtml:nativeMap,graphNodeCard:(_e,step)=>'<div class="graph-flow-step">NATIVE '+step.id+'</div>',
    drawProcessGraph:()=>{},
    processGraphData:graph,processRefIncludes:(vals,id)=>Array.isArray(vals)&&vals.map(String).includes(String(id)),
    currentEng:()=>engagement,confirmedSnapshot:()=>source,latestTobe:()=>proposal,
    tobeProposalSnapshot:()=>source,
    tobeAddedSteps:p=>p.flow.addedSteps,
    tobeFlowOwner:p=>proposal.flow,
    tobeFutureSteps:()=>{
      const live=original.filter(s=>proposal.items.some(i=>i.sourceStepId===s.id&&i.transformation!=='Se elimina'))
        .concat(proposal.flow.addedSteps.map(a=>({
          id:a.id,step_name:a.stepName,step_type:'ST02'
        })));
      return live.map(s=>({...s,normal_next_step:proposal.flow.routes[s.id]?.normal??s.normal_next_step,
        exception_path:proposal.flow.routes[s.id]?.exception?
          {destination_step:proposal.flow.routes[s.id].exception}:s.exception_path}));
    },
    tobeFlowItemId:i=>String(i.isAddition?i.id:i.sourceStepId),
    tobeFlowItemName:i=>String(i.isAddition?i.stepName:i.sourceStepName),
    tobeFlowItem:(_e,p,id)=>[...p.items,...p.flow.addedSteps].find(i=>
      String(i.isAddition?i.id:i.sourceStepId)===String(id)),
    tobeCoherenceFindings:()=>[{stepId:'S3',severity:'WARNING',message:'Verificar permisos'}],
    labelFrom:(_,v)=>v||'',
    esc:v=>String(v).replace(/[&<>"']/g,ch=>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
    attr:v=>String(v).replace(/"/g,'&quot;'),
    num:v=>String(v),
    tobeArtifactDisplay:values=>values?.join(' · ')||'No disponible',
    currentDiagnosticOutput:()=>({process_time_projection:{
      annual_active_hours:60,annual_wait_exposure_hours:720,annual_rework_hours:12
    }}),
    pageTop:(_title,subtitle)=>'<header>'+subtitle+'</header>',
    auneaEmptyState:()=>'<p>Esperando revisión</p>',
    state:{activePage:'comparacion'}
  };
  const api=vm.runInNewContext(semanticBlock+'\n'+regionBlock+'\n'+disclosureBlock+'\n'+modeBlock+'\n'+dataBlock+'\n'+code+
    ';({pg12OverlayModel,pg12OverlayHtml,pg12ComparisonCounters,pg12CountAuditHtml,pg12OriginalSignals,tobeComparisonPage})',context);
  return {api,proposal,engagement,nativeCalls,context};
}
test('PG12 renders exactly one map with three layer modes and no split view',()=>{
  const {api,nativeCalls}=harness(),html=api.tobeComparisonPage();
  assert.equal((html.match(/class="process-graph-board"/g)||[]).length,1);
  assert.equal((html.match(/<svg class="process-graph-lines"/g)||[]).length,1);
  assert.equal((html.match(/<svg class="pg12-future-lines"/g)||[]).length,1);
  assert.equal(nativeCalls.length,1,'the actual AS-IS renderer must be called exactly once');
  assert.deepEqual(nativeCalls[0].steps,['S1','S2','S3','S4']);
  assert.equal(nativeCalls[0].readonly,true);
  assert.match(html,/NATIVE S1/);
  assert.doesNotMatch(html,/pg12-side-by-side|pg12-process-comparison/);
  assert.match(html,/data-pg12-view="actual"/);
  assert.match(html,/data-pg12-view="proposed"/);
  assert.match(html,/data-pg12-view="comparison"/);
  assert.match(html,/aunea-ui-work-surface/);
  assert.equal((html.match(/data-aunea-ui-level="section"/g)||[]).length,3);
  assert.equal((html.match(/data-aunea-ui-level="subsection"/g)||[]).length,1);
  assert.match(html,/data-aunea-ui-level="block"/);
  assert.equal((html.match(/data-aunea-ui-level="datum"/g)||[]).length,6);
  assert.doesNotMatch(html,/data-tobe-select/);
});
test('PG12 retains original SÍ/NO routes and the read-only future route layer',()=>{
  const {api,engagement,proposal}=harness(),model=api.pg12OverlayModel(engagement,proposal,source);
  assert.ok(model.originalEdges.some(e=>e.from==='S2'&&e.to==='S3'&&e.label==='SÍ'));
  assert.ok(model.originalEdges.some(e=>e.from==='S2'&&e.to==='S4'&&e.label==='NO'));
  assert.ok(model.futureEdges.some(e=>e.from==='S2'&&e.to==='S4'&&e.label==='NO'));
});
test('PG12 keeps an eliminated original visible without treating it as a future activity',()=>{
  const {api,engagement,proposal}=harness();
  proposal.items[2].transformation='Se elimina';
  proposal.flow.routes.S2.normal='S4';
  const model=api.pg12OverlayModel(engagement,proposal,source);
  assert.ok(model.nodes.some(n=>n.id==='S3'));
  assert.ok(!model.futureEdges.some(e=>e.to==='S3'));
  assert.match(api.pg12OverlayHtml(engagement,proposal,source,'S3'),/data-pg12-state="removed"/);
});
test('PG12 shows a new future activity in the same map without altering original edges',()=>{
  const {api,engagement,proposal}=harness();
  proposal.flow.addedSteps.push({id:'N1',isAddition:true,stepName:'Control documental',
    sourceStepId:'S2',transformation:'Se incorpora control',futureActor:'ADMIN',tool:'ERP'});
  proposal.flow.routes.S2.normal='N1';
  proposal.flow.routes.N1={normal:'S3'};
  const model=api.pg12OverlayModel(engagement,proposal,source);
  assert.ok(model.nodes.some(n=>n.id==='N1'));
  assert.ok(model.futureEdges.some(e=>e.to==='N1'));
  assert.ok(!model.originalEdges.some(e=>e.to==='N1'));
  assert.match(api.pg12OverlayHtml(engagement,proposal,source,'N1'),/data-pg12-state="added"/);
});
test('PG12 locates declared wait, rework, friction and risk without forecasting savings',()=>{
  const {api,engagement,proposal}=harness(),
    html=api.pg12OverlayHtml(engagement,proposal,source,'S3'),
    page=api.tobeComparisonPage();
  assert.match(html,/Espera 720 min/);
  assert.match(html,/Retrabajo 5 min/);
  assert.match(html,/1 avisos/);
  assert.match(html,/Comprobar contadores y procedencia/);
  assert.match(html,/Fricciones AS-IS: 1/);
  assert.match(html,/Riesgos AS-IS: 1/);
  assert.match(page,/No disponible con evidencia suficiente/);
  assert.doesNotMatch(code,/saveState\(|markDirty\(/);
});
test('PG12 blocks comparison until human review',()=>{
  const {api,proposal}=harness();
  proposal.status='DRAFT';
  assert.doesNotMatch(api.tobeComparisonPage(),/class="process-graph-board"/);
  assert.match(api.tobeComparisonPage(),/Esperando revisión/);
});
test('PG12 counters are exclusive and respond to real transformation/added-step changes',()=>{
  const {api,proposal,engagement}=harness();
  const counts=()=>api.pg12ComparisonCounters(api.pg12OverlayModel(engagement,proposal,source));
  let c=counts();
  assert.deepEqual([c.unchanged,c.changed,c.added,c.removed,c.warnings,c.blocking],
    [0,4,0,0,1,0]);
  proposal.items[0].transformation='Se mantiene';
  proposal.items[1].transformation='Se elimina';
  proposal.flow.addedSteps.push({id:'N1',isAddition:true,stepName:'Control',
    sourceStepId:'S1',transformation:'Se incorpora control'});
  c=counts();
  assert.deepEqual([c.unchanged,c.changed,c.added,c.removed,c.warnings],
    [1,2,1,1,1]);
  assert.equal(c.unchanged+c.changed+c.added+c.removed,5);
});

test('PG12 separates blocking constraints from ordinary observations',()=>{
  const {api,proposal,engagement}=harness();
  proposal.items[0].transformation='Se mantiene';
  const model=api.pg12OverlayModel(engagement,proposal,source);
  model.findings=[
    {stepId:'S1',severity:'WARNING',message:'Platform evidence pending'},
    {stepId:'S2',severity:'BLOCKING',message:'Human approval contradicted'}
  ];
  const counts=api.pg12ComparisonCounters(model);
  assert.equal(counts.warnings,1);
  assert.equal(counts.blocking,1);
  const html=api.pg12CountAuditHtml(model,source,counts);
  assert.match(html,/Hallazgos pendientes: 1/);
  assert.match(html,/Bloqueos: 1/);
  assert.match(html,/Los cuatro contadores de transformación/);
});

test('PG12 native route renderer preserves the NO branch in Actual and Propuesto',()=>{
  const source=code.slice(code.indexOf('function pg12DrawOverlay(){'),
    code.indexOf('function registerPg12Interactions(){'));
  assert.ok(source.includes('function pg12RouteSetsEqual('));
  const initial=[{from:'__START__',to:'S1',label:''},{from:'S1',to:'S2',label:''},
    {from:'S2',to:'S3',label:'SÍ'},{from:'S2',to:'S4',label:'NO'},
    {from:'S3',to:'S4',label:''},{from:'S4',to:'__END__',label:''}];
  const future=[...initial],futureChanged=future.map(x=>
    x.from==='S2'&&x.label==='NO'?{...x,to:'__END__'}:x);
  function run(mode,planned){
    const makeSvg=(name)=>{
      const classes=new Set([name]);
      return {innerHTML:'',classList:{
        add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)}};
    };
    const base=makeSvg('process-graph-lines'),overlay=makeSvg('pg12-future-lines');
    const board={
      dataset:{graphEdges:JSON.stringify(initial),
        graphBranches:JSON.stringify([{decisionId:'S2',merge:'S4'}]),
        pg12FutureEdges:JSON.stringify(planned),
        pg12FutureBranches:JSON.stringify([{decisionId:'S2',merge:planned===future?'S4':'__END__'}]),
        pg12Mode:mode},
      querySelector:query=>query==='.pg12-future-lines'?overlay:
        query==='.process-graph-lines'?[base,overlay].find(v=>v.classList.contains('process-graph-lines')):null
    };
    const calls=[];
    const drawProcessGraph=current=>{
      const edges=JSON.parse(current.dataset.graphEdges);
      const branches=JSON.parse(current.dataset.graphBranches);
      const svg=current.querySelector('.process-graph-lines');
      calls.push({edges:edges.map(x=>x.label||''),branches,svg:svg===base?'base':'overlay'});
      svg.innerHTML='<defs id="auneaGraphArrowMain"></defs>'+
        edges.map(x=>'<path data-label="'+x.label+'"></path>').join('');
    };
    const doc={querySelector:()=>board};
    const context={
      document:doc,drawProcessGraph,pg12EdgeKey:e=>
        [String(e.from),String(e.to),String(e.label||'')].join('|')
    };
    const fn=vm.runInNewContext(source+';pg12DrawOverlay',context);
    fn();
    assert.equal(board.dataset.graphEdges,JSON.stringify(initial));
    assert.ok(calls[0].edges.includes('NO'));
    if(mode==='proposed'){
      assert.equal(calls.length,1,'Proposed must invoke only the native renderer');
      assert.ok(base.innerHTML.includes('data-label="NO"'));
    }
    if(mode==='comparison'&&planned===futureChanged){
      assert.equal(calls.length,2,'Comparison overlays the native future renderer');
      assert.ok(overlay.innerHTML.includes('data-label="NO"'));
      assert.ok(overlay.innerHTML.includes('pg12FutureArrowMain'));
      assert.equal(base.classList.contains('process-graph-lines'),true);
      assert.equal(overlay.classList.contains('process-graph-lines'),false);
    }
    return calls;
  }
  assert.equal(run('actual',future).length,1);
  assert.equal(run('proposed',future).length,1);
  assert.equal(run('comparison',future).length,1,'Identical routes need no duplicate stroke');
  assert.equal(run('comparison',futureChanged).length,2);
});
test('PG12 audit reconciles warnings from added and unlinked steps',()=>{
  const {api,proposal,engagement}=harness();
  proposal.flow.addedSteps.push({id:'N1',isAddition:true,stepName:'Nuevo control',
    sourceStepId:'S1',transformation:'Se incorpora control'});
  const model=api.pg12OverlayModel(engagement,proposal,source);
  model.findings=[
    {stepId:'S1',severity:'WARNING',message:'Original issue'},
    {stepId:'N1',severity:'WARNING',message:'New TO-BE issue'},
    {stepId:'',severity:'WARNING',message:'General issue'},
    {stepId:'S2',severity:'BLOCKING',message:'Separate blocker'}
  ];
  const counts=api.pg12ComparisonCounters(model);
  assert.equal(counts.warnings,3);
  assert.equal(counts.blocking,1);
  const html=api.pg12CountAuditHtml(model,source,counts);
  assert.match(html,/Nuevo control · nueva TO-BE/);
  assert.match(html,/Observaciones sin actividad vinculada/);
  assert.match(html,/Hallazgos pendientes: 3/);
  assert.match(html,/Bloqueos: 1/);
  const cells=html.match(/<td[^>]*>/g)||[];
  assert.ok(cells.length>=24,'source+new+orphan warnings require all audit rows');
});
test('PG12 refuses to mix a reviewed TO-BE with a materially changed AS-IS',()=>{
  const {context}=harness();
  context.tobeAsisCompatibility=()=>({
    compatible:false,message:'AS-IS v3 contiene cambios reales frente a la fuente TO-BE v2.'
  });
  context.auneaUiFeedbackMessage=(_level,message)=>'<p>'+message+'</p>';
  const page=vm.runInNewContext(code+';tobeComparisonPage()',context);
  assert.match(page,/contiene cambios reales/);
  assert.match(page,/Volver a TO-BE/);
  assert.doesNotMatch(page,/class="process-graph-board"/);
});
// [AUNEA-UAT-PG12-OVERLAY-472] END
