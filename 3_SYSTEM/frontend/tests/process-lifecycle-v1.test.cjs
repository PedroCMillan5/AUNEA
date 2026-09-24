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

test('layer confirmations require map, frictions, risks and impact before sealing DF093',()=>{
  const missing={processSteps:[],frictions:[],risks:[],economicInputs:[],answers:{DF014:'Inicio'},confirmedAsIs:false,processTab:'cliente'};
  const ctxMissing=makeCtx(missing);
  ctxMissing.confirmAsIs();
  assert.equal(missing.confirmedAsIs,false);
  assert.match(ctxMissing.__toasts.at(-1),/límites inicial y final|al menos un paso/);

  const e={processSteps:[],frictions:[],risks:[],economicInputs:[],answers:{DF014:'Inicio',DF015:'Fin'},confirmedAsIs:false,processTab:'cliente'};
  const ctx=makeCtx(e);
  ctx.confirmAsIs();
  assert.equal(e.layerConfirmations.map,true,'Inicio → Fin is a valid minimum map');
  assert.equal(e.confirmedAsIs,false,'map alone must not seal the full AS-IS');
  e.processTab='fricciones';ctx.confirmAsIs();assert.equal(e.layerConfirmations.frictions,true);
  e.processTab='riesgos';ctx.confirmAsIs();assert.equal(e.layerConfirmations.risks,true);
  e.processTab='impacto';ctx.confirmAsIs();
  assert.equal(e.layerConfirmations.impact,true);
  assert.equal(e.confirmedAsIs,true,'all four confirmed layers seal the shared AS-IS');
  assert.equal(e.answers.DF093,'YES');
  assert.ok(e.asIsConfirmedAt);
});
// [AUNEA-UAT-PROC-LIFECYCLE-030] END
