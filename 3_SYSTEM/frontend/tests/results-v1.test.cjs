// [AUNEA-UAT-RESULTS-010] START — Results/recommendation/scenario/quote regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'app-results.js'),'utf8');
const i18nCode=fs.readFileSync(path.join(root,'app-i18n-labels-v1.js'),'utf8');

test('the dead shadowed duplicates (processPage/flowReview/buildBackendPayload/evidenceTypeBackend/runDiagnosis and the obsolete recommendation-adapter guardrail) are gone from this file',()=>{
  assert.doesNotMatch(code,/unresolvedRecommendationAdapter/);
  assert.doesNotMatch(code,/function runDiagnosis\(/);
  assert.doesNotMatch(code,/function buildBackendPayload\(/);
  assert.doesNotMatch(code,/function processPage\(/);
  assert.doesNotMatch(code,/function flowReview\(/);
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
    state:{backendOnline:true,uiMode:uiMode||'INTERNAL'},
    missingRequired:()=>[],
    labelFrom:(s,v)=>v,
    companyById:()=>({name:'ACME'}),
    esc:v=>String(v??''),attr:v=>String(v??''),
    pageTop:()=>'',section:(t,s,body,actions)=>`${body}${actions||''}`,
    openModal:()=>{},closeModal:()=>{},markDirty:()=>{},render:()=>{},toast:()=>{},now:()=>'',
    document:{getElementById:()=>null,querySelectorAll:()=>[]}
  };
  vm.createContext(ctx);
  vm.runInContext(i18nCode,ctx);
  vm.runInContext(code,ctx);
  ctx.__eng=eng;
  return ctx;
}

test('resultsPage translates risk.residual_level/risk.status and pain state/confidence to Spanish, never the raw backend code',()=>{
  const ctx=makeCtx();
  ctx.__eng.diagnosticOutput={pain_results:[{pain_id:'P01',state:'CONFIRMED',confidence:'HIGH'}],economic_result:{},risk_result:{residual_level:'R2',status:'CONTROL_GAP'}};
  const html=ctx.resultsPage();
  assert.match(html,/Riesgo medio/);
  assert.match(html,/Brecha de control/);
  assert.match(html,/Confirmado/);
  assert.match(html,/Alta/);
  assert.doesNotMatch(html,/>CONTROL_GAP</);
  assert.doesNotMatch(html,/Estado: CONFIRMED/);
});

test('resultsPage falls back to "—" (not a console.warn-triggering empty label) when risk/pain fields are not yet present',()=>{
  const ctx=makeCtx();
  ctx.__eng.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{}};
  const html=ctx.resultsPage();
  assert.match(html,/<strong>—<\/strong><span><\/span>/);
});

test('scenarioBody and quotePage translate scenario risk level and quote status to Spanish',()=>{
  const ctx=makeCtx();
  ctx.__eng.diagnosticOutput={optimal_scenario:{action_id:'A1',risk:{residual_level:'R3'},quote:{status:'BLOCKED'}},quote:{status:'BLOCKED'}};
  const scenarioHtml=ctx.scenarioBody(ctx.__eng.diagnosticOutput.optimal_scenario);
  assert.match(scenarioHtml,/Riesgo crítico/);
  const quoteHtml=ctx.quotePage();
  assert.match(quoteHtml,/Bloqueada/);
  assert.doesNotMatch(quoteHtml,/>BLOCKED</);
});

test('the "Pains confirmados" KPI label switches to business language ("Hallazgos confirmados") in Session Mode and stays as-is in Internal Mode',()=>{
  const internalCtx=makeCtx('INTERNAL');
  internalCtx.__eng.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{}};
  assert.match(internalCtx.resultsPage(),/Pains confirmados/);
  const sessionCtx=makeCtx('SESSION');
  sessionCtx.__eng.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{}};
  const sessionHtml=sessionCtx.resultsPage();
  assert.match(sessionHtml,/Hallazgos confirmados/);
  assert.doesNotMatch(sessionHtml,/Pains confirmados/);
});

test('the raw Pain_ID badge in resultsPage is marked internal-only (hidden in Session Mode by the existing global CSS rule)',()=>{
  const ctx=makeCtx();
  ctx.__eng.diagnosticOutput={pain_results:[{pain_id:'P01',state:'CONFIRMED',confidence:'HIGH'}],economic_result:{},risk_result:{}};
  const html=ctx.resultsPage();
  assert.match(html,/<span class="code internal-only">P01<\/span>/);
});

test('recommendationPage/buildRecap/scenarioBody resolve action_id/functional_level_id/ai_level_id through REF_ACTION/REF_LEVEL_FUNC/REF_LEVEL_AI (real canonical reference data), never showing the raw code as protagonist — raw codes stay internal-only',()=>{
  const ctx=makeCtx();
  ctx.__eng.diagnosticOutput={recommendation:{action_id:'A1',functional_level_id:'N2',ai_level_id:'I1',rationale:[]},quote:{}};
  const html=ctx.recommendationPage();
  assert.match(html,/Redesign/);
  assert.match(html,/Standardize/);
  assert.match(html,/Assisted/);
  assert.match(html,/<span class="internal-tag">A1<\/span>/);
  assert.match(html,/<span class="internal-tag">N2<\/span>/);
  assert.match(html,/<span class="internal-tag">I1<\/span>/);
  const recap=ctx.buildRecap(ctx.__eng,ctx.__eng.diagnosticOutput);
  assert.match(recap,/Redesign/);
  assert.match(recap,/Standardize/);
  assert.match(recap,/Assisted/);
  assert.doesNotMatch(recap,/\bA1\b|\bN2\b|\bI1\b/,'a client-facing recap text must never show raw codes');
  const scenarioHtml=ctx.scenarioBody({action_id:'A1',functional_level_id:'N2',ai_level_id:'I1',quote:{}});
  assert.match(scenarioHtml,/Redesign/);
  assert.match(scenarioHtml,/Standardize \/ Assisted/);
});

test('libraryHtml resolves REF_LEVEL_FUNC/REF_LEVEL_AI through their real field name (Name), not a guessed Level_Name/Level_ID that leaked raw codes',()=>{
  const ctx=makeCtx();
  ctx.__eng.diagnosticOutput={optimal_scenario:{},quote:{}};
  const html=ctx.quotePage();
  assert.match(html,/Register/);
  assert.match(html,/Rules \/ no AI/);
  assert.doesNotMatch(html,/>N1</);
  assert.doesNotMatch(html,/>I0</);
});

test('the internal product/level/action library is never a dominant element in front of a client — wrapped internal-only in both scenariosPage and quotePage, so Session Mode hides it entirely',()=>{
  const scenCtx=makeCtx();
  scenCtx.__eng.diagnosticOutput={optimal_scenario:{},quote:{}};
  const scenHtml=scenCtx.scenariosPage();
  assert.match(scenHtml,/<div class="internal-only">[\s\S]*Diagnóstico Operativo[\s\S]*<\/div>/,'library content (sourced from the same REF_PRODUCT/REF_LEVEL_* fixtures) must sit inside the internal-only wrapper');
  const quoteCtx=makeCtx();
  quoteCtx.__eng.diagnosticOutput={optimal_scenario:{},quote:{}};
  const quoteHtml=quoteCtx.quotePage();
  assert.match(quoteHtml,/<div class="internal-only">[\s\S]*Diagnóstico Operativo[\s\S]*<\/div>/);
});

test('createScenario\'s level/action dropdowns show resolved business names as option text, keeping the raw code only as the option value',()=>{
  const ctx=makeCtx();
  ctx.openModal=(title,body)=>{ctx.__lastBody=body};
  ctx.__eng.scenarioResults=[];
  ctx.createScenario();
  assert.match(ctx.__lastBody,/<option value="A1">Redesign<\/option>/);
  assert.match(ctx.__lastBody,/<option value="N2">Standardize<\/option>/);
  assert.match(ctx.__lastBody,/<option value="I1">Assisted<\/option>/);
  assert.doesNotMatch(ctx.__lastBody,/<option>N1<\/option>|<option>I0<\/option>/,'must never show a bare raw code as the visible option text');
});
// [AUNEA-UAT-RESULTS-010] END
