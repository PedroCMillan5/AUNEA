// [AUNEA-UAT-PROC-LIFECYCLE-030] START — AS-IS lifecycle regression
// Covers AUNEA-FE-PROC-LIFECYCLE-030 (domain/process-lifecycle.js): supersede-instead-of-delete and
// AS-IS confirmation. Archiving must never physically drop a step/friction (traceability contract).
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'domain/process-lifecycle.js'),'utf8');
// Confirming the AS-IS closes PG09, and closing PG09 seals the confirmed snapshot.
const engagementCode=fs.readFileSync(path.join(root,'domain/engagement.js'),'utf8');
const indexHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');

function makeCtx(engagement){
  const toasts=[],dirty=[];
  const ctx={
    console,
    currentEng:()=>engagement,
    confirm:()=>true,
    markDirty:r=>{if(r)dirty.push(r)},
    render:()=>{},
    toast:m=>{toasts.push(m)},
    now:()=>'2026-09-14T00:00:00.000Z',
    audit:()=>{},schema:{version:'1.1',source:'test'},
    state:{engagements:[],companies:[],contacts:[]},
    companyById:()=>null,contactById:()=>null,contactFullName:c=>c&&c.name||'',
    activeSteps:e=>(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
    activeFrictions:e=>(e.frictions||[]).filter(x=>x.status!=='SUPERSEDED')
  };
  vm.createContext(ctx);
  vm.runInContext(engagementCode,ctx);
  vm.runInContext(code,ctx);
  ctx.__toasts=toasts;ctx.__dirty=dirty;
  return ctx;
}
const engagement=()=>({processSteps:[{id:'S1',status:'ACTIVE'},{id:'S2',status:'ACTIVE'}],frictions:[{id:'F1',status:'ACTIVE'}],answers:{},confirmedAsIs:false});

test('process lifecycle is wired into the runtime',()=>{
  assert.match(indexHtml,/<script src="domain\/process-lifecycle\.js"/);
});

test('supersedeStep marks SUPERSEDED without physically removing the step, and reopens AS-IS',()=>{
  const e=engagement();e.confirmedAsIs=true;
  const ctx=makeCtx(e);
  ctx.supersedeStep('S1');
  assert.equal(e.processSteps.length,2,'the step must survive physically for traceability');
  assert.equal(e.processSteps.find(s=>s.id==='S1').status,'SUPERSEDED');
  assert.equal(e.confirmedAsIs,false,'editing the flow reopens AS-IS confirmation');
});

test('supersedeFriction marks SUPERSEDED without physically removing the friction',()=>{
  const e=engagement();
  const ctx=makeCtx(e);
  ctx.supersedeFriction('F1');
  assert.equal(e.frictions.length,1);
  assert.equal(e.frictions[0].status,'SUPERSEDED');
});

test('confirmAsIs requires at least one active step and records DF093',()=>{
  const empty={processSteps:[{id:'S1',status:'SUPERSEDED'}],frictions:[],answers:{},confirmedAsIs:false};
  const ctxEmpty=makeCtx(empty);
  ctxEmpty.confirmAsIs();
  assert.equal(empty.confirmedAsIs,false,'an AS-IS with no active step cannot be confirmed');
  assert.match(ctxEmpty.__toasts.at(-1),/Añade al menos un paso/);

  const e=engagement();
  const ctx=makeCtx(e);
  ctx.confirmAsIs();
  assert.equal(e.confirmedAsIs,true);
  assert.equal(e.answers.DF093,'YES');
  assert.ok(e.asIsConfirmedAt);
});
// [AUNEA-UAT-PROC-LIFECYCLE-030] END
