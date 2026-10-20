// [AUNEA-UAT-DEMAND-STAGE-020] START — S03 Demanda, volumen y servicio · REVIEW
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const stages=read('pages/diagnostic-stages.js'),renderer=read('ui/renderer.js'),css=read('ui-system.css');
test('DF021 uses the established numeric hook while DF022 owns its period and DF021 persists scalar',()=>{const b=stages.slice(stages.indexOf('function habitualVolumeBlock'),stages.indexOf('function peakVolumeBlock'));assert.match(b,/data-number-value="\$\{f21\.Field_ID\}"/);assert.match(b,/data-answer="\$\{f22\.Field_ID\}"/);assert.doesNotMatch(b,/data-number-unit="\$\{f21\.Field_ID\}"/);assert.match(renderer,/if\(fid==='DF021'\)\{setAnswer\(fid,value\);return\}/)});
test('numeric capture never persists NaN or an empty unit-only ghost answer',()=>{assert.match(renderer,/const safeNumericValue=el=>/);assert.match(renderer,/Number\.isFinite\(native\)/);assert.match(renderer,/Number\.isFinite\(fallback\)\?fallback:null/);assert.match(renderer,/if\(value===''&&!mode\)\{setAnswer\(fid,''\);return\}/)});
test('S03 compound controls and dropdown overlays are page-scoped and visible',()=>{assert.match(stages,/diagnostic-stage-\$\{String\(stage\.Stage_ID\)\.toLowerCase\(\)\}/);assert.match(css,/\.content:has\(\.diagnostic-stage-s03\) \.field:has\(\.aunea-select\[open\]\)\{position:relative;z-index:120\}/);assert.match(css,/\.content:has\(\.diagnostic-stage-s03\) \.aunea-select-menu\{z-index:140;max-height:240px\}/);assert.match(css,/\.content:has\(\.diagnostic-stage-s03\) \.volume-sentence\{display:grid;grid-template-columns:/)});
test('S03 remains REVIEW/open',()=>{const r=JSON.parse(read('FROZEN_PAGES.json'));assert.equal(r.frozen_pages.some(x=>x.page_id==='demanda-volumen-servicio'),false)});
// [AUNEA-UAT-DEMAND-STAGE-020] END

test('DF025 is always askable in S03 and exposes an explicit no-SLA state',()=>{
  assert.match(stages,/function slaTargetBlock\(f,e\)/);
  assert.match(stages,/\{value:'NONE',label:'No existe'\}/);
  assert.match(stages,/data-sla-mode="\$\{f\.Field_ID\}"/);
  const noReask=read('domain/no-reask.js');
  assert.match(noReask,/f\.Field_ID==='DF025'&&f\.Stage_ID==='S03'\)return true/);
});

test('DF025 uses a compact existence-first SLA layout and hides value controls when SLA does not exist',()=>{
  assert.match(stages,/class="demand-sla-head"/);
  assert.match(stages,/data-sla-mode="\$\{f\.Field_ID\}"/);
  assert.match(stages,/data-sla-value-wrap="\$\{f\.Field_ID\}"/);
  assert.match(renderer,/document\.querySelectorAll\('\[data-sla-mode\]'\)/);
  assert.match(css,/\.demand-sla-head\{/);
  assert.match(css,/\.demand-sla-value\[hidden\]\{display:none!important\}/);
});

test('DF028 percentage hides period; count reveals a period selector',()=>{
  assert.match(renderer,/percentOrCount=c==='NUMBER_PERCENT_OR_COUNT'/);
  assert.match(renderer,/data-percent-count-unit/);
  assert.match(renderer,/data-count-period-wrap/);
  assert.match(renderer,/period=unit==='percent'\?'':rawPeriod/);
  assert.match(css,/\.percent-count-control \.number-count-period\[hidden\]\{display:none!important\}/);
});

// [AUNEA-UAT-DEMAND-SLA-LAYOUT-146] START — SLA meaning and demand layout regression.
test('PG03 explains SLA vs actual elapsed time and does not certify per-case compliance',()=>{
  assert.match(stages,/function s03ServiceTimeComparisonHtml\(e\)/);
  assert.match(stages,/SLA \(DF025\)/);
  assert.match(stages,/End-to-end \(DF026\)/);
  assert.match(stages,/no demuestra el cumplimiento de todos los casos/);
  assert.match(stages,/data-s03-service-time-compare/);
  const state=read('core/state.js');
  assert.match(state,/fid==='DF025'\|\|fid==='DF026'/);
  assert.match(state,/refreshS03ServiceTimeComparison\(e\)/);
});
test('PG03 seasonal classification and its contextual detail have aligned adjacent columns',()=>{
  assert.match(css,/\.demand-seasonality-pair\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.demand-seasonality-pair>\.detail-wrap\{margin:0;width:100%;min-width:0\}/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.demand-seasonality-pair\{grid-template-columns:1fr\}/);
});
test('DF024 actually renders as a full-width two-control pair even with answered-inline wrapping',()=>{
  const noReask=read('domain/no-reask.js');
  assert.match(noReask,/const wide=\['DF024','DF094','DF095'\]/);
  assert.match(renderer,/class="demand-seasonality-pair"/);
  assert.match(renderer,/data-seasonality-detail="\$\{fid\}"/);
});
test('PG03 backlog uses the left column beneath elapsed end-to-end time',()=>{
  assert.match(css,/\.field\[data-field="DF027"\]\{grid-column:1\}/);
  assert.match(stages,/if\(f\.Field_ID==='DF025'\)/);
  assert.match(stages,/out\.push\(renderQuestion\(f,e\)\)/);
});
test('comparison uses only existing DF025 and DF026 with no added capture or SLA business rule',()=>{
  const section=stages.slice(stages.indexOf('function s03ServiceTimeComparisonHtml'),stages.indexOf('function slaTargetBlock'));
  assert.match(section,/e\?\.answers\?\.DF025/);
  assert.match(section,/e\?\.answers\?\.DF026/);
  assert.doesNotMatch(section,/setAnswer|writeThroughToOwner|Math\.round/);
});
// [AUNEA-UAT-DEMAND-SLA-LAYOUT-146] END
