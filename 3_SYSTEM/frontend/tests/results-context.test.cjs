// [AUNEA-UAT-RESULT-CONTEXT-369] START — single owner of current/stale results.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../domain/result-context.js'),'utf8');

function fixture(){
  const e={confirmedSnapshots:[{version:3}],lastEngineSnapshotVersion:3,
    diagnosticOutput:{input_snapshot_hash:'DIAG-3'},gatesFresh:true};
  const c={confirmedSnapshot:e=>e.confirmedSnapshots?.at(-1)||null,
    engineGateOutputFresh:e=>e.gatesFresh};
  vm.createContext(c);
  vm.runInContext(source,c);
  return {e,c};
}

test('all consumers read exactly the current backend diagnostic output',()=>{
  const {e,c}=fixture(),before=JSON.stringify(e),out=e.diagnosticOutput;
  assert.equal(c.currentDiagnosticOutput(e),out);
  assert.equal(c.diagnosticOutputFreshness(e).status,'CURRENT');
  assert.equal(JSON.stringify(e),before,'result projection is read-only');
});

test('absent or stale sources never expose the previous official result',()=>{
  const {e,c}=fixture();
  e.confirmedSnapshots=[];
  assert.equal(c.currentDiagnosticOutput(e),null);
  assert.equal(c.diagnosticOutputFreshness(e).status,'BLOCKED');
  e.confirmedSnapshots=[{version:4}];
  assert.equal(c.currentDiagnosticOutput(e),null);
  assert.equal(c.diagnosticOutputFreshness(e).status,'OBSOLETE');
  e.lastEngineSnapshotVersion=4;
  e.gatesFresh=false;
  assert.equal(c.currentDiagnosticOutput(e),null);
  assert.equal(c.diagnosticOutputFreshness(e).status,'OBSOLETE');
  e.gatesFresh=true;
  e.diagnosticOutput=null;
  assert.equal(c.currentDiagnosticOutput(e),null);
  assert.equal(c.diagnosticOutputFreshness(e).status,'PENDING');
});
// [AUNEA-UAT-RESULT-CONTEXT-369] END
