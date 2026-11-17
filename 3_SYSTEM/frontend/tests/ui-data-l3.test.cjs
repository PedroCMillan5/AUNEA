// [AUNEA-UAT-UI-DATA-L3-483] START — Unified data presentation L3.
'use strict';
// PURPOSE: Check page-owned tables/metrics, filter-only DOM, accessible diagram/inspector regions.
// SOURCE: UI/UX master contract L3, DEC-050/055/056/075, canonical ProcessStep/Project owners.
// INPUTS: production source blocks; OUTPUTS: deterministic non-FROZEN contract assertions.
// SIDE_EFFECTS: none. CHANGE_RISK: LOW.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const renderer=read('ui/renderer.js'),core=read('core/state.js');
const block=(src,id)=>src.match(new RegExp('// \\['+id+'\\] START[\\s\\S]*?// \\['+id+'\\] END'))?.[0];
const data=block(renderer,'AUNEA-FE-UI-DATA-L3-481');
const regions=block(core,'AUNEA-FE-UI-REGION-L3-482');
assert.ok(data&&regions,'L3 must execute the actual shared owners');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=(document)=>vm.runInNewContext(data+'\n'+regions+
  '\n;({auneaUiTableRow,auneaUiDataTable,auneaUiMetric,auneaUiTableSearch,auneaUiFilterTable,auneaUiRegionStart,auneaUiRegionEnd})',
  {esc,attr:esc,document});
test('read-only table rows escape source values while preserving real zeros and owner-generated actions',()=>{
 const a=api();
 assert.equal(a.auneaUiTableRow(['Paso <origen>',0,'',null]),
  '<tr><td>Paso &lt;origen&gt;</td><td>0</td><td></td><td></td></tr>');
 const select='<button data-pg12-source="S1">Factura</button>';
 const row=a.auneaUiTableRow([select,'Fase & datos',0],[0]);
 assert.match(row,/^<tr><td><button data-pg12-source="S1">Factura<\/button><\/td>/);
 assert.match(row,/Fase &amp; datos/);
 assert.match(row,/<td>0<\/td>/);
 assert.throws(()=>a.auneaUiTableRow('no es array'),/requires arrays/);
 const numeric=a.auneaUiTableRow(['Trabajo',0,'—'],[],[1]);
 assert.match(numeric,/<td class="aunea-ui-numeric">0<\/td>/);
 assert.doesNotMatch(numeric,/<td class="aunea-ui-numeric">Trabajo/);
});
test('tables use shared DOM and keep page-owned empty messages with no invented rows',()=>{
 const a=api();
 const headers=['Actividad','Horas (h)'],row=a.auneaUiTableRow(['Registrar',0]);
 const table=a.auneaUiDataTable(headers,row,{id:'sourceTable'});
 assert.match(table,/^<div class="table-wrap"><table class="data-table" id="sourceTable">/);
 assert.match(table,/<thead><tr><th>Actividad<\/th><th>Horas \(h\)<\/th><\/tr><\/thead>/);
 assert.match(table,/<tbody><tr><td>Registrar<\/td><td>0<\/td><\/tr><\/tbody>/);
 const empty=a.auneaUiDataTable(headers,'',{emptyHtml:'<tr><td colspan="2">Sin registros reales todavía.</td></tr>'});
 assert.match(empty,/Sin registros reales todavía/);
 assert.throws(()=>a.auneaUiDataTable([],row),/requires headings/);
 assert.match(a.auneaUiDataTable(headers,row,{numericColumns:[1]}),
  /<th class="aunea-ui-numeric">Horas \(h\)<\/th>/);
 assert.match(read('styles.css'),/\.data-table :is\(th,td\)\.aunea-ui-numeric\{text-align:right;font-variant-numeric:tabular-nums\}/);
 const project=read('pages/projects.js');
 assert.ok((project.match(/auneaUiDataTable\(/g)||[]).length>=2);
 assert.ok((project.match(/auneaUiTableRow\(/g)||[]).length>=2);
});
test('PG10/PG12 metrics share two existing visual variants without treating zero as missing',()=>{
 const a=api();
 assert.equal(a.auneaUiMetric('Espera anual AS-IS',0,'Sin ahorro derivado'),
  '<div class="pg12-metric"><b>Espera anual AS-IS</b><strong>0</strong><small>Sin ahorro derivado</small></div>');
 assert.equal(a.auneaUiMetric('Pasos activos',3,'2 riesgos','overview'),
  '<div class="card metric"><small>Pasos activos</small><strong>3</strong><span>2 riesgos</span></div>');
 assert.throws(()=>a.auneaUiMetric('x',0,'n','inventada'),/Unsupported metric/);
 assert.match(read('pages/results.js'),/auneaUiMetric\('Pasos activos'/);
 assert.match(read('pages/comparison.js'),/auneaUiMetric\(title,value,note,'pg12'\)/);
});
test('filter is UI-only, reversible, accent-insensitive, with honest no-match message',()=>{
 const rows=[{textContent:'Registrar la factura',hidden:false},
  {textContent:'Aprobación y riesgo',hidden:false}];
 const message={hidden:true},doc={querySelector:key=>key==='[data-aunea-table-empty="pg12ChangesTable"]'?message:null};
 const a=api(doc),table={id:'pg12ChangesTable',querySelectorAll:q=>q==='tbody tr'?rows:[]};
 const original=rows.map(x=>x.textContent);
 assert.match(a.auneaUiTableSearch('pg12ChangesTable','Buscar actividad',''),/type="search"/);
 assert.match(a.auneaUiTableSearch('pg12ChangesTable','Buscar actividad',''),/data-aunea-table-filter="pg12ChangesTable"/);
 assert.equal(a.auneaUiFilterTable(table,'APROBACION'),1);
 assert.deepEqual(rows.map(x=>x.hidden),[true,false]);
 assert.equal(message.hidden,true);
 assert.equal(a.auneaUiFilterTable(table,'sin resultados'),0);
 assert.equal(message.hidden,false);
 assert.equal(a.auneaUiFilterTable(table,''),2);
 assert.deepEqual(rows.map(x=>x.hidden),[false,false]);
 assert.equal(message.hidden,true);
 assert.deepEqual(rows.map(x=>x.textContent),original,'filter does not alter source text');
 assert.throws(()=>a.auneaUiTableSearch('../other','Buscar'),/Invalid/);
 const view=read('pages/comparison.js');
 assert.match(view,/__auneaPg12TableQuery/);
 assert.match(view,/auneaUiFilterTable\(document.getElementById\('pg12ChangesTable'\)/);
 assert.doesNotMatch(data,/saveState\(|markDirty\(|currentEng\(|projectSource\(/);
});
test('inspector/diagram share accessible region semantics without duplicating engines',()=>{
 const a=api();
 const inspector=a.auneaUiRegionStart('inspector',
  {id:'tobeInspector',className:'tobe-inspector',ariaLabel:'Decisión TO-BE por actividad'})+
  '<p>Uno</p>'+a.auneaUiRegionEnd('inspector');
 assert.match(inspector,/^<section id="tobeInspector" class="tobe-inspector" aria-label="Decisión TO-BE por actividad" data-aunea-ui-region="inspector">/);
 assert.match(inspector,/<\/section>$/);
 const diagram=a.auneaUiRegionStart('diagram',
  {className:'pg12-native-map',ariaLabel:'Mapa original con cambios'})+
  '<svg></svg>'+a.auneaUiRegionEnd('diagram');
 assert.match(diagram,/data-aunea-ui-region="diagram"/);
 assert.match(diagram,/<\/div>$/);
 assert.throws(()=>a.auneaUiRegionStart('unknown',{ariaLabel:'x'}),/Unsupported/);
 assert.throws(()=>a.auneaUiRegionStart('diagram',{}),/requires an accessible label/);
 const pg11=read('pages/tobe.js'),pg12=read('pages/comparison.js');
 assert.ok((pg11.match(/auneaUiRegionStart\('diagram'/g)||[]).length>=1);
 assert.ok((pg11.match(/auneaUiRegionStart\('inspector'/g)||[]).length>=1);
 assert.ok((pg12.match(/auneaUiRegionStart\('diagram'/g)||[]).length>=1);
 assert.match(pg12,/processGraphHtml\(/,'the single AS-IS graph owner remains reused');
 assert.doesNotMatch(data+/ /+regions,/processGraphData\(/);
});
test('FROZEN owners stay unchanged and secondary filters do not write canonical rows',()=>{
 const projects=read('pages/projects.js'),comparison=read('pages/comparison.js');
 assert.match(core,/function section\(title,sub,body,actions=''\)/);
 assert.match(core,/function workspace\(main,inspector,opts=\{\}\)/);
 assert.match(projects,/projectLearning\(p\)/);
 assert.match(comparison,/__auneaPg12SelectedSource/);
 assert.doesNotMatch(data,/localStorage|sessionStorage|saveState\(|markDirty\(|fetch\(/);
 assert.doesNotMatch(regions,/localStorage|sessionStorage|saveState\(|markDirty\(|fetch\(/);
});
// [AUNEA-UAT-UI-DATA-L3-483] END
