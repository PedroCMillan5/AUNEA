const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const rules=fs.readFileSync(path.join(root,'data/process-suggestion-rules.js'),'utf8');
const engine=fs.readFileSync(path.join(root,'domain/process-suggestions.js'),'utf8');
const fields={};
const ctx={
  console,
  normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),
  activeSteps:e=>(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
  processContextValues:(e,setId)=>setId==='OS_ACTOR_ROLE'?(e.answers.DF017||[]):[],
  labelFrom:(setId,v)=>({ADMIN:'Administración',EMAIL:'Email',PDF:'PDF',DOWNLOAD:'Descargar',EV04:'Supuesto',EV07:'Inferido',THRESHOLD:'Umbral numérico / importe'}[v]||v),
  decisionCriteriaPresetFromScope:e=>(e.answers.DF020||[]).includes('AMOUNT')?['THRESHOLD']:[],
  processDecisionStep:s=>!!s?._ui?.has_decision,
  attr:v=>String(v??'').replaceAll('"','&quot;'),
  esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
  now:()=> '2026-10-08T17:00:00+02:00',
  toast:()=>{},
  Event:function(){},
  document:{getElementById:id=>fields[id]||null,querySelector:()=>null,querySelectorAll:()=>[]}
};
vm.createContext(ctx);
vm.runInContext(rules,ctx);
vm.runInContext(engine,ctx);

test('first invoice step gets governed reuse, derived and inferred suggestions without writing the step',()=>{
  const e={answers:{DF014:'Recepción de email con factura PDF adjunta',DF017:['ADMIN'],DF020:['AMOUNT'],DF100:'Escenario sintético declarado'},processSteps:[]};
  const s={inputs:[],outputs:[],manual_actions:[],communication_channels:[],evidence:[]};
  const before=JSON.stringify(s);
  const out=ctx.processStepSuggestions(e,s,{});
  assert.equal(JSON.stringify(s),before,'suggestion generation must not mutate the ProcessStep');
  assert.deepEqual(Array.from(out.actor[0].values),['ADMIN']);
  assert.deepEqual(Array.from(out.inputs[0].values),['EMAIL','PDF']);
  assert.deepEqual(Array.from(out.tool.at(-1).values),['EMAIL']);
  assert.deepEqual(Array.from(out.communication_channels[0].values),['EMAIL']);
  assert.deepEqual(Array.from(out.manual_actions[0].values),['DOWNLOAD']);
  assert.ok(out.evidence.some(x=>x.values?.includes('EV04')));
  assert.ok(out.evidence.some(x=>x.values?.includes('EV07')));
  assert.deepEqual(Array.from(out.decision_criteria[0].values),['THRESHOLD']);
  assert.equal(out.applies_to[0].value.mode,'ALL');
});

test('previous outputs are proposed as next inputs rather than copied automatically',()=>{
  const e={answers:{DF017:[]},processSteps:[{id:'S1',status:'ACTIVE',outputs:['PDF','RECORD']}]};
  const s={inputs:[]};
  const out=ctx.processStepSuggestions(e,s,{});
  assert.deepEqual(Array.from(out.inputs[0].values),['PDF','RECORD']);
  assert.deepEqual(s.inputs,[]);
  assert.equal(out.inputs[0].ruleId,'PSR-003');
});

test('suggestion UI states provenance and exposes Apply only for actionable proposals',()=>{
  const html=ctx.processSuggestionHtml('manual_actions',[{ruleId:'PSR-007',type:'INFERRED',values:['DOWNLOAD'],setId:'OS_MANUAL_ACTION',text:'Patrón gobernado.',apply:true}]);
  assert.match(html,/Inferido/);
  assert.match(html,/Descargar/);
  assert.match(html,/data-step-suggestion-rule="PSR-007"/);
  assert.match(html,/>Aplicar</);
  const warning=ctx.processSuggestionHtml('outputs',[{ruleId:'PSR-012',type:'COHERENCE',text:'Revisa.',apply:false}]);
  assert.match(warning,/Revisar coherencia/);
  assert.doesNotMatch(warning,/>Aplicar</);
});

test('accepted provenance is stored separately from confirmed field values',()=>{
  const s={manual_actions:[]};
  const sug={ruleId:'PSR-007',type:'INFERRED',values:['DOWNLOAD'],targetField:'manual_actions'};
  ctx.processSuggestionTrace(s,sug,true);
  assert.deepEqual(s.manual_actions,[]);
  assert.equal(s._suggestion_trace[0].rule_id,'PSR-007');
  assert.equal(s._suggestion_trace[0].accepted,true);
});
