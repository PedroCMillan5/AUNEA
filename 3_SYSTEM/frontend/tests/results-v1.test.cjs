// [AUNEA-UAT-RESULTS-010] START — Results/recommendation/scenario/quote regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'app-results.js'),'utf8');
const coreCode=fs.readFileSync(path.join(root,'app-core.js'),'utf8');
const i18nCode=fs.readFileSync(path.join(root,'app-i18n-labels-v1.js'),'utf8');

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
  const eng={id:'E1',companyId:'c1',answers:{},processSteps:[],frictions:[],economicInputs:[],risks:[],scenarioResults:[],diagnosticOutput:null,meetingRecap:''};
  const ctx={
    console,schema,
    currentEng:()=>eng,
    state:{backendOnline:true,backendUrl:'http://localhost:8000',uiMode:uiMode||'INTERNAL'},
    missingRequired:()=>[],labelFrom:(s,v)=>v,companyById:()=>({name:'ACME'}),
    buildBackendPayload:()=>({engagement_id:'E1'}),
    esc:v=>String(v??''),attr:v=>String(v??''),pageTop:()=>'',section:(t,s,body,actions)=>`${body}${actions||''}`,
    openModal:()=>{},closeModal:()=>{},markDirty:()=>{},render:()=>{},toast:()=>{},now:()=>'',
    document:{getElementById:()=>null,querySelectorAll:()=>[]}
  };
  vm.createContext(ctx);vm.runInContext(i18nCode,ctx);vm.runInContext(code,ctx);ctx.__eng=eng;return ctx;
}

test('resultsPage translates risk.residual_level/risk.status and pain state/confidence to Spanish, never the raw backend code',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={pain_results:[{pain_id:'P01',state:'CONFIRMED',confidence:'HIGH'}],economic_result:{},risk_result:{residual_level:'R2',status:'CONTROL_GAP'}};const html=ctx.resultsPage();assert.match(html,/Riesgo medio/);assert.match(html,/Brecha de control/);assert.match(html,/Confirmado/);assert.match(html,/Alta/);assert.doesNotMatch(html,/>CONTROL_GAP</);assert.doesNotMatch(html,/Estado: CONFIRMED/)});
test('resultsPage falls back to "—" when risk/pain fields are not yet present',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{}};assert.match(ctx.resultsPage(),/<strong>—<\/strong><span><\/span>/)});
test('scenarioBody and quotePage translate scenario risk level and quote status to Spanish',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={optimal_scenario:{action_id:'A1',risk:{residual_level:'R3'},quote:{status:'BLOCKED'}},quote:{status:'BLOCKED'}};assert.match(ctx.scenarioBody(ctx.__eng.diagnosticOutput.optimal_scenario),/Riesgo crítico/);const html=ctx.quotePage();assert.match(html,/Bloqueada/);assert.doesNotMatch(html,/>BLOCKED</)});
test('the Pains KPI switches to client language in Session Mode',()=>{const a=makeCtx('INTERNAL');a.__eng.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{}};assert.match(a.resultsPage(),/Pains confirmados/);const b=makeCtx('SESSION');b.__eng.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{}};assert.match(b.resultsPage(),/Hallazgos confirmados/);assert.doesNotMatch(b.resultsPage(),/Pains confirmados/)});
test('the raw Pain_ID badge is internal-only',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={pain_results:[{pain_id:'P01',state:'CONFIRMED',confidence:'HIGH'}],economic_result:{},risk_result:{}};assert.match(ctx.resultsPage(),/<span class="code internal-only">P01<\/span>/)});
test('recommendation/buildRecap/scenario resolve business labels and keep raw codes internal-only',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={recommendation:{action_id:'A1',functional_level_id:'N2',ai_level_id:'I1',rationale:[]},quote:{}};const html=ctx.recommendationPage();assert.match(html,/Redesign/);assert.match(html,/Standardize/);assert.match(html,/Assisted/);assert.match(html,/<span class="internal-tag">A1<\/span>/);const recap=ctx.buildRecap(ctx.__eng,ctx.__eng.diagnosticOutput);assert.match(recap,/Redesign/);assert.match(recap,/Standardize/);assert.match(recap,/Assisted/);assert.doesNotMatch(recap,/\bA1\b|\bN2\b|\bI1\b/);assert.match(ctx.scenarioBody({action_id:'A1',functional_level_id:'N2',ai_level_id:'I1',quote:{}}),/Standardize \/ Assisted/)});
test('libraryHtml resolves REF_LEVEL_FUNC/REF_LEVEL_AI through Name',()=>{const ctx=makeCtx();ctx.__eng.diagnosticOutput={optimal_scenario:{},quote:{}};const html=ctx.quotePage();assert.match(html,/Register/);assert.match(html,/Rules \/ no AI/);assert.doesNotMatch(html,/>N1</);assert.doesNotMatch(html,/>I0</)});
test('internal product/level/action library is wrapped internal-only in scenarios and quote',()=>{const a=makeCtx();a.__eng.diagnosticOutput={optimal_scenario:{},quote:{}};assert.match(a.scenariosPage(),/<div class="internal-only">[\s\S]*Diagnóstico Operativo[\s\S]*<\/div>/);const b=makeCtx();b.__eng.diagnosticOutput={optimal_scenario:{},quote:{}};assert.match(b.quotePage(),/<div class="internal-only">[\s\S]*Diagnóstico Operativo[\s\S]*<\/div>/)});

test('downloadQuotePdf requests a client-safe PDF and never window.print()',async()=>{
  const ctx=makeCtx();ctx.__eng.diagnosticOutput={optimal_scenario:{action_id:'A1',functional_level_id:'N1',ai_level_id:'I0',quote:{}},quote:{}};ctx.__eng.answers={DF011:'Alta de cliente',DF098:'Enviar resumen — Ana — 12/09/2026'};ctx.__eng.selectedScenarioIndex=0;
  let fetchArgs=null;const fakeBlob={__isBlob:true};ctx.fetch=async(url,opts)=>{fetchArgs={url,opts};return {ok:true,blob:async()=>fakeBlob}};
  const createdAnchors=[];ctx.document.createElement=tag=>{const el={tag,clicked:false,click(){this.clicked=true},remove(){}};if(tag==='a')createdAnchors.push(el);return el};ctx.document.body={appendChild:()=>{}};ctx.URL={createObjectURL:()=> 'blob:fake-url',revokeObjectURL:()=>{}};ctx.setTimeout=()=>{};let toasted='';ctx.toast=msg=>{toasted=msg};
  await ctx.downloadQuotePdf();const body=JSON.parse(fetchArgs.opts.body);assert.match(fetchArgs.url,/\/v1\/deliverables\/pdf$/);assert.deepEqual(body.diagnostic,ctx.__eng.diagnosticOutput);assert.equal(body.request.client_name,'ACME');assert.equal(body.request.process_name,'Alta de cliente');assert.equal(body.request.next_step,'Enviar resumen — Ana — 12/09/2026');assert.equal(body.request.include_internal_appendix,false);assert.equal(createdAnchors[0].href,'blob:fake-url');assert.match(createdAnchors[0].download,/^AUNEA_.*\.pdf$/);assert.equal(createdAnchors[0].clicked,true);assert.match(toasted,/descargado/i);
  const codeWithoutComments=code.split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');assert.doesNotMatch(codeWithoutComments,/window\.print\(\)/);const shellCode=fs.readFileSync(path.join(root,'app-shell.js'),'utf8');assert.match(shellCode,/printQuote['"]?\)?\.onclick\s*=\s*downloadQuotePdf/);
});

test('createScenario shows business names and requires an existing diagnostic snapshot',()=>{const ctx=makeCtx();ctx.openModal=(title,body)=>{ctx.__lastBody=body};ctx.__eng.diagnosticOutput={input_snapshot_hash:'H1',rule_bundle_version:'v0.8',optimal_scenario:{}};ctx.createScenario();assert.match(ctx.__lastBody,/<option value="A1">Redesign<\/option>/);assert.match(ctx.__lastBody,/<option value="N2">Standardize<\/option>/);assert.match(ctx.__lastBody,/<option value="I1">Assisted<\/option>/);assert.doesNotMatch(ctx.__lastBody,/<option>N1<\/option>|<option>I0<\/option>/)});

test('createScenario posts the exact DiagnosticOutput shown in the UI as the comparison base',async()=>{
  const ctx=makeCtx();const diag={input_snapshot_hash:'HASH-1',rule_bundle_version:'v0.8',optimal_scenario:{}};ctx.__eng.diagnosticOutput=diag;ctx.__eng.scenarioResults=[];
  let save=null;ctx.openModal=(title,body,onSave)=>{save=onSave};const controls={scName:{value:'Alt'},scAction:{value:'A1'},scN:{value:'N2'},scI:{value:'I1'}};ctx.document.getElementById=id=>controls[id]||null;let sent=null;ctx.fetch=async(url,opts)=>{sent=JSON.parse(opts.body);return {ok:true,status:200,json:async()=>({compared:{scenario_id:'S2'},input_snapshot_hash:'HASH-1',rule_bundle_version:'v0.8'})}};
  ctx.createScenario();await save();assert.deepEqual(sent.diagnostic,diag);assert.deepEqual(sent.engagement,{engagement_id:'E1'});assert.equal(sent.scenario.scenario_name,'Alt');assert.equal(ctx.__eng.scenarioResults.length,1);
});
// [AUNEA-UAT-RESULTS-010] END
