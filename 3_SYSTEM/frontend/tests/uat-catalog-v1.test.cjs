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
const noReaskCode=fs.readFileSync(path.join(root,'domain/no-reask.js'),'utf8');
const engineAdapterCode=fs.readFileSync(path.join(root,'services/engine-adapter.js'),'utf8');
const uatFixturesCode=fs.readFileSync(path.join(root,'uat/fixtures.js'),'utf8');
// Fixtures build real Engagements, so they need the module that owns the governed lifecycle.
const engagementCode=fs.readFileSync(path.join(root,'domain/engagement.js'),'utf8');
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
    auneaSelectControl:(id,opts,val,{extra='',placeholder='Selecciona…'}={})=>`<div class="canonical-aunea-select"><input type="hidden" id="${id}" value="${val||''}" ${extra}><details class="aunea-select"><summary><span>${placeholder}</span><i></i></summary><div class="aunea-select-menu">${(opts||[]).map(o=>`<button data-aunea-select-option="${id}" data-value="${o.value}">${o.label}</button>`).join('')}</div></details></div>`,
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
  vm.runInContext(engagementCode,ctx);
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


const studySuiteCode=fs.readFileSync(path.join(root,'uat/study-suite.js'),'utf8');

test('Study UAT suite contains exactly STUDY-UAT-001..120 grouped across PG01-PG15, S2 and E2E',()=>{
  const state={studyUatResults:{}},ctx={state,console,pages:{uat:()=>''},postBind:()=>{},now:()=>new Date().toISOString(),markDirty:()=>{},persistRecoverySnapshot:()=>{},render:()=>{},confirm:()=>true,esc:v=>String(v??''),section:(a,b,c,d)=>c+(d||''),document:{querySelectorAll:()=>[],getElementById:()=>null}};
  vm.createContext(ctx);vm.runInContext(studySuiteCode,ctx);
  const ids=vm.runInContext('STUDY_UAT_CATALOG.map(x=>x.id)',ctx);
  assert.equal(ids.length,120);
  assert.deepEqual([...ids],Array.from({length:120},(_,i)=>`STUDY-UAT-${String(i+1).padStart(3,'0')}`));
  const groups=vm.runInContext('STUDY_UAT_GROUPS.map(g=>g.id)',ctx);
  assert.deepEqual([...groups],['PG01','PG02','PG03','PG04','PG05','PG06','PG07','PG08','PG09','PG10','PG11','PG12','PG13','PG14','PG15','S2','E2E']);
});

test('Study UAT progress is QA-only and does not mutate operational collections',()=>{
  const state={studyUatResults:{},companies:[{id:'REAL-C'}],contacts:[{id:'REAL-CT'}],interactions:[{id:'REAL-I'}],opportunities:[{id:'REAL-O'}],engagements:[{id:'REAL-E'}],projects:[{id:'REAL-P'}]};
  const before=JSON.stringify({companies:state.companies,contacts:state.contacts,interactions:state.interactions,opportunities:state.opportunities,engagements:state.engagements,projects:state.projects});
  const ctx={state,console,pages:{uat:()=>''},postBind:()=>{},now:()=>new Date().toISOString(),markDirty:()=>{},persistRecoverySnapshot:()=>{},render:()=>{},confirm:()=>true,esc:v=>String(v??''),section:(a,b,c,d)=>c+(d||''),document:{querySelectorAll:()=>[],getElementById:()=>null}};
  vm.createContext(ctx);vm.runInContext(studySuiteCode,ctx);
  vm.runInContext("studyUatSet('STUDY-UAT-001','PASS')",ctx);
  assert.equal(state.studyUatResults['STUDY-UAT-001'].status,'PASS');
  const after=JSON.stringify({companies:state.companies,contacts:state.contacts,interactions:state.interactions,opportunities:state.opportunities,engagements:state.engagements,projects:state.projects});
  assert.equal(after,before);
});
