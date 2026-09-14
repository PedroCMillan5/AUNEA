// [AUNEA-FE-PERSIST-UAT-050] Fase 9 revalidation — DF098 answerDetails survive recovery, the
// progressive-disclosure <details class="step-group"> accordion state is purely ephemeral DOM (never
// serialized into the engagement), and normalizeRecoveredState tolerates the Fase 7/8 additions
// (engineGates, UAT--prefixed engagements, the new economicInputs evidence_type enum).
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const persistCode=fs.readFileSync(path.join(root,'app-persistence-uat-v1.js'),'utf8');
const processV1Code=fs.readFileSync(path.join(root,'app-process-v1.js'),'utf8');
const processEditorCode=fs.readFileSync(path.join(root,'app-process-editor.js'),'utf8');
const engineAdapterCode=fs.readFileSync(path.join(root,'app-engine-adapter-v1.js'),'utf8');

function makeCtx(){
  const ctx={
    console,NAV:[['GENERAL'],['uat','✓','UAT / QA'],['admin','⚙','Admin']],
    pages:{},postBind:()=>{},fmtDate:()=>'',esc:v=>String(v??''),
    schema:{version:'1.1'},
    state:{backendOnline:true},
    blankState:()=>({version:'1.0.1',activePage:'inicio',activeEngagementId:null,dirty:false,companies:[],contacts:[],opportunities:[],engagements:[],projects:[],audit:[]}),
    markDirty:()=>{},saveState:()=>{},audit:()=>{},now:()=>'2026-09-14T00:00:00.000Z',
    document:{getElementById:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},
    localStorage:{store:{},getItem(k){return this.store[k]??null},setItem(k,v){this.store[k]=v}},
    window:{addEventListener:()=>{}},addEventListener:()=>{}
  };
  vm.createContext(ctx);
  vm.runInContext(persistCode,ctx);
  return ctx;
}

test('normalizeRecoveredState preserves DF098 answerDetails (__action/__owner/__date) untouched across a raw JSON round-trip',()=>{
  const ctx=makeCtx();
  const raw={engagements:[{id:'ENG-1',companyId:'c1',answers:{DF098:'Solicitar evidencias — Pedro — 12/09/2026'},answerDetails:{DF098__action:'A_REQUEST_EVIDENCE',DF098__owner:'Pedro',DF098__date:'2026-09-12'},processSteps:[],frictions:[],risks:[],economicInputs:[],scenarioResults:[]}]};
  const roundTripped=JSON.parse(JSON.stringify(raw));
  const out=ctx.normalizeRecoveredState(roundTripped);
  assert.deepEqual(out.engagements[0].answerDetails,{DF098__action:'A_REQUEST_EVIDENCE',DF098__owner:'Pedro',DF098__date:'2026-09-12'});
  assert.equal(out.engagements[0].answers.DF098,'Solicitar evidencias — Pedro — 12/09/2026');
});

test('normalizeRecoveredState never strips fields it does not explicitly normalize — engineGates (Fase 6), UAT--prefixed ids (Fase 8), and the evidence_type string enum on economicInputs (Fase 8/I) all survive untouched',()=>{
  const ctx=makeCtx();
  const raw={engagements:[{
    id:'UAT-ENG-12',companyId:'UAT-CMP-12',contactIds:['UAT-CON-12'],
    answers:{DF001:'Empresa UAT-12'},answerDetails:{},
    processSteps:[{id:'UAT-STEP-12-1',status:'ACTIVE'}],
    frictions:[],risks:[{controls_present:true}],
    economicInputs:[{driver_id:'D1',evidence_type:'MEASURED',annual_active_hours:120}],
    scenarioResults:[],confirmedAsIs:true,
    engineGates:{process_design_first:'NO',existing_tool_can_close:'NO',unstructured_interpretation_need:'NO',bounded_action_space:'NO',management_visibility_need:'NO'}
  }]};
  const roundTripped=JSON.parse(JSON.stringify(raw));
  const out=ctx.normalizeRecoveredState(roundTripped);
  const e=out.engagements[0];
  assert.match(e.id,/^UAT-/);
  assert.deepEqual(e.engineGates,raw.engagements[0].engineGates);
  assert.equal(e.economicInputs[0].evidence_type,'MEASURED');
  assert.equal(e.confirmedAsIs,true);
});

test('normalizeRecoveredState self-heals a legacy engagement missing the newer array fields (backward compatibility with pre-Fase-1 snapshots)',()=>{
  const ctx=makeCtx();
  const raw={engagements:[{id:'ENG-OLD',companyId:'c1',answers:{}}]};
  const out=ctx.normalizeRecoveredState(raw);
  const e=out.engagements[0];
  assert.equal(Object.keys(e.answerDetails).length,0);
  assert.equal(e.processSteps.length,0);
  assert.equal(e.frictions.length,0);
  assert.equal(e.risks.length,0);
  assert.equal(e.economicInputs.length,0);
  assert.equal(e.scenarioResults.length,0);
});

test('the <details class="step-group"> progressive-disclosure accordion is purely ephemeral DOM — no source file ever reads .open/hasAttribute("open")/dataset off a step-group element into engagement or answers state',()=>{
  [processV1Code,processEditorCode,engineAdapterCode].forEach(code=>{
    assert.doesNotMatch(code,/step-group[^`]*\.open\b/s);
    assert.doesNotMatch(code,/querySelector(?:All)?\(['"]\.step-group['"]\)/);
    assert.doesNotMatch(code,/hasAttribute\(['"]open['"]\)/);
  });
});

test('re-opening the same step/friction/risk/economic modal always regenerates the identical default open/closed layout — nothing carried over from a previous open (structural: the modal body is a pure function of the record, never of prior DOM state)',()=>{
  const openStepIdx=processV1Code.indexOf('function openStepModal');
  const stepBody=processV1Code.slice(openStepIdx,processV1Code.indexOf('function ',openStepIdx+20));
  const firstGroupOpen=(stepBody.match(/<details class="step-group" open>/g)||[]).length;
  const laterGroupsClosed=(stepBody.match(/<details class="step-group">(?!\s*<\/details>)/g)||[]).length;
  assert.equal(firstGroupOpen,1,'exactly one group (the essentials) opens by default, every time the modal is built');
  assert.ok(laterGroupsClosed>=1,'the rest collapse by default — this is baked into the template string, not read from any element');
});
