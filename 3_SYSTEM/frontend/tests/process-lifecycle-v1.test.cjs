// [AUNEA-UAT-PROC-LIFECYCLE-030] START — AS-IS lifecycle regression
// Covers AUNEA-FE-PROC-LIFECYCLE-030 (domain/process-lifecycle.js): supersede-instead-of-delete and
// AS-IS confirmation. Archiving must never physically drop a step/friction (traceability contract).
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'domain/process-lifecycle.js'),'utf8');
// Confirming the AS-IS closes PG09, and closing PG09 seals the confirmed snapshot.
const engagementCode=fs.readFileSync(path.join(root,'domain/engagement.js'),'utf8');
const indexHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');

function makeCtx(engagement){
  const toasts=[],dirty=[];
  const ctx={
    console,
    currentEng:()=>engagement,
    confirm:()=>true,
    markDirty:r=>{if(r)dirty.push(r)},
    render:()=>{},
    toast:m=>{toasts.push(m)},
    now:()=>'2026-09-14T00:00:00.000Z',
    audit:()=>{},schema:{version:'1.1',source:'test'},
    state:{engagements:[],companies:[],contacts:[]},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{hash:'',search:''},
    companyById:()=>null,contactById:()=>null,contactFullName:c=>c&&c.name||'',
    activeSteps:e=>(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
    activeFrictions:e=>(e.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v])
  };
  vm.createContext(ctx);
  vm.runInContext(engagementCode,ctx);
  vm.runInContext(code,ctx);
  ctx.guardAsisMutation=()=>false;
  ctx.__toasts=toasts;ctx.__dirty=dirty;
  return ctx;
}
const engagement=()=>({processSteps:[{id:'S1',status:'ACTIVE'},{id:'S2',status:'ACTIVE'}],frictions:[{id:'F1',status:'ACTIVE'}],answers:{},confirmedAsIs:false});

test('process lifecycle is wired into the runtime',()=>{
  assert.match(indexHtml,/<script src="domain\/process-lifecycle\.js"/);
});

test('supersedeStep marks SUPERSEDED without physically removing the step, and reopens AS-IS',()=>{
  const e=engagement();e.confirmedAsIs=true;
  const ctx=makeCtx(e);
  ctx.supersedeStep('S1');
  assert.equal(e.processSteps.length,2,'the step must survive physically for traceability');
  assert.equal(e.processSteps.find(s=>s.id==='S1').status,'SUPERSEDED');
  assert.equal(e.confirmedAsIs,false,'editing the flow reopens AS-IS confirmation');
});

test('supersedeFriction marks SUPERSEDED without physically removing the friction',()=>{
  const e=engagement();
  const ctx=makeCtx(e);
  ctx.supersedeFriction('F1');
  assert.equal(e.frictions.length,1);
  assert.equal(e.frictions[0].status,'SUPERSEDED');
});

test('layer confirmations unlock PG09 but only final closure seals DF093 and snapshot',()=>{
  const missing={processSteps:[],frictions:[],risks:[],economicInputs:[],answers:{DF014:'Inicio'},confirmedAsIs:false,processTab:'cliente'};
  const ctxMissing=makeCtx(missing);
  ctxMissing.confirmAsIs();
  assert.equal(missing.confirmedAsIs,false);
  assert.match(ctxMissing.__toasts.at(-1),/límites inicial y final|al menos un paso/);

  const e={processSteps:[],frictions:[],risks:[],economicInputs:[],answers:{DF014:'Inicio',DF015:'Fin'},confirmedAsIs:false,processTab:'cliente'};
  const ctx=makeCtx(e);
  ctx.confirmAsIs();
  assert.equal(e.layerConfirmations.map,true,'Inicio → Fin is a valid minimum map');
  assert.equal(e.confirmedAsIs,false,'map alone must not seal the full AS-IS');
  e.processTab='fricciones';ctx.confirmAsIs();assert.equal(e.layerConfirmations.frictions,true);
  e.processTab='riesgos';ctx.confirmAsIs();assert.equal(e.layerConfirmations.risks,true);
  e.processTab='impacto';ctx.confirmAsIs();
  assert.equal(e.layerConfirmations.impact,true);
  assert.equal(e.confirmedAsIs,false,'all four layers only unlock PG09; they must not close it');
  assert.equal(e.answers.DF093,'');
  assert.equal(e.asIsConfirmedAt,null);
  e.status='Sesión 1';
  assert.equal(ctx.confirmClosingAsIs(),true);
  assert.equal(e.confirmedAsIs,true,'explicit PG09 closure confirms the shared AS-IS');
  assert.equal(e.answers.DF093,'YES');
  assert.ok(e.asIsConfirmedAt);
  assert.equal(ctx.hasConfirmedSnapshot(e),true,'only PG09 final closure exposes the handoff snapshot');
  assert.equal(e.confirmedSnapshots.length,1);
  assert.equal(ctx.confirmClosingAsIs(),true);
  assert.equal(e.confirmedSnapshots.length,1,'a repeated final click does not create another snapshot');
});

test('changing a real upstream session answer after PG09 reopens the shared AS-IS and preserves its sealed history',()=>{
  const e={id:'E1',status:'Trabajo interno',answers:{DF014:'Inicio',DF015:'Fin',DF021:100,DF022:'MONTH',DF093:'YES'},
    processSteps:[{id:'S1',status:'ACTIVE',active_time:10}],frictions:[],risks:[],economicInputs:[],
    layerConfirmations:{map:true,frictions:true,risks:true,impact:true},confirmedAsIs:true};
  const ctx=makeCtx(e);
  const historical=ctx.sealConfirmedSnapshot(e,'primera confirmación');
  const source=fs.readFileSync(path.join(root,'core/state.js'),'utf8');
  const match=source.match(/function setAnswer\(fid,value\)\{[\s\S]*?\n\}(?=\nfunction normalizeArray)/);
  assert.ok(match,'test must exercise the real shared setter, not a mock');
  let invalidated=0;
  ctx.invalidateDerivedState=()=>{invalidated++};
  ctx.refreshCaptureProgress=()=>{};
  vm.runInContext(match[0],ctx);
  ctx.setAnswer('DF021',200);
  assert.equal(e.answers.DF021,200);
  assert.equal(e.confirmedAsIs,false,'the previous closure cannot remain confirmed after its volume changes');
  assert.equal(e.answers.DF093,'');
  for(const layer of ['map','frictions','risks','impact'])
    assert.equal(e.layerConfirmations[layer],false,layer+' requires renewed confirmation');
  assert.equal(ctx.hasConfirmedSnapshot(e),false,'historical handoff is not a live one');
  assert.equal(ctx.engagementOfRecord(e),e,'internal work cannot silently use the old capture');
  assert.equal(e.confirmedSnapshots.length,1);
  assert.equal(e.confirmedSnapshots[0],historical,'old version is not replaced');
  assert.equal(historical.answers.DF021,100,'historical value must remain as confirmed');
  assert.equal(invalidated>0,true);
  assert.equal(e.diagnosticOutput,undefined);
});

test('an unchanged answer leaves existing layer confirmation untouched, while changing a partially confirmed session reopens it',()=>{
  const e={answers:{DF021:100,DF022:'MONTH',DF093:''},processSteps:[],frictions:[],risks:[],economicInputs:[],
    layerConfirmations:{map:true,frictions:true,risks:false,impact:false},confirmedAsIs:false};
  const ctx=makeCtx(e);
  const source=fs.readFileSync(path.join(root,'core/state.js'),'utf8');
  const match=source.match(/function setAnswer\(fid,value\)\{[\s\S]*?\n\}(?=\nfunction normalizeArray)/);
  assert.ok(match);
  let invalidated=0;ctx.invalidateDerivedState=()=>{invalidated++};ctx.refreshCaptureProgress=()=>{};
  vm.runInContext(match[0],ctx);
  ctx.setAnswer('DF021',100);
  assert.equal(e.layerConfirmations.map,true);
  assert.equal(e.layerConfirmations.frictions,true);
  assert.equal(invalidated,0,'repeat events are not new capture changes');
  ctx.setAnswer('DF021',200);
  assert.equal(e.layerConfirmations.map,false);
  assert.equal(e.layerConfirmations.frictions,false);
  assert.equal(invalidated>0,true);
});
// [AUNEA-UAT-PROC-LIFECYCLE-030] END

test('risks and impacts cannot float outside the active AS-IS',()=>{
  const e={processSteps:[{id:'S1',status:'ACTIVE',step_name:'Validar'}],frictions:[],risks:[
    {step_ids:[],category:'operational',description:'Riesgo',likelihood_1_5:2,impact_1_5:2,reversibility:'EASY',controls_present:false,current_control:[],sensitive_or_high_impact:false,material_financial_or_compliance:false,critical_trigger:false}
  ],economicInputs:[{step_ids:[],driver_id:'ED05',evidence_type:'EV02'}],answers:{},confirmedAsIs:false};
  const ctx=makeCtx(e);
  ctx.normalizeArray=v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]);
  const risks=ctx.processLayerIntegrityIssues(e,'risks').map(x=>x.message).join(' ');
  const impacts=ctx.processLayerIntegrityIssues(e,'impact').map(x=>x.message).join(' ');
  assert.match(risks,/al menos a un paso activo/);
  assert.match(impacts,/al menos a un paso activo/);
});

test('an EconomicInput pain link must belong to a friction on the selected step',()=>{
  const e={processSteps:[{id:'S1',status:'ACTIVE',step_name:'Validar'}],frictions:[
    {id:'F1',status:'ACTIVE',friction_type:'P02',derived_pain_id:'P02',affected_steps:['S1']}
  ],risks:[],economicInputs:[{step_ids:['S1'],pain_id:'P07',driver_id:'ED05',evidence_type:'EV02'}],answers:{},confirmedAsIs:false};
  const ctx=makeCtx(e);
  ctx.normalizeArray=v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]);
  const impacts=ctx.processLayerIntegrityIssues(e,'impact').map(x=>x.message).join(' ');
  assert.match(impacts,/problema que no existe en los pasos seleccionados/);
});


// [AUNEA-UAT-ASIS-CONSISTENCY-076] START — PG09 visible pre-close consistency review
test('pre-close review classifies blockers separately from non-blocking review items',()=>{
  const e={
    answers:{DF014:'Inicio',DF015:'Fin'},
    processSteps:[],frictions:[],
    risks:[{category:'',description:'',likelihood_1_5:null,impact_1_5:null}],
    economicInputs:[],
    layerConfirmations:{map:true,frictions:true,risks:true,impact:true},
    confirmedAsIs:false
  };
  const ctx=makeCtx(e);
  const review=ctx.preCloseConsistencyReview(e);
  assert.equal(review.blockers.length>0,true);
  assert.equal(review.clear,false);
  assert.match(review.blockers.map(x=>x.message).join(' '),/riesgo/i);

  e.risks=[];
  e._sessionTimeProjection={requestKey:'stale'};
  ctx.economicTimeRequest=()=>({volume:100,period:'MONTH'});
  const reviewOnly=ctx.preCloseConsistencyReview(e);
  assert.equal(reviewOnly.blockers.length,0);
  assert.equal(reviewOnly.reviews.some(x=>x.code==='STALE_TIME_PROJECTION'),true);
  assert.equal(reviewOnly.clear,true,'review items are explicit but do not block closure');
});

test('PG09 closure is refused when the visible consistency review has blockers',()=>{
  const e={
    answers:{DF014:'Inicio',DF015:'Fin'},
    processSteps:[],frictions:[],
    risks:[{category:'',description:'',likelihood_1_5:null,impact_1_5:null}],
    economicInputs:[],
    layerConfirmations:{map:true,frictions:true,risks:true,impact:true},
    confirmedAsIs:false
  };
  const ctx=makeCtx(e);
  assert.equal(ctx.confirmClosingAsIs(),false);
  assert.equal(e.confirmedAsIs,false);
  assert.equal(e.answers.DF093,undefined);
  assert.match(ctx.__toasts.at(-1),/No se puede cerrar el AS-IS/);
});

test('PG09 UI renders the same consistency review that gates confirmation',()=>{
  const source=fs.readFileSync(path.join(root,'pages/diagnostic-stages.js'),'utf8');
  assert.match(source,/Validación de coherencia/);
  assert.match(source,/preCloseConsistencyReview\(e,completion\)/);
  assert.match(source,/data-consistency-stage/);
  assert.match(source,/El cierre está bloqueado/);
});
// [AUNEA-UAT-ASIS-CONSISTENCY-076] END


test('PG09 empty evidence checklist produces no pending-evidence warning',()=>{
  const e={answers:{},processSteps:[],frictions:[],risks:[],economicInputs:[],layerConfirmations:{map:true,frictions:true,risks:true,impact:true}};
  const ctx=makeCtx(e);
  ctx.schema.fields=[{Field_ID:'DF095'}];
  ctx.effectiveValue=()=>['No hay evidencias pendientes'];
  const review=ctx.preCloseConsistencyReview(e);
  assert.equal(review.reviews.length,0);
});
