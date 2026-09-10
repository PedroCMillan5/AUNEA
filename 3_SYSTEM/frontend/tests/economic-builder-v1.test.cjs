// [AUNEA-UAT-ECON-010] START — Economics builder copy/label regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'app-process-editor.js'),'utf8');
const i18nCode=fs.readFileSync(path.join(root,'app-i18n-labels-v1.js'),'utf8');

function makeCtx(){
  const domFields={};
  const schema={tables:{REF_ECON_DRIVER:[{Economic_Driver_ID:'ED01',Name:'Manual execution time'},{Economic_Driver_ID:'ED02',Name:'Duplicate entry time'}]}};
  const eng={economicInputs:[],risks:[],processSteps:[],__contributors:[]};
  const ctx={
    console,schema,
    currentEng:()=>eng,
    activeTimeContributors:e=>e.__contributors||[],
    esc:v=>String(v??''),attr:v=>String(v??''),
    section:(title,sub,body,actions)=>`${body}${actions||''}`,
    openModal:(title,body,onSave)=>{ctx.__lastBody=body;ctx.__lastOnSave=onSave},
    closeModal:()=>{},markDirty:()=>{},render:()=>{},toast:()=>{},now:()=>'',id:p=>`${p}-1`,
    document:{getElementById:(elId)=>{if(!domFields[elId])domFields[elId]={};return domFields[elId]}},
    confirm:()=>true
  };
  ctx.__eng=eng;ctx.__domFields=domFields;
  vm.createContext(ctx);
  vm.runInContext(i18nCode,ctx);
  vm.runInContext('globalThis.I18N_LABELS_ES=I18N_LABELS_ES;',ctx);
  vm.runInContext(code,ctx);
  return ctx;
}

test('addEconomic translates the driver-picker label to Spanish and shows an informational, non-prefilling "Calculado desde: <pasos>" note only when process steps contributed to DF078',()=>{
  const ctx=makeCtx();
  ctx.__eng.__contributors=['Alta','Aprobación'];
  ctx.addEconomic();
  assert.match(ctx.__lastBody,/Concepto económico/);
  assert.doesNotMatch(ctx.__lastBody,/<label>Driver<\/label>/);
  assert.match(ctx.__lastBody,/Calculado desde: Alta, Aprobación/);
  assert.doesNotMatch(ctx.__lastBody,/id="econActive"[^>]*value=/,'the active-hours field must stay manual entry, never auto-prefilled from the unannualized minutes/case figure');
});

test('addEconomic omits the "Calculado desde" note when no process step has active_time captured yet',()=>{
  const ctx=makeCtx();
  ctx.addEconomic();
  assert.doesNotMatch(ctx.__lastBody,/Calculado desde/);
});

test('evidence-quality options are the governed Spanish labels (I18N_LABELS_ES), not a second hand-duplicated copy nor the raw backend code',()=>{
  const ctx=makeCtx();
  ctx.addEconomic();
  ['Medido','Declarado por cliente','Estimación AUNEA','Benchmark específico','Hipótesis'].forEach(l=>assert.match(ctx.__lastBody,new RegExp(l)));
  assert.doesNotMatch(ctx.__lastBody,/>MEASURED</);
});

test('economicBuilder resolves driver_id to its REF_ECON_DRIVER Name and translates evidence_type via the governed table, instead of leaking raw backend codes',()=>{
  const ctx=makeCtx();
  ctx.__eng.economicInputs=[{driver_id:'ED01',evidence_type:'MEASURED',annual_active_hours:10}];
  const html=ctx.economicBuilder(ctx.__eng);
  assert.match(html,/Manual execution time/,'REF_ECON_DRIVER.Name is canonical reference data in English — resolving to it is correct; inventing a Spanish translation is not');
  assert.match(html,/Evidencia: Medido/);
  assert.doesNotMatch(html,/>ED01</);
});

test('the economics builder never infers a direct-loss figure or an hours-per-year formula that is not governed — server-owned Economics remains the only source of derived totals',()=>{
  assert.doesNotMatch(code,/annual_wait_hours\s*=.*(occurrences|active_time)/);
  assert.doesNotMatch(code,/direct_loss.*=.*active_time.*error_rate/);
});
// [AUNEA-UAT-ECON-010] END
