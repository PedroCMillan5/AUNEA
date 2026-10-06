// [AUNEA-UAT-RESULTS-010] START — Results/recommendation/scenario/quote regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
const coreCode=fs.readFileSync(path.join(root,'core/state.js'),'utf8');
const i18nCode=fs.readFileSync(path.join(root,'core/i18n.js'),'utf8');

test('the dead shadowed duplicates (processPage/flowReview/buildBackendPayload/evidenceTypeBackend/runDiagnosis and the obsolete recommendation-adapter guardrail) are gone from this file',()=>{
  assert.doesNotMatch(code,/unresolvedRecommendationAdapter/);
  assert.doesNotMatch(code,/function runDiagnosis\(/);
  assert.doesNotMatch(code,/function buildBackendPayload\(/);
  assert.doesNotMatch(code,/function processPage\(/);
  assert.doesNotMatch(code,/function flowReview\(/);
});

test('capture mutations use one central invalidation contract for DiagnosticOutput and alternative scenarios',()=>{
  assert.match(coreCode,/function invalidateDerivedState\(/);
  assert.match(coreCode,/e\.diagnosticOutput=null/);
  assert.match(coreCode,/e\.scenarioResults=\[\]/);
  assert.match(coreCode,/function setAnswer\([^)]*\)[\s\S]*invalidateDerivedState\(e,/);
});

function makeCtx(uiMode){
  const schema={tables:{
    REF_PAIN:[],
    REF_PRODUCT:[{Product_ID:'PROD-A-P0',Product_Name:'Diagnóstico Operativo'}],
    REF_LEVEL_FUNC:[{Functional_Level_ID:'N1',Name:'Register'},{Functional_Level_ID:'N2',Name:'Standardize'}],
    REF_LEVEL_AI:[{AI_Level_ID:'I0',Name:'Rules / no AI'},{AI_Level_ID:'I1',Name:'Assisted'}],
    REF_ACTION:[{Action_ID:'ACT00',Name:'No action'},{Action_ID:'A1',Name:'Redesign'}]
  },friction_pain_map:[]};
  // Results fixtures represent PG09-confirmed captures; an unconfirmed Engagement is deliberately gated.
  const eng={id:'E1',companyId:'c1',answers:{},processSteps:[],frictions:[],economicInputs:[],risks:[],scenarioResults:[],diagnosticOutput:null,meetingRecap:'',confirmedAsIs:true,confirmedSnapshots:[{version:1}],lastEngineSnapshotVersion:1};
  const ctx={
    console,schema,
    currentEng:()=>eng,
    confirmedSnapshot:()=>eng.confirmedSnapshots[eng.confirmedSnapshots.length-1]||null,
    state:{backendOnline:true,backendUrl:'http://localhost:8000',uiMode:uiMode||'INTERNAL'},
    missingRequired:()=>[],labelFrom:(s,v)=>v,companyById:()=>({name:'ACME'}),
    normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),
    evidenceTypeBackend:v=>v||'CLIENT_DECLARED',
    econDriverLabel:v=>v,
    processBoundaryValue:(e,id,fallback)=>e.answers?.[id]||fallback,
    buildBackendPayload:()=>({engagement_id:'E1'}),
    esc:v=>String(v??''),attr:v=>String(v??''),pageTop:()=>'',section:(t,s,body,actions)=>`${body}${actions||''}`,
    auneaSelectControl:(id,opts,val,{extra='',placeholder='Selecciona…'}={})=>`<div class="canonical-aunea-select"><input type="hidden" id="${id}" value="${val||''}" ${extra}><details class="aunea-select"><summary><span>${placeholder}</span><i></i></summary><div class="aunea-select-menu">${(opts||[]).map(o=>`<button data-aunea-select-option="${id}" data-value="${o.value}" data-label="${o.label}">${o.label}</button>`).join('')}</div></details></div>`,
    openModal:()=>{},closeModal:()=>{},markDirty:()=>{},render:()=>{},toast:()=>{},now:()=>'',
    document:{getElementById:()=>null,querySelectorAll:()=>[]}
  };
  vm.createContext(ctx);vm.runInContext(i18nCode,ctx);vm.runInContext(code,ctx);ctx.__eng=eng;return ctx;
}

test('resultsPage translates risk.residual_level/risk.status and pain state/confidence to Spanish, never the raw backend code',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={pain_results:[{pain_id:'P01',state:'CONFIRMED',confidence:'HIGH'}],economic_result:{},risk_result:{residual_level:'R2',status:'CONTROL_GAP'}};const html=ctx.resultsPage();assert.match(html,/Riesgo medio/);assert.match(html,/Brecha de control/);assert.match(html,/Confirmado/);assert.match(html,/Alta/);assert.doesNotMatch(html,/>CONTROL_GAP</);assert.doesNotMatch(html,/Estado: CONFIRMED/)});
test('resultsPage falls back to "—" when risk/pain fields are not yet present',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{}};assert.match(ctx.resultsPage(),/<strong>—<\/strong><span><\/span>/)});
test('scenarioBody and quotePage translate scenario risk level and quote status to Spanish',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={optimal_scenario:{action_id:'A1',risk:{residual_level:'R3'},quote:{status:'BLOCKED'}},quote:{status:'BLOCKED'}};assert.match(ctx.scenarioBody(ctx.__eng.diagnosticOutput.optimal_scenario),/Riesgo crítico/);const html=ctx.quotePage();assert.match(html,/Bloqueada/);assert.doesNotMatch(html,/>BLOCKED</)});
test('PG10 uses business-facing Hallazgos wording in the internal diagnosis workspace',()=>{const a=makeCtx('INTERNAL');a.__eng.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{},recommendation:{rationale:[]}};assert.match(a.resultsPage(),/Hallazgos confirmados/);assert.doesNotMatch(a.resultsPage(),/Pains confirmados/)});
test('the raw Pain_ID badge is internal-only',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={pain_results:[{pain_id:'P01',state:'CONFIRMED',confidence:'HIGH'}],economic_result:{},risk_result:{}};assert.match(ctx.resultsPage(),/<span class="code internal-only">P01<\/span>/)});
test('recommendation/buildRecap/scenario resolve business labels and keep raw codes internal-only',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={recommendation:{action_id:'A1',functional_level_id:'N2',ai_level_id:'I1',rationale:[]},quote:{}};const html=ctx.recommendationPage();assert.match(html,/Redesign/);assert.match(html,/Automatización del flujo normal/);assert.match(html,/IA asistida/);assert.match(html,/<span class="internal-tag">A1<\/span>/);const recap=ctx.buildRecap(ctx.__eng,ctx.__eng.diagnosticOutput);assert.match(recap,/Redesign/);assert.match(recap,/Automatización del flujo normal/);assert.match(recap,/IA asistida/);assert.doesNotMatch(recap,/\bA1\b|\bN2\b|\bI1\b/);assert.match(ctx.scenarioBody({action_id:'A1',functional_level_id:'N2',ai_level_id:'I1',quote:{}}),/Automatización del flujo normal \/ IA asistida/)});
test('libraryHtml resolves REF_LEVEL_FUNC/REF_LEVEL_AI through Name',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={optimal_scenario:{},quote:{}};const html=ctx.quotePage();assert.match(html,/Registro y trazabilidad/);assert.match(html,/Reglas \/ sin IA/);assert.doesNotMatch(html,/>N1</);assert.doesNotMatch(html,/>I0</)});
test('internal product/level/action library is wrapped internal-only in scenarios and quote',()=>{const a=makeCtx();a.__eng.diagnosticOutput={optimal_scenario:{},quote:{}};assert.match(a.scenariosPage(),/<div class="internal-only">[\s\S]*Diagnóstico Operativo[\s\S]*<\/div>/);const b=makeCtx();b.__eng.diagnosticOutput={optimal_scenario:{},quote:{}};assert.match(b.quotePage(),/<div class="internal-only">[\s\S]*Diagnóstico Operativo[\s\S]*<\/div>/)});

test('downloadQuotePdf requests a client-safe PDF and never window.print()',async()=>{
  const ctx=makeCtx();ctx.__eng.diagnosticOutput={optimal_scenario:{action_id:'A1',functional_level_id:'N1',ai_level_id:'I0',quote:{}},quote:{}};ctx.__eng.answers={DF011:'Alta de cliente',DF098:'Enviar resumen — Ana — 12/09/2026'};ctx.__eng.selectedScenarioIndex=0;
  let fetchArgs=null;const fakeBlob={__isBlob:true};ctx.fetch=async(url,opts)=>{fetchArgs={url,opts};return {ok:true,blob:async()=>fakeBlob}};
  const createdAnchors=[];ctx.document.createElement=tag=>{const el={tag,clicked:false,click(){this.clicked=true},remove(){}};if(tag==='a')createdAnchors.push(el);return el};ctx.document.body={appendChild:()=>{}};ctx.URL={createObjectURL:()=> 'blob:fake-url',revokeObjectURL:()=>{}};ctx.setTimeout=()=>{};let toasted='';ctx.toast=msg=>{toasted=msg};
  await ctx.downloadQuotePdf();const body=JSON.parse(fetchArgs.opts.body);assert.match(fetchArgs.url,/\/v1\/deliverables\/pdf$/);assert.deepEqual(body.diagnostic,ctx.__eng.diagnosticOutput);assert.equal(body.request.client_name,'ACME');assert.equal(body.request.process_name,'Alta de cliente');assert.equal(body.request.next_step,'Enviar resumen — Ana — 12/09/2026');assert.equal(body.request.include_internal_appendix,false);assert.equal(createdAnchors[0].href,'blob:fake-url');assert.match(createdAnchors[0].download,/^AUNEA_.*\.pdf$/);assert.equal(createdAnchors[0].clicked,true);assert.match(toasted,/descargado/i);
  const codeWithoutComments=code.split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');assert.doesNotMatch(codeWithoutComments,/window\.print\(\)/);const shellCode=fs.readFileSync(path.join(root,'ui/shell.js'),'utf8');assert.match(shellCode,/printQuote['"]?\)?\.onclick\s*=\s*downloadQuotePdf/);
});

test('createScenario shows business names and requires an existing diagnostic snapshot',()=>{const ctx=makeCtx();ctx.openModal=(title,body)=>{ctx.__lastBody=body};ctx.__eng.diagnosticOutput={input_snapshot_hash:'H1',rule_bundle_version:'v0.8',optimal_scenario:{}};ctx.createScenario();assert.match(ctx.__lastBody,/data-value="A1"[^>]*>Redesign<\/button>/);assert.match(ctx.__lastBody,/data-value="N2"[^>]*>Automatización del flujo normal<\/button>/);assert.match(ctx.__lastBody,/data-value="I1"[^>]*>IA asistida<\/button>/);assert.doesNotMatch(ctx.__lastBody,/<select|<option/)});

test('createScenario posts the exact DiagnosticOutput shown in the UI as the comparison base',async()=>{
  const ctx=makeCtx();const diag={input_snapshot_hash:'HASH-1',rule_bundle_version:'v0.8',optimal_scenario:{}};ctx.__eng.diagnosticOutput=diag;ctx.__eng.scenarioResults=[];
  let save=null;ctx.openModal=(title,body,onSave)=>{save=onSave};const controls={scName:{value:'Alt'},scAction:{value:'A1'},scN:{value:'N2'},scI:{value:'I1'}};ctx.document.getElementById=id=>controls[id]||null;let sent=null;ctx.fetch=async(url,opts)=>{sent=JSON.parse(opts.body);return {ok:true,status:200,json:async()=>({compared:{scenario_id:'S2'},input_snapshot_hash:'HASH-1',rule_bundle_version:'v0.8'})}};
  ctx.createScenario();await save();assert.deepEqual(sent.diagnostic,diag);assert.deepEqual(sent.engagement,{engagement_id:'E1'});assert.equal(sent.scenario.scenario_name,'Alt');assert.equal(ctx.__eng.scenarioResults.length,1);
});
// [AUNEA-UAT-RESULTS-010] END

test('PG10 readiness exposes an explicit backend execution action instead of a dead readiness screen',()=>{
  const ctx=makeCtx();ctx.__eng.diagnosticOutput=null;ctx.__eng.lastEngineSnapshotVersion=null;
  const html=ctx.resultsPage();
  assert.match(html,/Diagnóstico interno/);
  assert.match(html,/id="runDiag">Ejecutar diagnóstico/);
  assert.match(html,/Pain[\s\S]*Economics[\s\S]*Risk[\s\S]*Recommendation[\s\S]*Pricing[\s\S]*Scenario/);
});

test('PG10 result renders diagnostic sections, traceability and the governed TO-BE handoff',()=>{
  const ctx=makeCtx();
  ctx.schema.tables.REF_PAIN=[{Pain_ID:'P01',Pain_Name:'Información incompleta'}];
  ctx.schema.friction_pain_map=[{Friction_Type_ID:'P01',Pain_ID:'P01'}];
  ctx.__eng.processSteps=[{id:'S1',step_name:'Validar factura',status:'ACTIVE',rework_time:10}];
  ctx.__eng.frictions=[{id:'F1',status:'ACTIVE',friction_type:'P01',client_label:'Información incompleta',observable_signal:'Faltan datos',affected_steps:['S1']}];
  ctx.__eng.economicInputs=[{driver_id:'ED05',step_ids:['S1'],annual_active_hours:19.2,evidence_type:'CLIENT_DECLARED'}];
  ctx.__eng.risks=[{step_ids:['S1'],description:'Riesgo de error',likelihood_1_5:3,impact_1_5:4,controls_present:true}];
  ctx.__eng.diagnosticOutput={pain_results:[{pain_id:'P01',state:'CONFIRMED',confidence:'HIGH',rationale:'Se observa retrabajo'}],economic_result:{annual_active_hours:19.2,annual_wait_hours:0,direct_loss_eur_annual:0,current_tool_cost_eur_annual:0,realized_cash_saving_eur_annual:0},risk_result:{inherent_level:'R2',residual_level:'R1',status:'CONTROLLED',rationale:'Controles presentes'},recommendation:{action_id:'A1',functional_level_id:'N2',ai_level_id:'I1',confidence:'HIGH',rationale:['Estandarizar antes de automatizar']}};
  const html=ctx.resultsPage();
  assert.match(html,/Mapa AS-IS con contexto de diagnóstico/);
  assert.match(html,/Información incompleta/);
  assert.match(html,/Validar factura/);
  assert.match(html,/19,2 h\/año/);
  assert.match(html,/Riesgo de error/);
  assert.match(html,/Recomendación preliminar/);
  assert.match(html,/Revisado: continuar a TO-BE/);
});

test('PG11 is blocked until a diagnostic output exists for the current confirmed snapshot',()=>{
  const ctx=makeCtx();ctx.__eng.diagnosticOutput=null;ctx.__eng.lastEngineSnapshotVersion=null;
  assert.match(ctx.tobePage(),/Diagnóstico vigente requerido/);
  ctx.__eng.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{},recommendation:{},optimal_scenario:{}};
  ctx.__eng.lastEngineSnapshotVersion=1;
  assert.match(ctx.tobePage(),/Crear borrador desde AS-IS confirmado/);
});

test('PG10 translates canonical business labels and structured engine rationales to Spanish',()=>{
  const ctx=makeCtx();
  ctx.schema.tables.REF_PAIN=[{Pain_ID:'P02',Pain_Pattern:'Missing / incomplete information'}];
  assert.equal(ctx.diagnosisPainLabel('P02'),'Información faltante o incompleta');
  assert.equal(ctx.actionLabel('ACT03'),'Construcción de sistema');
  assert.equal(ctx.funcLevelLabel('N4'),'Visibilidad y control');
  assert.equal(ctx.aiLevelLabel('I0'),'Reglas / sin IA');
  assert.match(ctx.engineRationaleEs('risk','Highest contextual risk=R3; controls_present=True.'),/Riesgo crítico/);
  assert.doesNotMatch(ctx.engineRationaleEs('risk','Highest contextual risk=R3; controls_present=True.'),/Highest contextual risk|controls_present/);
});

test('PG10 names aggregated active economics as quantified impact time, not total process work',()=>{
  const ctx=makeCtx();
  const html=ctx.diagnosisEconomicsHtml({annual_active_hours:139.2,annual_wait_hours:5760,capacity_value_eur_annual:3619.2,direct_loss_eur_annual:0,current_tool_cost_eur_annual:0,realized_cash_saving_eur_annual:0},{economicInputs:[]});
  assert.match(html,/Tiempo activo cuantificado/);
  assert.match(html,/no es la duración total del proceso/);
  assert.doesNotMatch(html,/>Trabajo activo anual</);
});
