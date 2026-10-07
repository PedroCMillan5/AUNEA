// [AUNEA-UAT-LEGACY-PHASES-ARCHIVED-010] START — Superseded phased UAT stays out of runtime
// PURPOSE: Prove the 2026-10-07 single end-to-end UAT replaced the visible phased UAT runtime.
// SOURCE: User instruction 2026-10-07; Diagnostic Master v1.2; DEC-050/065/068; DEC-067 superseded by current UAT contract.
// INPUTS: module-manifest.json, index.html, uat/visible.js.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: HIGH.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('module-manifest.json'));
const index=read('index.html');
const visible=read('uat/visible.js');

test('legacy Phase 1 and Phase 2 fixtures are not loaded by the runtime',()=>{
  const runtimePaths=manifest.modules.map(x=>x.path);
  assert.ok(runtimePaths.includes('uat/visible.js'));
  assert.ok(runtimePaths.includes('uat/endtoend-cases.js'));
  assert.ok(!runtimePaths.includes('uat/crm-fixtures.js'));
  assert.ok(!runtimePaths.includes('uat/study-fixtures.js'));
  assert.doesNotMatch(index,/uat\/crm-fixtures\.js|uat\/study-fixtures\.js/);
});

test('visible UAT contract is one complete end-to-end engagement',()=>{
  assert.match(visible,/UAT única end-to-end/);
  assert.match(visible,/Una sola UAT integral\. Sin fases, sin doce estudios y sin tres casos paralelos/);
  assert.match(visible,/Cargar UAT completa/);
  assert.match(visible,/1 estudio · 6 pasos · 3 fricciones · 2 riesgos/);
  assert.doesNotMatch(visible,/Fase 1|Fase 2|Generar Fase 2 Estudios/);
});

test('single UAT exposes the nine capture stages and internal work only after snapshot',()=>{
  for(const stage of ['S01','S02','S03','S08','S04','S05','S06','S07','S09'])assert.ok(visible.includes("'"+stage+"'"),stage);
  assert.match(visible,/Trabajo interno pendiente de cierre/);
  assert.match(visible,/hasConfirmedSnapshot\(e\)/);
  assert.match(visible,/state\.activePage='resultados'/);
});
// [AUNEA-UAT-LEGACY-PHASES-ARCHIVED-010] END
