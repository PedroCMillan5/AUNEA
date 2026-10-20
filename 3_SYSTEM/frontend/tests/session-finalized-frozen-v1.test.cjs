// [AUNEA-UAT-SESSION-FINALIZED-FROZEN-020] START — Finalized Estudios/S01/S02/S08
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
// Snapshot marker strings are assembled to keep the Block_ID audit focused on live START/END comments.
function block(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>=0,'Frozen markers missing: '+start);return text.slice(a,b+end.length)}
test('FINALIZED Estudios source and scoped styles are frozen',()=>{const s=read('ui/shell.js'),c=read('ui-system.css');assert.equal(block(s,'// ['+'AUNEA-FE-PAGE-STUDIES-010'+'] START','// ['+'AUNEA-FE-PAGE-STUDIES-010'+'] END'),read('tests/frozen/studies-page-v1.js.snapshot'));assert.equal(block(c,'/* ['+'AUNEA-FE-STUDIES-LIST-VIEWPORT-010'+'] START','/* ['+'AUNEA-FE-STUDIES-LIST-VIEWPORT-010'+'] END */'),read('tests/frozen/studies-style-v1.css.snapshot'))});
test('FINALIZED S01 Contexto y objetivos contract is frozen',()=>{const s=read('pages/diagnostic-stages.js');assert.equal(block(s,'// ['+'AUNEA-FROZEN-STAGE-S01-001'+'] START','// ['+'AUNEA-FROZEN-STAGE-S01-001'+'] END'),read('tests/frozen/session-s01-v1.js.snapshot'));assert.match(s,/S01:'I90-01'/)});
test('FINALIZED S02 Alcance del proceso contract is frozen',()=>{const s=read('pages/diagnostic-stages.js');assert.equal(block(s,'// ['+'AUNEA-FROZEN-STAGE-S02-001'+'] START','// ['+'AUNEA-FROZEN-STAGE-S02-001'+'] END'),read('tests/frozen/session-s02-v1.js.snapshot'));assert.match(s,/stage\.Stage_ID==='S02'\?engagementBusinessAreaBlock\(e\):''/);assert.match(s,/S02:'I90-02'/)});
test('FINALIZED S08 keeps DF089 full width',()=>{const c=read('ui-system.css'),s=read('pages/diagnostic-stages.js');assert.equal(block(c,'/* ['+'AUNEA-FROZEN-STAGE-S08-001'+'] START','/* ['+'AUNEA-FROZEN-STAGE-S08-001'+'] END */'),read('tests/frozen/session-s08-v1.css.snapshot'));assert.match(c,/\.field\[data-field="DF089"\]\{grid-column:1\/-1\}/);assert.match(s,/S08:'I90-08'/)});
test('reopened S08 defect fix adds only page-scoped spacing outside the frozen width block',()=>{
  const css=read('ui-system.css');
  assert.match(css,/AUNEA-FE-S08-DEFECT-SPACING-010/);
  assert.match(css,/body:has\(\[data-diagnostic-stage="S08"\]\) \.field \.detail-wrap/);
  assert.match(css,/margin-top:12px/);
  assert.match(css,/\.s08-detail-row/);
});

test('registry freezes the four approved pages but not S03',()=>{const r=JSON.parse(read('FROZEN_PAGES.json')),ids=new Set(r.frozen_pages.filter(x=>x.status==='FROZEN').map(x=>x.page_id));for(const id of ['estudios','contexto-objetivos','alcance-proceso','estado-objetivo-restricciones'])assert.ok(ids.has(id),id);assert.ok(!ids.has('demanda-volumen-servicio'))});
// [AUNEA-UAT-SESSION-FINALIZED-FROZEN-020] END


test('S08 filters only relevant DF010 context per field without changing canonical owner answers',()=>{
  const vm=require('node:vm'),renderer=read('ui/renderer.js');
  const from=renderer.indexOf('function s08Recommendation('),to=renderer.indexOf('function renderControl(',from);
  assert.ok(from>=0&&to>from,'isolated S08 context functions exist');
  const labels={COMPLIANCE:'Legal / compliance',OWNERSHIP:'Ownership / propiedad de datos',PLATFORM:'Herramientas / plataforma'};
  const ctx={
    selectedValues:v=>Array.isArray(v)?v:[],
    labelFrom:(name,v)=>labels[v]||v,
    esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),
    attr:s=>String(s).replace(/"/g,'&quot;')
  };
  vm.createContext(ctx);vm.runInContext(renderer.slice(from,to),ctx);
  const e={answers:{DF010:['COMPLIANCE','OWNERSHIP','PLATFORM']}},before=JSON.stringify(e);
  const context=id=>Array.from(ctx.s08RelevantContextValues(id,e));
  assert.deepEqual(context('DF087'),['COMPLIANCE','OWNERSHIP','PLATFORM']);
  assert.deepEqual(context('DF088'),['COMPLIANCE']);
  assert.deepEqual(context('DF089'),['PLATFORM']);
  assert.deepEqual(context('DF090'),['COMPLIANCE','OWNERSHIP']);
  assert.deepEqual(context('DF091'),[]);
  const html=ctx.s08PriorContext('DF089',e,['KEEP_EXISTING'],[{value:'KEEP_EXISTING',label:'Mantener herramientas actuales'}]);
  assert.match(html,/Contexto previo relevante/);
  assert.match(html,/PG01 \/ DF010/);
  assert.match(html,/Herramientas \/ plataforma/);
  assert.doesNotMatch(html,/Legal \/ compliance|Ownership \/ propiedad de datos/);
  assert.match(html,/Opciones marcadas/);
  assert.match(html,/Recomendación/);
  const other=ctx.s08PriorContext('DF091',e,['TRAINING'],[{value:'TRAINING',label:'Necesidad de formación'}]);
  assert.doesNotMatch(other,/Contexto previo relevante|Sin restricciones previas/);
  assert.match(other,/Opciones marcadas/);
  assert.match(other,/Necesidad de formación/);
  assert.match(other,/Recomendación/);
  assert.equal(JSON.stringify(e),before,'presentational context does not write to owners');
});
test('S08 stays frozen at approved layout baseline while only renderer context is refined',()=>{
  const c=read('ui-system.css');
  assert.equal(block(c,'/* ['+'AUNEA-FROZEN-STAGE-S08-001'+'] START','/* ['+'AUNEA-FROZEN-STAGE-S08-001'+'] END */'),read('tests/frozen/session-s08-v1.css.snapshot'));
});
