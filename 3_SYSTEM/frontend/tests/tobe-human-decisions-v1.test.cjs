// [AUNEA-UAT-PG11-HUMAN-DECISIONS-226] START
// Consultant choices belong to the existing versioned TO-BE owner; no Ollama.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../pages/results.js'),'utf8');
function block(id){
  const start='// ['+id+'] START',end='// ['+id+'] END';
  const a=src.indexOf(start),b=src.indexOf(end,a);
  if(a<0||b<0)throw Error('Missing contract block '+id);
  return src.slice(a,b+end.length);
}
function setup(){
  const saved=[],notices=[],listener=[],updates=[];
  const diag={input_snapshot_hash:'DIAG-VALID'};
  const snap={version:2};
  const ids=['S1','S2'];
  const items=ids.map((sid,i)=>({
    id:'TOBE-1-'+(i+1),sourceStepId:sid,sourceStepName:'Paso '+sid,
    transformation:'Se modifica',problemResolved:'Fricción documentada',
    futureActor:'Administración',tool:'ERP existente',inputs:'PDF',outputs:'RECORD',
    automationAi:'No aplica: actividad humana con revisión de registros',
    humanSupervision:'La administración revisará las excepciones',
    controlsRisk:'Registro de errores y trazabilidad de responsables',
    futureTime:'',futureTimeAssumption:''
  }));
  const proposals=ids.map(source_step_id=>({source_step_id,transformation:'Se modifica',
    rationale:'Acción propuesta: implementar un control. Resultado esperado: más trazabilidad.',
    problem_resolved:'Sin visibilidad',source_refs:[source_step_id]}));
  const p={version:1,sourceSnapshotVersion:2,status:'DRAFT',items,
    aiDraft:{sourceSnapshotVersion:2,diagnosticInputHash:'DIAG-VALID',proposal:{
      status:'DRAFT',input_hash:'ENG-VALID',items:proposals,
      review:{review_mode:'RULES_ONLY',issues:[{
        step_id:'S1',category:'BLOCKING',issue:'Cambio marcado Se mantiene'
      }]}}}};
  const e={id:'CASE',confirmedAsIs:true,tobeProposals:[p]};
  const note={value:'Se revisa la propuesta frente al AS-IS y los controles existentes.'};
  const sandbox={
    String,Array,Object,JSON,Math,Set,Map,console,
    TOBE_TRANSFORMATIONS:['Se mantiene','Se modifica','Se elimina','Se automatiza',
      'Se asiste con IA','Requiere decisión humana','Se incorpora control'],
    document:{
      addEventListener:(type,fn)=>{if(type==='click')listener.push(fn)},
      getElementById:id=>id==='tobeHumanReviewNote'?note:null
    },
    state:{activePage:'tobe'},currentEng:()=>e,latestTobe:()=>p,
    tobeEditable:x=>x?.status==='DRAFT',confirmedSnapshot:()=>snap,
    currentDiagnosticOutput:()=>diag,tobeSourceSteps:()=>ids.map(id=>({id})),
    // Future-route integrity is covered by the dedicated graph regression suite.
    tobeFlowIntegrity:()=>null,
    tobeAddedSteps:()=>[],
    selectedOtherMissingDetail:()=>false,fieldOptions:()=>[],
    tobeArtifactValues:v=>({resolved:Array.isArray(v)?v:(v?[v]:[])}),
    internalAiSavedDraft:()=>p.aiDraft.proposal,
    internalAiCheckpointValid:()=>false,
    saveTobeFromDom:()=>true,
    markDirty:m=>updates.push(m),now:()=> '2026-11-04T16:00:00+01:00',
    saveState:()=>{saved.push(JSON.stringify(e));return true},
    toast:m=>notices.push(m),render:()=>{},esc:x=>String(x),attr:x=>String(x)
  };
  vm.createContext(sandbox);
  vm.runInContext(block('AUNEA-FE-PG11-TRANSFORMATION-UX-258')+'\n'+
    block('AUNEA-FE-PG11-HUMAN-DECISIONS-223')+'\n'+
    block('AUNEA-FE-PG11-REVIEW-GATE-199')+'\n'+
    block('AUNEA-FE-PG11-HUMAN-DECISION-SAVE-224'),sandbox);
  const click=(sid,status,text=note.value)=>{
    note.value=text;
    const control={getAttribute:name=>name==='data-tobe-human-source'?sid:status};
    listener.at(-1)({target:{closest:selector=>selector==='[data-tobe-human-decision]'?control:null},
      preventDefault(){}});
  };
  const readiness=()=>vm.runInContext('tobeReviewReadiness(currentEng(),latestTobe(currentEng()))',sandbox);
  return {e,p,saved,notices,click,readiness,sandbox};
}
test('decisions ACCEPT/MODIFY/DISCARD persist without overwriting consultant fields',()=>{
  const h=setup(),before=JSON.stringify(h.p.items);
  assert.match(h.readiness(),/revisión humana/);
  h.click('S1','ACCEPT');
  assert.equal(h.p.aiDraft.humanReview.decisions.S1.status,'ACCEPT');
  assert.equal(h.saved.length,1);
  assert.equal(JSON.stringify(h.p.items),before,'choice cannot copy unreviewed fields into TO-BE');
  assert.match(h.readiness(),/Falta aceptar, modificar o descartar/);
  h.click('S2','DISCARD','No se acepta la sugerencia: se mantiene el control actual hasta validar su origen.');
  assert.equal(h.p.aiDraft.humanReview.decisions.S2.status,'DISCARD');
  assert.equal(h.readiness(),null,'human-reviewed, complete changed-step design may be sent to REVIEWED');
  h.click('S1','MODIFY','Se ajusta la propuesta tras revisar las fuentes y el control aplicable.');
  assert.equal(h.p.aiDraft.humanReview.decisions.S1.status,'MODIFY');
});
test('short justification and stale candidate cannot create valid decision',()=>{
  const h=setup();
  h.click('S1','ACCEPT','sí');
  assert.equal(h.p.aiDraft.humanReview,undefined);
  assert.match(h.notices.at(-1),/20 caracteres/);
  h.click('S1','ACCEPT');
  h.p.aiDraft.proposal.items[0].rationale+=' NUEVA GENERACIÓN';
  assert.match(h.readiness(),/revisión humana/,
    'previous acceptance must be invalidated on candidate regeneration');
});
test('blocking keep-state and legacy NO cannot be promoted to reviewed',()=>{
  const h=setup();
  h.click('S1','ACCEPT');
  h.click('S2','MODIFY');
  h.p.items[0].transformation='Se mantiene';
  assert.match(h.readiness(),/bloqueos/);
  h.p.items[0].transformation='Se modifica';
  h.p.items[0].controlsRisk='NO';
  assert.match(h.readiness(),/Completa herramienta, datos y controles/);
  h.p.items[0].controlsRisk='Trazabilidad de errores bajo responsable validado';
  assert.equal(h.readiness(),null);
});
test('explicit decisions remain bound to the same TO-BE version and diagnostic',()=>{
  const h=setup();
  h.click('S1','ACCEPT');
  h.click('S2','MODIFY');
  assert.equal(h.readiness(),null);
  h.p.version=2;
  assert.match(h.readiness(),/revisión humana/);
  h.p.version=1;
  h.p.sourceSnapshotVersion=1;
  assert.match(h.readiness(),/AS-IS confirmado vigente/);
});
// [AUNEA-UAT-PG11-HUMAN-DECISIONS-226] END
