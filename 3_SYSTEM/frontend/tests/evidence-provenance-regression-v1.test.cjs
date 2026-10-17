// [AUNEA-UAT-EVIDENCE-PROVENANCE-131] START — Provenance cannot be upgraded silently
// SOURCE: Diagnostic Master v1.2 EV01–EV07; PROJECT_RULES evidence classes; DEC-050.
// Regression on the actual engine adapter, with no backend/network dependency.
// CHANGE_RISK: HIGH.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../services/engine-adapter.js'),'utf8');
function extract(a,b){
  const i=src.indexOf(a),j=src.indexOf(b,i+a.length);
  assert.ok(i>=0&&j>i,a+' not found');
  return src.slice(i,j);
}
const functions=[
  extract('function evidenceTypeBackend(v){','function buildPainCandidatePayload('),
  extract('function buildBackendPayload(engagement){','async function runDiagnosis(){')
].join('\n');
const ctx={
  schema:{friction_pain_map:[{Friction_Type_ID:'P03',Pain_ID:'P03'}]},
  normalizeArray:v=>Array.isArray(v)?v:v==null||v===''?[]:[v],
  activeFrictions:e=>e.frictions||[],activeSteps:e=>e.processSteps||[],
  engagementOfRecord:e=>e,
  questionnaireAnswersForEngine:e=>e.answers||{},
  engineGates:()=>({}),
  ENGINE_GATE_CONTRACT:[],
  gateBool:()=>false
};
vm.createContext(ctx);
vm.runInContext(functions,ctx);
test('all canonical evidence classes map correctly, including sources that are not client declarations',()=>{
  const expected={
    EV01:'MEASURED',EV02:'CLIENT_DECLARED',EV03:'AUNEA_ESTIMATE',
    EV04:'HYPOTHESIS',EV05:'SPECIFIC_BENCHMARK',
    EV06:'AUNEA_ESTIMATE',EV07:'AUNEA_ESTIMATE'
  };
  for(const [input,output] of Object.entries(expected))assert.equal(ctx.evidenceTypeBackend(input),output,input);
});
test('blank or unsupported evidence is never upgraded to CLIENT_DECLARED',()=>{
  for(const input of ['',null,undefined,'GARBAGE'])assert.equal(ctx.evidenceTypeBackend(input),null,String(input));
});
test('invalid EconomicInput evidence fails before producing a backend payload',()=>{
  const e={economicInputs:[{driver_id:'ED12',current_tool_cost_eur_annual:100,evidence_type:'GARBAGE'}]};
  assert.throws(()=>ctx.normalizeEconomicInputs(e),/Evidencia económica sin tipo reconocido/);
});
test('friction with missing evidence has no fabricated evidence record or reference',()=>{
  const e={
    id:'E1',processName:'Test',answers:{DF011:'Proceso'},
    processSteps:[],risks:[],economicInputs:[],
    frictions:[{id:'F1',friction_type:'P03',observable_signal:'Captura doble',evidence_type:''}]
  };
  const payload=ctx.buildBackendPayload(e);
  assert.deepEqual(Array.from(payload.evidence),[]);
  assert.deepEqual(Array.from(payload.pain_signals[0].evidence_ids),[]);
  assert.equal(payload.pain_signals[0].concrete_evidence_present,false);
});
// [AUNEA-UAT-EVIDENCE-PROVENANCE-131] END
