// [AUNEA-UAT-ECON-010] START — Economics builder copy/label regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'app-economics-v1.js'),'utf8');
const i18nCode=fs.readFileSync(path.join(root,'app-i18n-labels-v1.js'),'utf8');

function makeCtx(){
  const domFields={};
  const schema={tables:{REF_ECON_DRIVER:[{Economic_Driver_ID:'ED01',Name:'Manual execution time'},{Economic_Driver_ID:'ED02',Name:'Duplicate entry time'}]}};
  const eng={economicInputs:[],risks:[],processSteps:[],__contributors:[],__waitContributors:[]};
  const ctx={
    console,schema,
    currentEng:()=>eng,
    activeTimeContributors:e=>e.__contributors||[],
    waitTimeContributors:e=>e.__waitContributors||[],
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

test('addEconomic translates the driver-picker label to Spanish and shows an informational, non-prefilling "Pasos con tiempo activo/espera registrado" note only when process steps contributed evidence, always paired with an explicit manual-entry instruction',()=>{
  const ctx=makeCtx();
  ctx.__eng.__contributors=['Alta','Aprobación'];
  ctx.__eng.__waitContributors=['Aprobación'];
  ctx.addEconomic();
  assert.match(ctx.__lastBody,/Concepto económico/);
  assert.doesNotMatch(ctx.__lastBody,/<label>Driver<\/label>/);
  assert.match(ctx.__lastBody,/Pasos con tiempo activo registrado: Alta, Aprobación/);
  assert.match(ctx.__lastBody,/Pasos con tiempo de espera registrado: Aprobación/);
  assert.match((ctx.__lastBody.match(/Introduce tú el total anual/g)||[]).join(''),/Introduce tú el total anual/,'both hours fields must carry the explicit manual-entry instruction');
  assert.equal((ctx.__lastBody.match(/Introduce tú el total anual/g)||[]).length,2);
  assert.doesNotMatch(ctx.__lastBody,/id="econActive"[^>]*value=/,'the active-hours field must stay manual entry, never auto-prefilled from the unannualized minutes/case figure');
  assert.doesNotMatch(ctx.__lastBody,/id="econWait"[^>]*value=/,'the wait-hours field must stay manual entry too');
});

test('addEconomic still shows the manual-entry instruction (but no "Pasos con..." provenance) when no process step has active_time/wait_time captured yet',()=>{
  const ctx=makeCtx();
  ctx.addEconomic();
  assert.doesNotMatch(ctx.__lastBody,/Pasos con tiempo/);
  assert.match(ctx.__lastBody,/Introduce tú el total anual/);
});

test('addEconomic warns (without blocking the save) when active/wait hours are saved as 0 despite Proceso having recorded time in those steps, and stays silent when there is no such evidence',()=>{
  const ctx=makeCtx();
  ctx.__eng.__contributors=['Alta'];
  ctx.addEconomic();
  ctx.__domFields.econDriver={value:'ED01'};ctx.__domFields.econActive={value:'0'};ctx.__domFields.econWait={value:'0'};ctx.__domFields.econEvidence={value:'MEASURED'};
  let warned='';ctx.toast=msg=>{warned=msg};
  ctx.__lastOnSave();
  assert.match(warned,/trabajo activo/);
  assert.doesNotMatch(warned,/espera/,'no wait-time evidence exists in this fixture, so the warning must not mention it');
  assert.equal(ctx.__eng.economicInputs.length,1,'the save itself must never be blocked by the warning');
  assert.equal(ctx.__eng.economicInputs[0].annual_active_hours,0);

  const ctx2=makeCtx();
  ctx2.addEconomic();
  ctx2.__domFields.econDriver={value:'ED01'};ctx2.__domFields.econActive={value:'5'};ctx2.__domFields.econWait={value:'0'};ctx2.__domFields.econEvidence={value:'MEASURED'};
  let warned2='';ctx2.toast=msg=>{warned2=msg};
  ctx2.__lastOnSave();
  assert.equal(warned2,'','no contributors and a non-zero active value: nothing to warn about');
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

test('addEconomic groups driver/valor-activo/evidencia into an open layer-1 group and the rest into a collapsed layer-2 group, same field ids and EconomicInput shape as before',()=>{
  const ctx=makeCtx();
  ctx.addEconomic();
  const groups=[...ctx.__lastBody.matchAll(/<details class="step-group"( open)?><summary>([^<]+)<\/summary>/g)];
  assert.equal(groups.length,2);
  assert.equal(groups[0][1],' open','layer 1 (driver/valor/evidencia) must be open by default');
  assert.equal(groups[1][1],undefined,'layer 2 (resto) must start collapsed');
  ['econDriver','econActive','econEvidence','econWait','econRate','econDirect','econTool','econCash'].forEach(fid=>{
    assert.match(ctx.__lastBody,new RegExp(`id="${fid}"`),`${fid} must still exist`);
  });
});

test('the economics builder never infers a direct-loss figure or an hours-per-year formula that is not governed — server-owned Economics remains the only source of derived totals',()=>{
  assert.doesNotMatch(code,/annual_wait_hours\s*=.*(occurrences|active_time)/);
  assert.doesNotMatch(code,/direct_loss.*=.*active_time.*error_rate/);
});
// [AUNEA-UAT-ECON-010] END
