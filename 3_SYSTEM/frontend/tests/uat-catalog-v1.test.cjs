// [AUNEA-UAT-RUNTIME-FIXTURE-020] Fase 8 regression — "Cargar caso UAT" (15-case catalog),
// "Limpiar datos UAT" and the "Generar N pasos UAT" stress tool. Uses the REAL diagnostic-master.min.json
// (not a synthetic schema) so UAT-12/13's "listo para cálculo E2E" claim is checked against the actual
// shipped Requiredness/Branch_Rule_ID/Ask_Mode contract, the same way tests/completion-model-v1.test.cjs
// already validates a minimal fully-worked engagement.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const noReaskCode=fs.readFileSync(path.join(root,'app-no-reask-v1.js'),'utf8');
const engineAdapterCode=fs.readFileSync(path.join(root,'app-engine-adapter-v1.js'),'utf8');
const uatFixturesCode=fs.readFileSync(path.join(root,'app-uat-fixtures-v1.js'),'utf8');
const realSchema=require('../data/diagnostic-master.min.json');

function makeCtx(){
  const state={companies:[],contacts:[],engagements:[],activeEngagementId:null,activePage:'',dirty:false,uatLastRun:null};
  const toasted=[],dirtyReasons=[];
  let confirmResult=true;
  const ctx={
    console,schema:realSchema,state,
    fieldOptions:id=>(realSchema.option_sets[id]||{}).options||[],
    labelFrom:(setId,v)=>v,
    companyById:id=>state.companies.find(c=>c.id===id)||null,
    contactById:id=>state.contacts.find(c=>c.id===id)||null,
    normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),
    setAnswer:()=>{},bindForms:()=>{},render:()=>{},setPage:()=>{},
    openModal:()=>{},closeModal:()=>{},runDiagnosis:()=>{},
    esc:v=>String(v??''),attr:v=>String(v??''),
    section:(title,sub,body,actions)=>`${body}${actions||''}`,
    now:()=>'2026-09-14T00:00:00.000Z',
    formatDateEs:v=>v,
    id:prefix=>`${prefix}-TEST-${Math.random().toString(36).slice(2,7)}`,
    audit:()=>{},persistRecoverySnapshot:()=>{},
    document:{querySelectorAll:()=>[],getElementById:()=>null},
    pages:{uat:()=>'<UAT_BASE>'},
    postBind:()=>{},
    runVisibleUAT:async()=>{},
    toast:msg=>{toasted.push(msg)},
    markDirty:msg=>{if(msg)dirtyReasons.push(msg)},
    confirm:()=>confirmResult
  };
  ctx.currentEng=()=>state.engagements.find(x=>x.id===state.activeEngagementId)||null;
  vm.createContext(ctx);
  vm.runInContext(noReaskCode,ctx);
  vm.runInContext(engineAdapterCode,ctx);
  vm.runInContext(uatFixturesCode,ctx);
  ctx.__toasted=toasted;ctx.__dirtyReasons=dirtyReasons;
  ctx.__setConfirm=v=>{confirmResult=v};
  return ctx;
}

test('UAT_CATALOG has exactly the 15 cases from the brief, each with a title/purpose/build()',()=>{
  const ctx=makeCtx();
  assert.equal(ctx.uatCatalog().length,15);
  ctx.uatCatalog().forEach(c=>{
    assert.equal(typeof c.title,'string');assert.ok(c.title.length>0);
    assert.equal(typeof c.purpose,'string');assert.ok(c.purpose.length>0);
    assert.equal(typeof c.build,'function');
  });
});

test('every case builds a UAT--prefixed bundle and never precharges diagnosticOutput or scenarioResults — real calculation must always run for real',()=>{
  const ctx=makeCtx();
  ctx.uatCatalog().forEach((c,i)=>{
    const b=c.build();
    assert.match(b.company.id,/^UAT-/,`case ${i+1} company id`);
    assert.match(b.contact.id,/^UAT-/,`case ${i+1} contact id`);
    assert.match(b.engagement.id,/^UAT-/,`case ${i+1} engagement id`);
    b.engagement.processSteps.forEach(s=>assert.match(s.id,/^UAT-/,`case ${i+1} step id`));
    b.engagement.frictions.forEach(f=>assert.match(f.id,/^UAT-/,`case ${i+1} friction id`));
    assert.equal(b.engagement.diagnosticOutput,null,`case ${i+1} must never precharge diagnosticOutput`);
    assert.equal(b.engagement.scenarioResults.length,0,`case ${i+1} must never precharge scenarioResults`);
    if(Array.isArray(b.extraContacts))b.extraContacts.forEach(c2=>assert.match(c2.id,/^UAT-/,`case ${i+1} extra contact id`));
  });
});

test('UAT-10 ("caso incompleto con blockers") has no active steps and confirmedAsIs=false — real blockers, not simulated',()=>{
  const ctx=makeCtx();
  const b=ctx.uatCatalog()[9].build();
  assert.equal(b.engagement.processSteps.length,0);
  assert.equal(b.engagement.confirmedAsIs,false);
  const missing=ctx.canonicalMissingRequired(b.engagement);
  assert.ok(missing.includes('Mapa AS-IS'));
  assert.ok(missing.includes('Confirmación AS-IS'));
  assert.ok(missing.length>2,'must also be missing real REQUIRED_90M fields, not just the two structural blockers');
});

test('UAT-11 ("DF098 completo") serializes Next_Step as a real "acción — owner — fecha" string, matching the real DROPDOWN_WITH_OWNER_DATE contract',()=>{
  const ctx=makeCtx();
  const b=ctx.uatCatalog()[10].build();
  assert.match(b.engagement.answers.DF098,/^.+ — .+ — .+$/);
  assert.ok(b.engagement.answerDetails.DF098__action);
  assert.ok(b.engagement.answerDetails.DF098__owner);
  assert.ok(b.engagement.answerDetails.DF098__date);
});

test('UAT-12 and UAT-13 are genuinely ready to calculate against the REAL Diagnostic Master — every REQUIRED_90M field answered, AS-IS confirmed, all 5 engine gates resolved',()=>{
  const ctx=makeCtx();
  [11,12].forEach(idx=>{
    const b=ctx.uatCatalog()[idx].build();
    const missing=ctx.canonicalMissingRequired(b.engagement);
    assert.equal(missing.length,0,`UAT-${idx+1} missing: ${JSON.stringify(missing)}`);
    const unresolved=ctx.unresolvedEngineGates(b.engagement);
    assert.equal(unresolved.length,0,`UAT-${idx+1} unresolved gates: ${JSON.stringify(unresolved)}`);
  });
});

test('UAT-15 links multiple contacts to the same engagement',()=>{
  const ctx=makeCtx();
  const b=ctx.uatCatalog()[14].build();
  assert.ok(Array.isArray(b.extraContacts)&&b.extraContacts.length>=2);
  assert.equal(b.engagement.contactIds.length,1+b.extraContacts.length);
});

test('loadUatCase(n) inserts the case into state (companies/contacts/engagements incl. extraContacts), opens it, and never touches unrelated state',()=>{
  const ctx=makeCtx();
  ctx.loadUatCase(15);
  assert.equal(ctx.state.companies.length,1);
  assert.equal(ctx.state.contacts.length,4);
  assert.equal(ctx.state.engagements.length,1);
  assert.equal(ctx.state.activeEngagementId,ctx.state.engagements[0].id);
  assert.equal(ctx.state.activePage,'diagnostico');
  assert.match(ctx.__toasted.at(-1),/UAT-15/);
});

test('loadUatCase on an unknown case number toasts and touches nothing',()=>{
  const ctx=makeCtx();
  ctx.loadUatCase(999);
  assert.equal(ctx.state.companies.length,0);
  assert.match(ctx.__toasted.at(-1),/no encontrado/i);
});

test('clearUatData removes only UAT--prefixed companies/contacts/engagements — real client data is never touched',()=>{
  const ctx=makeCtx();
  ctx.state.companies.push({id:'CMP-REAL-1',name:'Cliente real'});
  ctx.state.contacts.push({id:'CON-REAL-1',companyId:'CMP-REAL-1',name:'Contacto real'});
  ctx.state.engagements.push({id:'ENG-REAL-1',companyId:'CMP-REAL-1',contactIds:['CON-REAL-1']});
  ctx.loadUatCase(1);
  ctx.loadUatCase(6);
  assert.equal(ctx.state.companies.length,3);
  ctx.state.activeEngagementId=ctx.state.engagements.find(e=>e.id.startsWith('UAT-')).id;
  ctx.clearUatData();
  assert.deepEqual(ctx.state.companies.map(c=>c.id),['CMP-REAL-1']);
  assert.deepEqual(ctx.state.contacts.map(c=>c.id),['CON-REAL-1']);
  assert.deepEqual(ctx.state.engagements.map(e=>e.id),['ENG-REAL-1']);
  assert.equal(ctx.state.activeEngagementId,null,'the active UAT engagement must be cleared, never left dangling');
});

test('clearUatData does nothing without confirmation',()=>{
  const ctx=makeCtx();
  ctx.loadUatCase(1);
  ctx.__setConfirm(false);
  ctx.clearUatData();
  assert.equal(ctx.state.companies.length,1);
  assert.equal(ctx.state.engagements.length,1);
});

test('generateUatStressSteps requires an open engagement',()=>{
  const ctx=makeCtx();
  ctx.generateUatStressSteps(10);
  assert.match(ctx.__toasted.at(-1),/Abre o crea un estudio/);
});

test('generateUatStressSteps(N) appends N UAT-STEP-STRESS-prefixed steps chained onto the open engagement, at 10/25/50, without touching existing steps identity',()=>{
  const ctx=makeCtx();
  ctx.loadUatCase(1);
  const before=ctx.currentEng().processSteps.map(s=>s.id);
  [10,25,50].forEach(n=>{
    const e=ctx.currentEng();
    const startLen=e.processSteps.length;
    ctx.generateUatStressSteps(n);
    assert.equal(e.processSteps.length,startLen+n);
    const added=e.processSteps.slice(startLen);
    added.forEach(s=>assert.match(s.id,/^UAT-STEP-STRESS-/));
    for(let i=0;i<added.length-1;i++)assert.equal(added[i].normal_next_step,added[i+1].id);
  });
  before.forEach((id,i)=>assert.equal(ctx.currentEng().processSteps[i].id,id,'pre-existing steps must keep their identity/order'));
});

test('uatCatalogHtml/uatCleanupHtml/uatStressHtml render without throwing and list all 15 cases',()=>{
  const ctx=makeCtx();
  const catalogHtml=ctx.uatCatalogHtml();
  for(let i=1;i<=15;i++)assert.match(catalogHtml,new RegExp(`UAT-${String(i).padStart(2,'0')}`));
  assert.doesNotThrow(()=>ctx.uatCleanupHtml());
  assert.doesNotThrow(()=>ctx.uatStressHtml());
});
