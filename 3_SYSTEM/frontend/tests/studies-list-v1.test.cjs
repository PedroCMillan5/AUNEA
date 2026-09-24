// [AUNEA-UAT-STUDIES-LIST-010] START — Estudios list pagination, actions and viewport
// PURPOSE: Lock the reviewed Estudios list behaviour without reopening FROZEN CRM pages.
// SOURCE: User review 2026-09-22; DEC-042/050/051/055/066; Architecture Contract P05.
// INPUTS: ui/shell.js and ui-system.css.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: MEDIUM.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shell=read('ui/shell.js');
const css=read('ui-system.css');

test('Estudios paginates only after ten records with numbered navigation',()=>{
  assert.match(shell,/const STUDY_PAGE_SIZE=10/);
  assert.match(shell,/Math\.ceil\(rows\.length\/STUDY_PAGE_SIZE\)/);
  assert.match(shell,/data-study-page/);
  assert.match(shell,/state\.studyPage/);
  assert.match(shell,/paged\.totalPages>1/);
});

test('Estudios uses the same floating three-dot menu pattern as finalized CRM pages',()=>{
  assert.match(shell,/function openStudyActionMenu/);
  assert.match(shell,/className='row-menu-popover company-floating-menu'/);
  assert.match(shell,/data-study-actions/);
  assert.match(shell,/getBoundingClientRect\(\)/);
  assert.match(shell,/if\(top\+menu\.offsetHeight>window\.innerHeight-8\)top=Math\.max\(8,r\.top-menu\.offsetHeight-gap\)/);
  assert.match(shell,/data-study-menu-open/);
  assert.match(shell,/data-study-menu-work/);
  assert.match(shell,/data-study-menu-advance/);
});

test('Estudios keeps governed navigation, lifecycle advance and pagination contracts',()=>{
  assert.match(shell,/state\.activeEngagementId=eng\.id/);
  assert.match(shell,/state\.activePage='diagnostico'/);
  assert.match(shell,/state\.activePage='resultados'/);
  assert.match(shell,/advanceEngagementTo\(eng,next,'avance manual desde Estudios'\)/);
  assert.match(shell,/document\.querySelectorAll\('\[data-study-page\]'\)/);
});

test('Estudios locks vertical document scroll and keeps the content width',()=>{
  assert.match(shell,/studies-screen-marker/);
  assert.match(css,/html:has\(\.studies-screen-marker\),body:has\(\.studies-screen-marker\)\{[^}]*overflow:hidden!important/);
  assert.match(css,/\.main:has\(\.studies-screen-marker\)>\.content\{[^}]*width:100%;max-width:1620px/);
  assert.match(css,/\.content:has\(\.studies-screen-marker\) \.table-wrap\{overflow-x:auto;overflow-y:hidden\}/);
});
// [AUNEA-UAT-STUDIES-LIST-010] END
