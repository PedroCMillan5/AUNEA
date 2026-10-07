const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const p=fs.readFileSync(path.join(root,'domain/process.js'),'utf8');
const a=fs.readFileSync(path.join(root,'services/engine-adapter.js'),'utf8');

test('pain candidates are review-only in the friction layer',()=>{
  assert.ok(p.includes('Revisar posibles fricciones'));
  assert.ok(p.includes('Señales para revisar, no fricciones confirmadas.'));
  assert.ok(p.includes('openFrictionModal(frId=null,preselectedSteps=[],candidate=null)'));
  assert.ok(p.includes('Confirma la señal observable y completa causa/evidencia cuando estén disponibles'));
});

test('pain candidates come from the backend endpoint',()=>{
  assert.ok(a.includes('/v1/diagnostic/pain-candidates'));
  assert.ok(a.includes('async function fetchPainCandidates'));
});
