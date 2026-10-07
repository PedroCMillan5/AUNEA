// [AUNEA-UAT-SINGLE-ENDTOEND-130] START — Single-UAT isolation and final closure contract
// PURPOSE: Prove one synthetic engagement replaces parallel/phased visible QA and is isolated from real records.
// SOURCE: User instruction 2026-10-07; Diagnostic Master v1.2; DEC-050/065/068.
// INPUTS: uat/visible.js, uat/endtoend-cases.js, domain/process-lifecycle.js.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: HIGH.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const visible=read('uat/visible.js');
const cases=read('uat/endtoend-cases.js');
const lifecycle=read('domain/process-lifecycle.js');

test('single visible UAT loads only the invoice fixture',()=>{
  assert.match(visible,/uat\/cases\/invoices\.json/);
  assert.match(visible,/fixture\.key!=='INVOICE'/);
  assert.match(visible,/exactamente|único|1 estudio/i);
  assert.doesNotMatch(visible,/unified-requests\.json|email-orders\.json/);
});

test('single UAT cleanup is prefix-scoped and does not target ordinary records',()=>{
  assert.match(visible,/function isAnyUatSyntheticId\(v\)\{return \/\^UAT\[123\]-\//);
  assert.match(visible,/filter\(x=>!isAnyUatSyntheticId\(x\.id\)\)/);
  assert.match(cases,/const UAT3_PREFIX='UAT3-CASE-'/);
});

test('final PG09 closure is explicit, seals a snapshot and persists synchronously',()=>{
  assert.match(lifecycle,/function confirmClosingAsIs\(\)/);
  assert.match(lifecycle,/e\.confirmedAsIs=true;e\.answers\.DF093='YES'/);
  assert.match(lifecycle,/sealConfirmedSnapshot/);
  assert.match(lifecycle,/persistRecoverySnapshot\('cierre S09 confirmado'\)/);
});
// [AUNEA-UAT-SINGLE-ENDTOEND-130] END
