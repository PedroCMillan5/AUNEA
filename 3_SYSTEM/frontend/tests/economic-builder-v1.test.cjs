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
    console,schema,state:{backendOnline:true,backendUrl:'http://backend.test'},
    checkBackend:async()=>true,normalizeArray:v=>Array.isArray(v)?v:v==null?[]:[v],
    fetch:async()=>({ok:true,json:async()=>({status:'INCOMPLETE',gaps:['DF021: volumen habitual pendiente'],annual_cases:null})}),
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
  assert.match(ctx.__lastBody,/Se reutilizan para obtener un cálculo revisable/);
  assert.match(ctx.__lastBody,/Tiempo activo atribuible/);
  assert.match(ctx.__lastBody,/Tiempo de espera atribuible/);
  assert.match(ctx.__lastBody,/id="econActive_unit"/);
  assert.match(ctx.__lastBody,/id="econWait_unit"/);
});

test('addEconomic still shows the manual-entry instruction (but no "Pasos con..." provenance) when no process step has active_time/wait_time captured yet',()=>{
  const ctx=makeCtx();
  ctx.addEconomic();
  assert.doesNotMatch(ctx.__lastBody,/Pasos con tiempo/);
  assert.match(ctx.__lastBody,/Comprobando los datos/);
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

test('Impacto reuses mapped tools and direct-loss friction sources without inventing savings',()=>{
  const ctx=makeCtx();
  ctx.activeSteps=e=>e.processSteps.filter(s=>s.status!=='SUPERSEDED');
  ctx.activeFrictions=e=>e.frictions.filter(f=>f.status!=='SUPERSEDED');
  ctx.__eng.processSteps=[{id:'S1',status:'ACTIVE',tool:'TOOL1',step_name:'Recepción'}];
  ctx.__eng.frictions=[{id:'F1',status:'ACTIVE',affected_steps:['S1'],client_label:'Duplicación de cobros',direct_loss:{value:100}}];
  ctx.labelFrom=(set,id)=>set==='OS_TOOL_CATEGORY'?'Herramienta registrada':id;
  ctx.addEconomic(['S1']);
  assert.match(ctx.__lastBody,/Herramientas registradas en el mapa \(DF046\)/);
  assert.match(ctx.__lastBody,/Herramienta registrada/);
  assert.match(ctx.__lastBody,/coste atribuible/);
  assert.match(ctx.__lastBody,/Pérdidas directas declaradas en fricciones \(DF063\)/);
  assert.match(ctx.__lastBody,/DF082 no vuelva a contabilizar/);
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


test('economic preview always uses server output, never browser annualization',async()=>{
  const ctx=makeCtx(),e=ctx.__eng;
  e.answers={DF021:100,DF022:'MONTH'};
  e.processSteps=[{id:'S1',status:'ACTIVE',step_name:'Validar',active_time:10,wait_time:20,rework_time:5,occurrences_per_case:1,applies_to:{mode:'ALL'},error_rate:{mode:'percent',value:10}}];
  e.frictions=[{id:'F1',status:'ACTIVE',affected_steps:['S1'],frequency:{mode:'percent',value:20},active_time_loss:{value:2}}];
  let request=null;ctx.fetch=async(url,options)=>{
    request={url,body:JSON.parse(options.body)};
    return {ok:true,json:async()=>({status:'CALCULATED',annual_cases:1200,annual_active_hours:200,annual_wait_exposure_hours:400,annual_rework_hours:10,gaps:[],frictions_pending_overlap_review:[]})};
  };
  const p=await ctx.economicTimeProjection(e);
  assert.equal(p.annualCases,1200);
  assert.equal(p.active,200);
  assert.equal(p.wait,400);
  assert.equal(p.rework,10);
  assert.ok(request.url.endsWith('/v1/diagnostic/time-projection'));
  assert.equal(request.body.volume,100);
  assert.equal(request.body.period,'MONTH');
  assert.equal(request.body.steps.length,1);
  assert.equal(request.body.frictions.length,1);
  assert.equal(ctx.economicProjectionForDriver(p,'ED01').active,200);
  assert.equal(ctx.economicProjectionForDriver(p,'ED05').active,10);
  assert.equal(ctx.economicProjectionForDriver(p,'ED13').wait,400);
  assert.equal(ctx.economicProjectionForDriver(p,'ED02'),null);
});
test('frontend cannot invent operating calendar or reuse an incomplete server projection',async()=>{
  const ctx=makeCtx(),e=ctx.__eng;e.answers={DF021:10,DF022:'WEEK'};
  e.processSteps=[{id:'S2',status:'ACTIVE',active_time:8,applies_to:{mode:'CONDITION',condition:'Si excede presupuesto'}}];
  let sent=null;ctx.fetch=async(url,options)=>{
    sent=JSON.parse(options.body);
    return {ok:true,json:async()=>({status:'INCOMPLETE',annual_cases:null,annual_active_hours:null,gaps:['Se requieren semanas operativas'],frictions_pending_overlap_review:[]})};
  };
  const p=await ctx.economicTimeProjection(e);
  assert.equal(sent.operating_weeks_per_year,undefined);
  assert.equal(sent.operating_days_per_year,undefined);
  assert.equal(p.available,false);
  assert.equal(ctx.economicProjectionForDriver(p,'ED01'),null);
  assert.doesNotMatch(code,/DAY:365|WEEK:52/);
});
test('when the backend is offline, economic preview is explicitly unavailable',async()=>{
  const ctx=makeCtx();ctx.state.backendOnline=false;ctx.checkBackend=async()=>false;
  const p=await ctx.economicTimeProjection(ctx.__eng);
  assert.equal(p.available,false);
  assert.match(p.reason,/Backend no conectado/);
});

test('B03: an all-in ED01 and a specialized driver cannot be added for overlapping steps without governed decomposition',()=>{
  const ctx=makeCtx(),e=ctx.__eng;
  e.economicInputs=[{driver_id:'ED01',step_ids:['S1'],annual_active_hours:100}];
  const duplicate=ctx.economicCaptureIssues(e,{driver_id:'ED05',step_ids:['S1'],annual_active_hours:20});
  assert.equal(duplicate.length,1);
  assert.match(duplicate[0],/EAR-001\/004/);
  assert.equal(ctx.economicCaptureIssues(e,{driver_id:'ED05',step_ids:['S2'],annual_active_hours:20}).length,0);
});

test('B03: direct loss repeated across friction and DF082 is held pending reconciliation, without creating event IDs',()=>{
  const ctx=makeCtx(),e=ctx.__eng;
  e.frictions=[{id:'F1',affected_steps:['S1'],direct_loss:{value:100}}];
  const first=ctx.economicCaptureIssues(e,{driver_id:'ED11',step_ids:['S1'],direct_loss_eur_annual:100});
  assert.equal(first.length,0,'friction loss is evidence, not a second automatic economic row');
  e.economicInputs=[{driver_id:'ED11',step_ids:['S1'],direct_loss_eur_annual:100}];
  const problems=ctx.economicCaptureIssues(e,{driver_id:'ED11',step_ids:['S1'],direct_loss_eur_annual:100});
  assert.equal(problems.length,1);
  assert.match(problems[0],/DF063\/DF082/);
  assert.equal(ctx.economicCaptureIssues(e,{driver_id:'ED11',step_ids:['S2'],direct_loss_eur_annual:100}).length,0);
  assert.match(code,/deduplication_key:null/);
});

test('B03: overlapping economics input does not mutate engagement and manual capture demands selected evidence',()=>{
  const ctx=makeCtx(),e=ctx.__eng;
  e.economicInputs=[{driver_id:'ED01',annual_active_hours:100,step_ids:['S1']}];
  e.processSteps=[{id:'S1',step_name:'Inicio',status:'ACTIVE'}];ctx.activeSteps=a=>a.processSteps;
  let msg='';ctx.toast=x=>{msg=x};
  ctx.addEconomic(['S1']);
  Object.assign(ctx.__domFields,{econDriver:{value:'ED05'},econActive:{value:20},econActive_unit:{value:'h'},econWait:{value:0},econWait_unit:{value:'h'},econEvidence:{value:'CLIENT_DECLARED'}});
  ctx.__lastOnSave();
  assert.equal(e.economicInputs.length,1);
  assert.match(msg,/EAR-001\/004/);
  const ctx2=makeCtx();ctx2.addEconomic();
  Object.assign(ctx2.__domFields,{econDriver:{value:'ED02'},econActive:{value:20},econActive_unit:{value:'h'},econWait:{value:0},econWait_unit:{value:'h'},econEvidence:{value:''}});
  let warning='';ctx2.toast=x=>{warning=x};ctx2.__lastOnSave();
  assert.equal(ctx2.__eng.economicInputs.length,0);
  assert.match(warning,/Selecciona la evidencia/);
});

test('B03: backend projected extra effort is shown separately and the full-process fingerprint drives DF078/DF079',async()=>{
  const ctx=makeCtx(),e=ctx.__eng;
  e.answers={DF021:100,DF022:'MONTH'};
  e.processSteps=[
    {id:'S1',status:'ACTIVE',active_time:10,rework_time:0,wait_time:2},
    {id:'S2',status:'ACTIVE',active_time:4,rework_time:0,wait_time:0},
  ];
  e.frictions=[{id:'F1',status:'ACTIVE',affected_steps:['S1','S2'],time_attribution:{mode:'ADDITIONAL',step_id:'S1'},active_time_loss:{value:3}}];
  const sent=[];
  ctx.activeSteps=x=>x.processSteps;
  ctx.activeFrictions=x=>x.frictions;
  ctx.fetch=async(_url,options)=>{
    const req=JSON.parse(options.body);sent.push(req);
    return {ok:true,json:async()=>({
      status:'CALCULATED',annual_cases:1200,annual_active_hours:req.scope_step_ids?.length===1?200:280,
      annual_wait_exposure_hours:40,annual_rework_hours:0,annual_friction_additional_hours:12,
      annual_total_active_hours:292,active_minutes_per_case:14,rework_minutes_per_case:0,
      gaps:[],frictions_pending_overlap_review:[],monetary_reconciliation:[{friction_id:'F1',reconciliation_status:'PENDING_DF082'}]
    })};
  };
  const subset=await ctx.economicTimeProjection(e,['S1']);
  assert.equal(subset.additional,12);
  assert.equal(subset.monetaryPending.length,1);
  assert.equal(sent[0].frictions.length,1,'owner belongs to selected step');
  assert.equal(e._sessionTimeProjection,undefined,'partial subset never overwrites global DF078/DF079');
  const global=await ctx.economicTimeProjection(e);
  assert.equal(global.active,280);
  assert.equal(e._sessionTimeProjection.output.active_minutes_per_case,14);
});



test('B03: a stale automatic preview must not be reclassified as manual evidence on save',async()=>{
  const ctx=makeCtx(),e=ctx.__eng;
  e.answers={DF021:100,DF022:'MONTH'};
  e.processSteps=[{id:'S1',active_time:10,wait_time:0,rework_time:0}];
  ctx.activeSteps=x=>x.processSteps;
  ctx.fetch=async()=>({ok:true,json:async()=>({status:'CALCULATED',annual_active_hours:200,annual_wait_exposure_hours:0,annual_rework_hours:0,gaps:[]})});
  ctx.__domFields.econActive={value:'',dataset:{}};
  ctx.__domFields.econWait={value:'',dataset:{}};
  ctx.__domFields.econDriver={value:'ED01'};
  ctx.addEconomic();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(ctx.__domFields.econActive.value,'200.00');
  ctx.__domFields.econEvidence={value:'CLIENT_DECLARED'};
  e.answers.DF021=200;
  let warning='';ctx.toast=x=>warning=x;
  ctx.__lastOnSave();
  assert.equal(e.economicInputs.length,0);
  assert.match(warning,/actualiz|cambi/i);
});
test('No-Reask: changing a step while the HTTP projection is in flight cannot cache or display the old result as current',async()=>{
  const ctx=makeCtx(),e=ctx.__eng;
  e.answers={DF021:100,DF022:'MONTH'};
  e.processSteps=[{id:'S1',status:'ACTIVE',active_time:10,wait_time:0,rework_time:0}];
  ctx.activeSteps=x=>x.processSteps;
  let sent,release;
  ctx.fetch=(_url,options)=>{
    sent=JSON.parse(options.body);
    return new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({
      status:'CALCULATED',annual_active_hours:200,active_minutes_per_case:10,rework_minutes_per_case:0,gaps:[]
    })})});
  };
  const pending=ctx.economicTimeProjection(e);
  assert.equal(sent.steps[0].active_time,10);
  e.processSteps[0].active_time=20;
  release();
  const result=await pending;
  assert.equal(result.available,false);
  assert.equal(result.status,'STALE');
  assert.match(result.reason,/cambiaron durante el cálculo/);
  assert.equal(e._sessionTimeProjection,undefined,'an old response must not populate the full-process cache');
  assert.equal(sent.steps[0].active_time,10,'the HTTP request must preserve the original input snapshot');
  let lastBody;
  ctx.fetch=async(_url,options)=>{
    lastBody=JSON.parse(options.body);
    return {ok:true,json:async()=>({status:'CALCULATED',annual_active_hours:400,active_minutes_per_case:20,rework_minutes_per_case:0,gaps:[]})};
  };
  const current=await ctx.economicTimeProjection(e);
  assert.equal(current.available,true);
  assert.equal(lastBody.steps[0].active_time,20);
  assert.equal(e._sessionTimeProjection.output.active_minutes_per_case,20);
});

test('No-Reask: changing session volume during an in-flight projection invalidates that response',async()=>{
  const ctx=makeCtx(),e=ctx.__eng;
  e.answers={DF021:100,DF022:'MONTH'};
  let release;
  ctx.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({status:'CALCULATED',active_minutes_per_case:10,gaps:[]})})});
  const pending=ctx.economicTimeProjection(e);
  e.answers.DF021=200;
  release();
  const p=await pending;
  assert.equal(p.available,false);
  assert.equal(e._sessionTimeProjection,undefined);
});

// [AUNEA-UAT-ECON-010] END
