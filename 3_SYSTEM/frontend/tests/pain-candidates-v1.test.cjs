const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const p=fs.readFileSync(path.join(root,'domain/process.js'),'utf8');
const a=fs.readFileSync(path.join(root,'services/engine-adapter.js'),'utf8');

test('pain candidates are review-only in the friction layer',()=>{
  assert.ok(p.includes('Revisar posibles fricciones'));
  assert.ok(p.includes('Oportunidades para revisar con el cliente'));
  assert.ok(p.includes('openFrictionModal(frId=null,preselectedSteps=[],candidate=null)'));
  assert.ok(p.includes('Confirma la señal observable y completa causa/evidencia cuando estén disponibles'));
  assert.ok(p.includes('Revisar con el cliente'));
  assert.ok(p.includes('Preguntas para validarlo con el cliente'))
});

test('pain candidates come from the backend endpoint',()=>{
  assert.ok(a.includes('/v1/diagnostic/pain-candidates'));
  assert.ok(a.includes('async function fetchPainCandidates'));
});


test('pain candidate review does not validate risks or full diagnostic payload',()=>{
  assert.ok(a.includes('function buildPainCandidatePayload'));
  const start=a.indexOf('function buildPainCandidatePayload');
  const end=a.indexOf('async function fetchPainCandidates',start);
  const body=a.slice(start,end);
  assert.ok(body.includes('_process_steps:activeSteps(e)'));
  assert.ok(body.includes('_frictions:activeFrictions(e)'));
  assert.ok(!body.includes('normalizeRiskInputs'));
  assert.ok(!body.includes('buildBackendPayload'));
  const fetchStart=a.indexOf('async function fetchPainCandidates');
  const fetchEnd=a.indexOf('async function diagnosticCoveragePreflight',fetchStart);
  const fetchBody=a.slice(fetchStart,fetchEnd);
  assert.ok(fetchBody.includes('buildPainCandidatePayload(e)'));
  assert.ok(!fetchBody.includes('buildBackendPayload(e)'));
});
