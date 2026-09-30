// [AUNEA-UAT-ENDTOEND-120] START — Execute the actual three Phase 3 seeds, not source-pattern checks.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const schema=JSON.parse(read('data/diagnostic-master.min.json'));
const cases=['invoices.json','unified-requests.json','email-orders.json'].map(file=>JSON.parse(read('uat/cases/'+file)));
function scenario(){
 const state={companies:[],contacts:[],opportunities:[],interactions:[],engagements:[],projects:[]};
 const ctx={state,console,postBind(){},document:{getElementById(){return null},querySelectorAll(){return []}},schema,
  companyById:id=>state.companies.find(x=>x.id===id),contactById:id=>state.contacts.find(x=>x.id===id),
  painForFriction:type=>schema.friction_pain_map.find(x=>x.Friction_Type_ID===type)?.Pain_ID||null,
  phase1CrmCompletenessReport:()=>({pass:true}),phase2StudyAssociationReport:()=>({pass:true}),
  toast(){},render(){},markDirty(){},persistRecoverySnapshot(){return true},confirm(){return true}};
 vm.createContext(ctx);vm.runInContext(read('uat/endtoend-cases.js'),ctx);
 return ctx;
}
test('three fixtures have specific coherent non-dummy data with canonical option values',()=>{
 const codes=new Set();
 for(const c of cases){
  assert.ok(c.key&&c.label&&c.opportunity.notes.length>70);
  assert.equal(c.steps.length,6);assert.equal(c.frictions.length,3);assert.equal(c.risks.length,2);
  assert.ok(!codes.has(c.key));codes.add(c.key);
  assert.equal(c.contacts.length,2);
  for(const [field,set] of [['DF008','OS_SESSION_OBJECTIVE'],['DF009','OS_SUCCESS_DIMENSION'],['DF010','OS_CONSTRAINT_TYPE'],['DF020','OS_VARIANT_DIMENSION'],['DF029','OS_PRIORITY_CLASS'],['DF055','OS_DATA_QUALITY_ISSUE'],['DF073','OS_SENSITIVE_DATA'],['DF086','OS_FUTURE_OUTCOME'],['DF087','OS_MUST_KEEP'],['DF088','OS_NO_AUTOMATE'],['DF089','OS_PLATFORM_PREFERENCE'],['DF090','OS_SECURITY_CONSTRAINT'],['DF091','OS_CHANGE_CONSTRAINT']]){
   const options=new Set(schema.option_sets[set].options.map(o=>o.value));
   for(const v of c.answers[field]||[])assert.ok(options.has(v),c.key+' '+field+': '+v);
  }
  for(const s of c.steps){
   assert.ok(schema.option_sets.OS_STEP_TYPE.options.some(o=>o.value===s.type),c.key+' step type');
   assert.ok(schema.option_sets.OS_ACTOR_ROLE.options.some(o=>o.value===s.actor),c.key+' actor');
   assert.ok(schema.option_sets.OS_TOOL_CATEGORY.options.some(o=>o.value===s.tool),c.key+' tool');
   assert.ok(Number.isFinite(s.active)&&Number.isFinite(s.wait)&&Number.isFinite(s.rework)&&Number.isFinite(s.error));
  }
 }
});
test('seed all three into the same application state and exercise the actual per-study audit',()=>{
 const ctx=scenario(),rows=cases.map(c=>ctx.uat3Seed(c));
 for(const row of rows){
  ctx.state.companies.push(row.company);ctx.state.contacts.push(...row.contacts);
  ctx.state.opportunities.push(row.opportunity);ctx.state.interactions.push(row.interaction);ctx.state.engagements.push(row.engagement);
 }
 assert.equal(ctx.state.companies.length,3);assert.equal(ctx.state.contacts.length,6);assert.equal(ctx.state.engagements.length,3);
 assert.equal(new Set(rows.map(r=>r.engagement.companyId)).size,3);
 for(const row of rows){
  const e=row.engagement,a=ctx.uat3Audit(e);
  assert.equal(a.passed,a.total,e.id+': '+JSON.stringify(a.checks.filter(c=>!c.pass)));
  assert.equal(e.answers.DF021,row.source.answers.DF021);
  assert.equal(e.answers.DF022,'MONTH');
  assert.equal(e.answers.DF098,row.source.followup);
  assert.equal(e.confirmedAsIs,false);
  assert.equal(e.confirmedSnapshots.length,0);
  assert.equal(e.answers.DF093,undefined);
  assert.equal(e.processSteps.length,6);
  assert.equal(e.frictions.length,3);
  assert.equal(e.risks.length,2);
  assert.equal(e.economicInputs.length,2);
  assert.equal(new Set(e.processSteps.map(s=>s.id)).size,6);
  assert.equal(new Set(e.frictions.map(s=>s.id)).size,3);
  assert.equal(e.frictions.every(f=>f.affected_steps.includes(f.time_attribution.step_id)),true);
  assert.equal(a.findings.some(x=>x.includes('DF047')&&x.includes('DF049')),true);
  for(const f of schema.fields){
   if(['CAPTURE_IN_PROCESS_STEP','CAPTURE_IN_FRICTION','CAPTURE_IN_RISK','DERIVED','SYSTEM_GENERATED','DERIVE_AND_CONFIRM'].includes(f.Ask_Mode))
    assert.equal(Object.hasOwn(e.answers,f.Field_ID),false,e.id+': duplicate answer owner '+f.Field_ID);
  }
 }
});
test('three decision maps retain explicit positive/negative destinations and do not route to an undefined step',()=>{
 const ctx=scenario();
 for(const c of cases){
  const e=ctx.uat3Seed(c).engagement;const ids=new Set(e.processSteps.map(s=>s.id));
  for(const s of e.processSteps){
   assert.ok(s.normal_next_step==='__END__'||ids.has(s.normal_next_step),c.key+': '+s.step_name);
   if(s.exception_path)assert.ok(s.exception_path.destination_step==='__END__'||ids.has(s.exception_path.destination_step),c.key+': exception');
  }
  const branching=e.processSteps.filter(s=>s.step_type==='ST04');
  assert.equal(branching.length,1);
  assert.notEqual(branching[0].normal_next_step,branching[0].exception_path.destination_step);
  assert.ok(branching[0].notes&&branching[0].exception_path.condition);
  assert.equal(branching[0]._ui.has_decision,true);
 }
});
test('a same-owner edit remains visible as an audit failure, not hidden by a green fixture check',()=>{
 const ctx=scenario(),r=ctx.uat3Seed(cases[0]),e=r.engagement;
 ctx.state.companies.push(r.company);ctx.state.contacts.push(...r.contacts);
 e.answers.DF001='Empresa divergente';
 const audit=ctx.uat3Audit(e);
 assert.ok(audit.checks.some(x=>x.label.includes('Owner CRM')&&!x.pass));
});
test('three UAT source files and integration remain distinct from existing Phase 1/2',()=>{
 const index=read('index.html'),ui=read('uat/visible.js'),phase1=read('uat/crm-fixtures.js'),phase2=read('uat/study-fixtures.js');
 assert.ok(index.indexOf('uat/endtoend-cases.js')>index.indexOf('uat/study-fixtures.js'));
 assert.match(ui,/Fase 3 · Tres estudios integrales/);
 assert.match(ui,/data-uat3-open/);
 assert.match(ui,/loadUat3/);
 assert.match(phase1,/PHASE1_COMPANY_COUNT=12/);
 assert.match(phase2,/PHASE2_STUDY_COUNT=12/);
});
test('audit makes differences in declared cycle time visible for each scenario and links the human control to the real step',()=>{
 const ctx=scenario();
 for(const c of cases){
  const row=ctx.uat3Seed(c),e=row.engagement;
  ctx.state.companies.push(row.company);ctx.state.contacts.push(...row.contacts);
  const audit=ctx.uat3Audit(e);
  assert.ok(audit.findings.some(x=>x.includes('DF026')&&x.includes(c.key==='INVOICE'?'72 h':c.key==='INTAKE'?'40 h':'15 h')),c.key+': missing cycle-time discrepancy');
  const control=e.processSteps.find(s=>s.id===e.answerDetails.DF075__steps[0]);
  assert.ok(control,c.key+': human control must have a real step');
  assert.equal(control.step_type,c.key==='EMAIL'?'ST02':'ST05',c.key+': wrong protected action');
 }
});
test('visible Generate click loads all three independent cases without requiring Phase 1 or Phase 2',async()=>{
 const ctx=scenario(),load={disabled:false,onclick:null},status={textContent:''};
 ctx.phase1CrmCompletenessReport=()=>({pass:false});ctx.phase2StudyAssociationReport=()=>({pass:false});
 ctx.document.baseURI='http://127.0.0.1:5500/index.html';
 ctx.document.getElementById=id=>id==='loadUat3'?load:id==='uat3LoadStatus'?status:null;
 ctx.URL=URL;
 ctx.fetch=async url=>{
  const fixture=cases.find((_,i)=>url.endsWith(['invoices.json','unified-requests.json','email-orders.json'][i]));
  return fixture?{ok:true,json:async()=>fixture}:{ok:false,status:404};
 };
 let saved=0;ctx.persistRecoverySnapshot=()=>{saved++;return true};
 vm.runInContext('postBind()',ctx);
 assert.equal(typeof load.onclick,'function','actual button receives a click handler');
 await load.onclick();
 assert.equal(ctx.state.engagements.length,3);
 assert.equal(ctx.state.companies.length,3);
 assert.equal(ctx.state.contacts.length,6);
 assert.equal(saved,1,'do not persist intermediate empty state');
 assert.match(status.textContent,/Cargados y guardados: 3 estudios/);
 assert.equal(load.disabled,false);
});
test('Generate click exposes a missing fixture as visible failure and changes no study data',async()=>{
 const ctx=scenario(),load={disabled:false,onclick:null},status={textContent:''};
 ctx.document.baseURI='http://127.0.0.1:5500/index.html';
 ctx.document.getElementById=id=>id==='loadUat3'?load:id==='uat3LoadStatus'?status:null;
 ctx.URL=URL;
 ctx.fetch=async()=>({ok:false,status:404});
 ctx.console={error(){}};
 vm.runInContext('postBind()',ctx);
 await load.onclick();
 assert.equal(ctx.state.engagements.length,0);
 assert.match(status.textContent,/Error al generar/);
 assert.match(status.textContent,/HTTP 404/);
 assert.equal(load.disabled,false);
});
 // [AUNEA-UAT-ENDTOEND-120] END
