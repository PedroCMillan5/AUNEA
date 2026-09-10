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

function makeCtx(){
  const schema={tables:{REF_PAIN:[],REF_PRODUCT:[],REF_LEVEL_FUNC:[],REF_LEVEL_AI:[],REF_ACTION:[]},friction_pain_map:[]};
  const eng={id:'E1',companyId:'c1',answers:{},processSteps:[],frictions:[],economicInputs:[],risks:[],scenarioResults:[],diagnosticOutput:null,meetingRecap:''};
  const ctx={
    console,schema,
    currentEng:()=>eng,
    state:{backendOnline:true},
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
// [AUNEA-UAT-RESULTS-010] END
