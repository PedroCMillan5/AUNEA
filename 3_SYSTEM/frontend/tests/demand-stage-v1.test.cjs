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
  assert.match(stages,/data-number-mode="\$\{f\.Field_ID\}"/);
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
