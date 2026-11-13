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

test('work disclosure builder preserves semantic markup and escapes its label',()=>{
  const vm=require('node:vm');
  const renderer=load('ui/renderer.js');
  const source=renderer.match(/function auneaWorkDisclosure\(kind,title,body\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source,'Shared disclosure builder missing');
  const escapeHtml=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const build=vm.runInNewContext('('+source+')',{attr:escapeHtml,esc:escapeHtml});
  assert.equal(build('pg10-stage-nav','Etapas','<p>Contenido</p>'),
    '<details class="pg10-stage-nav aunea-ui-work-disclosure"><summary>Etapas</summary><p>Contenido</p></details>');
  assert.equal(build('pg10-stage-nav','<revisión>',''),
    '<details class="pg10-stage-nav aunea-ui-work-disclosure"><summary>&lt;revisión&gt;</summary></details>');
});

test('cross-screen shared primitives are defined once and consumed from CRM through PG12+',()=>{
  const core=load('core/state.js'),renderer=load('ui/renderer.js');
  for(const fn of ['pageTop','section','statusBadge','openModal'])
    assert.match(core,new RegExp('function '+fn+'\\('),'Missing common owner: '+fn);
  assert.match(renderer,/function auneaSelectControl\(/);
  for(const selector of ['.card{','.btn{','.data-table{','.field{','.notice{','.status{','.page-head{'])
    assert.ok(base.includes(selector),'Base visual owner missing: '+selector);
  const sourceFiles=[
    'pages/crm-companies.js','pages/crm-contacts.js','pages/crm-interactions.js',
    'pages/crm-opportunities.js','ui/shell.js','pages/diagnostic-stages.js',
    'pages/results.js','pages/tobe.js','pages/tobe-global.js',
    'pages/comparison.js','pages/projects.js','pages/session-display.js'
  ];
  for(const source of sourceFiles){
    const contents=load(source);
    assert.match(contents,/class=\"(?:[^"]*\b)?(?:btn|card|notice|field|data-table|empty|status|badge)\b/,
      'Screen must consume the shared existing UI foundation: '+source);
  }
});

test('all approved screens remain under nine explicit frozen-page gates',()=>{
  const frozen=JSON.parse(load('FROZEN_PAGES.json'));
  assert.equal(frozen.frozen_pages.length,9);
  const names=frozen.frozen_pages.map(x=>x.page_id);
  for(const name of ['inicio','empresas','contactos','interacciones','oportunidades',
    'estudios','contexto-objetivos','alcance-proceso','estado-objetivo-restricciones'])
    assert.ok(names.includes(name),'Missing frozen page: '+name);
});

test('design inventory covers every manifest source and all documented DS categories',()=>{
  const manifest=JSON.parse(load('module-manifest.json')).modules;
  const script=load('../../tools/aunea-design-system-audit.cjs');
  const catalog=require(path.resolve(root,'../../tools/aunea-ui-component-map.cjs'));
  assert.match(script,/manifest\.map|for\(const m of manifest\)/);
  assert.match(script,/aunea-ui-component-map\.cjs/);
  assert.equal(Object.keys(catalog).length,20);
  for(let i=1;i<=20;i++){
    const id='DS-'+String(i).padStart(3,'0');
    assert.ok(catalog[id],'Missing governed design category '+id);
    assert.ok(Array.isArray(catalog[id].selector),'Missing CSS candidate list '+id);
  }
  assert.equal(manifest.length,46);
});


test('all 46 runtime modules obey the F1 shared-style anti-regression baseline',()=>{
  const cp=require('node:child_process');
  const script=path.resolve(root,'../../tools/aunea-design-system-audit.cjs');
  const inventory=JSON.parse(cp.execFileSync(process.execPath,[script],{
    cwd:path.resolve(root,'../..'),encoding:'utf8',maxBuffer:8*1024*1024
  }));
  const baseline=JSON.parse(load('../../docs/audit/AUNEA_INTERNAL_DESIGN_BASELINE_20261113.json'));
  // Classify every outstanding cross-owner/selector conflict; status is not an approval.
  const triage=inventory.ownershipTriage;
  assert.equal(triage.method,'STATIC_OWNER_RESOLUTION_PENDING_MANUAL_VISUAL_APPROVAL');
  assert.equal(triage.counts.unresolvedClasses,0,'Every cross-CSS class needs a documented owner');
  assert.equal(triage.counts.unresolvedSelectorContexts,0,'Every repeated context needs a documented owner');
  assert.ok(triage.counts.scopedSelectorExceptions>0,'Keep intentional PG10/PG11 scoped contexts separate from FROZEN');
  assert.equal(triage.crossFileClasses.length,inventory.metrics.classesCrossFile);
  assert.equal(triage.repeatedSelectorContexts.length,inventory.metrics.repeatedSelectorContextGroups);
  assert.equal(triage.counts.browserApproved,0,'No visual approval may be inferred from static checks');
  for(const item of [...triage.crossFileClasses,...triage.repeatedSelectorContexts]){
    assert.ok(triage.permittedStatuses.includes(item.status),
      'Unclassified cross-file CSS triage: '+(item.className||item.selectorContext));
    assert.ok(item.reason&&item.browserVerified===false&&item.manualVisualReviewRequired===true,
      'Resolved owner does not equal approved visual UAT');
  }
  for(const item of triage.crossFileClasses){
    const original=inventory.css.find(x=>x.className===item.className);
    if(original.frozenRisk)assert.equal(item.status,'FROZEN_PROTECTED',
      'A FROZEN consumer may not be silently reclassified');
  }
  assert.equal(inventory.metrics.modules,46,'Cover the complete current manifest');
  assert.equal(inventory.frozen.length,9,'Approved frozen boundary remains intact');
  assert.equal(inventory.metrics.documentedComponents,20);
  for(const key of ['classesCrossFile','repeatedSelectorContextGroups','inlineStyleAttributes'])
    assert.ok(inventory.metrics[key]<=baseline.metrics[key],
      'Do not add unowned visual duplication without updating the governed baseline: '+key+
      ' (current '+inventory.metrics[key]+', baseline '+baseline.metrics[key]+')');
  for(const prefix of ['pages/crm-','pages/diagnostic-stages.js','pages/results.js',
    'pages/tobe.js','pages/comparison.js','pages/projects.js'])
    assert.ok(inventory.modules.some(m=>m.path.startsWith(prefix)),'Missing page family '+prefix);
});


test('structured IA evidence and session layout use shared visual owner',()=>{
  const ai=load('domain/internal-ai-pilot.js'),session=load('pages/session-display.js');
  assert.match(shared,/\.aunea-ui-code-pre\{white-space:pre-wrap;overflow-wrap:anywhere;max-height:30rem;overflow:auto\}/);
  assert.match(ai,/<pre class="aunea-ui-code-pre">/);
  assert.doesNotMatch(ai,/<pre style=/);
  assert.match(session,/class="grid g3 aunea-ui-mt-12"/);
  assert.doesNotMatch(session,/class="grid g3" style="margin-top:12px"/);
  // Graph geometry is dynamic data-driven positioning; it must not be replaced with a fixed utility class.
  assert.match(session,/--graph-cols:/);
});


test('PG12 and Projects share the semantic empty-state renderer with unchanged HTML',()=>{
  const vm=require('node:vm');
  const renderer=load('ui/renderer.js'),comparison=load('pages/comparison.js'),
    projects=load('pages/projects.js');
  const source=renderer.match(/function auneaEmptyState\(title,description\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source,'Component owner must exist');
  const escapeHtml=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const build=vm.runInNewContext('('+source+')',{esc:escapeHtml});
  assert.equal(build('Aún no hay proyectos',
    'Registra la decisión de implementación desde Trabajo interno después de presentar los resultados.'),
    '<div class="empty"><h2>Aún no hay proyectos</h2><p>Registra la decisión de implementación desde Trabajo interno después de presentar los resultados.</p></div>');
  assert.equal(build('TO-BE revisado requerido',
    'La comparación se habilita cuando el TO-BE ha pasado revisión humana.'),
    '<div class="empty"><h2>TO-BE revisado requerido</h2><p>La comparación se habilita cuando el TO-BE ha pasado revisión humana.</p></div>');
  const results=load('pages/results.js');
  assert.ok(results.includes("auneaEmptyState('AS-IS confirmado requerido'"));
  assert.ok(results.includes("auneaEmptyState('Resultado oficial pendiente'"));
  assert.equal(build('AS-IS confirmado requerido','Trabajo Interno consume el snapshot de PG09.'),
    '<div class="empty"><h2>AS-IS confirmado requerido</h2><p>Trabajo Interno consume el snapshot de PG09.</p></div>');
  assert.equal(build('Resultado oficial pendiente',
    'Conecta AUNEA Backend y calcula el diagnóstico. La interfaz no reproduce reglas de negocio en JavaScript.'),
    '<div class="empty"><h2>Resultado oficial pendiente</h2><p>Conecta AUNEA Backend y calcula el diagnóstico. La interfaz no reproduce reglas de negocio en JavaScript.</p></div>');
  assert.match(comparison,/auneaEmptyState\('TO-BE revisado requerido'/);
  assert.match(projects,/auneaEmptyState\('Aún no hay proyectos'/);
  assert.equal(build('<riesgo>','Datos & estados'),
    '<div class="empty"><h2>&lt;riesgo&gt;</h2><p>Datos &amp; estados</p></div>');
});


test('PG11 captions inherit common typography and retain only scoped margins',()=>{
  const pg11=load('pages/tobe.js');
  assert.match(pg11,/tobe-context-head[\s\S]*?aunea-ui-section-caption/);
  assert.match(pg11,/tobe-review-section-head aunea-ui-work-surface[\s\S]*?aunea-ui-section-caption/);
  assert.match(base,/\.aunea-ui-section-caption\{[\s\S]*?font-size:var\(--font-small\);/);
  assert.match(local,/\.tobe-context-head \.aunea-ui-section-caption\{margin:0\}/);
  assert.match(local,/\.tobe-review-section-head p\{margin:0\}/);
});

test('PG10 and recommendations reuse the semantic compact empty-message renderer',()=>{
  const vm=require('node:vm');
  const renderer=load('ui/renderer.js'),results=load('pages/results.js');
  const source=renderer.match(/function auneaEmptyMessage\(message\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source,'Paragraph-only empty message must use the existing component owner');
  const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const render=vm.runInNewContext('('+source+')',{esc});
  assert.equal(render('Sin fricciones priorizadas.'),
    '<div class="empty"><p>Sin fricciones priorizadas.</p></div>');
  assert.equal(render('<dato> & problema'),
    '<div class="empty"><p>&lt;dato&gt; &amp; problema</p></div>');
  assert.match(results,/auneaEmptyMessage\('Sin fricciones priorizadas\.'\)/);
  assert.match(results,/auneaEmptyMessage\('El backend no ha devuelto hallazgos para este snapshot\.'\)/);
  assert.doesNotMatch(results,/<div class="empty"><p>Sin fricciones priorizadas\.<\/p><\/div>/);
});


test('PG10 sealed ledger preserves only effective typography declarations',()=>{
  const pg10=load('domain/analysis-workbench.js');
  for(const cls of ['asis-confirmed-data-heading','asis-data-group','asis-data-pairs'])
    assert.ok(pg10.includes(cls),'PG10 snapshot consumer missing: '+cls);
  assert.doesNotMatch(local,/\.asis-confirmed-data-heading>b\{font-size:15px\}/);
  assert.doesNotMatch(local,/\.asis-data-group h4\{font-size:13px/);
  assert.doesNotMatch(local,/\.asis-data-group li\{font-size:12px/);
  assert.match(local,/\.asis-data-group h4\{font-size:14px\}/);
  assert.match(local,/\.asis-data-group li\{font-size:13px;line-height:1.55\}/);
});


test('DS-006/007 notice is rendered once with canonical styles across PG10/PG11',()=>{
  const vm=require('node:vm');
  const renderer=load('ui/renderer.js'),pg10=load('pages/results.js'),pg11=load('pages/tobe.js');
  const source=renderer.match(/function auneaNoticeMessage\(tone,message\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source,'Shared notice renderer must be available');
  const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const build=vm.runInNewContext('('+source+')',{esc});
  assert.equal(build('warn','Confirma el AS-IS antes de comenzar el trabajo interno.'),
    '<div class="notice warn">Confirma el AS-IS antes de comenzar el trabajo interno.</div>');
  assert.equal(build('info','<origen> & resultados'),
    '<div class="notice info">&lt;origen&gt; &amp; resultados</div>');
  assert.equal(build('unknown','Mensaje'),'<div class="notice info">Mensaje</div>');
  assert.match(pg10,/auneaNoticeMessage\('warn','Confirma el AS-IS antes de comenzar el trabajo interno\.'\)/);
  assert.match(pg11,/auneaNoticeMessage\('warn','Confirma el cierre del AS-IS antes de diseñar el proceso futuro\.'\)/);
  assert.match(base,/\.notice\{/,'DS-006 appearance remains in shared base stylesheet');
});


test('nine FROZEN pages have immutable Chromium desktop/mobile hashes, not auto-approved images',()=>{
  const manifest=JSON.parse(load('FROZEN_PAGES.json'));
  const evidence=JSON.parse(load('tests/frozen/frozen-visual-reference-sha256.json'));
  const smoke=load('tests/uat-browser-smoke.cjs');
  assert.equal(evidence.status,'TECHNICAL_FROZEN_REFERENCE_NOT_MANUAL_VISUAL_APPROVAL');
  assert.equal(Object.keys(evidence.sha256).length,18);
  for(const page of manifest.frozen_pages)
    for(const width of [1365,390]){
      const key='frozen-'+page.page_id+'-'+width+'.png';
      assert.match(evidence.sha256[key]||'',/^[a-f0-9]{64}$/,
        'Frozen viewport without a fixed checksum: '+key);
    }
  assert.match(smoke,/FROZEN_TECHNICAL_PIXEL_EQUIVALENCE_PASS/);
  assert.match(smoke,/createHash\('sha256'\)/);
  assert.match(smoke,/frozen-visual-reference-sha256\.json/);
});

// [AUNEA-UAT-DESIGN-COMMON-312] END
