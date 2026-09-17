const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'pages/session-display.js'),'utf8');
const boot=fs.readFileSync(path.join(root,'boot.js'),'utf8');

test('C06 Results Mode is a separate hash-routed client surface',()=>{
  assert.match(boot,/location\.hash==='\#results'/);
  assert.match(boot,/bootResultsMode\(\)/);
  assert.match(page,/window\.open\(`\$\{location\.pathname\}#results`/);
  assert.match(page,/aunea_results_display_v1/);
});

test('C06 publishes only after confirmed snapshot, approved TO-BE and diagnostic output exist',()=>{
  assert.match(page,/confirmedSnapshot/);
  assert.match(page,/APPROVED_FOR_CLIENT/);
  assert.match(page,/PUBLISHED/);
  assert.match(page,/diagnosticOutput/);
  assert.match(page,/Falta snapshot confirmado, TO-BE aprobado o diagnóstico oficial/);
});

test('C06 narrative is read-only and never calls diagnose or scenario endpoints',()=>{
  for(const heading of ['AS-IS confirmado','Qué detectamos y por qué','TO-BE aprobado','AS-IS vs TO-BE','Solución recomendada','Escenario y business case','Siguientes pasos'])assert.ok(page.includes(heading),heading);
  const mode=page.slice(page.indexOf('// C06 · Modo Resultados'));
  assert.doesNotMatch(mode,/\/v1\/diagnose|\/v1\/scenarios\/compare/);
  assert.doesNotMatch(mode,/data-answer|data-tobe-item/);
});

test('C06 opening Results Mode advances lifecycle to Sesión 2',()=>{
  assert.match(page,/advanceEngagementTo\(e,'Sesión 2'/);
});
