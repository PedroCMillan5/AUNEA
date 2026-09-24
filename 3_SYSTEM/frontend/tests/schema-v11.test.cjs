// [AUNEA-UAT-SCHEMA-V11-010] START — Schema v1.2 regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','services/schema.js'),'utf8');
const ctx={console};vm.createContext(ctx);vm.runInContext(code,ctx);

test('projects canonical Diagnostic Master v1.2 deltas over accepted base',()=>{
  const fields=Array.from({length:100},(_,i)=>({Field_ID:`DF${String(i+1).padStart(3,'0')}`}));
  const process_step_model=Array.from({length:19},(_,i)=>({Field_Key:`f${i}`}));
  const out=ctx.applyDiagnosticMasterV12({fields,process_step_model,option_sets:{}});
  assert.equal(out.version,'1.2');
  assert.equal(out.source_drive_id,'1HRlB30kpziDc3WNPxMVj0HfXuRUdOgbW');
  assert.equal(out.option_sets.REF_DOMAIN.options.length,25);
  assert.equal(out.option_sets.REF_DOMAIN.options.find(x=>x.value==='D04').label,'Ventas y CRM');
  assert.equal(out.option_sets.REF_INDUSTRY_CNAE25.options.length,22);
  assert.equal(out.option_sets.REF_INDUSTRY_CNAE25.options.find(x=>x.value==='CNAE25-N').label,'Actividades profesionales, científicas y técnicas');
  assert.equal(out.option_sets.REF_COUNTRY_ISO3166.options.length,249);
  assert.equal(out.option_sets.REF_COUNTRY_ISO3166.options.find(x=>x.value==='ES').label,'España');
  assert.equal(out.fields.find(x=>x.Field_ID==='DF002').Option_Set_ID,'REF_INDUSTRY_CNAE25');
  assert.equal(out.fields.find(x=>x.Field_ID==='DF002').Reuse_From,'RT_COMPANY.Sector');
  assert.equal(out.fields.find(x=>x.Field_ID==='DF050').Reuse_From,'RT_PROCESS_STEP.Communication_Channels');
  assert.equal(out.process_step_model.length,20);
  assert.ok(out.process_step_model.some(x=>x.Field_Key==='communication_channels'));
});
// [AUNEA-UAT-SCHEMA-V11-010] END
