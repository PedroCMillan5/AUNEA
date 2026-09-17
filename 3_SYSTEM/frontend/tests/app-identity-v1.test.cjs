const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');
const project=fs.readFileSync(path.join(root,'domain/project.js'),'utf8');

test('shared shell uses the official logo and Pedro Carrasco consultant identity',()=>{
  assert.match(html,/assets\/brand\/Logo\.png/);
  assert.doesNotMatch(html,/aunea-system-dark\.jpg/);
  assert.match(html,/<b>Pedro Carrasco<\/b><small>Consultor<\/small>/);
  assert.match(html,/class="avatar">PC</);
  assert.match(html,/id="globalSearch"/);
});

test('select styling is centralized for every native dropdown state',()=>{
  assert.match(css,/select,\.field select,\.filter-row select,\.compound-control select,\.entity-picker select/);
  assert.match(css,/select:hover/);
  assert.match(css,/select:focus/);
  assert.match(css,/select:disabled/);
  assert.match(css,/select option/);
  assert.match(css,/\.field-pending select/);
});

test('project creation persists the AUNEA owner independently from client contacts',()=>{
  assert.match(project,/AUNEA_DEFAULT_PROJECT_OWNER=Object\.freeze\(\{id:'pedro-carrasco',name:'Pedro Carrasco',role:'Consultor'\}\)/);
  assert.match(project,/contactIds:\[\.\.\.\(e\.contactIds\|\|\[\]\)\],auneaOwner:\{\.\.\.AUNEA_DEFAULT_PROJECT_OWNER\}/);
});
