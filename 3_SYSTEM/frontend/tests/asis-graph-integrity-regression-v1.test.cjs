// [AUNEA-UAT-ASIS-GRAPH-130] START — Persisted graph integrity regressions
// PURPOSE: Prevent visual fallback from disguising incomplete persisted AS-IS connections.
// SOURCE: Diagnostic Master v1.2 DF042/043; DEC-050/065; verified session export (17/10/2026).
// INPUTS: ProcessStep graph with an explicit branch and persisted next_step references.
// OUTPUTS: deterministic node/edge and pre-confirmation integrity assertions.
// SIDE_EFFECTS: none. CHANGE_RISK: HIGH.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const processSrc=fs.readFileSync(path.join(root,'domain/process.js'),'utf8');
const lifecycleSrc=fs.readFileSync(path.join(root,'domain/process-lifecycle.js'),'utf8');
function extract(source,start,end){
  const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
  assert.ok(i>=0&&j>i,'missing function extraction marker: '+start);
  return source.slice(i,j);
}
const code=[
  extract(processSrc,'function processGraphData(e,steps){','function processNodeIconName('),
  extract(lifecycleSrc,'function processLayerIntegrityIssues(e,key){','function captureIntegrityIssues(e){')
].join('\n');
const ctx={
  schema:{fields:[]},
  activeSteps:e=>(e.processSteps||[]).filter(s=>s.status!=='SUPERSEDED'),
  activeFrictions:e=>e.frictions||[],
  processDecisionStep:s=>s.step_type==='ST04'||s._ui?.has_decision===true,
  normalizeArray:v=>Array.isArray(v)?v:v==null||v===''?[]:[v]
};
vm.createContext(ctx);vm.runInContext(code,ctx);
const step=(id,next,type='ST02',alternate=null)=>({
  id,status:'ACTIVE',step_name:'Paso '+id,step_type:type,actor:'ADMIN',
  normal_next_step:next,exception_path:alternate?{destination_step:alternate}:null
});
function engagement(steps){return {processSteps:steps,frictions:[],risks:[],economicInputs:[],answers:{DF014:'Inicio',DF015:'Fin'}}}
test('a missing stored edge inside a branched map is a pending destination, not an implied next step',()=>{
  const steps=[
    step('A','B'),step('B',''),step('C','D','ST04','E'),
    step('D','E'),step('E','__END__')
  ];
  const g=ctx.processGraphData(engagement(steps),steps);
  const edge=g.edges.find(x=>x.from==='B');
  assert.ok(edge);
  assert.notEqual(edge.to,'C','a missing stored edge must not be inferred from array order');
  assert.equal(g.nodes.find(n=>n.id===edge.to)?.kind,'pending');
  const issues=Array.from(ctx.processLayerIntegrityIssues(engagement(steps),'map')).map(x=>x.message);
  assert.ok(issues.some(x=>/destino principal|siguiente paso|continuación/i.test(x)),issues.join(' / '));
  assert.ok(issues.some(x=>/inalcanzable|no se puede alcanzar/i.test(x)),issues.join(' / '));
});
test('all explicit routes in a branched map pass graph integrity validation',()=>{
  const steps=[
    step('A','B'),step('B','C'),step('C','D','ST04','E'),
    step('D','E'),step('E','__END__')
  ];
  assert.deepEqual(Array.from(ctx.processLayerIntegrityIssues(engagement(steps),'map')),[]);
  const g=ctx.processGraphData(engagement(steps),steps);
  assert.equal(g.edges.find(x=>x.from==='B').to,'C');
});
test('a disconnected step and a cycle without exit are detected before map confirmation',()=>{
  const steps=[
    step('A','B'),step('B','C'),step('C','D','ST04','E'),
    step('D','D'),step('E','__END__'),step('X','__END__')
  ];
  const issues=Array.from(ctx.processLayerIntegrityIssues(engagement(steps),'map')).map(x=>x.message).join(' / ');
  assert.match(issues,/inalcanzable|no se puede alcanzar/i);
  assert.match(issues,/fin|cierre|salida/i);
});
test('a linear sequence remains eligible for canonical order-based presentation',()=>{
  const steps=[step('A','B'),step('B','')];
  const g=ctx.processGraphData(engagement(steps),steps);
  assert.equal(g.edges.find(x=>x.from==='B').to,'__END__');
});
// [AUNEA-UAT-ASIS-GRAPH-130] END
