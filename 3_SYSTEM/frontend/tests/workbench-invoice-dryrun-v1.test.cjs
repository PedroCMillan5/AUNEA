// [AUNEA-UAT-WORKBENCH-INVOICES-154] START — Existing synthetic AS-IS continuity evidence
// PURPOSE: Keep the invoice dry-run grounded: declared SLA/E2E, conditional approval,
// INCLUDED/BREAKDOWN time attribution and financial safeguards. No TO-BE forecast.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../uat/cases/invoices.json'),'utf8'));
test('invoice case is an unapproved synthetic fixture, not real-client evidence',()=>{
  assert.equal(fixture.key,'INVOICE');
  assert.equal(fixture.company.name,'Levante Instalaciones Técnicas');
  assert.equal(fixture.answers.DF011,'Recepción y registro de facturas de proveedor');
  assert.match(fixture.answers.DF100,/Escenario sintético declarado/);
  assert.equal(fixture.answers.DF093,undefined);
  assert.equal(fixture.steps.length,6);
});
test('E2E is a declared 72h baseline distinct from the 48h service SLA',()=>{
  assert.deepEqual(fixture.answers.DF026,{value:72,unit:'h'});
  assert.deepEqual(fixture.answers.DF025,{value:48,unit:'h'});
  assert.equal(fixture.answers.DF021,160);
  assert.equal(fixture.answers.DF022,'MONTH');
  assert.notEqual(fixture.answers.DF025.value,fixture.answers.DF026.value);
});
test('approval is on the existing conditional branch and final financial decision remains human',()=>{
  const gate=fixture.steps[3],manager=fixture.steps[4];
  assert.equal(gate.yes,4);
  assert.equal(gate.no,5);
  assert.equal(manager.share,25);
  assert.equal(manager.wait,720);
  assert.ok(fixture.answers.DF088.includes('FINAL_DECISION'));
  assert.ok(fixture.risks.some(r=>r.description.includes('autorización')));
});
test('existing 5-minute re-key and incomplete document times are never additive by default',()=>{
  const rek=fixture.frictions.find(f=>f.signal.includes('teclear'));
  const incomplete=fixture.frictions.find(f=>f.signal.includes('8%'));
  assert.ok(rek);
  assert.equal(rek.minutes,5);
  assert.equal(rek.mode,'INCLUDED');
  assert.equal(fixture.steps[rek.owner].active,5);
  assert.ok(incomplete);
  assert.equal(incomplete.mode,'BREAKDOWN');
  assert.equal(incomplete.minutes,10);
  assert.equal(fixture.steps[incomplete.owner].rework,10);
  assert.ok(fixture.frictions.every(f=>['INCLUDED','BREAKDOWN','ADDITIONAL'].includes(f.mode)));
});
test('not one missing TO-BE assumption can be silently promoted to ROI, price or future SLA',()=>{
  assert.equal(fixture.future_active_hours,undefined);
  assert.equal(fixture.future_wait_hours,undefined);
  assert.equal(fixture.scenarioResults,undefined);
  assert.equal(fixture.quote,undefined);
  assert.equal(fixture.approvedOutputReview,undefined);
  assert.ok(fixture.answers.DF088.includes('FINANCIAL_ACTION'));
});
// [AUNEA-UAT-WORKBENCH-INVOICES-154] END
