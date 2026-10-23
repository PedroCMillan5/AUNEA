// [AUNEA-UAT-ASIS-PARTICIPANTS-132] START — Scope/actor reconciliation, no invented facts
// SOURCE: Diagnostic Master DF017; DEC-050; ProcessStep.Actor; 2026-10-17 synthetic UAT scope.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../domain/process-lifecycle.js'),'utf8');
function between(start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Missing governed function: '+start);
  return src.slice(a,b);
}
const ctx={
  normalizeArray:v=>Array.isArray(v)?v:v==null||v===''?[]:[v],
  processLayerConfirmations:()=>({map:true,frictions:true,risks:true,impact:true}),
  captureIntegrityIssues:()=>[],
  reusedValue:(id,e)=>id==='DF017'?e.processSteps.filter(s=>s.status!=='SUPERSEDED').map(s=>s.actor):[],
  valuePresent:v=>Array.isArray(v)?v.length>0:v!==null&&v!==undefined&&v!=='',
  schema:{fields:[]},
  labelFrom:(_,v)=>({CUSTOMER:'Cliente',SALES:'Comercial',OPERATIONS:'Operaciones',MANAGER:'Manager / dirección',ADMIN:'Administración',FINANCE:'Finanzas'}[v]||v)
};
vm.createContext(ctx);
vm.runInContext(
  between('function processParticipantsScopeReview(e){','// [AUNEA-FE-ASIS-PARTICIPANTS-078] EN'+'D')+
  between('const CONSISTENCY_LAYER_STAGE=','// [AUNEA-FE-ASIS-CONSISTENCY-076] EN'+'D'),ctx
);
const session=()=>({
  answers:{DF017:['CUSTOMER','SALES','OPERATIONS','MANAGER']},
  processSteps:[{actor:'ADMIN'},{actor:'FINANCE'},{actor:'MANAGER'},{actor:'OUTDATED',status:'SUPERSEDED'}]
});
test('previous DF017 scope and real step actors differ, both sides reported',()=>{
  const v=ctx.processParticipantsScopeReview(session());
  assert.deepEqual(Array.from(v.onlyDeclared),['CUSTOMER','SALES','OPERATIONS']);
  assert.deepEqual(Array.from(v.onlyMapped),['ADMIN','FINANCE']);
});
test('reordered and duplicate roles do not create a false discrepancy',()=>{
  const e=session();e.answers.DF017=['MANAGER','ADMIN','FINANCE','ADMIN'];
  assert.equal(ctx.processParticipantsScopeReview(e),null);
});
test('incomplete map and no prior role list do not manufacture a discrepancy',()=>{
  const e=session();e.processSteps=[];assert.equal(ctx.processParticipantsScopeReview(e),null);
  e.processSteps=[{actor:'FINANCE'}];e.answers.DF017=[];assert.equal(ctx.processParticipantsScopeReview(e),null);
});
test('superseded steps are ignored and review never mutates source data',()=>{
  const e=session(),before=JSON.stringify(e);
  ctx.processParticipantsScopeReview(e);
  assert.equal(JSON.stringify(e),before);
});
test('PG09 surfaces a human review, not a fabricated replacement or engine conclusion',()=>{
  const e=session(),before=JSON.stringify(e);
  const r=ctx.preCloseConsistencyReview(e,{blockers:[]});
  const item=r.blockers.find(x=>x.code==='DF017_PARTICIPANT_SCOPE');
  assert.ok(item,'the conflict must be discoverable at PG09');
  assert.equal(item.stage,'S09');
  assert.match(item.message,/declarados en Alcance y los responsables del mapa/);
  assert.doesNotMatch(item.message,/\b(?:PG\d{2}|DF\d{3})\b/);
  assert.equal(JSON.stringify(e),before);
  assert.ok(r.blockers.length>=1,'a material disagreement requires explicit final human reconciliation');
});
test('PG09 does not show a role-conflict review after reconciliation',()=>{
  const e=session();e.answers.DF017=['ADMIN','FINANCE','MANAGER'];
  const r=ctx.preCloseConsistencyReview(e,{blockers:[]});
  assert.equal(r.blockers.some(x=>x.code==='DF017_PARTICIPANT_SCOPE'),false);
});
test('an explicit version-bound final confirmation removes the scope blocker without editing steps',()=>{
  const e=session();e.answerDetails={};
  const before=JSON.stringify(e.processSteps),declared=e.answers.DF017;
  const mapped=[...new Set(e.processSteps.filter(s=>s.status!=='SUPERSEDED').map(s=>s.actor))];
  e.answerDetails.DF017__initial_scope=[...declared];
  e.answers.DF017=['ADMIN','FINANCE','MANAGER'];
  e.answerDetails.DF017__final_scope_confirmation={fingerprint:JSON.stringify({declared:[...e.answers.DF017].sort(),mapped:[...mapped].sort()})};
  assert.equal(ctx.processParticipantsScopeReview(e),null);
  assert.equal(JSON.stringify(e.processSteps),before);
  e.processSteps.push({actor:'HR'});
  assert.ok(ctx.processParticipantsScopeReview(e),'adding a new actor must invalidate the previous role confirmation');
});
test('PG09 shows initial PG02 roles, map roles and confirms the selected final set without rewriting steps',()=>{
 const page=fs.readFileSync(path.join(__dirname,'../pages/diagnostic-stages.js'),'utf8');
 const start=page.indexOf('function df017FinalReviewPanel(e){'),end=page.indexOf('// ['+'AUNEA-FE-DF017-FINAL-137'+'] EN'+'D',start);
 assert.ok(start>=0&&end>start);
 const e=session();e.answerDetails={};e.confirmedAsIs=false;e.layerConfirmations={map:true,frictions:true,risks:true,impact:true};
 const actors=JSON.stringify(e.processSteps),state={audit:[],dirty:false};
 const local={
   normalizeArray:ctx.normalizeArray,
   activeSteps:eng=>eng.processSteps.filter(s=>s.status!=='SUPERSEDED'),
   labelFrom:(_,value)=>({ADMIN:'Administración',FINANCE:'Finanzas',MANAGER:'Manager',CUSTOMER:'Cliente',SALES:'Ventas',OPERATIONS:'Operaciones'}[value]||value),
   esc:String,attr:String,fieldOptions:()=>['ADMIN','FINANCE','MANAGER','CUSTOMER','SALES','OPERATIONS'].map(value=>({value})),
   state,currentEng:()=>e,now:()=>new Date('2026-10-20T12:00:00Z').toISOString(),
   document:{querySelectorAll:()=>['ADMIN','FINANCE','MANAGER'].map(df017FinalOption=>({dataset:{df017FinalOption}}))},
   markDirty:()=>{state.dirty=true},audit:()=>{},invalidateDerivedState:()=>{},
   persistRecoverySnapshot:()=>true,render:()=>{},toast:()=>{}
 };
 vm.createContext(local);vm.runInContext(page.slice(start,end),local);
 const panel=local.df017FinalReviewPanel(e);
 assert.match(panel,/Los participantes declarados/);
 assert.match(panel,/los responsables del mapa/);
 assert.match(panel,/data-confirm-df017-final/);
 assert.equal(local.confirmDf017FinalSelection(),true);
 assert.deepEqual(Array.from(e.answers.DF017),['ADMIN','FINANCE','MANAGER']);
 assert.deepEqual(Array.from(e.answerDetails.DF017__initial_scope),['CUSTOMER','SALES','OPERATIONS','MANAGER']);
 assert.equal(JSON.stringify(e.processSteps),actors,'the ProcessStep owner is not changed by reconciliation');
 assert.equal(ctx.processParticipantsScopeReview(e),null,'the version-bound confirmation clears the conflict');
 assert.match(local.df017FinalReviewPanel(e),/pg09-participant-confirmed/);
 assert.match(local.df017FinalReviewPanel(e),/<strong>Confirmado<\/strong>/);
});
// [AUNEA-UAT-ASIS-PARTICIPANTS-132] END
