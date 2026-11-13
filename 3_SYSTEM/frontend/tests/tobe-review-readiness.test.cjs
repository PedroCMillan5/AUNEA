// [AUNEA-UAT-PG11-REVIEW-GATE-199] START — behavioral QA of governed PG11 DRAFT readiness.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const src=require('./pg11-source.cjs')();
const block=src.match(/\/\/ \[AUNEA-FE-PG11-REVIEW-GATE-199\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-REVIEW-GATE-199\] END/)?.[0];
if(!block)throw Error('Falta el control de revisión PG11');

function harness(){
  const warnings=[],dirty=[];
  const current={
    status:'DRAFT',version:1,sourceSnapshotVersion:2,
    items:[{sourceStepId:'S1',sourceStepName:'Registrar',transformation:'Se modifica',
      problemResolved:'Entrada duplicada',futureActor:'Administración',
      tool:'ERP',inputs:['PDF'],outputs:['RECORD'],controlsRisk:'Validar duplicados y registrar excepciones.',
      automationAi:'',humanSupervision:'',futureTime:'',futureTimeAssumption:''}]
  };
  const sandbox={
    Set,String,Array,
    confirmedSnapshot:()=>({version:2}),
    tobeSourceSteps:()=>[{id:'S1'}],
    // Isolated field-readiness harness; future-route integrity is independently tested.
    tobeFlowIntegrity:()=>null,
    tobeAddedSteps:()=>[],selectedOtherMissingDetail:()=>false,
    fieldOptions:()=>[],tobeArtifactValues:v=>({resolved:Array.isArray(v)?v:(v?[v]:[])}),
    latestTobe:()=>current,
    nextTobeStatus:p=>p.status==='DRAFT'?'REVIEWED':null,
    toast:message=>warnings.push(message),markDirty:message=>dirty.push(message),
    now:()=> '2026-11-03T11:00:00Z'
  };
  vm.createContext(sandbox);
  const rationale=src.match(/\/\/ \[AUNEA-FE-PG11-TRANSFORMATION-UX-258\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-TRANSFORMATION-UX-258\] END/)?.[0];
  vm.runInContext('const TOBE_TRANSFORMATIONS=["Se mantiene","Se modifica","Se elimina","Se automatiza","Se asiste con IA","Requiere decisión humana","Se incorpora control"];\n'+rationale+'\n'+block,sandbox);
  return {current,warnings,dirty,
    check:()=>vm.runInContext('tobeReviewReadiness(null,latestTobe())',sandbox),
    advance:()=>vm.runInContext('advanceTobeStatus(null)',sandbox)};
}

test('PG11 refuses stale confirmed source and missing activity correspondence',()=>{
  const h=harness();
  h.current.sourceSnapshotVersion=1;
  assert.match(h.check(),/no corresponde al AS-IS/);
  assert.equal(h.advance(),false);
  assert.equal(h.current.status,'DRAFT');
  h.current.sourceSnapshotVersion=2;
  h.current.items[0].sourceStepId='S-OTHER';
  assert.match(h.check(),/no coinciden/);
  assert.equal(h.current.status,'DRAFT');
});

test('PG11 requires a valid transformation, future actor and problem for a changed activity',()=>{
  const h=harness(),item=h.current.items[0];
  item.transformation='Criterio no canónico';
  assert.match(h.check(),/transformación válida/);
  item.transformation='Se modifica';
  item.futureActor='';
  assert.match(h.check(),/responsable futuro/);
  item.futureActor='Administración';
  item.problemResolved='';
  assert.match(h.check(),/justificación concreta/);
  item.transformation='Se mantiene';
  assert.match(h.check(),/Motivo para conservar la actividad/,'Mantener también exige justificación');
  item.problemResolved='Se mantiene el control existente porque responde a la obligación declarada.';
  assert.equal(h.check(),null,'Se mantiene con motivo trazable, sin inventar cambios');
});

test('PG11 elimination retains the source and diagnosis but never demands a fictional future actor',()=>{
  const h=harness(),item=h.current.items[0];
  item.transformation='Se elimina';
  item.problemResolved='Se retira el registro duplicado y su ruta debe reconectarse.';
  item.futureActor='';
  item.tool='';
  assert.equal(h.check(),null,'routing is separately validated by future-flow integrity');
});

test('PG11 rejects future time without traced assumption, then allows one final TO-BE review',()=>{
  const h=harness(),item=h.current.items[0];
  item.futureTime='30 min';
  assert.match(h.check(),/supuesto trazable/);
  assert.equal(h.advance(),false);
  assert.equal(h.current.status,'DRAFT');
  item.futureTimeAssumption='Estimación pendiente de validar';
  assert.equal(h.check(),null);
  assert.equal(h.advance(),true);
  assert.equal(h.current.status,'REVIEWED');
  assert.equal(h.dirty.length,1);
  assert.ok(!h.warnings.at(-1)?.includes('Publicar'));
});

test('F4: same semantic placeholder validation governs reviewed TO-BE fields',()=>{
  const h=harness(),item=h.current.items[0];
  for(const placeholder of ['NO','N/A','ninguno','sin definir','pendiente','—','   ']){
    item.tool=placeholder;
    assert.match(h.check(),/herramienta, entradas, salidas y controles/,placeholder);
  }
  item.tool='ERP';
  item.controlsRisk='Pendiente';
  assert.match(h.check(),/herramienta, entradas, salidas y controles/);
  item.controlsRisk='Verificación de duplicados';
  assert.equal(h.check(),null);
});
// [AUNEA-UAT-PG11-REVIEW-GATE-199] END
