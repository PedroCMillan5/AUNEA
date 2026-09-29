// Persistence revalidation — DF098 answerDetails survive recovery, progressive-disclosure state remains
// ephemeral DOM, newer engagement fields survive normalization, and legacy backup format remains importable.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const persistCode=fs.readFileSync(path.join(root,'services/persistence.js'),'utf8');
const processV1Code=fs.readFileSync(path.join(root,'domain/process.js'),'utf8');
const economicsCode=fs.readFileSync(path.join(root,'domain/economics.js'),'utf8');
const engineAdapterCode=fs.readFileSync(path.join(root,'services/engine-adapter.js'),'utf8');

function makeCtx(){
  const ctx={
    console,
    AUNEA_PRODUCT_VERSION:'2.0.0',STORAGE_SCHEMA_VERSION:'1',STORAGE_KEY:'aunea_internal_v1',
    schema:{version:'1.1'},
    state:{backendOnline:true},
    blankState:()=>({version:'2.0.0',activePage:'inicio',activeEngagementId:null,dirty:false,companies:[],contacts:[],opportunities:[],engagements:[],projects:[],audit:[]}),
    markDirty:()=>{},saveState:()=>{},audit:()=>{},now:()=>'2026-09-14T00:00:00.000Z',render:()=>{},toast:()=>{},confirm:()=>true,
    document:{getElementById:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},createElement:()=>({click(){}}),visibilityState:'visible'},
    localStorage:{store:{},getItem(k){return this.store[k]??null},setItem(k,v){this.store[k]=v}},
    __listeners:{},window:{addEventListener:(name,fn)=>{ctx.__listeners[name]=fn}},clearTimeout:()=>{},setTimeout:()=>0,Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},Date
  };
  vm.createContext(ctx);
  vm.runInContext(persistCode,ctx);
  return ctx;
}

test('normalizeRecoveredState preserves DF098 answerDetails (__action/__owner/__date) untouched across a raw JSON round-trip',()=>{
  const ctx=makeCtx();
  const raw={engagements:[{id:'ENG-1',companyId:'c1',answers:{DF098:'Solicitar evidencias — Pedro — 12/09/2026'},answerDetails:{DF098__action:'A_REQUEST_EVIDENCE',DF098__owner:'Pedro',DF098__date:'2026-09-12'},processSteps:[],frictions:[],risks:[],economicInputs:[],scenarioResults:[]}]};
  const out=ctx.normalizeRecoveredState(JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(out.engagements[0].answerDetails,{DF098__action:'A_REQUEST_EVIDENCE',DF098__owner:'Pedro',DF098__date:'2026-09-12'});
  assert.equal(out.engagements[0].answers.DF098,'Solicitar evidencias — Pedro — 12/09/2026');
});

test('normalizeRecoveredState never strips newer engagement fields',()=>{
  const ctx=makeCtx();
  const raw={engagements:[{id:'UAT-ENG-12',companyId:'UAT-CMP-12',contactIds:['UAT-CON-12'],answers:{DF001:'Empresa UAT-12'},answerDetails:{},processSteps:[{id:'UAT-STEP-12-1',status:'ACTIVE'}],frictions:[],risks:[{controls_present:true}],economicInputs:[{driver_id:'D1',evidence_type:'MEASURED',annual_active_hours:120}],scenarioResults:[],confirmedAsIs:true,engineGates:{process_design_first:'NO',existing_tool_can_close:'NO',unstructured_interpretation_need:'NO',bounded_action_space:'NO',management_visibility_need:'NO'}}]};
  const e=ctx.normalizeRecoveredState(JSON.parse(JSON.stringify(raw))).engagements[0];
  assert.match(e.id,/^UAT-/);assert.deepEqual(e.engineGates,raw.engagements[0].engineGates);assert.equal(e.economicInputs[0].evidence_type,'MEASURED');assert.equal(e.confirmedAsIs,true);
});

test('normalizeRecoveredState self-heals legacy engagements missing newer array fields',()=>{
  const ctx=makeCtx();
  const e=ctx.normalizeRecoveredState({engagements:[{id:'ENG-OLD',companyId:'c1',answers:{}}]}).engagements[0];
  assert.equal(Object.keys(e.answerDetails).length,0);assert.equal(e.processSteps.length,0);assert.equal(e.frictions.length,0);assert.equal(e.risks.length,0);assert.equal(e.economicInputs.length,0);assert.equal(e.scenarioResults.length,0);
});

test('recovery format is independent from product SemVer and legacy AUNEA_INTERNAL_V1 remains explicitly recognized',()=>{
  const ctx=makeCtx();
  const recoveryFormat=vm.runInContext('RECOVERY_FORMAT_VERSION',ctx);
  const legacyFormat=vm.runInContext('LEGACY_RECOVERY_FORMAT_VERSION',ctx);
  assert.equal(recoveryFormat,'AUNEA_INTERNAL_STATE_V1');
  assert.equal(legacyFormat,'AUNEA_INTERNAL_V1');
  assert.notEqual(recoveryFormat,'2.0.0');
  ctx.persistRecoverySnapshot('test');
  const saved=JSON.parse(ctx.localStorage.store.aunea_internal_v1);
  assert.equal(saved.recoveryMeta.format,'AUNEA_INTERNAL_STATE_V1');
  assert.equal(saved.recoveryMeta.productVersion,'2.0.0');
  assert.equal(saved.recoveryMeta.schemaVersion,'1');
});

test('step-group expansion remains ephemeral DOM and is never persisted as engagement data',()=>{
  [processV1Code,economicsCode,engineAdapterCode].forEach(code=>{
    assert.doesNotMatch(code,/localStorage\.(?:setItem|getItem)\([^)]*step-group/s);
    assert.doesNotMatch(code,/\b(?:s|f|r|eng)\._ui\.(?:accordion|expanded_sections|step_group_open)\s*=/);
    assert.doesNotMatch(code,/hasAttribute\(['"]open['"]\)/);
  });
});

test('re-opening the same step/friction/risk/economic modal regenerates the default open/closed layout',()=>{
  const openStepIdx=processV1Code.indexOf('function openStepModal');
  const stepBody=processV1Code.slice(openStepIdx,processV1Code.indexOf('function ',openStepIdx+20));
  assert.equal((stepBody.match(/<details class="step-group" open>/g)||[]).length,1);
  assert.ok((stepBody.match(/<details class="step-group">(?!\s*<\/details>)/g)||[]).length>=1);
});


test('cross-tab process synchronization preserves the horizontal map viewport instead of resetting to the left',()=>{
  assert.match(persistCode,/const flowViewport=flowCanvas\?\{left:flowCanvas\.scrollLeft,top:flowCanvas\.scrollTop\}:null/);
  assert.match(persistCode,/nextCanvas\.scrollLeft=flowViewport\.left/);
  assert.match(persistCode,/nextCanvas\.scrollTop=flowViewport\.top/);
});

test('client editor keeps the live Engagement reference during cross-tab sync with an edit modal open',()=>{
  const ctx=makeCtx();
  const local={id:'ENG-1',updatedAt:'2026-09-29T10:00:00.000Z',processSteps:[{id:'STEP-1',step_name:'Anterior'}],answers:{}};
  ctx.state={...ctx.blankState(),activePage:'proceso',activeEngagementId:'ENG-1',engagements:[local]};
  ctx.isClientDisplay=()=>false;ctx.isProcessEditorWindow=()=>true;
  ctx.currentEng=()=>ctx.state.engagements.find(e=>e.id===ctx.state.activeEngagementId);
  let editing=true,renderCount=0;
  ctx.document.querySelector=selector=>selector==='#modalRoot .modal'&&editing?{}:null;
  ctx.render=()=>{renderCount++};
  const remote={...local,updatedAt:'2026-09-29T11:00:00.000Z',processSteps:[]};
  ctx.__listeners.storage({key:'aunea_internal_v1',newValue:JSON.stringify({...ctx.state,engagements:[remote]})});
  assert.equal(ctx.state.engagements[0],local,'open step modal must retain the exact object captured by its save callback');
  assert.equal(ctx.state.engagements[0].processSteps.length,1);
  assert.equal(renderCount,1);
  // After closing the modal, a genuinely newer remote engagement is accepted.
  editing=false;
  ctx.__listeners.storage({key:'aunea_internal_v1',newValue:JSON.stringify({...ctx.state,engagements:[remote]})});
  assert.equal(ctx.state.engagements[0].processSteps.length,0);
  assert.notEqual(ctx.state.engagements[0],local);
});
test('client editor rejects older cross-tab snapshots even with its modal closed',()=>{
  const ctx=makeCtx();
  const local={id:'ENG-2',updatedAt:'2026-09-29T11:00:00.000Z',processSteps:[{id:'STEP-1'}],answers:{}};
  ctx.state={...ctx.blankState(),activeEngagementId:'ENG-2',engagements:[local]};
  ctx.isClientDisplay=()=>false;ctx.isProcessEditorWindow=()=>true;
  ctx.currentEng=()=>ctx.state.engagements.find(e=>e.id===ctx.state.activeEngagementId);
  ctx.document.querySelector=()=>null;
  const old={...local,updatedAt:'2026-09-29T10:00:00.000Z',processSteps:[]};
  ctx.__listeners.storage({key:'aunea_internal_v1',newValue:JSON.stringify({...ctx.state,engagements:[old]})});
  assert.equal(ctx.state.engagements[0],local);
  assert.equal(ctx.state.engagements[0].processSteps.length,1);
});
