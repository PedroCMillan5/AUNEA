// [AUNEA-UAT-UI-ACTION-OWNERSHIP-490] START — enforce common visual ownership.
// SOURCE: AUNEA UI/UX Master v0.5, DS-017, DEC-050/056; F6 screenshot PG10.
// SCOPE: non-FROZEN pages only; never retrofit FROZEN markup or styling.
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),
  fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pageModules=[
  'results.js','results-analysis.js','results-official.js','tobe.js',
  'tobe-review.js','tobe-global.js','tobe-flow.js','comparison.js','projects.js'
];
const actionLinks=text=>{
  const matches=[...text.matchAll(/<a\b[^>]*class="([^"]+)"[^>]*>/g)];
  return matches.filter(m=>m[1].split(/\s+/).includes('btn')).map(m=>({html:m[0],classes:m[1]}));
};
test('styled navigational links opt in to one shared action contract across non-FROZEN pages',()=>{
  let total=0;
  for(const filename of pageModules){
    const links=actionLinks(read('pages/'+filename));total+=links.length;
    for(const link of links){
      assert.match(link.html,/\baunea-ui-action-link\b/,filename+': missing shared anchor/button visual owner');
      assert.match(link.html,/\baunea-ui-after-content\b/,
        filename+': standalone action after content must use shared gap owner');
    }
  }
  assert.ok(total>=1,'PG10 diagnostic source link must be audited');
});
test('one opt-in CSS owner removes underline and uses a shared spacing token, not page-specific margins',()=>{
 const css=read('styles.css'),local=read('ui-system.css');
 assert.match(css,/\[AUNEA-FE-UI-ACTION-LINK-489\] START/);
 assert.match(css,/a\.aunea-ui-action-link\.btn\{text-decoration:none\}/);
 assert.match(css,/\.aunea-ui-after-content\{margin-block-start:var\(--space-3\)\}/);
 assert.match(css,/--space-3:12px/);
 assert.doesNotMatch(local,/AUNEA-FE-UI-ACTION-LINK-489/,
   'Shared action owner must not be copied into page-specific CSS');
});
test('PG10 preserves its original source navigation target, semantics and reusable visual',()=>{
 const page=read('pages/results.js');
 assert.match(page,/<a class="btn btn-outline aunea-ui-action-link aunea-ui-after-content" href="#asis-source-step-/);
 assert.match(page,/attr\(String\(firstStep\)\)/,'No new navigation or data owner');
 assert.match(page,/Ver punto de análisis en esta página/);
 assert.match(page,/document\.querySelectorAll\('\.asis-point-review a\[href\^="#asis-source-step-"\]/);
});
test('FROZEN source pages remain independent from the opt-in action link contract',()=>{
 for(const filename of ['crm-companies.js','crm-contacts.js','crm-interactions.js',
 'crm-opportunities.js','session-display.js','diagnostic-stages.js']){
  assert.doesNotMatch(read('pages/'+filename),/aunea-ui-action-link|aunea-ui-after-content/,
   filename+' is protected by DEC-056');
 }
});
// [AUNEA-UAT-UI-ACTION-OWNERSHIP-490] END
