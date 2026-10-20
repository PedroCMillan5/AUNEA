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
  schema:{fields:[]}
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
  assert.match(item.message,/PG02 y responsables del mapa/);
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
// [AUNEA-UAT-ASIS-PARTICIPANTS-132] END
