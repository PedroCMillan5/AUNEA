'use strict';
// [AUNEA-UAT-PG12-OVERLAY-472] START — source-preserving PG12 single-map regression.
// SOURCE: Simulator CANONICAL PG12; DEC-050/055/075. No UI-generated economics.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'pages/comparison.js'),'utf8');
const process=fs.readFileSync(path.join(root,'domain/process.js'),'utf8');
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
  const context={
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
  const api=vm.runInNewContext(code+
    ';({pg12OverlayModel,pg12OverlayHtml,pg12OriginalSignals,tobeComparisonPage})',context);
  return {api,proposal,engagement};
}
test('PG12 renders exactly one map with three layer modes and no split view',()=>{
  const {api}=harness(),html=api.tobeComparisonPage();
  assert.equal((html.match(/class="pg12-overlay-board"/g)||[]).length,1);
  assert.equal((html.match(/<svg class="pg12-overlay-lines"/g)||[]).length,1);
  assert.doesNotMatch(html,/pg12-side-by-side|pg12-process-comparison/);
  assert.match(html,/data-pg12-view="actual"/);
  assert.match(html,/data-pg12-view="proposed"/);
  assert.match(html,/data-pg12-view="comparison"/);
  assert.match(html,/aunea-ui-work-surface/);
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
  assert.match(api.pg12OverlayHtml(engagement,proposal,source,'S3'),/pg12-node-removed/);
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
  assert.match(api.pg12OverlayHtml(engagement,proposal,source,'N1'),/pg12-node-added/);
});
test('PG12 locates declared wait, rework, friction and risk without forecasting savings',()=>{
  const {api,engagement,proposal}=harness(),
    html=api.pg12OverlayHtml(engagement,proposal,source,'S3'),
    page=api.tobeComparisonPage();
  assert.match(html,/Espera AS-IS 720 min/);
  assert.match(html,/Retrabajo AS-IS 5 min/);
  assert.match(html,/Fricciones 1/);
  assert.match(html,/Riesgos 1/);
  assert.match(html,/Avisos 1/);
  assert.match(page,/No disponible con evidencia suficiente/);
  assert.doesNotMatch(code,/saveState\(|markDirty\(/);
});
test('PG12 blocks comparison until human review',()=>{
  const {api,proposal}=harness();
  proposal.status='DRAFT';
  assert.doesNotMatch(api.tobeComparisonPage(),/class="pg12-overlay-board"/);
  assert.match(api.tobeComparisonPage(),/Esperando revisión/);
});
// [AUNEA-UAT-PG12-OVERLAY-472] END
