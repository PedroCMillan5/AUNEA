// [AUNEA-UAT-RENDER-010] START — Renderer regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','ui/renderer.js'),'utf8');
const e={companyId:'c1',answers:{},answerDetails:{},processSteps:[{id:'s1',status:'ACTIVE',step_name:'Inicio'}],frictions:[{id:'f1',status:'ACTIVE',friction_type:'P01'}]};
const ctx={console,schema:{option_sets:{OS_X:{options:[{value:'A',label:'Alpha'},{value:'B',label:'Beta'}]},OS_WORKAROUND:{options:[{value:'CHASE',label:'Seguimiento manual'},{value:'NO_WORKAROUND',label:'No existe'}]},OS_SENSITIVE_DATA:{options:[{value:'PERSONAL',label:'Datos personales'},{value:'NONE',label:'Ninguno'}]}}},state:{companies:[{id:'c1',name:'ACME'}],contacts:[{id:'p1',companyId:'c1',name:'Ana',role:'Ops',status:'Activo'},{id:'p2',companyId:'c1',name:'Beto',role:'IT',status:'Inactivo'}]},currentEng:()=>e,normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),attr:v=>String(v??'').replaceAll('"','&quot;'),labelFrom:(s,v)=>v,bindForms:()=>{},setAnswer:(fid,v)=>{e.answers[fid]=v},now:()=>'',markDirty:()=>{},toast:()=>{},render:()=>{},formatDateEs:()=>'12/09/2026',document:{querySelectorAll:()=>[],querySelector:()=>null}};
vm.createContext(ctx);vm.runInContext(code,ctx);
test('searchable dropdown remains catalog-backed and uses the single AUNEA Select primitive',()=>{const html=ctx.renderControl({Field_ID:'DF002',Control_UI:'SEARCHABLE_DROPDOWN',Option_Set_ID:'OS_X',Validation:'permitir Otro'},'A',ctx.schema.option_sets.OS_X.options,e);assert.match(html,/data-aunea-select="DF002"/);assert.match(html,/data-aunea-select-search="DF002"/);assert.match(html,/data-aunea-select-option="DF002"/);assert.doesNotMatch(html,/<datalist/);assert.doesNotMatch(html,/<select/);});
test('number+unit is structured',()=>{const html=ctx.renderControl({Field_ID:'DF021',Control_UI:'NUMBER_WITH_UNIT'},'',[],e);assert.match(html,/data-number-value="DF021"/);assert.match(html,/data-number-unit="DF021"/);});

test('all canonical single-select controls share AUNEA Select instead of browser-native dropdowns',()=>{
  const opts=[{value:'A',label:'Alpha'},{value:'B',label:'Beta'}];
  for(const control of ['DROPDOWN','CONTACT_REFERENCE','CRM_REFERENCE_OR_TEXT']){
    const html=ctx.renderControl({Field_ID:'DF004',Control_UI:control},'A',opts,e);
    assert.match(html,/class="aunea-select"/,control+' must use AUNEA Select');
    assert.doesNotMatch(html,/<select/,control+' must not render a native select');
  }
  const compound=ctx.renderControl({Field_ID:'DF021',Control_UI:'NUMBER_WITH_UNIT'},{value:10,unit:'case'},[],e);
  assert.match(compound,/class="aunea-select"/,'compound unit dropdown uses same component');
  assert.doesNotMatch(compound,/<select/);
});
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
  const fakeBox={querySelector:sel=>sel==='summary span'?{textContent:'Beta'}:null};
  const savedDoc=ctx.document;
  ctx.document={querySelector:sel=>sel.includes('data-aunea-select="DF098__action"')?fakeBox:null,querySelectorAll:()=>[]};
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

test('DF007/DF016 contact reference pickers exclude Inactivo contacts under DEC-061',()=>{
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

test('DF010 Otra behaves like other conditional Other controls',()=>{
  e.answerDetails={};
  const opts=[{value:'BUDGET',label:'Presupuesto'},{value:'OTHER',label:'Otra'}];
  const hidden=ctx.renderControl({Field_ID:'DF010',Control_UI:'MULTISELECT_WITH_DETAIL'},[],opts,e);
  assert.match(hidden,/value="OTHER"[^>]*data-other-toggle="DF010"/);
  assert.match(hidden,/data-detail-wrap="DF010"[^>]*style="display:none"/);
  const shown=ctx.renderControl({Field_ID:'DF010',Control_UI:'MULTISELECT_WITH_DETAIL'},['OTHER'],opts,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF010"[^>]*style="display:none"/);
  e.answerDetails={};
});

test('DF007 offers inline creation of a real Contact',()=>{
  const html=ctx.renderControl({Field_ID:'DF007',Control_UI:'CONTACT_MULTISELECT'},[],[],e);
  assert.match(html,/data-create-contact-for-field="DF007"/);
  assert.match(html,/Crear contacto y añadirlo/);
});

test('PG02 DF017 Otro reveals detail only when selected',()=>{
  e.answerDetails={};
  const opts=[{value:'OPERATIONS',label:'Operaciones'},{value:'OTHER',label:'Otro'}];
  const hidden=ctx.renderControl({Field_ID:'DF017',Control_UI:'MULTISELECT_REFERENCE'},[],opts,e);
  assert.match(hidden,/value="OTHER"[^>]*data-other-toggle="DF017"/);
  assert.match(hidden,/data-detail-wrap="DF017"[^>]*style="display:none"/);
  const shown=ctx.renderControl({Field_ID:'DF017',Control_UI:'MULTISELECT_REFERENCE'},['OTHER'],opts,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF017"[^>]*style="display:none"/);
});

test('PG02 DF020 Otra reveals detail only when selected',()=>{
  e.answerDetails={};
  const opts=[{value:'SERVICE',label:'Servicio / producto'},{value:'OTHER',label:'Otra'}];
  const hidden=ctx.renderControl({Field_ID:'DF020',Control_UI:'MULTISELECT_WITH_DETAIL'},[],opts,e);
  assert.match(hidden,/value="OTHER"[^>]*data-other-toggle="DF020"/);
  assert.match(hidden,/data-detail-wrap="DF020"[^>]*style="display:none"/);
  const shown=ctx.renderControl({Field_ID:'DF020',Control_UI:'MULTISELECT_WITH_DETAIL'},['OTHER'],opts,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF020"[^>]*style="display:none"/);
});


test('dropdown/combobox detail stays hidden unless canonical Otro is selected',()=>{
  e.answerDetails={};
  const opts=[{value:'EMAIL',label:'Email'},{value:'OTHER',label:'Otro'}];
  const hidden=ctx.renderControl({Field_ID:'DF012',Control_UI:'COMBOBOX_WITH_DETAIL'},'EMAIL',opts,e);
  assert.match(hidden,/data-conditional-other-select="DF012"/);
  assert.match(hidden,/data-detail-wrap="DF012"[^>]*style="display:none"/);
  const shown=ctx.renderControl({Field_ID:'DF012',Control_UI:'COMBOBOX_WITH_DETAIL'},'OTHER',opts,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF012"[^>]*style="display:none"/);
  const noOther=ctx.renderControl({Field_ID:'DF024',Control_UI:'DROPDOWN_WITH_DETAIL'},'SEASONAL',[{value:'SEASONAL',label:'Estacional'}],e);
  assert.match(noOther,/detail-wrap/,'detail remains available when the canonical set has no Otro branch');
});

// [AUNEA-UAT-RENDER-010] END
