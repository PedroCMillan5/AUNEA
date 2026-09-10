// [AUNEA-UAT-PROC-010] START — Process/friction regression
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const code=fs.readFileSync(path.join(__dirname,'..','app-process-v1.js'),'utf8');
const eng={processSteps:[],frictions:[]};
const ctx={console,schema:{friction_pain_map:[{Friction_Type_ID:'P07',Pain_ID:'P07'}]},state:{returnTo:null},fieldOptions:()=>[],normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),currentEng:()=>eng,activeSteps:e=>(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),activeFrictions:e=>(e.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),bindForms:()=>{},markDirty:()=>{},render:()=>{},attr:v=>String(v??''),esc:v=>String(v??''),labelFrom:(s,v)=>v,num:v=>String(v||0),pageTop:()=>'',section:(t,s,body)=>body,fmtDate:()=>'',document:{querySelectorAll:()=>[]}};vm.createContext(ctx);vm.runInContext(code,ctx);test('duration normalization keeps active/wait/rework comparable',()=>{assert.equal(ctx.minutesFrom(2,'h'),120);assert.equal(ctx.minutesFrom(1,'day'),1440)});test('friction pain is derived, not selected',()=>{assert.equal(ctx.painForFriction('P07'),'P07');assert.doesNotMatch(code,/id="fr_pain"/)});test('v1.1 editor includes communication channels',()=>{assert.match(code,/OS_COMM_CHANNEL/);assert.match(code,/communication_channels/)});test('friction UI enforces affected step selection before save',()=>{assert.match(code,/!f\.affected_steps\.length/)});

test('moveStep swaps only array position with the nearest ACTIVE neighbor, skipping SUPERSEDED steps, and never touches normal_next_step/exception_path/affected_steps',()=>{
  eng.processSteps=[
    {id:'S1',status:'ACTIVE',normal_next_step:'S2',exception_path:{destination_step:'S3'}},
    {id:'S2',status:'SUPERSEDED',normal_next_step:'S3'},
    {id:'S3',status:'ACTIVE',normal_next_step:null}
  ];
  eng.frictions=[{id:'F1',status:'ACTIVE',affected_steps:['S1','S3']}];
  ctx.moveStep('S1',1);
  assert.deepEqual(eng.processSteps.map(x=>x.id),['S3','S2','S1'],'S1 must swap with the nearest ACTIVE neighbor (S3), jumping over the SUPERSEDED S2');
  assert.equal(eng.processSteps.find(x=>x.id==='S1').normal_next_step,'S2','normal_next_step must survive reordering untouched');
  assert.deepEqual(eng.processSteps.find(x=>x.id==='S1').exception_path,{destination_step:'S3'},'exception_path must survive reordering untouched');
  assert.deepEqual(eng.frictions[0].affected_steps,['S1','S3'],'friction affected_steps must survive reordering untouched');
});

test('stepOrderDiscrepancies flags when the visual order no longer matches normal_next_step, without correcting it',()=>{
  const steps=[{id:'A',step_name:'Alta',normal_next_step:'C'},{id:'B',step_name:'Revisión',normal_next_step:null},{id:'C',step_name:'Cierre',normal_next_step:null}];
  const gaps=ctx.stepOrderDiscrepancies(steps);
  assert.equal(gaps.length,1);
  assert.equal(gaps[0].from.id,'A');
  assert.equal(gaps[0].to.id,'C');
});

test('"+ Crear nuevo paso como siguiente" links back to the origin step id without inventing a new normal_next_step shape',()=>{
  assert.match(code,/\+ Crear nuevo paso como siguiente/);
  assert.match(code,/function openStepModal\(stepId=null,linkFromStepId=null\)/);
  assert.match(code,/if\(linkFromStepId\)\{const origin=e\.processSteps\.find\(x=>x\.id===linkFromStepId\);if\(origin\)origin\.normal_next_step=s\.id\}/);
});

test('reorder buttons are wired to moveStep in both directions',()=>{
  assert.match(code,/data-move-step-up/);
  assert.match(code,/data-move-step-down/);
  assert.match(code,/moveStep\(b\.dataset\.moveStepUp,-1\)/);
  assert.match(code,/moveStep\(b\.dataset\.moveStepDown,1\)/);
});
// [AUNEA-UAT-PROC-010] END
