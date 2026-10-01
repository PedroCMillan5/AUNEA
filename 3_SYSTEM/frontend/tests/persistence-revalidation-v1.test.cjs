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
    markDirty:()=>{},saveState:()=>{},updateHeader:()=>{},audit:()=>{},now:()=>'2026-09-14T00:00:00.000Z',render:()=>{},toast:()=>{},confirm:()=>true,
    document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},createElement:()=>({click(){}}),visibilityState:'visible'},
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


test('cross-tab process synchronization preserves horizontal viewport when accepting current shared state',()=>{
  const ctx=makeCtx(),view={scrollLeft:142,scrollTop:23},next={scrollLeft:0,scrollTop:0};
  ctx.isClientDisplay=()=>false;ctx.isProcessEditorWindow=()=>true;
  ctx.document.querySelector=q=>q==='.flow-canvas'?view:null;
  ctx.requestAnimationFrame=fn=>{ctx.document.querySelector=q=>q==='.flow-canvas'?next:null;fn()};
  const newer={...ctx.blankState(),engagements:[{id:'E1',answers:{DF021:100}}]};
  const payload=JSON.stringify(newer);
  ctx.localStorage.setItem('aunea_internal_v1',payload);
  ctx.__listeners.storage({key:'aunea_internal_v1',newValue:payload});
  assert.equal(next.scrollLeft,142);
  assert.equal(next.scrollTop,23);
});

test('an edit modal holds its captured Engagement object and stale remote state cannot hard-delete process steps afterwards',()=>{
  const ctx=makeCtx(),local={id:'ENG-1',processSteps:[{id:'STEP-1',step_name:'Borrador'}],answers:{}};
  ctx.state={...ctx.blankState(),activePage:'proceso',activeEngagementId:'ENG-1',engagements:[local]};
  vm.runInContext('__auneaSyncedState=recoveryClone(state)',ctx);
  ctx.isClientDisplay=()=>false;ctx.isProcessEditorWindow=()=>true;
  let editing=true,renderCount=0;
  ctx.document.querySelector=q=>q==='#modalRoot .modal'&&editing?{}:null;
  ctx.render=()=>{renderCount++};
  const remote={...ctx.state,engagements:[{...local,processSteps:[]}]},payload=JSON.stringify(remote);
  ctx.localStorage.setItem('aunea_internal_v1',payload);
  ctx.__listeners.storage({key:'aunea_internal_v1',newValue:payload});
  assert.equal(ctx.state.engagements[0],local,'an open form must retain the referenced object');
  assert.equal(renderCount,0,'do not redraw and discard unsaved controls');
  editing=false;
  ctx.__listeners.storage({key:'aunea_internal_v1',newValue:payload});
  assert.equal(ctx.state.engagements[0].processSteps.length,1,'process steps use SUPERSEDED lifecycle and must not disappear through stale storage');
  assert.equal(renderCount,1);
});

test('a delayed older storage event never replaces a newer shared record',()=>{
  const ctx=makeCtx();ctx.isClientDisplay=()=>false;ctx.isProcessEditorWindow=()=>false;
  const current={...ctx.blankState(),engagements:[{id:'E1',answers:{DF021:200}}]};
  const older={...ctx.blankState(),engagements:[{id:'E1',answers:{DF021:100}}]};
  ctx.localStorage.setItem('aunea_internal_v1',JSON.stringify(current));
  ctx.__listeners.storage({key:'aunea_internal_v1',newValue:JSON.stringify(current)});
  ctx.__listeners.storage({key:'aunea_internal_v1',newValue:JSON.stringify(older)});
  assert.equal(ctx.state.engagements[0].answers.DF021,200);
});

test('two windows updating independent fields on the same study merge without losing either change',()=>{
  const ctx=makeCtx(),base={...ctx.blankState(),engagements:[{id:'E1',answers:{DF021:100,DF022:'MONTH'},processSteps:[{id:'S1',step_name:'Recepción',active_time:10}]}]};
  ctx.state=JSON.parse(JSON.stringify(base));
  ctx.localStorage.setItem('aunea_internal_v1',JSON.stringify(base));
  vm.runInContext('__auneaSyncedState=JSON.parse(JSON.stringify(state))',ctx);
  // Console changes case volume; editor independently changes the step duration.
  const newer=JSON.parse(JSON.stringify(base));newer.engagements[0].answers.DF021=200;
  ctx.localStorage.setItem('aunea_internal_v1',JSON.stringify(newer));
  ctx.state.engagements[0].processSteps[0].active_time=20;
  assert.equal(ctx.persistRecoverySnapshot('test'),true);
  const shared=JSON.parse(ctx.localStorage.getItem('aunea_internal_v1'));
  assert.equal(shared.engagements[0].answers.DF021,200);
  assert.equal(shared.engagements[0].processSteps[0].active_time,20);
  assert.equal(ctx.state.engagements[0].processSteps[0].active_time,20);
});

test('same-field concurrent changes never overwrite disk silently',()=>{
  const ctx=makeCtx(),base={...ctx.blankState(),engagements:[{id:'E1',answers:{DF021:100}}]};
  ctx.state=JSON.parse(JSON.stringify(base));
  ctx.localStorage.setItem('aunea_internal_v1',JSON.stringify(base));
  vm.runInContext('__auneaSyncedState=JSON.parse(JSON.stringify(state))',ctx);
  ctx.state.engagements[0].answers.DF021=150;
  const remote=JSON.parse(JSON.stringify(base));remote.engagements[0].answers.DF021=200;
  const payload=JSON.stringify(remote);
  ctx.localStorage.setItem('aunea_internal_v1',payload);
  let warning='';ctx.toast=x=>{warning=x};
  assert.equal(ctx.persistRecoverySnapshot('test'),false);
  assert.equal(ctx.localStorage.getItem('aunea_internal_v1'),payload);
  assert.equal(ctx.state.engagements[0].answers.DF021,150,'unsaved local draft remains available');
  assert.match(warning,/mismo dato/);
});

test('booting a second editor does not rewrite shared storage before the user edits',()=>{
  const ctx=makeCtx();
  assert.equal(ctx.localStorage.getItem('aunea_internal_v1'),null);
  assert.doesNotMatch(persistCode,/persistRecoverySnapshot\('module-init'\)/);
});

test('remote study update retains the selected process layer of the receiving window',()=>{
  const ctx=makeCtx();ctx.isClientDisplay=()=>false;ctx.isProcessEditorWindow=()=>true;
  const ours={id:'E1',processTab:'riesgos',answers:{DF021:100},processSteps:[],frictions:[],risks:[],economicInputs:[]};
  ctx.state={...ctx.blankState(),activePage:'proceso',activeEngagementId:'E1',engagements:[ours]};
  vm.runInContext('__auneaSyncedState=recoveryClone(state)',ctx);
  const remote={...ctx.state,engagements:[{...ours,processTab:'cliente',answers:{DF021:200}}]};
  const raw=JSON.stringify(remote);ctx.localStorage.setItem('aunea_internal_v1',raw);
  ctx.__listeners.storage({key:'aunea_internal_v1',newValue:raw});
  assert.equal(ctx.state.engagements[0].processTab,'riesgos');
  assert.equal(ctx.state.engagements[0].answers.DF021,200);
  assert.equal(ctx.persistRecoverySnapshot('test'),true,'layer-only navigation must not cause a false business conflict');
  assert.equal(JSON.parse(ctx.localStorage.getItem('aunea_internal_v1')).engagements[0].processTab,'riesgos');
});
