// [AUNEA-UAT-RENDER-010] START — Renderer regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','app-renderer-v1.js'),'utf8');
const e={companyId:'c1',answers:{},answerDetails:{},processSteps:[{id:'s1',status:'ACTIVE',step_name:'Inicio'}],frictions:[{id:'f1',status:'ACTIVE',friction_type:'P01'}]};
const ctx={console,schema:{option_sets:{OS_X:{options:[{value:'A',label:'Alpha'},{value:'B',label:'Beta'}]},OS_WORKAROUND:{options:[{value:'CHASE',label:'Seguimiento manual'},{value:'NO_WORKAROUND',label:'No existe'}]},OS_SENSITIVE_DATA:{options:[{value:'PERSONAL',label:'Datos personales'},{value:'NONE',label:'Ninguno'}]}}},state:{companies:[{id:'c1',name:'ACME'}],contacts:[{id:'p1',companyId:'c1',name:'Ana',role:'Ops'}]},currentEng:()=>e,normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),attr:v=>String(v??'').replaceAll('"','&quot;'),labelFrom:(s,v)=>v,bindForms:()=>{},setAnswer:()=>{},now:()=>'',markDirty:()=>{},toast:()=>{},render:()=>{},document:{querySelectorAll:()=>[],querySelector:()=>null}};
vm.createContext(ctx);vm.runInContext(code,ctx);
test('searchable dropdown remains catalog-backed',()=>{const html=ctx.renderControl({Field_ID:'DF002',Control_UI:'SEARCHABLE_DROPDOWN',Option_Set_ID:'OS_X',Validation:'permitir Otro'},'A',ctx.schema.option_sets.OS_X.options,e);assert.match(html,/data-search-answer="DF002"/);assert.match(html,/datalist/);});
test('number+unit is structured',()=>{const html=ctx.renderControl({Field_ID:'DF021',Control_UI:'NUMBER_WITH_UNIT'},'',[],e);assert.match(html,/data-number-value="DF021"/);assert.match(html,/data-number-unit="DF021"/);});
test('multiselect keeps choices',()=>{const html=ctx.renderControl({Field_ID:'DF008',Control_UI:'MULTISELECT_WITH_OTHER'},['A'],ctx.schema.option_sets.OS_X.options,e);assert.match(html,/data-multi="DF008"/);assert.match(html,/detail-input/);});
test('unknown structured controls never degrade to free text',()=>{const html=ctx.renderControl({Field_ID:'DF999',Control_UI:'UNSUPPORTED_STRUCTURED'},'',[],e);assert.match(html,/control-error/);assert.doesNotMatch(html,/data-answer="DF999"/);});

test('Otro detail is hidden by default and only shown once a detail value already exists',()=>{
  e.answerDetails={};
  const hidden=ctx.renderControl({Field_ID:'DF008',Control_UI:'MULTISELECT_WITH_OTHER'},['A'],ctx.schema.option_sets.OS_X.options,e);
  assert.match(hidden,/data-detail-wrap="DF008"[^>]*style="display:none"/);
  assert.match(hidden,/data-other-toggle="DF008"/);
  assert.doesNotMatch(hidden,/id="DF008__other_toggle"[^>]*checked/);
  e.answerDetails={DF008:'Un valor no cubierto por el catálogo'};
  const shown=ctx.renderControl({Field_ID:'DF008',Control_UI:'MULTISELECT_WITH_OTHER'},['A'],ctx.schema.option_sets.OS_X.options,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF008"[^>]*style="display:none"/);
  assert.match(shown,/id="DF008__other_toggle"[^>]*checked/);
  e.answerDetails={};
});

test('Ninguno/No-existe exclusivity is only wired for the two curated Field_IDs, via a hand-curated table not a Validation regex',()=>{
  const workaround=ctx.renderControl({Field_ID:'DF065',Control_UI:'MULTISELECT'},['CHASE'],ctx.schema.option_sets.OS_WORKAROUND.options,e);
  assert.match(workaround,/value="NO_WORKAROUND"[^>]*data-exclusive="1"/);
  assert.doesNotMatch(workaround,/value="CHASE"[^>]*data-exclusive="1"/);
  const sensitive=ctx.renderControl({Field_ID:'DF073',Control_UI:'MULTISELECT'},[],ctx.schema.option_sets.OS_SENSITIVE_DATA.options,e);
  assert.match(sensitive,/value="NONE"[^>]*data-exclusive="1"/);
  const ordinary=ctx.renderControl({Field_ID:'DF008',Control_UI:'MULTISELECT_WITH_OTHER'},['A'],ctx.schema.option_sets.OS_X.options,e);
  assert.doesNotMatch(ordinary,/data-exclusive/);
});
// [AUNEA-UAT-RENDER-010] END
