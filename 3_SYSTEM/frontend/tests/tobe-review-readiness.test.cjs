// [AUNEA-UAT-PG11-REVIEW-GATE-199] START — behavioral QA of governed PG11 DRAFT readiness.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../pages/results.js'),'utf8');
const block=src.match(/\/\/ \[AUNEA-FE-PG11-REVIEW-GATE-199\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-REVIEW-GATE-199\] END/)?.[0];
if(!block)throw Error('Falta el control de revisión PG11');

function harness(){
  const warnings=[],dirty=[];
  const current={
    status:'DRAFT',version:1,sourceSnapshotVersion:2,
    items:[{sourceStepId:'S1',sourceStepName:'Registrar',transformation:'Se modifica',
      problemResolved:'Entrada duplicada',futureActor:'Administración',
      futureTime:'',futureTimeAssumption:''}]
  };
  const sandbox={
    Set,String,Array,
    confirmedSnapshot:()=>({version:2}),
    tobeSourceSteps:()=>[{id:'S1'}],
    latestTobe:()=>current,
    nextTobeStatus:p=>p.status==='DRAFT'?'REVIEWED':null,
    toast:message=>warnings.push(message),markDirty:message=>dirty.push(message),
    now:()=> '2026-11-03T11:00:00Z'
  };
  vm.createContext(sandbox);
  vm.runInContext('const TOBE_TRANSFORMATIONS=["Se mantiene","Se modifica","Se elimina","Se automatiza","Se asiste con IA","Requiere decisión humana","Se incorpora control"];\n'+block,sandbox);
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
  assert.match(h.check(),/qué problema resuelve/);
  item.transformation='Se mantiene';
  assert.equal(h.check(),null,'Conservar una actividad sin inventar un problema debe permitirse');
});

test('PG11 rejects future time without traced assumption, then allows human review only',()=>{
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
// [AUNEA-UAT-PG11-REVIEW-GATE-199] END
