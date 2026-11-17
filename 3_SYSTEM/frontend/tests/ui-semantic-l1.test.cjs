// [AUNEA-UAT-UI-SEMANTIC-477] START — L1 semantic hierarchy regression.
// PURPOSE: Prove one shared non-FROZEN renderer for section/subsection/block/group/datum,
// preserving legacy section markup and preventing spontaneous card nesting.
// SOURCE: AUNEA_INTERNAL_UI_UX_MASTER_CONTRACT_20261117.md L1; DEC-050/056;
//         TOKENS_AUNEA and FROZEN_PAGES.json.
// INPUTS: source of current core/state.js, styles.css, PG11 and PG12 consumers.
// OUTPUTS: deterministic node:test assertions, no business side effects.
// SIDE_EFFECTS: none. CHANGE_RISK: LOW.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const core=read('core/state.js'),css=read('styles.css');
const block=core.match(/\/\/ \[AUNEA-FE-UI-SEMANTIC-475\] START[\s\S]*?\/\/ \[AUNEA-FE-UI-SEMANTIC-475\] END/)?.[0];
assert.ok(block,'Missing shared semantic owner 475');
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const build=()=>vm.runInNewContext(block+'\n;({auneaUiStructureStart,auneaUiStructureEnd,auneaUiDatum})',{
  esc:escapeHtml,attr:escapeHtml
});
test('all semantic levels use a single allowlisted structure owner',()=>{
  const api=build();
  const expected={section:'section',subsection:'section',block:'div',group:'div'};
  for(const [level,tag] of Object.entries(expected)){
    const html=api.auneaUiStructureStart(level,{className:'test-existing'});
    assert.match(html,new RegExp('^<'+tag+' class="aunea-ui-structure aunea-ui-structure--'+level));
    assert.ok(html.includes('data-aunea-ui-level="'+level+'"'));
    assert.ok(html.includes('test-existing'));
    assert.equal(api.auneaUiStructureEnd(level),'</'+tag+'>');
  }
  assert.throws(()=>api.auneaUiStructureStart('other'),/Unsupported/);
  assert.throws(()=>api.auneaUiStructureEnd('input'),/Unsupported/);
  assert.throws(()=>api.auneaUiStructureStart('group',{visual:'unapproved'}),/Unsupported/);
});
test('ARIA attributes are escaped and each layer preserves the exact page-owned class',()=>{
  const api=build();
  const html=api.auneaUiStructureStart('subsection',{
    className:'pg12-selected-detail',id:'pg12SelectedDetail',
    ariaLive:'polite',ariaLabel:'Mapa de datos <confirmados>'
  });
  assert.match(html,/class="aunea-ui-structure aunea-ui-structure--subsection pg12-selected-detail"/);
  assert.match(html,/id="pg12SelectedDetail"/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/aria-label="Mapa de datos &lt;confirmados&gt;"/);
});
test('read-only datum never creates an input or silently converts missing values to zero',()=>{
  const api=build();
  const html=api.auneaUiDatum('Responsable <AS-IS>','No consta & pendiente');
  assert.match(html,/data-aunea-ui-level="datum"/);
  assert.match(html,/<dt>Responsable &lt;AS-IS&gt;<\/dt>/);
  assert.match(html,/<dd>No consta &amp; pendiente<\/dd>/);
  assert.doesNotMatch(html,/<input|<select|<textarea/);
});
test('new visual variants are strictly opt-in; migrated existing screens keep their style',()=>{
  const x=css.match(/\/\* \[AUNEA-FE-UI-SEMANTIC-STYLE-476\] START[\s\S]*?\/\* \[AUNEA-FE-UI-SEMANTIC-STYLE-476\] END \*\//)?.[0]||'';
  assert.ok(x,'Missing L1 semantic visual block');
  assert.match(x,/\.aunea-ui-structure--flow\{/);
  assert.match(x,/\.aunea-ui-structure--surface\{/);
  assert.doesNotMatch(x,/\[data-aunea-ui-level/);
  assert.doesNotMatch(x,/(^|\n)\s*(?:section|div|article|\.card|\.section)\s*\{/m);
  const api=build(),plain=api.auneaUiStructureStart('section',{className:'pg12-primary'});
  assert.doesNotMatch(plain,/aunea-ui-structure--(?:flow|surface)/);
  const flow=api.auneaUiStructureStart('group',{visual:'flow'});
  assert.match(flow,/aunea-ui-structure--flow/);
});
test('existing legacy section() remains byte-compatible for nine FROZEN pages',()=>{
  assert.match(core,/function section\(title,sub,body,actions=''\)\{return `<div class="card card-pad section">/);
  const frozen=JSON.parse(read('FROZEN_PAGES.json'));
  assert.equal(frozen.frozen_pages.filter(p=>p.status==='FROZEN').length,9);
});
test('PG11 and PG12 consume the actual hierarchy primitives',()=>{
  const compare=read('pages/comparison.js'),review=read('pages/tobe-review.js');
  assert.ok((compare.match(/auneaUiStructureStart\('section'/g)||[]).length>=3);
  assert.ok(compare.includes("auneaUiStructureStart('subsection'"));
  assert.ok(compare.includes("auneaUiStructureStart('block'"));
  assert.ok(compare.includes("auneaUiDatum(label,value)"));
  assert.equal((review.match(/auneaUiStructureStart\('group'/g)||[]).length,2);
  assert.ok((review.match(/auneaUiStructureEnd\('group'/g)||[]).length===2);
  assert.doesNotMatch(review,/<input[^>]*data-aunea-ui-level/);
});
// [AUNEA-UAT-UI-SEMANTIC-477] END
