// [AUNEA-UAT-RENDER-010] START — Renderer regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','app-renderer-v1.js'),'utf8');
const e={companyId:'c1',answers:{},answerDetails:{},processSteps:[{id:'s1',status:'ACTIVE',step_name:'Inicio'}],frictions:[{id:'f1',status:'ACTIVE',friction_type:'P01'}]};
const ctx={console,schema:{option_sets:{OS_X:{options:[{value:'A',label:'Alpha'},{value:'B',label:'Beta'}]},OS_WORKAROUND:{options:[{value:'CHASE',label:'Seguimiento manual'},{value:'NO_WORKAROUND',label:'No existe'}]},OS_SENSITIVE_DATA:{options:[{value:'PERSONAL',label:'Datos personales'},{value:'NONE',label:'Ninguno'}]}}},state:{companies:[{id:'c1',name:'ACME'}],contacts:[{id:'p1',companyId:'c1',name:'Ana',role:'Ops',status:'Contactado'},{id:'p2',companyId:'c1',name:'Beto',role:'IT',status:'Perdido'}]},currentEng:()=>e,normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),attr:v=>String(v??'').replaceAll('"','&quot;'),labelFrom:(s,v)=>v,bindForms:()=>{},setAnswer:(fid,v)=>{e.answers[fid]=v},now:()=>'',markDirty:()=>{},toast:()=>{},render:()=>{},formatDateEs:()=>'12/09/2026',document:{querySelectorAll:()=>[],querySelector:()=>null}};
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

test('DF054 STEP_SYSTEM_PAIR_SELECTOR builds a neutral candidate list from tool changes, channels and manual actions — never asserting a "gap" itself',()=>{
  const eng={processSteps:[
    {id:'s1',status:'ACTIVE',step_name:'Alta',tool:'CRM',communication_channels:['CH1'],manual_actions:[]},
    {id:'s2',status:'ACTIVE',step_name:'Aprobación',tool:'EXCEL',manual_actions:['REKEY']},
    {id:'s3',status:'SUPERSEDED',step_name:'Viejo',tool:'OLD'}
  ]};
  const html=ctx.renderControl({Field_ID:'DF054',Control_UI:'STEP_SYSTEM_PAIR_SELECTOR'},[],[],eng);
  assert.match(html,/pair:s1:s2/);
  assert.match(html,/channel:s1/);
  assert.match(html,/manual:s2/);
  assert.doesNotMatch(html,/<label[^>]*>[^<]*\bgap\b/i,'no individual candidate label may assert a gap — only the disclaimer notice may mention the word');
  assert.doesNotMatch(html,/checked/,'no candidate may come pre-checked; only an explicit consultant confirmation may select one');
  assert.doesNotMatch(html,/s3/,'SUPERSEDED steps must not produce candidates');
});

test('DF054 only persists the candidate ids the consultant explicitly confirms, via the same shared checkbox mechanism as any other multiselect',()=>{
  const eng={processSteps:[{id:'s1',status:'ACTIVE',step_name:'Alta',tool:'CRM'},{id:'s2',status:'ACTIVE',step_name:'Aprobación',tool:'EXCEL'}]};
  const html=ctx.renderControl({Field_ID:'DF054',Control_UI:'STEP_SYSTEM_PAIR_SELECTOR'},['pair:s1:s2'],[],eng);
  assert.match(html,/value="pair:s1:s2"[^>]*data-multi="DF054"[^>]*checked/);
});

test('DF098 DROPDOWN_WITH_OWNER_DATE serializes to a plain "<acción> — <owner> — <fecha>" string (matching the confirmed backend contract), only once all three pieces are present — never a partial value, never an object',()=>{
  e.answerDetails={};e.answers={};
  const html=ctx.renderControl({Field_ID:'DF098',Control_UI:'DROPDOWN_WITH_OWNER_DATE',Option_Set_ID:'OS_X'},'',ctx.schema.option_sets.OS_X.options,e);
  assert.match(html,/data-nextstep-action="DF098"/);
  assert.match(html,/data-nextstep-owner="DF098"/);
  assert.match(html,/data-nextstep-date="DF098"/);
  const fakeSelect={selectedIndex:1,options:[{textContent:'—'},{textContent:'Beta'}]};
  const savedDoc=ctx.document;
  ctx.document={querySelector:sel=>sel.includes('data-nextstep-action')?fakeSelect:null,querySelectorAll:()=>[]};
  e.answerDetails.DF098__action='B';
  ctx.syncNextStep('DF098');
  assert.equal(e.answers.DF098,'','owner and date are still missing, so no partial string may be written');
  e.answerDetails.DF098__owner='Pedro';
  ctx.syncNextStep('DF098');
  assert.equal(e.answers.DF098,'');
  e.answerDetails.DF098__date='2026-09-12';
  ctx.syncNextStep('DF098');
  assert.equal(e.answers.DF098,'Beta — Pedro — 12/09/2026');
  ctx.document=savedDoc;
  e.answerDetails={};e.answers={};
});

test('DF007/DF016 contact reference pickers exclude contacts marked Perdido, reusing the CRM status field (no new archived flag)',()=>{
  const single=ctx.renderControl({Field_ID:'DF006',Control_UI:'CONTACT_REFERENCE'},'',[],e);
  const multi=ctx.renderControl({Field_ID:'DF007',Control_UI:'CONTACT_MULTISELECT'},[],[],e);
  const orRole=ctx.renderControl({Field_ID:'DF016',Control_UI:'CONTACT_OR_ROLE_REFERENCE'},'',[],e);
  [single,multi,orRole].forEach(html=>{assert.match(html,/Ana/);assert.doesNotMatch(html,/Beto/)});
});

test('TEXT_LONG_INTERNAL never renders the literal string "off" and stays internal-only',()=>{
  const empty=ctx.renderControl({Field_ID:'DF100',Control_UI:'TEXT_LONG_INTERNAL'},'',[],e);
  const filled=ctx.renderControl({Field_ID:'DF100',Control_UI:'TEXT_LONG_INTERNAL'},undefined,[],e);
  assert.doesNotMatch(empty,/>off</);
  assert.doesNotMatch(filled,/>off</);
  assert.match(empty,/class="internal-only"/);
});
// [AUNEA-UAT-RENDER-010] END
