const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');
const project=fs.readFileSync(path.join(root,'domain/project.js'),'utf8');
const state=fs.readFileSync(path.join(root,'core/state.js'),'utf8');
const shell=fs.readFileSync(path.join(root,'ui/shell.js'),'utf8');

test('shared shell uses the official logo and Pedro Carrasco consultant identity',()=>{
  assert.match(html,/assets\/brand\/Logo\.png/);
  assert.doesNotMatch(html,/aunea-system-dark\.jpg/);
  assert.match(html,/<b>Pedro Carrasco<\/b><small>Consultor<\/small>/);
  assert.match(html,/class="avatar">PC</);
  assert.match(html,/id="globalSearch"/);
});

test('workspace pearl covers both main and content surfaces without white outer gutters',()=>{
  assert.match(css,/\.main\{background:#E6E6E6\}/);
  assert.match(css,/\.content\{[^}]*max-width:none[^}]*background:#E6E6E6/);
});

test('home navigation tiles stay white without overriding standard primary buttons',()=>{
  assert.match(css,/\.content \.hero-action,\.content \.hero-action\.primary\{background:#fff;color:var\(--ink\);border-color:var\(--line\)\}/);
  assert.match(css,/\.content \.hero-action \.arrow,\.content \.hero-action\.primary \.arrow\{color:var\(--ink\)\}/);
  assert.doesNotMatch(css,/\.content \.btn[^\{]*\{background:#fff/);
});

test('select styling is centralized and all form controls preserve rounded geometry',()=>{
  assert.match(css,/select,\.field select,\.filter-row select,\.compound-control select,\.entity-picker select/);
  assert.match(css,/border-radius:var\(--radius-sm\)/);
  assert.match(css,/select:hover/);
  assert.match(css,/select:focus/);
  assert.match(css,/select:disabled/);
  assert.match(css,/select option/);
  assert.match(css,/\.field-pending select/);
  assert.match(css,/\.field input,\.field textarea,\.filter-row input,\.compound-control input,\.entity-picker input\{border-radius:var\(--radius-sm\)\}/);
});

test('project creation persists the AUNEA owner independently from client contacts',()=>{
  assert.match(project,/AUNEA_DEFAULT_PROJECT_OWNER=Object\.freeze\(\{id:'pedro-carrasco',name:'Pedro Carrasco',role:'Consultor'\}\)/);
  assert.match(project,/contactIds:\[\.\.\.\(e\.contactIds\|\|\[\]\)\]/);
  assert.match(project,/auneaOwner:\{\.\.\.AUNEA_DEFAULT_PROJECT_OWNER\}/);
});
