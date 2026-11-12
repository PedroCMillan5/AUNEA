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
  html=load('index.html'),pg11=require('./pg11-source.cjs')();
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
  assert.match(pg11,/03 · DISEÑO TO-BE/);
  assert.match(pg11,/<h2 class="aunea-ui-section-title">Revisión por actividad<\/h2>/);
  assert.match(pg11,/04 · Validación global/);
  assert.doesNotMatch(pg11,/05 · Validación global/);
  assert.match(pg11,/Auditoría IA · Detalle técnico \(opcional\)/);
  assert.doesNotMatch(pg11,/04 · Auditoría de propuestas IA por actividad/);
});

test('PG11 section 03 reuses section 01/02 surface and canonical typography tokens',()=>{
  assert.match(local,/\.tobe-context,\.tobe-global-analysis,\.tobe-review-section-head\{/);
  const sourceLabelStyle=local.match(/\.tobe-original-facts dt\{[^}]*\}/)?.[0]||'';
  assert.match(sourceLabelStyle,/font-family:Inter/);
  assert.match(sourceLabelStyle,/font-size:var\(--font-caption\)/);
  assert.match(local,/\.tobe-original-facts dd\{[^}]*font-size:var\(--font-small\)/);
  assert.match(local,/\.tobe-advice-pairs dd\{font-size:var\(--font-small\)/);
  assert.match(local,/\.tobe-inspector #tobeStepOrigin>\.tobe-subdetails>summary,/);
  assert.match(local,/\.tobe-inspector #tobeStepAdvice>\.tobe-subdetails>summary\{/);
  assert.match(local,/\.tobe-workspace\[data-tobe-mode="guided"\] \.tobe-ai-field-control :is\(input,textarea,select\)\{[^}]*font-size:var\(--font-small\)/);
  assert.doesNotMatch(local,/\.tobe-workspace\[data-tobe-mode="guided"\] \.tobe-guided-nav \.btn\{[^}]*font-size:/);
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
test('PG01 shares headings and form surfaces without local appearance overrides',()=>{
  const pg01=load('pages/diagnostic-stages.js');
  assert.match(pg01,/pg01-disclosure-head section-title/);
  assert.match(pg01,/<h2 id="pg01-session-heading">/);
  assert.match(pg01,/aria-labelledby="pg01-session-heading"/);
  assert.match(pg01,/pg01-disclosure-open aunea-ui-form-section/);
  assert.equal((local.match(/\.pg01-disclosure-open\s*\{/g)||[]).length,1);
  for(const rule of local.matchAll(/\.pg01-[^{]+\{([^}]+)\}/g))
    assert.doesNotMatch(rule[1],/font(?:-size|-family|-weight)?\s*:|background\s*:|border(?:-radius)?\s*:|color\s*:/);
  assert.doesNotMatch(pg01,/class="btn[^"\n]*" style=/);
});
test('PG11 work surfaces and stages reuse the same opt-in structural primitives',()=>{
  assert.match(shared,/\.aunea-ui-work-surface\{[^}]*display:grid;[^}]*padding:20px 22px;/);
  assert.match(shared,/\.aunea-ui-work-stage\{[^}]*display:grid;gap:12px;min-width:0/);
  for(const name of ['tobe-context','tobe-global-analysis','tobe-review-section-head'])
    assert.ok(pg11.includes(name+' aunea-ui-work-surface'),'Missing shared work surface: '+name);
  for(const name of ['tobe-origin','tobe-advice','tobe-edit'])
    assert.ok(new RegExp('class="'+name+'[^"\\n]*aunea-ui-work-stage').test(pg11),'Missing shared stage: '+name);
  assert.doesNotMatch(local,/\.tobe-origin,\.tobe-edit,\.tobe-advice\{display:grid;gap:12px\}/);
  assert.doesNotMatch(local,/\.tobe-context,\.tobe-global-analysis,\.tobe-review-section-head\{[^}]*padding:20px 22px/);
  // Both structures inherit min-width from their existing shared work primitives.
  assert.doesNotMatch(local,/\.tobe-origin,\.tobe-edit,\.tobe-advice\{min-width:0\}/);
  assert.doesNotMatch(local,/\.tobe-context,\.tobe-global-analysis,\.tobe-review-section-head\{min-width:0\}/);
});
// [AUNEA-UAT-DESIGN-COMMON-312] END

test('internal work result layouts reuse shared opt-in structure instead of inline presentation',()=>{
  const results=load('pages/results.js');
  for(const selector of ['.aunea-ui-mt-8{','.aunea-ui-mt-12{','.aunea-ui-mt-14{','.aunea-ui-block{','.aunea-ui-recap-input{','.aunea-ui-metric-status{'])
    assert.ok(shared.includes(selector),'Missing shared component: '+selector);
  for(const className of ['aunea-ui-mt-8','aunea-ui-mt-12','aunea-ui-mt-14','aunea-ui-recap-input','aunea-ui-metric-status'])
    assert.ok(results.includes(className),'Results page must use '+className);
  assert.doesNotMatch(results,/style="/,'Results must not reintroduce inline styles');
});

test('diagnostic work disclosures share the same structural owner',()=>{
  const results=load('pages/results.js');
  const common=['pg10-stage-nav','pg10-critical-points','pg10-decision-trace'];
  const renderer=load('ui/renderer.js');
  assert.match(renderer,/function auneaWorkDisclosure\(kind,title,body\)/);
  assert.match(renderer,/aunea-ui-work-disclosure/);
  assert.match(shared,/\.aunea-ui-work-disclosure\{margin-top:16px;padding:13px 16px;/);
  assert.match(shared,/\.aunea-ui-work-disclosure>summary\{font-size:13px;/);
  assert.match(shared,/\.aunea-ui-work-disclosure\[open\]>summary\{/);
  for(const kind of common){
    assert.ok(results.includes("auneaWorkDisclosure('"+kind+"'"),
      'The '+kind+' disclosure must reuse the shared component renderer');
    for(const suffix of ['{',',','>summary','[open]'])
      assert.ok(!local.includes('.'+kind+suffix),
        'Visual geometry for '+kind+' must not be duplicated in page CSS');
  }
  assert.match(local,/\.pg10-critical-points \.asis-opportunity-list\{margin-top:14px\}/,
    'Section-specific content positioning remains owned by PG10');
});
