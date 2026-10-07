// [AUNEA-UAT-ENDTOEND-120] START — Single complete end-to-end UAT.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const schema=JSON.parse(read('data/diagnostic-master.min.json'));
const fixture=JSON.parse(read('uat/cases/invoices.json'));
function scenario(){
 const state={companies:[],contacts:[],opportunities:[],interactions:[],engagements:[],projects:[]};
 const ctx={state,console,postBind(){},document:{getElementById(){return null},querySelectorAll(){return []}},schema,
  companyById:id=>state.companies.find(x=>x.id===id),contactById:id=>state.contacts.find(x=>x.id===id),
  painForFriction:type=>schema.friction_pain_map.find(x=>x.Friction_Type_ID===type)?.Pain_ID||null,
  toast(){},render(){},markDirty(){},persistRecoverySnapshot(){return true},confirm(){return true}};
 vm.createContext(ctx);vm.runInContext(read('uat/endtoend-cases.js'),ctx);
 return ctx;
}
test('single invoice fixture is specific, coherent and canonical',()=>{
 assert.equal(fixture.key,'INVOICE');
 assert.equal(fixture.steps.length,6);assert.equal(fixture.frictions.length,3);assert.equal(fixture.risks.length,2);
 assert.equal(fixture.contacts.length,2);
 for(const [field,set] of [['DF008','OS_SESSION_OBJECTIVE'],['DF009','OS_SUCCESS_DIMENSION'],['DF010','OS_CONSTRAINT_TYPE'],['DF020','OS_VARIANT_DIMENSION'],['DF029','OS_PRIORITY_CLASS'],['DF055','OS_DATA_QUALITY_ISSUE'],['DF073','OS_SENSITIVE_DATA'],['DF086','OS_FUTURE_OUTCOME'],['DF087','OS_MUST_KEEP'],['DF088','OS_NO_AUTOMATE'],['DF089','OS_PLATFORM_PREFERENCE'],['DF090','OS_SECURITY_CONSTRAINT'],['DF091','OS_CHANGE_CONSTRAINT']]){
  const options=new Set(schema.option_sets[set].options.map(o=>o.value));
  for(const v of fixture.answers[field]||[])assert.ok(options.has(v),field+': '+v);
 }
 for(const s of fixture.steps){
  assert.ok(schema.option_sets.OS_STEP_TYPE.options.some(o=>o.value===s.type));
  assert.ok(schema.option_sets.OS_ACTOR_ROLE.options.some(o=>o.value===s.actor));
  assert.ok(schema.option_sets.OS_TOOL_CATEGORY.options.some(o=>o.value===s.tool));
 }
});
test('single seed owns CRM, map, frictions, risks and economics without duplicate records',()=>{
 const ctx=scenario(),row=ctx.uat3Seed(fixture),e=row.engagement;
 ctx.state.companies.push(row.company);ctx.state.contacts.push(...row.contacts);ctx.state.opportunities.push(row.opportunity);ctx.state.interactions.push(row.interaction);ctx.state.engagements.push(e);
 assert.equal(ctx.state.companies.length,1);assert.equal(ctx.state.contacts.length,2);assert.equal(ctx.state.engagements.length,1);
 assert.equal(e.processSteps.length,6);assert.equal(e.frictions.length,3);assert.equal(e.risks.length,2);assert.equal(e.economicInputs.length,2);
 assert.equal(e.risks.every(r=>r.reversibility&&typeof r.reversible==='boolean'&&typeof r.controls_present==='boolean'&&typeof r.sensitive_or_high_impact==='boolean'&&typeof r.material_financial_or_compliance==='boolean'&&typeof r.critical_trigger==='boolean'),true);
 const [receive,validate,match,decision,approval,register]=e.processSteps;
 assert.equal(decision.normal_next_step,approval.id);assert.equal(decision.exception_path.destination_step,register.id);
 assert.equal(approval.normal_next_step,register.id);assert.equal(register.normal_next_step,'__END__');
 for(const f of schema.fields){
  if(['CAPTURE_IN_PROCESS_STEP','CAPTURE_IN_FRICTION','CAPTURE_IN_RISK','DERIVED','SYSTEM_GENERATED','DERIVE_AND_CONFIRM'].includes(f.Ask_Mode))
   assert.equal(Object.hasOwn(e.answers,f.Field_ID),false,'duplicate answer owner '+f.Field_ID);
 }
});
test('visible QA surface exposes only one complete UAT',()=>{
 const ui=read('uat/visible.js');
 assert.match(ui,/Una sola UAT integral/);
 assert.match(ui,/loadSingleUat/);
 assert.match(ui,/singleUatEngagement/);
 assert.doesNotMatch(ui,/Fase 1 · Dataset CRM completo/);
 assert.doesNotMatch(ui,/Fase 2 · Estudios asociados/);
 assert.doesNotMatch(ui,/Fase 3 · Tres estudios integrales/);
});
// [AUNEA-UAT-ENDTOEND-120] END
