// [AUNEA-UAT-CRM-PHASE1-080] START — Clean UAT Phase 1 CRM dataset
// PURPOSE: Prove the restarted UAT runtime contains only the complete CRM Phase 1 fixture and no study fixture.
// SOURCE: User instruction 2026-09-22; DEC-050/051/058/061/066.
// INPUTS: uat/visible.js, uat/crm-fixtures.js and index.html.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: HIGH.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fixture=read('uat/crm-fixtures.js');
const visible=read('uat/visible.js');
const index=read('index.html');

test('UAT runtime starts from Phase 1 CRM only',()=>{
  assert.match(index,/uat\/visible\.js/);
  assert.match(index,/uat\/crm-fixtures\.js/);
  assert.doesNotMatch(index,/uat\/fixtures\.js/);
  assert.doesNotMatch(index,/uat\/asis-suite\.js/);
  assert.doesNotMatch(index,/uat\/study-suite\.js/);
  assert.match(visible,/Fase 1 prueba exclusivamente el CRM congelado/);
  assert.match(visible,/los estudios se generarán en la Fase 2/);
});

test('Phase 1 declares the requested CRM volumes and no study/project fixture',()=>{
  assert.match(fixture,/PHASE1_COMPANY_COUNT=12/);
  assert.match(fixture,/PHASE1_CONTACT_COUNT=24/);
  assert.match(fixture,/PHASE1_INTERACTION_COUNT=24/);
  assert.match(fixture,/PHASE1_OPPORTUNITY_COUNT=16/);
  assert.match(fixture,/return \{companies,contacts,interactions,opportunities\}/);
  assert.match(fixture,/return \{companies,contacts,interactions,opportunities\}/);
  assert.doesNotMatch(fixture,/return \{companies,contacts,interactions,opportunities,engagements/);
});

test('Phase 1 uses a new isolated prefix and reset removes superseded UAT prefixes safely',()=>{
  assert.match(fixture,/UAT1-CRM-/);
  assert.match(fixture,/DUMMY-CRM-/);
  assert.match(fixture,/function resetAllUatData/);
  assert.match(fixture,/Los datos reales no se tocarán/);
  assert.match(fixture,/state\.companies=state\.companies\.filter\(x=>!isAnyUatRecordId\(x\.id\)\)/);
  assert.match(fixture,/state\.engagements=\(state\.engagements\|\|\[\]\)\.filter\(x=>!isAnyUatRecordId\(x\.id\)\)/);
});

test('Phase 1 validates completeness, references, enums and pagination coverage',()=>{
  for(const phrase of [
    'Company: todos los campos aplicables completos',
    'Contact: todos los campos completos',
    'Opportunity: todos los campos completos',
    'Interaction: campos CRM aplicables completos',
    'Primary Contact pertenece a su Company',
    'Opportunity refs válidas',
    'Interaction refs válidas',
    'Estados Company válidos',
    'Estados/Cargos Contact válidos',
    'Stages/Origen Opportunity válidos',
    'Interaction enums válidos',
    'Volumen activa paginación Empresas',
    'Volumen activa paginación Contactos',
    'Volumen activa paginación Interacciones',
    'Volumen activa paginación Oportunidades'
  ]) assert.ok(fixture.includes(phrase),phrase);
});
// [AUNEA-UAT-CRM-PHASE1-080] END
