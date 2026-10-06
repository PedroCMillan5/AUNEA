// [AUNEA-UAT-ENGINE-020] START — Engine adapter regression
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const code=fs.readFileSync(path.join(__dirname,'..','services/engine-adapter.js'),'utf8');const e={id:'E1',title:'Test',answers:{DF011:'Proceso',DF086:['VISIBILITY']},answerDetails:{},processSteps:[{id:'S1',status:'ACTIVE'}],frictions:[{id:'F1',status:'ACTIVE',friction_type:'P03',observable_signal:'Se reintroduce cada solicitud',evidence_type:'EV02',affected_steps:['S1']}],economicInputs:[],risks:[],engineGates:{process_design_first:'NO',existing_tool_can_close:'NO',unstructured_interpretation_need:'NO',bounded_action_space:'NO',management_visibility_need:'YES'}};const ctx={console,schema:{friction_pain_map:[{Friction_Type_ID:'P03',Pain_ID:'P03'}]},activeFrictions:e=>(e.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),activeSteps:e=>(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),currentEng:()=>e,fieldOptions:()=>[],esc:v=>String(v??''),attr:v=>String(v??''),openModal:()=>{},markDirty:()=>{},closeModal:()=>{},now:()=>'',runDiagnosis:()=>{},state:{backendOnline:true},canonicalMissingRequired:()=>[],render:()=>{},toast:()=>{},document:{getElementById:()=>null,querySelectorAll:()=>[]}};vm.createContext(ctx);vm.runInContext(code,ctx);test('no hardcoded recommendation guard remains in canonical adapter',()=>{assert.doesNotMatch(code,/unresolvedRecommendationAdapter\s*=\s*true/)});test('client-declared concrete friction can become concrete evidence input without deciding Pain state',()=>{const p=ctx.buildBackendPayload(e);assert.equal(p.pain_signals[0].direct_mechanism_present,true);assert.equal(p.pain_signals[0].concrete_evidence_present,true);assert.equal(p.evidence[0].type,'CLIENT_DECLARED');});test('five canonical engine gates map to backend inputs',()=>{const p=ctx.buildBackendPayload(e);assert.equal(p.process_design_preconditions_ok,true);assert.equal(p.existing_tool_can_cover,false);assert.equal(p.requires_management_visibility,true);assert.equal(p.requires_unstructured_ai_assistance,false);assert.equal(p.requires_bounded_agent_action,false)});test('commercial scope is omitted unless explicitly captured',()=>{const p=ctx.buildBackendPayload(e);assert.equal(Object.hasOwn(p,'commercial_scope'),false)});test('scenario remains backend-owned',()=>{assert.match(code,/\/v1\/diagnose/);assert.doesNotMatch(code,/one_off_eur\s*=/)});
test('the Engine Gates review is framed as "Confirmación del consultor antes de calcular", not another discovery section — never phrased as validating/asking the client',()=>{
  assert.match(code,/Confirmación del consultor antes de calcular/);
  assert.doesNotMatch(code,/Validar inputs para Recommendation/,'the old technical-sounding title must be gone');
  assert.match(code,/Confirmar y calcular/);
});

// The adapter owns state→payload conversion, HTTP and structured outputs — never capture UI.
// Risk capture UI lives in domain/risk.js and is covered by risk-capture-v1.test.cjs.
test('the engine adapter contains no capture UI: no risk/economic modal markup, no capture field ids',()=>{
  assert.doesNotMatch(code,/<details class="step-group"/,'capture modals must not live in the adapter');
  ['riskCat','riskDesc','riskLike','riskImpact','econDriver','econActive'].forEach(fid=>{
    assert.doesNotMatch(code,new RegExp(`id="${fid}"`),`${fid} is capture UI and must not live in the adapter`);
  });
  assert.doesNotMatch(code,/function addRisk\(|function addEconomic\(/,'capture entry points belong to their own modules');
});
// [AUNEA-UAT-ENGINE-020] END

test('economic payload keeps only the metric owned by each driver and removes legacy cross-metric contamination',()=>{
  const sample={...e,economicInputs:[
    {driver_id:'ED13',step_ids:['S1'],annual_active_hours:204,annual_wait_hours:5760,evidence_type:'CLIENT_DECLARED'},
    {driver_id:'ED05',step_ids:['S1'],annual_active_hours:19.2,annual_wait_hours:99,evidence_type:'CLIENT_DECLARED'}
  ]};
  const p=ctx.buildBackendPayload(sample);
  assert.equal(p.economics[0].annual_active_hours,0);
  assert.equal(p.economics[0].annual_wait_hours,5760);
  assert.equal(p.economics[1].annual_active_hours,19.2);
  assert.equal(p.economics[1].annual_wait_hours,0);
});

test('coverage preflight runs before diagnose and remains backend-owned',()=>{
  assert.match(code,/\/v1\/diagnostic\/coverage/);
  assert.match(code,/diagnosticCoveragePreflight/);
  assert.match(code,/handleCoveragePreflight/);
});

test('blocking coverage gaps send the consultant back to the owning diagnostic stage',()=>{
  ctx.schema.fields=[{Field_ID:'DF088',Stage_ID:'S08',Pregunta_o_etiqueta_ES:'Qué no debe automatizarse'}];
  ctx.state.activePage='resultados';
  const ok=ctx.handleCoveragePreflight(e,{coverage:{items:[{input_id:'IN-R-05',status:'GAP',blocking:true,source_fields:['DF088']}],status:'BLOCKED'},integrity_issues:[]});
  assert.equal(ok,false);
  assert.equal(ctx.state.activePage,'diagnostico');
  assert.equal(e.stageId,'S08');
});

test('relational integrity preflight returns the consultant to the AS-IS instead of calculating',()=>{
  ctx.state.activePage='resultados';
  const ok=ctx.handleCoveragePreflight(e,{coverage:{items:[]},integrity_issues:['El impacto 1 no está vinculado a ningún paso activo.']});
  assert.equal(ok,false);
  assert.equal(ctx.state.activePage,'proceso');
});
