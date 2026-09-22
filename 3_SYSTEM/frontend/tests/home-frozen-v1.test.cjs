// [AUNEA-UAT-HOME-FROZEN-010] START — Finalized CRM Inicio
// PURPOSE: Freeze the approved CRM landing page after removing its document vertical scroll.
// SOURCE: Explicit user closure 2026-09-22; DEC-066.
// INPUTS: Home page block in ui/shell.js and its page-scoped CSS block.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: CRITICAL.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function block(text,start,end){
  const a=text.indexOf(start),b=text.indexOf(end);
  assert.ok(a>=0&&b>=0,'Frozen Inicio markers must remain present');
  return text.slice(a,b+end.length);
}

test('FINALIZED Inicio page block is byte-for-byte frozen',()=>{
  const src=read('ui/shell.js');
  const id='AUNEA-FE-'+'PAGE-HOME-010';
  assert.equal(
    block(src,'// ['+id+'] START','// ['+id+'] END'),
    read('tests/frozen/home-page-v1.js.snapshot'),
    'Inicio CRM está FINALIZADA/FROZEN: no se puede modificar su bloque de página.'
  );
});

test('FINALIZED Inicio styles are byte-for-byte frozen',()=>{
  const css=read('ui-system.css');
  const id='AUNEA-FROZEN-'+'PAGE-HOME-001';
  assert.equal(
    block(css,'/* ['+id+'] START','/* ['+id+'] END */'),
    read('tests/frozen/home-style-v1.css.snapshot'),
    'Inicio CRM está FINALIZADA/FROZEN: no se puede modificar su bloque CSS.'
  );
});

test('FINALIZED Inicio has no vertical document scroll',()=>{
  const page=read('tests/frozen/home-page-v1.js.snapshot');
  const css=read('tests/frozen/home-style-v1.css.snapshot');
  assert.match(page,/home-screen-marker/);
  assert.match(css,/html:has\(\.home-screen-marker\),body:has\(\.home-screen-marker\)\{[^}]*overflow:hidden!important/);
  assert.match(css,/body:has\(\.home-screen-marker\) \.app-shell\{[^}]*height:100vh[^}]*overflow:hidden/);
});
// [AUNEA-UAT-HOME-FROZEN-010] END
