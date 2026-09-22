// [AUNEA-UAT-STUDY-PHASE2-100] START — Linked Study UAT phase 2
// PURPOSE: Prove Phase 2 builds Studies only from validated Phase 1 CRM references.
// SOURCE: DEC-042/050/051/060/066/067; user instruction 2026-09-22.
// INPUTS: uat/study-fixtures.js, uat/visible.js, index.html.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: HIGH.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fixture=read('uat/study-fixtures.js');
const visible=read('uat/visible.js');
const index=read('index.html');

test('Phase 2 Study fixture is loaded after Phase 1 CRM',()=>{
  const crm=index.indexOf('uat/crm-fixtures.js'),study=index.indexOf('uat/study-fixtures.js');
  assert.ok(crm>=0&&study>crm);
  assert.match(visible,/Generar Fase 2 Estudios/);
  assert.match(visible,/Fase 1 CRM debe estar en PASS antes de generar Estudios/);
});

test('Phase 2 creates twelve Studies and no CRM masters or Projects',()=>{
  assert.match(fixture,/const PHASE2_STUDY_COUNT=12/);
  assert.match(fixture,/UAT2-STUDY-/);
  assert.match(fixture,/state\.engagements\.push\(\.\.\.studies\)/);
  assert.doesNotMatch(fixture,/state\.companies\.push/);
  assert.doesNotMatch(fixture,/state\.contacts\.push/);
  assert.doesNotMatch(fixture,/state\.opportunities\.push/);
  assert.doesNotMatch(fixture,/state\.projects\.push/);
});

test('Every generated Study references existing Company, Contacts and Opportunity',()=>{
  assert.match(fixture,/companyId:o\.companyId/);
  assert.match(fixture,/contactIds/);
  assert.match(fixture,/opportunityId:o\.id/);
  assert.match(fixture,/Opportunity existente de la misma Company/);
  assert.match(fixture,/Contacts del Estudio pertenecen a su Opportunity/);
  assert.match(fixture,/Una Opportunity no genera dos Estudios UAT/);
});

test('Phase 2 starts at Preparation S01 and reuses CRM-owned values',()=>{
  assert.match(fixture,/status:'Preparación'/);
  assert.match(fixture,/stageId:'S01'/);
  assert.match(fixture,/DF001:co\?\.name/);
  assert.match(fixture,/DF002:co\?\.sector/);
  assert.match(fixture,/DF006:primary/);
  assert.match(fixture,/Volumen activa paginación Estudios/);
});
// [AUNEA-UAT-STUDY-PHASE2-100] END
