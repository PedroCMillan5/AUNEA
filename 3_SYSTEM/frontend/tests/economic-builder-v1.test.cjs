// [AUNEA-UAT-ECON-010] START — Economics builder copy/label regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'domain/economics.js'),'utf8');
const i18nCode=fs.readFileSync(path.join(root,'core/i18n.js'),'utf8');

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
    auneaSelectControl:(id,opts,val,{extra='',placeholder='Selecciona…'}={})=>`<div class="canonical-aunea-select"><input type="hidden" id="${id}" value="${val||''}" ${extra}><details class="aunea-select"><summary><span>${placeholder}</span><i></i></summary><div class="aunea-select-menu">${(opts||[]).map(o=>`<button data-aunea-select-option="${id}" data-value="${o.value}">${o.label}</button>`).join('')}</div></details></div>`,
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
  assert.match(ctx.__lastBody,/Pasos con espera registrada: Aprobación/);
  assert.match(ctx.__lastBody,/mismo patrón valor \+ unidad/);
  assert.match(ctx.__lastBody,/Tiempo activo atribuible/);
  assert.match(ctx.__lastBody,/Tiempo de espera atribuible/);
  assert.match(ctx.__lastBody,/id="econActive_unit"/);
  assert.match(ctx.__lastBody,/id="econWait_unit"/);
});

test('addEconomic still shows the manual-entry instruction (but no "Pasos con..." provenance) when no process step has active_time/wait_time captured yet',()=>{
  const ctx=makeCtx();
  ctx.addEconomic();
  assert.doesNotMatch(ctx.__lastBody,/Pasos con tiempo/);
  assert.match(ctx.__lastBody,/Introduce el total anual con valor \+ unidad/);
});

test('addEconomic warns (without blocking the save) when active/wait hours are saved as 0 despite Proceso having recorded time in those steps, and stays silent when there is no such evidence',()=>{
  const ctx=makeCtx();
  ctx.__eng.__contributors=['Alta'];
  ctx.addEconomic();
  ctx.__domFields.econDriver={value:'ED01'};ctx.__domFields.econActive={value:'0'};ctx.__domFields.econActive_unit={value:'h'};ctx.__domFields.econWait={value:'0'};ctx.__domFields.econWait_unit={value:'h'};ctx.__domFields.econEvidence={value:'MEASURED'};
  let warned='';ctx.toast=msg=>{warned=msg};
  ctx.__lastOnSave();
  assert.match(warned,/trabajo activo/);
  assert.doesNotMatch(warned,/espera/,'no wait-time evidence exists in this fixture, so the warning must not mention it');
  assert.equal(ctx.__eng.economicInputs.length,1,'the save itself must never be blocked by the warning');
  assert.equal(ctx.__eng.economicInputs[0].annual_active_hours,0);

  const ctx2=makeCtx();
  ctx2.addEconomic();
  ctx2.__domFields.econDriver={value:'ED01'};ctx2.__domFields.econActive={value:'5'};ctx2.__domFields.econActive_unit={value:'h'};ctx2.__domFields.econWait={value:'0'};ctx2.__domFields.econWait_unit={value:'h'};ctx2.__domFields.econEvidence={value:'MEASURED'};
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

test('economicBuilder keeps canonical driver ids internally but all visible driver labels are Spanish',()=>{
  const ctx=makeCtx();
  ctx.__eng.economicInputs=[{driver_id:'ED01',evidence_type:'MEASURED',annual_active_hours:10}];
  const html=ctx.economicBuilder(ctx.__eng);
  assert.match(html,/Tiempo de ejecución manual/);
  assert.match(html,/Evidencia: Medido/);
  assert.doesNotMatch(html,/Manual execution time/);
  assert.doesNotMatch(html,/>ED01</);
});

test('addEconomic uses clear Spanish sections for time/evidence and costs/losses, both visible while completing the popup',()=>{
  const ctx=makeCtx();
  ctx.addEconomic();
  const groups=[...ctx.__lastBody.matchAll(/<details class="step-group"( open)?><summary>([^<]+)<\/summary>/g)];
  assert.equal(groups.length,2);
  assert.equal(groups[0][1],' open');
  assert.equal(groups[0][2],'Impacto en tiempo y evidencia');
  assert.equal(groups[1][1],' open');
  assert.equal(groups[1][2],'Costes, pérdidas y ahorro realizado');
  ['econDriver','econActive','econEvidence','econWait','econRate','econDirect','econTool','econCash'].forEach(fid=>{
    assert.match(ctx.__lastBody,new RegExp(`id="${fid}"`),`${fid} must still exist`);
  });
});

test('the economics builder never infers a direct-loss figure or an hours-per-year formula that is not governed — server-owned Economics remains the only source of derived totals',()=>{
  assert.doesNotMatch(code,/annual_wait_hours\s*=.*(occurrences|active_time)/);
  assert.doesNotMatch(code,/direct_loss.*=.*active_time.*error_rate/);
});
test('economic driver dropdown translates all canonical REF_ECON_DRIVER ids used by the UI without changing their values',()=>{
  const ctx=makeCtx();ctx.addEconomic();
  assert.match(ctx.__lastBody,/Tiempo de ejecución manual/);
  assert.match(ctx.__lastBody,/Tiempo de entrada duplicada/);
  assert.doesNotMatch(ctx.__lastBody,/Manual execution time|Duplicate entry time/);
});

test('economic time entry uses the same value plus unit interaction pattern as process time and converts only on save',()=>{
  const ctx=makeCtx();ctx.addEconomic();
  assert.match(ctx.__lastBody,/economic-time-control/);
  assert.match(ctx.__lastBody,/id="econActive_unit"/);
  assert.match(ctx.__lastBody,/id="econWait_unit"/);
  assert.match(ctx.__lastBody,/al año/);
  assert.equal(ctx.econHoursFrom(120,'min'),2);
  assert.equal(ctx.econHoursFrom(2,'h'),2);
});

// [AUNEA-UAT-ECON-010] END
