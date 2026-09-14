// [AUNEA-UAT-COMPLETION-010] START — Completion model regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const noReaskCode=fs.readFileSync(path.join(root,'app-no-reask-v1.js'),'utf8');
const engineAdapterCode=fs.readFileSync(path.join(root,'app-engine-adapter-v1.js'),'utf8');
const completionCode=fs.readFileSync(path.join(root,'app-completion-model-v1.js'),'utf8');
const i18nCode=fs.readFileSync(path.join(root,'app-i18n-labels-v1.js'),'utf8');
const diagFieldsCode=fs.readFileSync(path.join(root,'app-diagnostic-fields.js'),'utf8');

const schema={
  flow:[
    {Stage_ID:'S01',Stage_ES:'Contexto'},
    {Stage_ID:'S02',Stage_ES:'Alcance IA'},
    {Stage_ID:'S03',Stage_ES:'Cierre (sin campos directos)'}
  ],
  fields:[
    {Field_ID:'DF900',Stage_ID:'S01',Requiredness:'REQUIRED_90M',Ask_Mode:'FREE_TEXT',Branch_Rule_ID:'BR-BASE',Pregunta_o_etiqueta_ES:'Empresa'},
    {Field_ID:'DF010',Stage_ID:'S01',Requiredness:'REQUIRED_90M',Ask_Mode:'FREE_TEXT',Branch_Rule_ID:'BR-BASE',Pregunta_o_etiqueta_ES:'Objetivo del estudio'},
    {Field_ID:'DF088',Stage_ID:'S02',Requiredness:'CONDITIONAL_90M',Ask_Mode:'FREE_TEXT',Branch_Rule_ID:'BR-BASE',Pregunta_o_etiqueta_ES:'Detalle IA'},
    {Field_ID:'DF200',Stage_ID:'S02',Requiredness:'REQUIRED_90M',Ask_Mode:'FREE_TEXT',Branch_Rule_ID:'BR-AI',Pregunta_o_etiqueta_ES:'Alcance de asistencia IA'}
  ]
};

function makeEngagement(){
  return {companyId:'c1',contactIds:[],answers:{},processSteps:[],frictions:[],risks:[],economicInputs:[],confirmedAsIs:false,engineGates:{}};
}

function makeCtx(){
  const ctx={
    console,schema,
    companyById:()=>({id:'c1',name:'ACME'}),
    fieldOptions:()=>[],
    labelFrom:(setId,v)=>v,
    normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),
    setAnswer:()=>{},bindForms:()=>{},markDirty:()=>{},render:()=>{},setPage:()=>{},
    openModal:()=>{},closeModal:()=>{},toast:()=>{},now:()=>'',runDiagnosis:()=>{},
    esc:v=>String(v??''),attr:v=>String(v??''),
    section:(title,sub,body)=>body,pageTop:(title,sub,actions)=>actions||'',
    renderControl:()=>'<input class="stub">',
    state:{backendOnline:true,returnTo:null},
    document:{querySelectorAll:()=>[],getElementById:()=>null}
  };
  ctx.currentEng=()=>ctx.__eng;
  vm.createContext(ctx);
  vm.runInContext(noReaskCode,ctx);
  vm.runInContext(engineAdapterCode,ctx);
  vm.runInContext(completionCode,ctx);
  vm.runInContext(i18nCode,ctx);
  vm.runInContext(diagFieldsCode,ctx);
  return ctx;
}

test('a field made inactive by its Branch_Rule_ID is excluded from overall.applicable (branch-aware, not a fixed 100 denominator)',()=>{
  const ctx=makeCtx();const e=makeEngagement();ctx.__eng=e;
  const c=ctx.engagementCompletion(e);
  assert.equal(c.overall.applicable,3);
  assert.ok(schema.fields.length>c.overall.applicable);
});

test('missing required fields and unresolved engine gates produce ASIS/FIELD/GATE blockers and readyToCalculate=false',()=>{
  const ctx=makeCtx();const e=makeEngagement();ctx.__eng=e;
  const c=ctx.engagementCompletion(e);
  assert.equal(c.readyToCalculate,false);
  assert.ok(c.blockers.some(b=>b.type==='ASIS'&&b.id==='Mapa AS-IS'));
  assert.ok(c.blockers.some(b=>b.type==='ASIS'&&b.id==='Confirmación AS-IS'));
  assert.ok(c.blockers.some(b=>b.type==='FIELD'&&b.id==='DF900'&&b.label==='Empresa'));
  assert.ok(c.blockers.some(b=>b.type==='GATE'));
  assert.equal(c.engineGates.totalCount,5);
  assert.equal(c.engineGates.resolvedCount,0);
});

test('a stage with no directly visible canonical fields falls back to confirmedAsIs for "reviewed" (never inventing a new signal)',()=>{
  const ctx=makeCtx();const e=makeEngagement();ctx.__eng=e;
  let c=ctx.engagementCompletion(e);
  assert.equal(c.stagesTotal,3);
  assert.equal(c.stagesReviewed,0);
  e.confirmedAsIs=true;
  c=ctx.engagementCompletion(e);
  assert.ok(c.stagesReviewed>=1,'S03 has zero fields so it must follow e.confirmedAsIs');
});

test('readyToCalculate mirrors runDiagnosis gating exactly: only missing===[] and engineGates.unresolved===[] flip it true',()=>{
  const ctx=makeCtx();const e=makeEngagement();ctx.__eng=e;
  e.answers.DF900='ACME';e.answers.DF010='Reducir tiempos de espera';
  e.processSteps=[{id:'s1',status:'ACTIVE'}];e.confirmedAsIs=true;
  e.engineGates={process_design_first:'NO',existing_tool_can_close:'NO',unstructured_interpretation_need:'NO',bounded_action_space:'NO',management_visibility_need:'NO'};
  const c=ctx.engagementCompletion(e);
  assert.equal(c.missing.length,0);
  assert.equal(c.engineGates.unresolved.length,0);
  assert.equal(c.readyToCalculate,true);
  assert.equal(c.requiredApplicable,c.requiredComplete);
});

test('evidencePending surfaces frictions/economics without evidence_type without asserting a "reviewed"/"confirmed" state that does not exist in the model',()=>{
  const ctx=makeCtx();const e=makeEngagement();ctx.__eng=e;
  e.frictions=[{id:'f1',status:'ACTIVE',friction_type:'P07',evidence_type:''}];
  e.economicInputs=[{driver_id:'D1',evidence_type:''}];
  const c=ctx.engagementCompletion(e);
  assert.equal(c.evidencePending.length,2);
  assert.ok(c.evidencePending.some(x=>x.type==='FRICTION'&&x.id==='f1'));
  assert.ok(c.evidencePending.some(x=>x.type==='ECONOMIC'&&x.id==='D1'));
});

test('stagePage no longer renders the fixed answered/100 denominator or a global pct as the stage headline',()=>{
  const diagSrc=fs.readFileSync(path.join(root,'app-diagnostic-fields.js'),'utf8');
  assert.doesNotMatch(diagSrc,/\/100 campos/);
  assert.doesNotMatch(diagSrc,/overall\.pct/);
  assert.match(diagSrc,/engagementCompletion\(e\)/);
  assert.match(diagSrc,/completion-summary/);
  assert.match(diagSrc,/readyToCalculate/);
});

test('state.returnTo round-trips: leaving a stage for the process map remembers it, and returning restores stageId and clears returnTo',()=>{
  const coreSrc=fs.readFileSync(path.join(root,'app-core.js'),'utf8');
  assert.match(coreSrc,/function goToProcessFromStage\(\)/);
  assert.match(coreSrc,/function returnToStage\(\)/);
  assert.match(coreSrc,/state\.returnTo=\{page:'diagnostico',stageId:e\.stageId\}/);
  assert.match(coreSrc,/state\.returnTo=null/);
  const diagSrc=fs.readFileSync(path.join(root,'app-diagnostic-fields.js'),'utf8');
  assert.match(diagSrc,/data-goto-process/);
  const processSrc=fs.readFileSync(path.join(root,'app-process-v1.js'),'utf8');
  assert.match(processSrc,/id="returnToStage"/);
});

test('validationSummary (last-stage closing screen) uses only factual language — "con evidencia/controles registrados", never "revisada"/"confirmado" except the real e.confirmedAsIs state',()=>{
  const ctx=makeCtx();
  const e={confirmedAsIs:false,processSteps:[{id:'s1',status:'ACTIVE'}],frictions:[{id:'f1',status:'ACTIVE',evidence_type:'EV02'},{id:'f2',status:'ACTIVE',evidence_type:''}],risks:[{controls_present:true},{controls_present:false}],economicInputs:[{driver_id:'D1',evidence_type:'MEASURED'}],answers:{}};
  const completion={readyToCalculate:false,missing:[{type:'FIELD',id:'DF900',label:'Empresa',stage:'S01',navigationTarget:'diagnostico'}],blockers:[{type:'FIELD',id:'DF900',label:'Empresa',stage:'S01',navigationTarget:'diagnostico'}]};
  const html=ctx.validationSummary(e,completion);
  assert.match(html,/1 con evidencia registrada/);
  assert.match(html,/1 con controles registrados/);
  assert.match(html,/1 Medido/);
  assert.doesNotMatch(html,/revisada/i);
  assert.doesNotMatch(html,/\bconfirmado\b/i,'only the literal e.confirmedAsIs state may use this word, and it is false here');
  assert.match(html,/data-goto-stage="S01"/);
  assert.doesNotMatch(html,/id="runDiag"/,'the CALCULAR button must not appear while blockers remain');
});

test('validationSummary shows the single CALCULAR CTA (and nothing else) once readyToCalculate is true',()=>{
  const ctx=makeCtx();
  const e={confirmedAsIs:true,processSteps:[{id:'s1',status:'ACTIVE'}],frictions:[],risks:[],economicInputs:[],answers:{DF098:'Solicitar evidencias — Pedro — 12/09/2026'}};
  const completion={readyToCalculate:true,missing:[],blockers:[]};
  const html=ctx.validationSummary(e,completion);
  assert.match(html,/id="runDiag">CALCULAR DIAGNÓSTICO Y RECOMENDACIÓN/);
  assert.doesNotMatch(html,/blocker-list/);
  assert.match(html,/Solicitar evidencias — Pedro — 12\/09\/2026/);
});

test('the last stage renders validationSummary and never a "Siguiente →" button (no stage 10)',()=>{
  assert.match(diagFieldsCode,/isLastStage\?validationSummary\(e,completion\):''/);
  assert.match(diagFieldsCode,/isLastStage\?''/);
  assert.doesNotMatch(diagFieldsCode,/stageIndex===schema\.flow\.length-1\?'disabled':''/,'the old disabled-but-present Siguiente button must be gone, not just disabled');
});

test('the diagnóstico header CTA (#runDiagHeader) shows "Calcular diagnóstico y recomendación" before any DiagnosticOutput exists and "Recalcular" only after, and never collides with the last-stage CALCULAR CTA (#runDiag) that validationSummary renders alongside it',()=>{
  const ctx=makeCtx();
  const e=makeEngagement();
  e.answers={DF900:'ACME',DF010:'Reducir tiempos de espera'};
  e.processSteps=[{id:'s1',status:'ACTIVE'}];
  e.confirmedAsIs=true;
  e.engineGates={process_design_first:'NO',existing_tool_can_close:'NO',unstructured_interpretation_need:'NO',bounded_action_space:'NO',management_visibility_need:'NO'};
  ctx.__eng=e;

  e.stageId='S01';
  let html=ctx.stagePage();
  assert.match(html,/id="runDiagHeader">Calcular diagnóstico y recomendación</);
  assert.doesNotMatch(html,/id="runDiagHeader">Recalcular/);

  e.diagnosticOutput={recommendation:{}};
  html=ctx.stagePage();
  assert.match(html,/id="runDiagHeader">Recalcular/);

  e.stageId='S03'; // last stage in this synthetic 3-stage flow
  html=ctx.stagePage();
  assert.equal((html.match(/id="runDiagHeader"/g)||[]).length,1);
  assert.equal((html.match(/id="runDiag"/g)||[]).length,1,'the validationSummary CALCULAR CTA must keep its own distinct id, never colliding with the header button');
  assert.match(html,/id="runDiag">CALCULAR DIAGNÓSTICO Y RECOMENDACIÓN/);
});

// --- Bug "5/9 etapas revisadas" on a fully worked, already-calculated case — real canonical schema ---
// completionStageReviewed() used to require EVERY visible field of a stage (required AND optional AND
// conditional) to carry a value. Two independent, real defects made that unreachable even on a genuinely
// complete case: (1) DF094/DF095 (S09) are SYSTEM_GENERATED checklists whose own reusedValue() is
// canonicalMissingRequired(e) itself — an array that reads as absent exactly when the case IS complete,
// a self-referential paradox; (2) DF080/DF081 (S07) had Control_UI:DERIVED_OR_CONDITIONAL, which the
// renderer's "starts with DERIVED => read-only" heuristic swallowed even though their Ask_Mode is
// CONDITIONAL_ASK — a genuinely askable field that could never actually be answered from the UI. The
// real, deeper fix is that "reviewed" now tracks the same REQUIRED_90M tier that already gates
// readyToCalculate/canonicalMissingRequired, so a stage full of legitimately-blank optional/conditional
// fields does not get stuck forever. These fixtures use the REAL diagnostic-master.min.json, not a
// synthetic schema, so the assertions are about the actual shipped Diagnostic Master v1.1.
const realSchema=require('../data/diagnostic-master.min.json');
function firstOpt(setId){return realSchema.option_sets[setId].options[0].value}
function makeRealCtx(){
  const ctx={
    console,schema:realSchema,
    companyById:()=>({id:'c1',name:'ACME'}),
    fieldOptions:id=>(realSchema.option_sets[id]||{}).options||[],
    labelFrom:(setId,v)=>v,
    normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),
    setAnswer:()=>{},bindForms:()=>{},markDirty:()=>{},render:()=>{},setPage:()=>{},
    openModal:()=>{},closeModal:()=>{},toast:()=>{},now:()=>'',runDiagnosis:()=>{},
    esc:v=>String(v??''),attr:v=>String(v??''),
    state:{backendOnline:true,returnTo:null},
    document:{querySelectorAll:()=>[],getElementById:()=>null}
  };
  ctx.currentEng=()=>ctx.__eng;
  vm.createContext(ctx);
  vm.runInContext(noReaskCode,ctx);
  vm.runInContext(engineAdapterCode,ctx);
  vm.runInContext(completionCode,ctx);
  return ctx;
}
function fullyWorkedEngagement(){
  return {
    companyId:'c1',contactIds:['p1'],
    answers:{
      DF001:'ACME',DF006:'p1',
      DF008:[firstOpt('OS_SESSION_OBJECTIVE')],
      DF011:'Proceso de aprobación de facturas',
      DF012:firstOpt('OS_TRIGGER_TYPE'),DF013:firstOpt('OS_OUTCOME_TYPE'),
      DF021:{value:10,unit:'case',period:'',mode:''},DF022:firstOpt('OS_PERIOD'),
      DF086:[firstOpt('OS_FUTURE_OUTCOME')],
      DF098:'Enviar resumen — Ana — 12/09/2026'
    },
    processSteps:[{id:'s1',status:'ACTIVE',step_name:'Alta',actor:'A1',tool:'T1',active_time:10,occurrences_per_case:1}],
    frictions:[{id:'f1',status:'ACTIVE',friction_type:'P07',evidence_type:'EV02'}],
    risks:[{controls_present:true}],
    economicInputs:[{driver_id:'D1',evidence_type:'MEASURED'}],
    confirmedAsIs:true,
    engineGates:{process_design_first:'NO',existing_tool_can_close:'NO',unstructured_interpretation_need:'NO',bounded_action_space:'NO',management_visibility_need:'NO'}
  };
}

test('a fully worked, already-calculable case (every REQUIRED_90M field answered, AS-IS confirmed, gates resolved) shows every applicable stage as reviewed — never stuck below stagesTotal',()=>{
  const ctx=makeRealCtx();const e=fullyWorkedEngagement();ctx.__eng=e;
  const c=ctx.engagementCompletion(e);
  assert.equal(c.stagesReviewed,c.stagesTotal,`esperaba ${c.stagesTotal}/${c.stagesTotal}, obtuve ${c.stagesReviewed}/${c.stagesTotal} — pendientes: ${JSON.stringify(c.missing)}`);
  assert.equal(c.missing.length,0);
  assert.equal(c.readyToCalculate,true);
  assert.equal(c.requiredComplete,c.requiredApplicable);
});

test('DF094/DF095 (S09 system-generated checklist) never block S09 from being reviewed once the case is genuinely complete, despite their own self-referential reusedValue()',()=>{
  const ctx=makeRealCtx();const e=fullyWorkedEngagement();ctx.__eng=e;
  const s09=realSchema.flow.find(s=>s.Stage_ID==='S09');
  assert.equal(ctx.completionStageReviewed(s09,e),true);
  assert.equal(ctx.reusedValue('DF094',e).length,0,'canonicalMissingRequired ya está vacío: DF094 se auto-referencia y nunca podría satisfacer valuePresent');
});

test('DF080/DF081 (S07, Ask_Mode CONDITIONAL_ASK, Control_UI DERIVED_OR_CONDITIONAL) render a real editable number+unit control, never the read-only "se completará automáticamente" box that made them permanently unanswerable',()=>{
  const rendererCode=fs.readFileSync(path.join(root,'app-renderer-v1.js'),'utf8');
  const ctx={console,schema:realSchema,state:{companies:[]},
    fieldOptions:id=>(realSchema.option_sets[id]||{}).options||[],
    esc:v=>String(v??''),attr:v=>String(v??''),
    answerDetails:()=>({}),normalizeArray:v=>Array.isArray(v)?v:(v==null?[]:[v]),
    labelFrom:()=>'',referenceableContacts:()=>[],document:{querySelectorAll:()=>[]},
    formatDateEs:()=>'',bindForms:()=>{}
  };
  vm.createContext(ctx);vm.runInContext(rendererCode,ctx);
  const df080=realSchema.fields.find(f=>f.Field_ID==='DF080');
  const html=ctx.renderControl(df080,'',[],{processSteps:[],frictions:[]});
  assert.match(html,/data-number-value="DF080"/);
  assert.doesNotMatch(html,/readonly-box/);
  assert.doesNotMatch(html,/control-error/);
});

test('an incomplete case (one required field missing in one stage) correctly names that exact stage as not-reviewed, and every other applicable stage still shows reviewed',()=>{
  const ctx=makeRealCtx();const e=fullyWorkedEngagement();ctx.__eng=e;
  delete e.answers.DF013; // S02 required field left blank
  const c=ctx.engagementCompletion(e);
  assert.equal(c.stagesReviewed,c.stagesTotal-1,`sólo S02 debía quedar pendiente; pendientes: ${JSON.stringify(c.missing)}`);
  const s02=realSchema.flow.find(s=>s.Stage_ID==='S02');
  assert.equal(ctx.completionStageReviewed(s02,e),false);
  assert.ok(c.missing.some(m=>m.id==='DF013'&&m.stage==='S02'));
  ['S01','S03','S04','S05','S06','S07','S08','S09'].forEach(sid=>{
    const s=realSchema.flow.find(x=>x.Stage_ID===sid);
    assert.equal(ctx.completionStageReviewed(s,e),true,`${sid} debía seguir revisada`);
  });
  assert.equal(c.readyToCalculate,false);
});
// [AUNEA-UAT-COMPLETION-010] END
