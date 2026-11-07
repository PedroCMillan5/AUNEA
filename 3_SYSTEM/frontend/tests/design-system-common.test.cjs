// [AUNEA-UAT-DESIGN-COMMON-312] START — Global CSS ownership and PG11 component reuse.
// SOURCE: TOKENS_AUNEA v1.0, DESIGN_SYSTEM_AUNEA v1.0, CATALOGO_COMPONENTES DS-002/003/017.
// PURPOSE: Stop local appearance overrides from accumulating on shared controls.
// FROZEN pages must retain their existing source/style snapshots.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const load=name=>fs.readFileSync(path.join(root,name),'utf8');
const base=load('styles.css'),local=load('ui-system.css'),
  html=load('index.html'),pg11=load('pages/results.js');
const shared=base.match(/\/\* \[AUNEA-FE-SHARED-COMPONENTS-311\] START[\s\S]*?\/\* \[AUNEA-FE-SHARED-COMPONENTS-311\] END \*\//)?.[0];

test('the application loads ONE base CSS before the layout/skin CSS',()=>{
  assert.match(html,/<link rel="stylesheet" href="styles\.css">/);
  assert.match(html,/<link rel="stylesheet" href="ui-system\.css">/);
  assert.ok(html.indexOf('href="styles.css"')<html.indexOf('href="ui-system.css"'));
  assert.equal((html.match(/href="styles\.css"/g)||[]).length,1);
  assert.equal((html.match(/href="ui-system\.css"/g)||[]).length,1);
});

test('canonical tokens and button variants live in the shared stylesheet only',()=>{
  assert.equal((base.match(/:root\s*\{/g)||[]).length,1);
  assert.doesNotMatch(local,/:root\s*\{/);
  for(const token of ['--system','--system-soft','--font-body','--font-small','--font-caption','--space-2'])
    assert.match(base,new RegExp(token+':'));
  for(const selector of ['.btn{','.btn-primary{','.btn-outline{','.btn-small{'])
    assert.ok(base.includes(selector),'Missing canonical '+selector);
  assert.doesNotMatch(local,/(^|})\s*\.btn\s*\{/m,'Page CSS must not redefine the base button');
});

test('new reusable primitives are opt-in and scoped; FROZEN baseline receives no implicit changes',()=>{
  assert.ok(shared,'Missing shared design component block');
  const selectors=[...shared.matchAll(/(?:^|\})\s*(\.[a-z][^{]+)\{/gm)]
    .map(m=>m[1].trim());
  assert.ok(selectors.length>=4);
  assert.ok(selectors.every(s=>s.startsWith('.aunea-ui-')),
    'Shared additions must not target existing frozen pages by generic element');
  assert.doesNotMatch(shared,/(^|})\s*(?:button|h1|h2|h3|p|:root)\s*\{/m);
  assert.match(shared,/font-family:Sora/);
  assert.match(shared,/font-family:Inter/);
});

test('PG11 uses common heading primitives and has four numbered main sections',()=>{
  assert.match(pg11,/class="aunea-ui-section-title"/);
  assert.match(pg11,/01 · INFORMACIÓN GENERAL/);
  assert.match(pg11,/02 · ANÁLISIS IA GLOBAL DEL PROCESO/);
  assert.match(pg11,/03 · REVISIÓN POR ACTIVIDAD Y DISEÑO TO-BE/);
  assert.match(pg11,/04 · Validación global/);
  assert.doesNotMatch(pg11,/05 · Validación global/);
  assert.match(pg11,/Auditoría IA · Detalle técnico \(opcional\)/);
  assert.doesNotMatch(pg11,/04 · Auditoría de propuestas IA por actividad/);
});

test('PG11 consultant action buttons use the shared compact-button group',()=>{
  assert.match(pg11,/class="tobe-ai-row-actions aunea-ui-button-row"/);
  assert.match(pg11,/class="btn btn-outline btn-small/);
  assert.match(shared,/\.aunea-ui-button-row>\.btn\{[^}]*text-align:center;[^}]*white-space:nowrap;/);
  assert.doesNotMatch(local,/\.tobe-ai-row-actions(?:>\.btn| \.btn)\{[^}]*font-size:/);
  assert.doesNotMatch(local,/\.tobe-ai-row-actions(?:>\.btn| \.btn)\{[^}]*padding:/);
  assert.doesNotMatch(pg11,/class="btn btn-outline btn-small" style="margin:0 12px 10px 0"/);
});

test('shared visual contract does not change business or IA execution state',()=>{
  assert.match(pg11,/data-tobe-ai-use-field/);
  assert.match(pg11,/data-tobe-ai-keep-field/);
  assert.match(pg11,/data-tobe-ai-edit-field/);
  assert.match(pg11,/id="checkTobeReadiness"/);
  assert.match(pg11,/id="tobeAiMount"/);
  const frozen=JSON.parse(load('FROZEN_PAGES.json'));
  assert.ok(frozen.frozen_pages.some(p=>p.status==='FROZEN'));
});
// [AUNEA-UAT-DESIGN-COMMON-312] END
